"""Schema-agnostic data source, discovery, query, widget, and rule engine for KeyCTL."""
from datetime import datetime, timezone
import json
import secrets

from keyctl_core.db import get_conn, init_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_platform_tables() -> None:
    init_db()
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS data_sources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL,
                config_json TEXT NOT NULL DEFAULT '{}',
                schema_json TEXT NOT NULL DEFAULT '{}',
                mapping_json TEXT NOT NULL DEFAULT '{}',
                record_count INTEGER NOT NULL DEFAULT 0,
                last_sync_at TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dynamic_records (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                external_id TEXT,
                raw_json TEXT NOT NULL,
                normalized_json TEXT NOT NULL,
                ingested_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                widget_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                field TEXT NOT NULL,
                aggregation TEXT NOT NULL,
                group_by TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dynamic_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_id TEXT NOT NULL,
                field TEXT NOT NULL,
                condition TEXT NOT NULL,
                value TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'medium',
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dynamic_alerts (
                id TEXT PRIMARY KEY,
                rule_id TEXT NOT NULL,
                source_id TEXT NOT NULL,
                record_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                explanation TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def _infer_type(val: object) -> str:
    if val is None or val == "":
        return "null"
    if isinstance(val, bool):
        return "boolean"
    if isinstance(val, int):
        return "integer"
    if isinstance(val, float):
        return "number"
    if isinstance(val, (dict, list)):
        return "object"
    s = str(val).strip()
    if s.isdigit():
        return "integer"
    try:
        float(s)
        return "number"
    except ValueError:
        pass
    if "T" in s and (s.endswith("Z") or "+" in s):
        return "timestamp"
    return "string"


def discover_schema(records: list[dict]) -> dict:
    """Inspect a sample of arbitrary records and infer fields, types, and nullability."""
    sample = records[:50]
    fields: dict[str, dict] = {}
    for row in sample:
        if not isinstance(row, dict):
            continue
        for k, v in row.items():
            info = fields.setdefault(k, {"name": k, "types": set(), "nullable": False, "sample_values": []})
            t = _infer_type(v)
            if t == "null":
                info["nullable"] = True
            else:
                info["types"].add(t)
                if len(info["sample_values"]) < 3:
                    info["sample_values"].append(v)
    result = {}
    for k, info in fields.items():
        types = sorted(info["types"])
        result[k] = {
            "name": k,
            "inferred_type": types[0] if len(types) == 1 else ("mixed" if types else "string"),
            "nullable": info["nullable"],
            "sample_values": info["sample_values"],
        }
    return {"field_count": len(result), "fields": result}


def create_source(name: str, source_type: str, config: dict | None = None) -> dict:
    init_platform_tables()
    sid = f"src-{secrets.token_hex(6)}"
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO data_sources (id, name, source_type, config_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (sid, name, source_type, json.dumps(config or {}), now),
        )
        return dict(conn.execute("SELECT * FROM data_sources WHERE id = ?", (sid,)).fetchone())


def list_sources() -> list[dict]:
    init_platform_tables()
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM data_sources ORDER BY created_at DESC").fetchall()]


def _evaluate_condition(actual: object, cond: str, target: str) -> bool:
    s_actual = "" if actual is None else str(actual)
    if cond == "eq":
        return s_actual == target
    if cond == "neq":
        return s_actual != target
    if cond == "contains":
        return target in s_actual
    if cond == "gt":
        try:
            return float(s_actual) > float(target)
        except ValueError:
            return False
    if cond == "lt":
        try:
            return float(s_actual) < float(target)
        except ValueError:
            return False
    return False


def ingest_records(source_id: str, records: list[dict], mapping: dict[str, str] | None = None) -> dict:
    init_platform_tables()
    schema = discover_schema(records)
    now = _now()
    mapping = mapping or {}
    alerts_triggered = 0

    with get_conn() as conn:
        src = conn.execute("SELECT * FROM data_sources WHERE id = ?", (source_id,)).fetchone()
        if src is None:
            raise ValueError(f"Unknown source_id: {source_id}")
        rules = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM dynamic_rules WHERE source_id = ? AND enabled = 1", (source_id,)
            ).fetchall()
        ]

        for row in records:
            if not isinstance(row, dict):
                continue
            rec_id = f"rec-{secrets.token_hex(8)}"
            normalized = dict(row)
            for src_field, target_field in mapping.items():
                if target_field and src_field in row:
                    normalized[target_field] = row[src_field]
            conn.execute(
                "INSERT INTO dynamic_records (id, source_id, external_id, raw_json, normalized_json, ingested_at) VALUES (?, ?, ?, ?, ?, ?)",
                (rec_id, source_id, str(row.get("id", "")), json.dumps(row), json.dumps(normalized), now),
            )
            for rule in rules:
                if _evaluate_condition(normalized.get(rule["field"]), rule["condition"], rule["value"]):
                    alerts_triggered += 1
                    conn.execute(
                        "INSERT INTO dynamic_alerts (id, rule_id, source_id, record_id, severity, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (
                            f"dalt-{secrets.token_hex(6)}",
                            rule["id"],
                            source_id,
                            rec_id,
                            rule["severity"],
                            f"Rule '{rule['name']}' matched {rule['field']} {rule['condition']} '{rule['value']}'",
                            now,
                        ),
                    )

        conn.execute(
            "UPDATE data_sources SET schema_json = ?, mapping_json = ?, record_count = record_count + ?, last_sync_at = ? WHERE id = ?",
            (json.dumps(schema), json.dumps(mapping), len(records), now, source_id),
        )
    return {"source_id": source_id, "ingested": len(records), "alerts_triggered": alerts_triggered, "schema": schema}


def query_records(
    source_id: str,
    field: str = "",
    aggregation: str = "count",
    group_by: str = "",
    limit: int = 50,
) -> dict:
    init_platform_tables()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, normalized_json, ingested_at FROM dynamic_records WHERE source_id = ? ORDER BY ingested_at DESC LIMIT ?",
            (source_id, min(max(limit, 1), 500)),
        ).fetchall()
    parsed = [{"_record_id": r["id"], "_ingested_at": r["ingested_at"], **json.loads(r["normalized_json"])} for r in rows]

    if aggregation == "count" and not group_by:
        value = len(parsed) if not field else sum(1 for r in parsed if r.get(field) not in (None, ""))
        return {"aggregation": "count", "value": value, "records": parsed[:20]}

    if group_by:
        buckets: dict[str, int] = {}
        for r in parsed:
            k = str(r.get(group_by, "unknown"))
            buckets[k] = buckets.get(k, 0) + 1
        return {"aggregation": "group_count", "groups": [{"key": k, "count": v} for k, v in buckets.items()], "records": parsed[:20]}

    nums = []
    for r in parsed:
        try:
            nums.append(float(r[field]))
        except (KeyError, TypeError, ValueError):
            pass
    if aggregation == "sum":
        val = sum(nums)
    elif aggregation == "avg":
        val = sum(nums) / len(nums) if nums else 0.0
    elif aggregation == "min":
        val = min(nums) if nums else 0.0
    elif aggregation == "max":
        val = max(nums) if nums else 0.0
    elif aggregation == "distinct_count":
        val = len({r.get(field) for r in parsed if field in r})
    else:
        val = len(parsed)
    return {"aggregation": aggregation, "value": val, "records": parsed[:20]}


def save_widget(title: str, widget_type: str, source_id: str, field: str, aggregation: str, group_by: str = "") -> dict:
    init_platform_tables()
    wid = f"wid-{secrets.token_hex(6)}"
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO dashboard_widgets (id, title, widget_type, source_id, field, aggregation, group_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (wid, title, widget_type, source_id, field, aggregation, group_by, now),
        )
        return dict(conn.execute("SELECT * FROM dashboard_widgets WHERE id = ?", (wid,)).fetchone())


def list_widgets() -> list[dict]:
    init_platform_tables()
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM dashboard_widgets ORDER BY created_at DESC").fetchall()]


def create_dynamic_rule(name: str, source_id: str, field: str, condition: str, value: str, severity: str = "medium") -> dict:
    init_platform_tables()
    rid = f"drul-{secrets.token_hex(6)}"
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO dynamic_rules (id, name, source_id, field, condition, value, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (rid, name, source_id, field, condition, value, severity, now),
        )
        return dict(conn.execute("SELECT * FROM dynamic_rules WHERE id = ?", (rid,)).fetchone())


def list_dynamic_alerts() -> list[dict]:
    init_platform_tables()
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM dynamic_alerts ORDER BY created_at DESC").fetchall()]
