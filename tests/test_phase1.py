"""Phase 1 automated tests for keyctl."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import team_app
from keyctl_core import audit, store


ROOT = Path(__file__).resolve().parent.parent
ADAPTER = ROOT / "track4_service.py"


class Phase1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="keyctl-test-")
        self.prev_env = os.environ.get("TRACK4_STATE_DIR")
        os.environ["TRACK4_STATE_DIR"] = self.tmp.name

    def tearDown(self):
        if self.prev_env is None:
            os.environ.pop("TRACK4_STATE_DIR", None)
        else:
            os.environ["TRACK4_STATE_DIR"] = self.prev_env
        self.tmp.cleanup()

    def _setup(self):
        return team_app.dispatch({
            "op": "setup",
            "owners": {"brief": "maya", "notes": "liam"},
            "contents": {"brief": "secret-brief", "notes": "secret-notes"},
            "disabled": [],
            "key_material": "synthetic-key-material",
        })

    def test_01_successful_setup(self):
        self.assertEqual(self._setup(), {"ready": True})

    def test_02_authorized_resource_access(self):
        self._setup()
        res = team_app.dispatch({"op": "read", "actor": "maya", "asset": "brief", "request_id": "r1"})
        self.assertEqual(res, {"decision": "allow", "body": "secret-brief"})

    def test_03_unauthorized_resource_access(self):
        self._setup()
        res = team_app.dispatch({"op": "read", "actor": "liam", "asset": "brief", "request_id": "r2"})
        self.assertEqual(res, {"decision": "deny"})
        self.assertNotIn("body", res)

    def test_04_successful_device_revocation(self):
        self._setup()
        res = team_app.dispatch({"op": "revoke", "actor": "maya"})
        self.assertEqual(res, {})

    def test_05_denied_access_after_revocation(self):
        self._setup()
        team_app.dispatch({"op": "revoke", "actor": "maya"})
        res = team_app.dispatch({"op": "read", "actor": "maya", "asset": "brief", "request_id": "r3"})
        self.assertEqual(res, {"decision": "deny"})
        audit_res = team_app.dispatch({"op": "audit", "request_id": "r3"})
        self.assertEqual(audit_res["request_id"], "r3")
        self.assertEqual(audit_res["decision"], "deny")

    def test_06_independent_users_retain_access(self):
        self._setup()
        team_app.dispatch({"op": "revoke", "actor": "maya"})
        res = team_app.dispatch({"op": "read", "actor": "liam", "asset": "notes", "request_id": "r4"})
        self.assertEqual(res, {"decision": "allow", "body": "secret-notes"})

    def test_07_persistence_across_separate_processes(self):
        env = os.environ.copy()
        env["TRACK4_STATE_DIR"] = self.tmp.name

        def invoke(payload):
            proc = subprocess.run(
                [sys.executable, "-B", str(ADAPTER)],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                env=env,
                cwd=str(ROOT),
                check=True,
            )
            return json.loads(proc.stdout)

        self.assertEqual(invoke({
            "op": "setup",
            "owners": {"doc": "alice"},
            "contents": {"doc": "hello"},
            "disabled": [],
            "key_material": "k",
        }), {"ready": True})
        self.assertEqual(invoke({"op": "revoke", "actor": "alice"}), {})
        self.assertEqual(invoke({"op": "read", "actor": "alice", "asset": "doc", "request_id": "p1"}), {"decision": "deny"})
        self.assertEqual(invoke({"op": "audit", "request_id": "p1"})["decision"], "deny")

    def test_08_interrupted_atomic_writes(self):
        self._setup()
        before = store.load_state()
        with mock.patch("keyctl_core.store.os.replace", side_effect=OSError("simulated crash")):
            with self.assertRaises(OSError):
                team_app.dispatch({"op": "revoke", "actor": "maya"})
        after = store.load_state()
        self.assertEqual(before, after)
        self.assertEqual(list(Path(self.tmp.name).glob(".keyctl-state-*.tmp")), [])

    def test_09_audit_chain_integrity(self):
        self._setup()
        team_app.dispatch({"op": "read", "actor": "maya", "asset": "brief", "request_id": "a1"})
        team_app.dispatch({"op": "revoke", "actor": "maya"})
        team_app.dispatch({"op": "read", "actor": "maya", "asset": "brief", "request_id": "a2"})
        state = store.load_state()
        ok, bad_idx = audit.verify_audit_chain(state["audit_chain"])
        self.assertTrue(ok)
        self.assertIsNone(bad_idx)
        self.assertEqual(len(state["audit_chain"]), 3)

    def test_10_audit_tampering_detection(self):
        self._setup()
        team_app.dispatch({"op": "read", "actor": "maya", "asset": "brief", "request_id": "t1"})
        state = store.load_state()
        state["audit_chain"][0]["decision"] = "deny"
        store.save_state(state)
        with self.assertRaises(store.StateError):
            team_app.dispatch({"op": "read", "actor": "maya", "asset": "brief", "request_id": "t2"})

    def test_11_malformed_input(self):
        env = os.environ.copy()
        env["TRACK4_STATE_DIR"] = self.tmp.name
        proc = subprocess.run(
            [sys.executable, "-B", str(ADAPTER)],
            input="{not-json",
            text=True,
            capture_output=True,
            env=env,
            cwd=str(ROOT),
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertEqual(proc.stdout, "")

    def test_12_user_controlled_newline_injection(self):
        self._setup()
        evil_id = "r5\n{\"seq\":99,\"decision\":\"allow\"}"
        res = team_app.dispatch({"op": "read", "actor": "liam", "asset": "brief", "request_id": evil_id})
        self.assertEqual(res, {"decision": "deny"})
        state = store.load_state()
        self.assertEqual(len(state["audit_chain"]), 1)
        self.assertEqual(state["audit_chain"][0]["request_id"], evil_id)
        ok, _ = audit.verify_audit_chain(state["audit_chain"])
        self.assertTrue(ok)


if __name__ == "__main__":
    unittest.main()
