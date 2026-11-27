"""Automated tests for Phases 2-5 of keyctl."""
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import team_app
from keyctl_core import backup, cluster, detector, keyring, messaging

HAS_PQCRYPTO = importlib.util.find_spec("pqcrypto") is not None
ROOT = Path(__file__).resolve().parent.parent
ADAPTER = ROOT / "track4_service.py"


class Phases2To5Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="keyctl-p25-")
        self.prev_env = os.environ.get("TRACK4_STATE_DIR")
        os.environ["TRACK4_STATE_DIR"] = self.tmp.name
        team_app.dispatch({
            "op": "setup",
            "owners": {"brief": "maya", "notes": "liam"},
            "contents": {"brief": "secret-brief", "notes": "secret-notes"},
            "disabled": [],
            "key_material": "synthetic-key",
        })

    def tearDown(self):
        if self.prev_env is None:
            os.environ.pop("TRACK4_STATE_DIR", None)
        else:
            os.environ["TRACK4_STATE_DIR"] = self.prev_env
        self.tmp.cleanup()

    def test_keyring_rotation_grace_and_cutoff(self):
        t0 = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        kr = keyring.initialize_keyring(grace_period_seconds=60, now_utc=t0)
        self.assertTrue(keyring.is_version_accepted(kr, "v1", now_utc=t0))
        prev, new_ver, retired = keyring.rotate_keyring(kr, grace_period_seconds=60, now_utc=t0 + timedelta(seconds=10))
        self.assertEqual((prev, new_ver, retired), ("v1", "v2", []))
        self.assertTrue(keyring.is_version_accepted(kr, "v1", now_utc=t0 + timedelta(seconds=30)))
        self.assertFalse(keyring.is_version_accepted(kr, "v1", now_utc=t0 + timedelta(seconds=70)))
        self.assertTrue(keyring.is_version_accepted(kr, "v2", now_utc=t0 + timedelta(seconds=70)))

    def test_backup_tamper_and_anti_rollback(self):
        bkey = b"test-backup-key-32-bytes-long!!!"
        bundle = backup.create_backup(bkey, backup_id="b1")
        tampered = json.loads(json.dumps(bundle))
        tampered["state"]["contents"]["brief"] = "tampered"
        with self.assertRaises(backup.BackupError):
            backup.restore_backup(tampered, bkey)

        team_app.dispatch({"op": "revoke", "actor": "maya"})
        with self.assertRaises(backup.BackupError):
            backup.restore_backup(bundle, bkey)

    def test_cluster_revocation_and_retry(self):
        cl = cluster.NodeCluster(["node-a", "node-b"])
        cl.set_node_available("node-b", False)
        t0 = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        res = cl.propagate_revocation("maya", ["maya"], now_utc=t0)
        self.assertEqual(res["pending_nodes"], ["node-b"])
        state = {"owners": {"brief": "maya"}, "contents": {"brief": "x"}, "disabled": ["maya"]}
        self.assertEqual(cl.check_node_access("node-a", "maya", "brief", state), ("deny", "identity_disabled"))
        self.assertEqual(cl.check_node_access("node-b", "maya", "brief", state), ("deny", "node_stale_epoch"))

        cl.set_node_available("node-b", True)
        res2 = cl.retry_pending(["maya"], now_utc=t0 + timedelta(seconds=2))
        self.assertEqual(res2["pending_nodes"], [])
        self.assertEqual(res2["propagation_delay_ms"], 2000.0)

    def test_messaging_replay_recipient_order_and_resumption(self):
        skey = b"0123456789abcdef0123456789abcdef"
        ch = messaging.OrderedChannel("bob", skey)
        m0 = messaging.build_message(skey, "alice", "bob", 0, "hello", msg_id="m0")
        m1 = messaging.build_message(skey, "alice", "bob", 1, "world", msg_id="m1")
        m_wrong = messaging.build_message(skey, "alice", "eve", 2, "nope", msg_id="m2")

        self.assertEqual(ch.receive(m1), [])
        self.assertEqual(ch.missing_sequences(), [0])
        delivered = ch.receive(m0)
        self.assertEqual([m["payload"] for m in delivered], ["hello", "world"])
        with self.assertRaises(messaging.MessagingError):
            ch.receive(m0)
        with self.assertRaises(messaging.MessagingError):
            ch.receive(m_wrong)

        mgr = messaging.SessionTicketManager(b"ticket-secret-key")
        t0 = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        ticket = mgr.issue_ticket("alice", "bob", ttl_seconds=60, now_utc=t0)
        self.assertTrue(mgr.resume_ticket(ticket, "alice", "bob", [], now_utc=t0 + timedelta(seconds=10)))
        self.assertFalse(mgr.resume_ticket(ticket, "eve", "bob", [], now_utc=t0 + timedelta(seconds=10)))
        self.assertFalse(mgr.resume_ticket(ticket, "alice", "bob", ["alice"], now_utc=t0 + timedelta(seconds=10)))

    def test_detector_practice_dataset(self):
        res = detector.evaluate_against_labels(
            ROOT / "practice" / "events.csv",
            ROOT / "practice" / "approvals.json",
            ROOT / "practice" / "labels.csv",
        )
        self.assertEqual(res["precision"], 1.0)
        self.assertEqual(res["recall"], 1.0)
        self.assertEqual(res["f1"], 1.0)
        self.assertEqual(res["false_alerts_per_1000_benign"], 0.0)

    @unittest.skipUnless(HAS_PQCRYPTO, "pqcrypto not installed locally")
    def test_protected_read_real_ml_kem_768(self):
        import base64
        from pqcrypto.kem import ml_kem_768

        pk, sk = ml_kem_768.generate_keypair()
        pk_b64 = base64.b64encode(pk).decode("ascii")
        challenge = "fresh-challenge-123"
        env = os.environ.copy()
        env["TRACK4_STATE_DIR"] = self.tmp.name
        proc = subprocess.run(
            [sys.executable, "-B", str(ADAPTER)],
            input=json.dumps({
                "op": "protected_read",
                "actor": "maya",
                "asset": "brief",
                "challenge": challenge,
                "public_key": pk_b64,
            }),
            text=True,
            capture_output=True,
            env=env,
            cwd=str(ROOT),
            check=True,
        )
        resp = json.loads(proc.stdout)
        ct = base64.b64decode(resp["ciphertext"])
        ss = ml_kem_768.decrypt(sk, ct)
        expected_proof = hmac.new(ss, (challenge + "secret-brief").encode("utf-8"), hashlib.sha256).hexdigest()
        self.assertEqual(resp["proof"], expected_proof)


if __name__ == "__main__":
    unittest.main()
