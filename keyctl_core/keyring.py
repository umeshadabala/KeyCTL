"""Versioned key lifecycle and rotation management for keyctl.

Key states:
- "active": Current key version used for new operations.
- "grace": Previous key version within its documented grace period; accepted
  until `cutoff_at` (exclusive), then transitions to "retired".
- "retired": Expired or superseded key version; rejected for all operations.
"""
from datetime import datetime, timedelta, timezone

DEFAULT_GRACE_PERIOD_SECONDS = 300


def _now_utc(now_utc: datetime | None = None) -> datetime:
    return now_utc if now_utc is not None else datetime.now(timezone.utc)


def initialize_keyring(
    grace_period_seconds: int = DEFAULT_GRACE_PERIOD_SECONDS,
    now_utc: datetime | None = None,
) -> dict:
    """Create initial v1 keyring."""
    if not isinstance(grace_period_seconds, int) or grace_period_seconds < 0:
        raise ValueError("grace_period_seconds must be a non-negative integer.")
    now = _now_utc(now_utc)
    return {
        "active_version": "v1",
        "grace_period_seconds": grace_period_seconds,
        "versions": {
            "v1": {
                "version": "v1",
                "status": "active",
                "activated_at": now.isoformat(),
                "retired_at": None,
                "cutoff_at": None,
            }
        },
    }


def retire_expired_versions(keyring: dict, now_utc: datetime | None = None) -> list[str]:
    """Transition any grace-period versions past cutoff_at to retired."""
    now = _now_utc(now_utc)
    retired: list[str] = []
    for ver, meta in keyring["versions"].items():
        if meta["status"] == "grace" and meta["cutoff_at"] is not None:
            cutoff = datetime.fromisoformat(meta["cutoff_at"])
            if now >= cutoff:
                meta["status"] = "retired"
                retired.append(ver)
    return retired


def rotate_keyring(
    keyring: dict,
    grace_period_seconds: int | None = None,
    now_utc: datetime | None = None,
) -> tuple[str, str, list[str]]:
    """Rotate active key version to a new version with grace-period cutoff.

    Returns (previous_version, new_version, newly_retired_versions).
    """
    now = _now_utc(now_utc)
    grace = keyring["grace_period_seconds"] if grace_period_seconds is None else grace_period_seconds
    if not isinstance(grace, int) or grace < 0:
        raise ValueError("grace_period_seconds must be a non-negative integer.")

    newly_retired = retire_expired_versions(keyring, now_utc=now)
    prev_ver = keyring["active_version"]
    prev_meta = keyring["versions"][prev_ver]
    prev_meta["status"] = "grace" if grace > 0 else "retired"
    prev_meta["retired_at"] = now.isoformat()
    prev_meta["cutoff_at"] = (now + timedelta(seconds=grace)).isoformat()
    if grace == 0:
        newly_retired.append(prev_ver)

    next_num = len(keyring["versions"]) + 1
    new_ver = f"v{next_num}"
    keyring["versions"][new_ver] = {
        "version": new_ver,
        "status": "active",
        "activated_at": now.isoformat(),
        "retired_at": None,
        "cutoff_at": None,
    }
    keyring["active_version"] = new_ver
    return prev_ver, new_ver, newly_retired


def is_version_accepted(keyring: dict, version: str, now_utc: datetime | None = None) -> bool:
    """Return True iff version is active or within its grace-period cutoff."""
    meta = keyring["versions"].get(version)
    if meta is None:
        return False
    status = meta["status"]
    if status == "active":
        return True
    if status == "grace" and meta["cutoff_at"] is not None:
        now = _now_utc(now_utc)
        cutoff = datetime.fromisoformat(meta["cutoff_at"])
        return now < cutoff
    return False
