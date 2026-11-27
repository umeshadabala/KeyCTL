"""Append-only, hash-chained tamper-evident audit log for keyctl.

Integrity limitations:
- This unkeyed SHA-256 hash chain detects accidental corruption and partial or
  in-place modification, deletion, or reordering of existing records.
- It does NOT prevent an attacker with full write access to the state file from
  rewriting the entire chain from genesis.
"""
import hashlib
import json
from datetime import datetime, timezone

GENESIS_HASH = "0" * 64


def _compute_entry_hash(entry_without_hash: dict) -> str:
    canonical = json.dumps(
        entry_without_hash,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def append_audit_record(
    state: dict,
    request_id: str,
    actor: str,
    action: str,
    asset: str | None,
    decision: str,
    rule: str,
) -> dict:
    """Append a hash-chained audit record and index it by request_id."""
    chain = state["audit_chain"]
    prev_hash = chain[-1]["entry_hash"] if chain else GENESIS_HASH
    seq = len(chain)
    body = {
        "seq": seq,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
        "actor": actor,
        "action": action,
        "asset": asset,
        "decision": decision,
        "rule": rule,
        "prev_hash": prev_hash,
    }
    entry_hash = _compute_entry_hash(body)
    record = dict(body, entry_hash=entry_hash)
    chain.append(record)
    if action == "read":
        state["events"][request_id] = {
            "request_id": request_id,
            "decision": decision,
            "rule": rule,
        }
    return record


def verify_audit_chain(chain: list) -> tuple[bool, int | None]:
    """Verify the entire hash chain. Returns (True, None) or (False, bad_index)."""
    if not isinstance(chain, list):
        return False, 0
    expected_prev = GENESIS_HASH
    for idx, record in enumerate(chain):
        if not isinstance(record, dict):
            return False, idx
        if record.get("seq") != idx or record.get("prev_hash") != expected_prev:
            return False, idx
        recorded_hash = record.get("entry_hash")
        if not isinstance(recorded_hash, str):
            return False, idx
        body = {k: v for k, v in record.items() if k != "entry_hash"}
        if _compute_entry_hash(body) != recorded_hash:
            return False, idx
        expected_prev = recorded_hash
    return True, None


def find_audit_decision(chain: list, request_id: str) -> dict | None:
    """Derive an audit response directly from the verified audit chain."""
    for record in reversed(chain):
        if record.get("action") == "read" and record.get("request_id") == request_id:
            return {
                "request_id": request_id,
                "decision": record["decision"],
                "rule": record["rule"],
            }
    return None
