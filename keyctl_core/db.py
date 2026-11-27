"""SQLite persistence layer for KeyCTL product workflows (identities, assets, policies, ingestion, rules, alerts)."""
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import secrets
import sqlite3
import tempfile


def get_db_path() -> Path:
    raw = os.environ.get("TRACK4_STATE_DIR") or tempfile.gettempdir()
    d = Path(raw)
    d.mkdir(parents=True, exist_ok=True)
    return d / "keyctl.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(str(get_db_path()), timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS identities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'viewer',
                department TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                source_type TEXT NOT NULL DEFAULT 'manual',
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                classification TEXT NOT NULL DEFAULT 'internal',
                content TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                source_type TEXT NOT NULL DEFAULT 'manual',
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS policies (
                id TEXT PRIMARY KEY,
                actor_id TEXT NOT NULL,
                asset_id TEXT NOT NULL,
                effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
                created_at TEXT NOT NULL,
                UNIQUE(actor_id, asset_id)
            );
            CREATE TABLE IF NOT EXISTS monitoring_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                rule_type TEXT NOT NULL,
                threshold INTEGER NOT NULL DEFAULT 3,
                enabled INTEGER NOT NULL DEFAULT 1,
                description TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                rule_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                actor TEXT NOT NULL,
                target TEXT NOT NULL,
                explanation TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS imports (
                id TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                filename TEXT NOT NULL,
                record_count INTEGER NOT NULL,
                rejected_count INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        existing_rules = conn.execute("SELECT COUNT(*) FROM monitoring_rules").fetchone()[0]
        if existing_rules == 0:
            conn.executemany(
                "INSERT INTO monitoring_rules (id, name, rule_type, threshold, enabled, description) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    ("rule-repeated-deny", "Repeated Denied Access", "repeated_deny", 3, 1, "Flags >= 3 denied access attempts by an identity."),
                    ("rule-revoked-access", "Revoked Identity Access Attempt", "revoked_access", 1, 1, "Flags any access attempt by a revoked identity."),
                    ("rule-unapproved-role", "Unapproved Role Change", "unapproved_role_change", 1, 1, "Flags role changes without matching change-control approval."),
                ],
            )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_identities() -> list[dict]:
    init_db()
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM identities ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def create_identity(
    identity_id: str,
    name: str,
    role: str = "viewer",
    department: str = "",
    source_type: str = "manual",
    metadata: dict | None = None,
) -> dict:
    init_db()
    if not identity_id or not name:
        raise ValueError("identity_id and name are required.")
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO identities (id, name, role, department, status, source_type, metadata_json, created_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, department=excluded.department, source_type=excluded.source_type
            """,
            (identity_id, name, role, department, source_type, json.dumps(metadata or {}), now),
        )
        row = conn.execute("SELECT * FROM identities WHERE id = ?", (identity_id,)).fetchone()
        return dict(row)


def revoke_identity_db(identity_id: str) -> dict:
    init_db()
    with get_conn() as conn:
        cur = conn.execute("UPDATE identities SET status = 'revoked' WHERE id = ?", (identity_id,))
        if cur.rowcount == 0:
            raise ValueError(f"Identity {identity_id} not found.")
        row = conn.execute("SELECT * FROM identities WHERE id = ?", (identity_id,)).fetchone()
        return dict(row)


def list_assets() -> list[dict]:
    init_db()
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM assets ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def create_asset(
    asset_id: str,
    name: str,
    owner_id: str,
    classification: str = "internal",
    content: str = "",
    source_type: str = "manual",
    metadata: dict | None = None,
) -> dict:
    init_db()
    if not asset_id or not name or not owner_id:
        raise ValueError("asset_id, name, and owner_id are required.")
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO assets (id, name, owner_id, classification, content, status, source_type, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, owner_id=excluded.owner_id, classification=excluded.classification, content=excluded.content
            """,
            (asset_id, name, owner_id, classification, content, source_type, json.dumps(metadata or {}), now),
        )
        row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
        return dict(row)


def list_policies() -> list[dict]:
    init_db()
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM policies ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def upsert_policy(actor_id: str, asset_id: str, effect: str) -> dict:
    init_db()
    if effect not in ("allow", "deny"):
        raise ValueError("effect must be 'allow' or 'deny'.")
    pid = f"pol-{secrets.token_hex(6)}"
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO policies (id, actor_id, asset_id, effect, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(actor_id, asset_id) DO UPDATE SET effect=excluded.effect
            """,
            (pid, actor_id, asset_id, effect, now),
        )
        row = conn.execute("SELECT * FROM policies WHERE actor_id = ? AND asset_id = ?", (actor_id, asset_id)).fetchone()
        return dict(row)


def evaluate_access_db(actor_id: str, asset_id: str) -> dict:
    init_db()
    with get_conn() as conn:
        ident = conn.execute("SELECT * FROM identities WHERE id = ?", (actor_id,)).fetchone()
        if ident is None:
            return {"decision": "deny", "rule": "unknown_identity"}
        if ident["status"] == "revoked":
            conn.execute(
                "INSERT INTO alerts (id, rule_id, severity, actor, target, explanation, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
                (f"alt-{secrets.token_hex(6)}", "rule-revoked-access", "high", actor_id, asset_id, f"Revoked identity {actor_id} attempted access to {asset_id}.", _now()),
            )
            return {"decision": "deny", "rule": "identity_revoked"}
        pol = conn.execute("SELECT * FROM policies WHERE actor_id = ? AND asset_id = ?", (actor_id, asset_id)).fetchone()
        if pol is not None:
            return {"decision": pol["effect"], "rule": f"policy_{pol['id']}"}
        asset = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
        if asset is not None and asset["owner_id"] == actor_id:
            return {"decision": "allow", "rule": "owner_allowed"}
        return {"decision": "deny", "rule": "deny_by_default"}


def list_rules() -> list[dict]:
    init_db()
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM monitoring_rules").fetchall()]


def toggle_rule(rule_id: str, enabled: bool) -> dict:
    init_db()
    with get_conn() as conn:
        conn.execute("UPDATE monitoring_rules SET enabled = ? WHERE id = ?", (1 if enabled else 0, rule_id))
        row = conn.execute("SELECT * FROM monitoring_rules WHERE id = ?", (rule_id,)).fetchone()
        if row is None:
            raise ValueError("Rule not found.")
        return dict(row)


def list_alerts() -> list[dict]:
    init_db()
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM alerts ORDER BY created_at DESC").fetchall()]


def ack_alert(alert_id: str) -> dict:
    init_db()
    with get_conn() as conn:
        conn.execute("UPDATE alerts SET status = 'acknowledged' WHERE id = ?", (alert_id,))
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise ValueError("Alert not found.")
        return dict(row)


def record_import(source_type: str, filename: str, record_count: int, rejected_count: int) -> dict:
    init_db()
    imp_id = f"imp-{secrets.token_hex(6)}"
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO imports (id, source_type, filename, record_count, rejected_count, status, created_at) VALUES (?, ?, ?, ?, ?, 'completed', ?)",
            (imp_id, source_type, filename, record_count, rejected_count, now),
        )
        row = conn.execute("SELECT * FROM imports WHERE id = ?", (imp_id,)).fetchone()
        return dict(row)


def list_imports() -> list[dict]:
    init_db()
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM imports ORDER BY created_at DESC").fetchall()]
