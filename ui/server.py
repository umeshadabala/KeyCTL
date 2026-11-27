"""Local-only HTTP/JSON API server for the keyctl React dashboard (127.0.0.1 only)."""
import base64
from datetime import datetime, timezone
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import team_app
from keyctl_core import audit, backup, cluster, db, detector, messaging, platform, store

ADAPTER = ROOT / "track4_service.py"
STATE_DIR = Path(os.environ.get("TRACK4_STATE_DIR") or (Path(tempfile.gettempdir()) / "keyctl-ui-state"))
STATE_DIR.mkdir(parents=True, exist_ok=True)
os.environ["TRACK4_STATE_DIR"] = str(STATE_DIR)

MAX_BODY_BYTES = 65536
HAS_PQCRYPTO = importlib.util.find_spec("pqcrypto") is not None


def _call_adapter(payload: dict) -> dict:
    env = os.environ.copy()
    env["TRACK4_STATE_DIR"] = str(STATE_DIR)
    proc = subprocess.run(
        [sys.executable, "-B", str(ADAPTER)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        env=env,
        cwd=str(ROOT),
        timeout=8,
    )
    if proc.returncode != 0:
        raise ValueError("Adapter rejected request or state is not initialized.")
    return json.loads(proc.stdout)


def _get_overview() -> dict:
    try:
        state = store.load_state()
        ok, bad_idx = audit.verify_audit_chain(state["audit_chain"])
        return {
            "initialized": True,
            "python_version": sys.version.split()[0],
            "pqcrypto_available": HAS_PQCRYPTO,
            "owners": state["owners"],
            "disabled": state["disabled"],
            "keyring": state.get("keyring"),
            "audit_chain": state["audit_chain"],
            "audit_verified": ok,
            "audit_bad_index": bad_idx,
        }
    except store.StateError:
        return {
            "initialized": False,
            "python_version": sys.version.split()[0],
            "pqcrypto_available": HAS_PQCRYPTO,
            "owners": {},
            "disabled": [],
            "keyring": None,
            "audit_chain": [],
            "audit_verified": None,
            "audit_bad_index": None,
        }


class KeyctlApiHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY_BYTES:
            raise ValueError("Payload too large.")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("Request body must be a JSON object.")
        return data

    def do_GET(self):
        if self.path == "/api/health":
            self._send_json(200, {"status": "ok", "python": sys.version.split()[0], "pqcrypto": HAS_PQCRYPTO})
        elif self.path == "/api/overview":
            ov = _get_overview()
            ov["db_identities"] = db.list_identities()
            ov["db_assets"] = db.list_assets()
            ov["db_policies"] = db.list_policies()
            ov["db_alerts"] = db.list_alerts()
            ov["db_rules"] = db.list_rules()
            ov["db_imports"] = db.list_imports()
            self._send_json(200, ov)
        elif self.path == "/api/identities":
            self._send_json(200, {"identities": db.list_identities()})
        elif self.path == "/api/assets":
            self._send_json(200, {"assets": db.list_assets()})
        elif self.path == "/api/policies":
            self._send_json(200, {"policies": db.list_policies()})
        elif self.path == "/api/rules":
            self._send_json(200, {"rules": db.list_rules()})
        elif self.path == "/api/alerts":
            self._send_json(200, {"alerts": db.list_alerts()})
        elif self.path == "/api/ingest/history":
            self._send_json(200, {"imports": db.list_imports()})
        elif self.path == "/api/platform/sources":
            self._send_json(200, {"sources": platform.list_sources()})
        elif self.path == "/api/platform/widgets":
            self._send_json(200, {"widgets": platform.list_widgets()})
        elif self.path == "/api/platform/alerts":
            self._send_json(200, {"alerts": platform.list_dynamic_alerts()})
        else:
            self._send_json(404, {"error": "not_found"})

    def do_POST(self):
        try:
            body = self._read_json()
            if self.path == "/api/setup":
                res = _call_adapter({
                    "op": "setup",
                    "owners": body.get("owners", {"brief": "maya", "notes": "liam"}),
                    "contents": body.get("contents", {"brief": "classified-brief", "notes": "liam-notes"}),
                    "disabled": body.get("disabled", []),
                    "key_material": body.get("key_material", "ui-synthetic-key"),
                })
                self._send_json(200, res)
            elif self.path == "/api/access/read":
                res = _call_adapter({
                    "op": "read",
                    "actor": body["actor"],
                    "asset": body["asset"],
                    "request_id": body["request_id"],
                })
                self._send_json(200, res)
            elif self.path == "/api/access/revoke":
                res = _call_adapter({"op": "revoke", "actor": body["actor"]})
                self._send_json(200, res)
            elif self.path == "/api/access/audit":
                res = _call_adapter({"op": "audit", "request_id": body["request_id"]})
                self._send_json(200, res)
            elif self.path == "/api/access/protected-read":
                if not HAS_PQCRYPTO:
                    self._send_json(400, {"error": "pqcrypto==0.4.0 is not installed in this Python runtime."})
                    return
                from pqcrypto.kem import ml_kem_768
                pk, sk = ml_kem_768.generate_keypair()
                pk_b64 = base64.b64encode(pk).decode("ascii")
                challenge = str(body.get("challenge", "ui-challenge"))
                res = _call_adapter({
                    "op": "protected_read",
                    "actor": body["actor"],
                    "asset": body["asset"],
                    "challenge": challenge,
                    "public_key": pk_b64,
                })
                if res.get("decision") == "deny":
                    self._send_json(200, {"decision": "deny", "verified": False})
                    return
                ct = base64.b64decode(res["ciphertext"])
                ss = ml_kem_768.decrypt(sk, ct)
                state = store.load_state()
                expected = hmac.new(ss, (challenge + state["contents"][body["asset"]]).encode("utf-8"), hashlib.sha256).hexdigest()
                verified = hmac.compare_digest(expected, res["proof"])
                self._send_json(200, {
                    "decision": "allow",
                    "ciphertext_bytes": len(ct),
                    "proof_hex": res["proof"],
                    "verified": verified,
                })
            elif self.path == "/api/keys/rotate":
                res = team_app.rotate_key(actor=str(body.get("actor", "operator")), grace_period_seconds=int(body.get("grace_period_seconds", 300)))
                self._send_json(200, res)
            elif self.path == "/api/audit/verify":
                state = store.load_state()
                ok, bad_idx = audit.verify_audit_chain(state["audit_chain"])
                self._send_json(200, {"verified": ok, "bad_index": bad_idx, "length": len(state["audit_chain"])})
            elif self.path == "/api/backup/demo":
                bkey = b"ui-demo-backup-key-32-bytes!!!!!"
                bundle = backup.create_backup(bkey, backup_id="ui-bkp")
                tampered = json.loads(json.dumps(bundle))
                first_asset = next(iter(tampered["state"]["contents"]), None)
                tamper_rejected = False
                if first_asset:
                    tampered["state"]["contents"][first_asset] = "tampered"
                    try:
                        backup.restore_backup(tampered, bkey)
                    except backup.BackupError:
                        tamper_rejected = True
                self._send_json(200, {
                    "backup_id": bundle["backup_id"],
                    "state_digest": bundle["state_digest"],
                    "tamper_rejected": tamper_rejected,
                })
            elif self.path == "/api/simulations/revocation":
                state = store.load_state()
                cl = cluster.NodeCluster(["node-a", "node-b", "node-c"])
                res = cl.propagate_revocation(str(body.get("actor", "maya")), state["disabled"], now_utc=datetime.now(timezone.utc))
                self._send_json(200, {"simulated": True, **res})
            elif self.path == "/api/simulations/messaging":
                skey = b"ui-demo-session-key-32-bytes!!!!"
                ch = messaging.OrderedChannel("bob", skey)
                m0 = messaging.build_message(skey, "alice", "bob", 0, "hello", msg_id="ui-m0")
                delivered = ch.receive(m0)
                replay_rejected = False
                try:
                    ch.receive(m0)
                except messaging.MessagingError:
                    replay_rejected = True
                recipient_rejected = False
                try:
                    ch.receive(messaging.build_message(skey, "alice", "eve", 1, "bad", msg_id="ui-m1"))
                except messaging.MessagingError:
                    recipient_rejected = True
                self._send_json(200, {
                    "simulated": True,
                    "delivered_count": len(delivered),
                    "replay_rejected": replay_rejected,
                    "recipient_mismatch_rejected": recipient_rejected,
                })
            elif self.path == "/api/detection/run":
                res = detector.evaluate_against_labels(
                    ROOT / "practice" / "events.csv",
                    ROOT / "practice" / "approvals.json",
                    ROOT / "practice" / "labels.csv",
                )
                self._send_json(200, res)
            elif self.path == "/api/identities":
                rec = db.create_identity(
                    str(body["id"]),
                    str(body["name"]),
                    str(body.get("role", "viewer")),
                    str(body.get("department", "")),
                    "manual",
                )
                self._send_json(200, rec)
            elif self.path == "/api/identities/revoke":
                rec = db.revoke_identity_db(str(body["id"]))
                self._send_json(200, rec)
            elif self.path == "/api/assets":
                rec = db.create_asset(
                    str(body["id"]),
                    str(body["name"]),
                    str(body["owner_id"]),
                    str(body.get("classification", "internal")),
                    str(body.get("content", "")),
                    "manual",
                )
                self._send_json(200, rec)
            elif self.path == "/api/policies":
                rec = db.upsert_policy(str(body["actor_id"]), str(body["asset_id"]), str(body["effect"]))
                self._send_json(200, rec)
            elif self.path == "/api/policies/evaluate":
                res = db.evaluate_access_db(str(body["actor_id"]), str(body["asset_id"]))
                self._send_json(200, res)
            elif self.path == "/api/rules/toggle":
                rec = db.toggle_rule(str(body["id"]), bool(body["enabled"]))
                self._send_json(200, rec)
            elif self.path == "/api/alerts/ack":
                rec = db.ack_alert(str(body["id"]))
                self._send_json(200, rec)
            elif self.path == "/api/ingest/commit":
                source_type = str(body.get("source_type", "json"))
                filename = str(body.get("filename", "upload"))
                target = str(body.get("target", "identities"))
                records = body.get("records", [])
                mapping = body.get("mapping", {})
                imported = 0
                rejected = 0
                for row in records:
                    try:
                        if target == "identities":
                            rid = str(row.get(mapping.get("id", "id"), "")).strip()
                            rname = str(row.get(mapping.get("name", "name"), "")).strip()
                            rrole = str(row.get(mapping.get("role", "role"), "viewer")).strip() or "viewer"
                            rdept = str(row.get(mapping.get("department", "department"), "")).strip()
                            db.create_identity(rid, rname, rrole, rdept, source_type, row)
                        else:
                            rid = str(row.get(mapping.get("id", "id"), "")).strip()
                            rname = str(row.get(mapping.get("name", "name"), "")).strip()
                            rowner = str(row.get(mapping.get("owner_id", "owner_id"), "")).strip()
                            db.create_asset(rid, rname, rowner, "internal", "", source_type, row)
                        imported += 1
                    except Exception:
                        rejected += 1
                imp = db.record_import(source_type, filename, imported, rejected)
                self._send_json(200, imp)
            elif self.path == "/api/platform/discover":
                self._send_json(200, platform.discover_schema(body.get("records", [])))
            elif self.path == "/api/platform/sources":
                self._send_json(200, platform.create_source(str(body["name"]), str(body["source_type"]), body.get("config")))
            elif self.path == "/api/platform/ingest":
                self._send_json(200, platform.ingest_records(str(body["source_id"]), body.get("records", []), body.get("mapping")))
            elif self.path == "/api/platform/query":
                self._send_json(200, platform.query_records(
                    str(body["source_id"]),
                    str(body.get("field", "")),
                    str(body.get("aggregation", "count")),
                    str(body.get("group_by", "")),
                    int(body.get("limit", 50)),
                ))
            elif self.path == "/api/platform/widgets":
                self._send_json(200, platform.save_widget(
                    str(body["title"]),
                    str(body["widget_type"]),
                    str(body["source_id"]),
                    str(body["field"]),
                    str(body["aggregation"]),
                    str(body.get("group_by", "")),
                ))
            elif self.path == "/api/platform/rules":
                self._send_json(200, platform.create_dynamic_rule(
                    str(body["name"]),
                    str(body["source_id"]),
                    str(body["field"]),
                    str(body["condition"]),
                    str(body["value"]),
                    str(body.get("severity", "medium")),
                ))
            else:
                self._send_json(404, {"error": "not_found"})
        except Exception as exc:
            self._send_json(400, {"error": str(exc)})


def main() -> None:
    port = int(os.environ.get("KEYCTL_UI_PORT", "8765"))
    server = ThreadingHTTPServer(("127.0.0.1", port), KeyctlApiHandler)
    print(f"keyctl API server listening on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
