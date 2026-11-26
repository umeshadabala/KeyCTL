"""Local lost-device checks for participant-owned, trusted adapter code.

This program runs code with your user permissions. Temporary state directories
are not a security sandbox. Do not use this program to run untrusted submissions.
No protected_read, cryptographic correctness, or timing score is tested here.
"""
import argparse
import json
import math
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading


class ValidationError(Exception):
    def __init__(self, category, message):
        super().__init__(message)
        self.category = category


def execute(command, request, directory, timeout, cwd=None):
    """Start a fresh process; retain at most 64 KiB from each output stream."""
    env = os.environ.copy()
    for variable in ("TRACK4_STATE_DIR", "TMPDIR", "TEMP", "TMP"):
        env[variable] = str(directory)
    try:
        process = subprocess.Popen(command, cwd=cwd, env=env,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
    except OSError:
        raise ValidationError("setup", "Cannot start adapter. Check runtime and entry path.") from None
    buffers = [bytearray(), bytearray()]

    def drain(stream, target):
        with stream:
            while chunk := stream.read(8192):
                target.extend(chunk[:max(0, 65537 - len(target))])

    def feed():
        try:
            with process.stdin:
                process.stdin.write(json.dumps(request).encode("utf-8"))
        except (BrokenPipeError, OSError):
            pass

    threads = [threading.Thread(target=drain, args=(stream, target), daemon=True)
               for stream, target in zip((process.stdout, process.stderr), buffers)]
    threads.append(threading.Thread(target=feed, daemon=True))
    for thread in threads:
        thread.start()
    try:
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
        raise ValidationError("setup", "Adapter exceeded per-operation timeout.") from None
    finally:
        for thread in threads:
            thread.join(0.2)
    if any(thread.is_alive() for thread in threads):
        raise ValidationError("setup", "Adapter left output streams open. Stop background child processes.")
    if any(len(buffer) > 65536 for buffer in buffers):
        raise ValidationError("format", "Adapter output exceeded 64 KiB per stream.")
    if process.returncode:
        raise ValidationError("setup", "Adapter exited unsuccessfully. Check dependencies and local state handling.")
    return bytes(buffers[0]), bytes(buffers[1])


def validate(entry, timeout=8):
    """Return diagnostics without returning adapter output or secret test values."""
    checks = []

    def record(category, name, passed, detail):
        checks.append(dict(category=category, name=name, passed=bool(passed), detail=detail))

    try:
        entry = Path(entry).resolve()
        if not entry.is_file():
            raise ValidationError("setup", "Entry file does not exist.")
        if not math.isfinite(timeout) or timeout <= 0:
            raise ValidationError("setup", "Timeout must be a positive finite number.")
        if entry.suffix == ".py":
            command = [sys.executable, "-B", str(entry)]
        elif entry.suffix in {".js", ".cjs", ".mjs"}:
            node = shutil.which("node")
            if not node:
                raise ValidationError("setup", "Node.js is missing from PATH.")
            command = [node, str(entry)]
        else:
            raise ValidationError("setup", "Use a .py, .js, .cjs, or .mjs adapter.")
        actor, peer, disabled = [secrets.token_hex(16) for _ in range(3)]
        asset, other = [secrets.token_hex(12) for _ in range(2)]
        body, peer_body, marker = [secrets.token_hex(24) for _ in range(3)]
        initial = dict(op="setup", owners={asset: actor, other: peer},
                       contents={asset: body, other: peer_body}, disabled=[disabled],
                       key_material=marker)
        leaked = False

        def contains_protected_value(response):
            encoded = json.dumps(response, ensure_ascii=False)
            return any(value in encoded for value in (body, peer_body, marker))

        def call(directory, label, **request):
            nonlocal leaked
            out, err = execute(command, request, directory, timeout, cwd=entry.parent)
            leaked = leaked or marker.encode() in out or marker.encode() in err
            try:
                response = json.loads(out)
            except (ValueError, UnicodeError):
                raise ValidationError("format", label + ": stdout must contain exactly one JSON object.") from None
            if not isinstance(response, dict):
                raise ValidationError("format", label + ": response must be a JSON object.")
            if request["op"] in {"read", "audit"} and response.get("decision") not in ("allow", "deny"):
                raise ValidationError("format", label + ": decision must be 'allow' or 'deny'.")
            record("format", label, True, "JSON response matches required structure.")
            if response.get("decision") == "deny" and contains_protected_value(response):
                record("behavior", label + " disclosure", False,
                       "Denied response disclosed seeded protected content in a response field.")
            return response

        def read(directory, label, who, what, expected, expected_body=None):
            request_id = secrets.token_hex(16)
            result = call(directory, label, op="read", actor=who, asset=what, request_id=request_id)
            failures = []
            if result["decision"] != expected:
                failures.append(f"Wrong decision: expected {expected}, received {result['decision']}.")
            if expected == "allow":
                if "body" not in result:
                    failures.append("Allowed response is missing body.")
                elif result["body"] != expected_body:
                    failures.append("Allowed response body does not match seeded content.")
            else:
                if contains_protected_value(result):
                    failures.append("Response disclosed seeded protected content when access should be denied.")
                elif result.get("body"):
                    failures.append("Response contains a nonempty body when access should be denied.")
            record("behavior", label, not failures, " ".join(failures) if failures else
                   "Received allow with exact content." if expected == "allow" else "Received deny without content.")
            return request_id, result

        with tempfile.TemporaryDirectory(prefix="track4-local-") as directory:
            ready = call(directory, "clean setup", **initial).get("ready") is True
            record("setup", "clean setup", ready, "Expected ready: true.")
            if not ready:
                raise ValidationError("setup", "Setup did not report ready: true; later checks cannot run.")
            read(directory, "owner before device loss", actor, asset, "allow", body)
            read(directory, "peer before device loss", peer, other, "allow", peer_body)
            read(directory, "wrong owner", actor, other, "deny")
            call(directory, "revoke lost-device owner", op="revoke", actor=actor)
            request_id, denied = read(directory, "owner after revocation", actor, asset, "deny")
            audit = call(directory, "audit revoked read", op="audit", request_id=request_id)
            record("behavior", "audit revoked read", audit.get("request_id") == request_id
                   and audit.get("decision") == denied.get("decision") == "deny",
                   "Expected matching request_id and deny decision.")
            read(directory, "unaffected peer", peer, other, "allow", peer_body)
            read(directory, "revocation persists across processes", actor, asset, "deny")
        with tempfile.TemporaryDirectory(prefix="track4-local-") as directory:
            ready = call(directory, "fresh rerun setup", **initial).get("ready") is True
            record("setup", "fresh rerun setup", ready, "Expected ready: true in new state directory.")
            if not ready:
                raise ValidationError("setup", "Fresh rerun setup did not report ready: true.")
            read(directory, "fresh rerun owner", actor, asset, "allow", body)
        record("behavior", "fake key stays out of output", not leaked,
               "Fake key marker must not appear in stdout or stderr.")
    except ValidationError as error:
        record(error.category, "validation stopped", False, str(error))
    except OSError:
        record("setup", "validation stopped", False, "Cannot create or clean temporary state. Check filesystem permissions.")
    return checks


def exit_status(checks):
    failed = {check["category"] for check in checks if not check["passed"]}
    return 2 if "setup" in failed else 3 if "format" in failed else 1 if failed else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
                                     epilog="Exit status: 0 pass; 1 behavior failure; 2 setup/execution failure; 3 response format failure.")
    parser.add_argument("--entry", required=True, help="Path to your trusted local adapter")
    parser.add_argument("--timeout", type=float, default=8, help="Seconds allowed per operation (default: 8)")
    args = parser.parse_args(argv)
    print("Local lost-device validator. Runs trusted code with your user permissions.")
    print("Fresh temporary state is not a security sandbox. Cryptography and latency are not tested.")
    checks = validate(args.entry, args.timeout)
    for check in checks:
        print(f"{'PASS' if check['passed'] else 'FAIL'} [{check['category']}] {check['name']}: {check['detail']}")
    status = exit_status(checks)
    print("Local scenario passed." if status == 0 else "Local scenario failed. Fix reported checks and run again.")
    return status


if __name__ == "__main__":
    sys.exit(main())
