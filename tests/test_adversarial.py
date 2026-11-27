"""Adversarial security tests for keyctl (Phase C)."""
import base64
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import team_app
from keyctl_core import benchmark, crypto, keyring, messaging

ROOT = Path(__file__).resolve().parent.parent
ADAPTER = ROOT / "track4_service.py"


class AdversarialSecurityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="keyctl-adv-")
        self.prev_env = os.environ.get("TRACK4_STATE_DIR")
        os.environ["TRACK4_STATE_DIR"] = self.tmp.name
        team_app.dispatch({
            "op": "setup",
            "owners": {"brief": "maya"},
            "contents": {"brief": "top-secret"},
            "disabled": [],
            "key_material": "k",
        })

    def tearDown(self):
        if self.prev_env is None:
            os.environ.pop("TRACK4_STATE_DIR", None)
        else:
            os.environ["TRACK4_STATE_DIR"] = self.prev_env
        self.tmp.cleanup()

    def test_malformed_and_oversized_json_rejected(self):
        env = os.environ.copy()
        env["TRACK4_STATE_DIR"] = self.tmp.name
        proc = subprocess.run(
            [sys.executable, "-B", str(ADAPTER)],
            input='{"op":"read","actor":"maya","asset":"' + ("A" * 200000),
            text=True,
            capture_output=True,
            env=env,
            cwd=str(ROOT),
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertEqual(proc.stdout, "")

    def test_invalid_base64_and_wrong_length_public_key(self):
        with self.assertRaises(crypto.CryptoError):
            crypto.decode_ml_kem_public_key("not!valid!base64")
        short_b64 = base64.b64encode(b"too-short").decode("ascii")
        with self.assertRaises(crypto.CryptoError):
            crypto.decode_ml_kem_public_key(short_b64)

    def test_grace_period_expiration_rejects_old_key(self):
        t0 = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        kr = keyring.initialize_keyring(grace_period_seconds=30, now_utc=t0)
        keyring.rotate_keyring(kr, grace_period_seconds=30, now_utc=t0)
        self.assertTrue(keyring.is_version_accepted(kr, "v1", now_utc=t0 + timedelta(seconds=29)))
        self.assertFalse(keyring.is_version_accepted(kr, "v1", now_utc=t0 + timedelta(seconds=30)))

    def test_tampered_session_ticket_and_expired_ticket_rejected(self):
        mgr = messaging.SessionTicketManager(b"ticket-key")
        t0 = datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        ticket = mgr.issue_ticket("alice", "bob", ttl_seconds=60, now_utc=t0)
        tampered = dict(ticket, mac="0" * 64)
        self.assertFalse(mgr.resume_ticket(tampered, "alice", "bob", [], now_utc=t0 + timedelta(seconds=10)))
        self.assertFalse(mgr.resume_ticket(ticket, "alice", "bob", [], now_utc=t0 + timedelta(seconds=61)))

    def test_held_out_synthetic_benchmark_metrics(self):
        res = benchmark.run_benchmark(seed=1337, num_events=500)
        self.assertEqual(res["total_events"], 500)
        self.assertGreaterEqual(res["f1"], 0.99)
        self.assertEqual(res["false_alerts_per_1000_benign"], 0.0)


if __name__ == "__main__":
    unittest.main()
