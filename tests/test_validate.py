"""Local validator regressions; no Docker or third-party packages required."""
import contextlib
import io
from pathlib import Path
import tempfile
import unittest

import validate


SERVICE = '''import json, os, pathlib, sys
r = json.load(sys.stdin)
p = pathlib.Path(os.environ["TRACK4_STATE_DIR"]) / "state.json"
assert pathlib.Path("config.json").read_text() == '{"local_config": true}'
assert all(os.environ[k] == str(p.parent) for k in ("TMPDIR", "TEMP", "TMP"))
if r["op"] == "setup":
    assert not p.exists(), "state must be fresh"
    s = dict(r, events={})
    out = {"ready": True}
else:
    s = json.loads(p.read_text())
    if r["op"] == "revoke":
        s["disabled"].append(r["actor"])
        out = {}
    elif r["op"] == "audit":
        out = s["events"][r["request_id"]]
    else:
        allowed = s["owners"].get(r["asset"]) == r["actor"] and r["actor"] not in s["disabled"]
        out = {"decision": "allow" if allowed else "deny"}
        if allowed:
            out["body"] = s["contents"][r["asset"]]
        s["events"][r["request_id"]] = dict(request_id=r["request_id"], decision=out["decision"])
p.write_text(json.dumps(s))
print(json.dumps(out))
'''


class ValidatorTests(unittest.TestCase):
    def run_service(self, source, timeout=8):
        with tempfile.TemporaryDirectory() as directory:
            entry = Path(directory) / "adapter.py"
            entry.write_text(source)
            (Path(directory) / "config.json").write_text('{"local_config": true}')
            checks = validate.validate(entry, timeout)
            self.assertFalse((Path(directory) / "state.json").exists())
            return checks

    def test_happy_path_uses_fresh_state_and_fresh_processes(self):
        checks = self.run_service(SERVICE)
        self.assertEqual(validate.exit_status(checks), 0, checks)

    def test_denial_with_content_fails(self):
        checks = self.run_service(SERVICE.replace('if allowed:', 'if True:'))
        self.assertEqual(validate.exit_status(checks), 1)
        self.assertTrue(any(c["name"] == "owner after revocation" and not c["passed"] for c in checks))

    def test_missing_revocation_fails(self):
        checks = self.run_service(SERVICE.replace('s["disabled"].append(r["actor"])', 'pass'))
        self.assertEqual(validate.exit_status(checks), 1)
        self.assertTrue(any("Wrong decision" in c["detail"] for c in checks))

    def test_denial_with_nested_protected_content_fails(self):
        source = SERVICE.replace('p.write_text(json.dumps(s))',
                                 'if out.get("decision") == "deny":\n    out["debug"] = {"nested": [next(iter(s["contents"].values()))]}\np.write_text(json.dumps(s))')
        checks = self.run_service(source)
        self.assertEqual(validate.exit_status(checks), 1)
        self.assertTrue(any("disclosed seeded protected content" in c["detail"] for c in checks))

    def test_missing_body_has_specific_diagnostic(self):
        checks = self.run_service(SERVICE.replace('out["body"] = s["contents"][r["asset"]]', 'pass'))
        self.assertEqual(validate.exit_status(checks), 1)
        self.assertTrue(any("missing body" in c["detail"] for c in checks))

    def test_format_and_execution_have_distinct_exit_status(self):
        self.assertEqual(validate.exit_status(self.run_service('print("not JSON")')), 3)
        self.assertEqual(validate.exit_status(self.run_service('raise RuntimeError("bad")')), 2)
        self.assertEqual(validate.exit_status(self.run_service('import time; time.sleep(5)', 0.1)), 2)

    def test_fake_key_leak_fails_without_echo(self):
        source = SERVICE.replace('print(json.dumps(out))', 'print(s["key_material"], file=sys.stderr)\nprint(json.dumps(out))')
        checks = self.run_service(source)
        self.assertEqual(validate.exit_status(checks), 1)
        self.assertFalse(next(c for c in checks if c["name"] == "fake key stays out of output")["passed"])
        with tempfile.TemporaryDirectory() as directory:
            entry = Path(directory) / "adapter.py"
            entry.write_text('import sys; print("PRIVATE-ERROR", file=sys.stderr); raise RuntimeError()')
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(validate.main(["--entry", str(entry)]), 2)
            self.assertNotIn("PRIVATE-ERROR", output.getvalue())


if __name__ == "__main__":
    unittest.main()
