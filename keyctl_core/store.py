"""Atomic, crash-safe, lock-protected state persistence for keyctl.

Persistence guarantee:
- Cross-process read-modify-write transactions are serialized using an advisory
  exclusive file lock (`fcntl.flock`) on `keyctl-state.lock`. If a process
  terminates unexpectedly, the OS kernel automatically releases the lock.
- Writes are staged to a temporary file in the same directory, flushed and
  synced with `os.fsync()`, atomically swapped via `os.replace()`, and followed
  by a best-effort directory `os.fsync()` so the directory entry is durable.
"""
from contextlib import contextmanager
import fcntl
import json
import os
import tempfile
from pathlib import Path


class StateError(Exception):
    """Raised when persisted state is missing, invalid, or corrupted."""


def get_state_dir() -> Path:
    """Return the writable state directory from TRACK4_STATE_DIR or OS temp."""
    raw = os.environ.get("TRACK4_STATE_DIR") or tempfile.gettempdir()
    path = Path(raw)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_state_path() -> Path:
    """Return the canonical state file path."""
    return get_state_dir() / "keyctl-state.json"


def _get_lock_path() -> Path:
    return get_state_dir() / "keyctl-state.lock"


@contextmanager
def state_transaction():
    """Serialize cross-process read-modify-write transactions via flock."""
    lock_path = _get_lock_path()
    fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def validate_state(state: object) -> dict:
    """Validate full state schema; fail closed on any corruption."""
    if not isinstance(state, dict):
        raise StateError("State must be a JSON object.")
    required = ("owners", "contents", "disabled", "events", "audit_chain")
    for key in required:
        if key not in state:
            raise StateError(f"Missing required state key: {key}")

    owners = state["owners"]
    if not isinstance(owners, dict) or not all(
        isinstance(k, str) and k and isinstance(v, str) and v for k, v in owners.items()
    ):
        raise StateError("owners must map non-empty strings to non-empty strings.")

    contents = state["contents"]
    if not isinstance(contents, dict) or not all(
        isinstance(k, str) and k and isinstance(v, str) for k, v in contents.items()
    ):
        raise StateError("contents must map non-empty strings to strings.")

    disabled = state["disabled"]
    if not isinstance(disabled, list) or not all(isinstance(x, str) and x for x in disabled):
        raise StateError("disabled must be a list of non-empty strings.")

    events = state["events"]
    if not isinstance(events, dict):
        raise StateError("events must be an object.")
    for req_id, ev in events.items():
        if not isinstance(req_id, str) or not req_id or not isinstance(ev, dict):
            raise StateError("events entries must be objects keyed by non-empty request_id.")
        if ev.get("request_id") != req_id or ev.get("decision") not in ("allow", "deny"):
            raise StateError("events entry has invalid request_id or decision.")

    audit_chain = state["audit_chain"]
    if not isinstance(audit_chain, list):
        raise StateError("audit_chain must be a list.")
    for rec in audit_chain:
        if not isinstance(rec, dict):
            raise StateError("audit_chain entries must be objects.")
        for field in ("seq", "timestamp_utc", "request_id", "actor", "action", "decision", "rule", "prev_hash", "entry_hash"):
            if field not in rec:
                raise StateError(f"audit_chain entry missing {field}.")

    if "keyring" in state:
        kr = state["keyring"]
        if not isinstance(kr, dict):
            raise StateError("keyring must be an object.")
        if not isinstance(kr.get("active_version"), str) or not kr["active_version"]:
            raise StateError("keyring.active_version must be a non-empty string.")
        if not isinstance(kr.get("grace_period_seconds"), int) or kr["grace_period_seconds"] < 0:
            raise StateError("keyring.grace_period_seconds must be a non-negative integer.")
        versions = kr.get("versions")
        if not isinstance(versions, dict) or kr["active_version"] not in versions:
            raise StateError("keyring.versions must contain active_version.")
        for ver, meta in versions.items():
            if not isinstance(ver, str) or not isinstance(meta, dict):
                raise StateError("keyring.versions entries must be objects.")
            if meta.get("version") != ver or meta.get("status") not in ("active", "grace", "retired"):
                raise StateError("keyring version metadata is invalid.")

    return state


def load_state() -> dict:
    """Load and validate persisted state; fail closed if missing or corrupt."""
    path = get_state_path()
    if not path.is_file():
        raise StateError("State has not been initialized.")
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
    except (OSError, ValueError, UnicodeError) as exc:
        raise StateError("Failed to read or parse state.") from exc
    return validate_state(data)


def _fsync_dir(directory: Path) -> None:
    """Best-effort fsync on the parent directory for rename durability."""
    try:
        dir_fd = os.open(directory, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(dir_fd)
    except OSError:
        pass
    finally:
        os.close(dir_fd)


def save_state(state: dict) -> None:
    """Atomically persist validated state using temp file + fsync + os.replace."""
    validate_state(state)
    state_dir = get_state_dir()
    target = get_state_path()
    payload = json.dumps(state, allow_nan=False, separators=(",", ":"))
    fd, tmp_name = tempfile.mkstemp(prefix=".keyctl-state-", suffix=".tmp", dir=str(state_dir))
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_path, target)
        _fsync_dir(state_dir)
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise
