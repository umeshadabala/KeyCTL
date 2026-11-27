"""End-to-end CLI demonstration of keyctl components (Phase D)."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import team_app
from keyctl_core import audit, backup, cluster, detector, keyring, messaging, store


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="keyctl-demo-") as tmp:
        os.environ["TRACK4_STATE_DIR"] = tmp
        print("=== keyctl Live Demonstration ===")
        print("[1] Setup:", team_app.dispatch({
            "op": "setup",
            "owners": {"brief": "maya", "notes": "liam"},
            "contents": {"brief": "classified-brief", "notes": "liam-notes"},
            "disabled": [],
            "key_material": "demo-synthetic-key",
        }))
        print("[2] Authorized read (maya):", team_app.dispatch({
            "op": "read", "actor": "maya", "asset": "brief", "request_id": "d1",
        }))
        print("[3] Denied read (liam -> brief):", team_app.dispatch({
            "op": "read", "actor": "liam", "asset": "brief", "request_id": "d2",
        }))
        print("[4] Key rotation:", team_app.rotate_key(actor="operator", grace_period_seconds=0))
        state = store.load_state()
        print("[4b] v1 accepted after 0s grace?:", keyring.is_version_accepted(state["keyring"], "v1"))

        print("[5] Revoke maya & [SIMULATED] NodeCluster propagation:")
        team_app.dispatch({"op": "revoke", "actor": "maya"})
        cl = cluster.NodeCluster(["node-a", "node-b"])
        print("    Cluster:", cl.propagate_revocation("maya", ["maya"], now_utc=datetime.now(timezone.utc)))

        bkey = b"demo-backup-key-32-bytes-long!!!"
        bundle = backup.create_backup(bkey, backup_id="demo-bkp")
        bundle["state"]["contents"]["brief"] = "corrupted"
        try:
            backup.restore_backup(bundle, bkey)
        except backup.BackupError as exc:
            print("[6] Backup corruption detected:", str(exc))

        skey = b"demo-session-key-32-bytes-long!!"
        ch = messaging.OrderedChannel("bob", skey)
        m0 = messaging.build_message(skey, "alice", "bob", 0, "hello", msg_id="demo-m0")
        ch.receive(m0)
        try:
            ch.receive(m0)
        except messaging.MessagingError as exc:
            print("[7] [SIMULATED] Replay rejected:", str(exc))

        root = Path(__file__).resolve().parent.parent
        det = detector.evaluate_against_labels(
            root / "practice" / "events.csv",
            root / "practice" / "approvals.json",
            root / "practice" / "labels.csv",
        )
        print("[8] Detector on practice/:", {"precision": det["precision"], "recall": det["recall"], "f1": det["f1"]})

        ok, bad = audit.verify_audit_chain(store.load_state()["audit_chain"])
        print("[9] Audit chain verified:", {"ok": ok, "bad_index": bad})


if __name__ == "__main__":
    main()
