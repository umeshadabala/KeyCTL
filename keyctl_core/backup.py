"""Integrity-protected backup and anti-rollback restore for keyctl."""
import copy
from datetime import datetime, timezone
import hashlib
import hmac
import json
import secrets

from keyctl_core.audit import append_audit_record, verify_audit_chain
from keyctl_core.store import StateError, load_state, save_state, state_transaction, validate_state


class BackupError(Exception):
    """Raised when backup creation, verification, or restore fails."""


def _canonical_json(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def _compute_state_digest(state: dict) -> str:
    return hashlib.sha256(_canonical_json(state).encode("utf-8")).hexdigest()


def _compute_backup_mac(backup_key: bytes, backup_id: str, created_at: str, chain_len: int, state_digest: str) -> str:
    if not isinstance(backup_key, (bytes, bytearray)) or not backup_key:
        raise BackupError("backup_key must be non-empty bytes.")
    payload = f"{backup_id}|{created_at}|{chain_len}|{state_digest}".encode("utf-8")
    return hmac.new(bytes(backup_key), payload, hashlib.sha256).hexdigest()


def create_backup(backup_key: bytes, backup_id: str | None = None, actor: str = "system") -> dict:
    """Create an integrity-protected snapshot of the current committed state."""
    bid = backup_id or f"bkp-{secrets.token_hex(8)}"
    created_at = datetime.now(timezone.utc).isoformat()
    with state_transaction():
        state = load_state()
        ok, bad_idx = verify_audit_chain(state["audit_chain"])
        if not ok:
            raise StateError(f"Audit chain integrity check failed at index {bad_idx}.")
        snapshot = copy.deepcopy(state)
        state_digest = _compute_state_digest(snapshot)
        mac = _compute_backup_mac(backup_key, bid, created_at, len(snapshot["audit_chain"]), state_digest)
        append_audit_record(
            state,
            request_id=f"backup-{bid}",
            actor=actor,
            action="backup_create",
            asset=None,
            decision="allow",
            rule=f"digest_{state_digest[:12]}",
        )
        save_state(state)
    return {
        "backup_id": bid,
        "created_at": created_at,
        "state_digest": state_digest,
        "mac": mac,
        "state": snapshot,
    }


def restore_backup(bundle: dict, backup_key: bytes, actor: str = "system") -> dict:
    """Verify backup integrity and anti-rollback constraints, then restore atomically."""
    if not isinstance(bundle, dict):
        raise BackupError("Backup bundle must be a dict.")
    for field in ("backup_id", "created_at", "state_digest", "mac", "state"):
        if field not in bundle:
            raise BackupError(f"Backup bundle missing {field}.")

    restored = copy.deepcopy(bundle["state"])
    validate_state(restored)
    ok, bad_idx = verify_audit_chain(restored["audit_chain"])
    if not ok:
        raise BackupError(f"Backup audit chain invalid at index {bad_idx}.")

    actual_digest = _compute_state_digest(restored)
    if not hmac.compare_digest(actual_digest, str(bundle["state_digest"])):
        raise BackupError("Backup state digest mismatch.")

    expected_mac = _compute_backup_mac(
        backup_key,
        str(bundle["backup_id"]),
        str(bundle["created_at"]),
        len(restored["audit_chain"]),
        actual_digest,
    )
    if not hmac.compare_digest(expected_mac, str(bundle["mac"])):
        raise BackupError("Backup MAC verification failed.")

    with state_transaction():
        try:
            current = load_state()
        except StateError:
            current = None

        if current is not None:
            # Never silently reactivate revoked identities or roll back audit history.
            lost_revocations = set(current["disabled"]) - set(restored["disabled"])
            if lost_revocations:
                raise BackupError("Restore rejected: would reactivate revoked identities.")
            if len(restored["audit_chain"]) < len(current["audit_chain"]):
                raise BackupError("Restore rejected: backup audit chain is older than committed state.")

        append_audit_record(
            restored,
            request_id=f"restore-{bundle['backup_id']}",
            actor=actor,
            action="backup_restore",
            asset=None,
            decision="allow",
            rule=f"restored_{actual_digest[:12]}",
        )
        save_state(restored)

    return {
        "backup_id": bundle["backup_id"],
        "state_digest": actual_digest,
        "status": "restored",
    }
