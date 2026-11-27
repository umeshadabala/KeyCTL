"""Deterministic, explainable security event detector for keyctl (Phase 5)."""
import csv
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import statistics
import time

SUSPICIOUS_LABELS = {
    "unexpected_role_change",
    "review_after_role_change",
    "lateral_movement_candidate",
}

EXPECTED_SERVICE_EDGES = {
    ("portal", "identity"),
    ("portal", "catalog"),
    ("portal", "reports"),
    ("portal", "reports-node-a"),
    ("portal", "reports-node-b"),
    ("admin-console", "identity"),
    ("reports", "catalog"),
}


def parse_utc(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)


def corrected_event_time(event: dict) -> datetime:
    """Subtract known source_clock_offset_ms from event_time_utc."""
    raw = parse_utc(event["event_time_utc"])
    offset_ms = int(event.get("source_clock_offset_ms") or 0)
    return raw - timedelta(milliseconds=offset_ms)


def _has_valid_role_approval(event: dict, approvals: dict, corr_time: datetime) -> bool:
    approval_id = event.get("approval_id", "")
    if not approval_id:
        return False
    for change in approvals.get("changes", []):
        if change.get("approval_id") != approval_id:
            continue
        if change.get("operation") != "grant_role":
            continue
        if change.get("subject") != event.get("actor"):
            continue
        if change.get("role") != event.get("role_after"):
            continue
        valid_from = parse_utc(change["valid_from_utc"])
        valid_until = parse_utc(change["valid_until_utc"])
        if valid_from <= corr_time < valid_until:
            return True
    return False


def analyze_events(events: list[dict], approvals: dict) -> dict:
    """Analyze events using approval context; returns explainable alerts and timeline."""
    alerts: list[dict] = []
    flagged_event_ids: set[str] = set()
    unapproved_sessions: set[tuple[str, str]] = set()
    unexpected_denial_groups: dict[tuple[str, str, str], list[dict]] = {}

    for ev in events:
        corr_time = corrected_event_time(ev)
        eid = ev["event_id"]
        actor = ev["actor"]
        action = ev["action"]
        sess = ev["session_id"]
        corr_id = ev["correlation_id"]
        edge = (ev["source_service"], ev["target_service"])

        if action == "role_change":
            if not _has_valid_role_approval(ev, approvals, corr_time):
                unapproved_sessions.add((actor, sess))
                flagged_event_ids.add(eid)
                alerts.append({
                    "alert_id": f"alert-{len(alerts) + 1}",
                    "rule": "unapproved_role_change",
                    "severity": "high",
                    "actor": actor,
                    "target_service": ev["target_service"],
                    "event_ids": [eid],
                    "timestamp_utc": corr_time.isoformat(),
                    "explanation": (
                        f"Actor {actor} changed role from {ev['role_before']} to "
                        f"{ev['role_after']} without a matching valid approval."
                    ),
                })

        elif action == "read" and ev["outcome"] == "allow" and (actor, sess) in unapproved_sessions:
            flagged_event_ids.add(eid)
            alerts.append({
                "alert_id": f"alert-{len(alerts) + 1}",
                "rule": "post_unapproved_privilege_use",
                "severity": "high",
                "actor": actor,
                "target_service": ev["target_service"],
                "event_ids": [eid],
                "timestamp_utc": corr_time.isoformat(),
                "explanation": (
                    f"Actor {actor} performed allowed read on {ev['target_service']} "
                    f"in session {sess} after an unapproved role change."
                ),
            })

        elif ev["outcome"] == "deny" and edge not in EXPECTED_SERVICE_EDGES:
            unexpected_denial_groups.setdefault((actor, sess, corr_id), []).append(ev)

    for (actor, sess, corr_id), group in unexpected_denial_groups.items():
        if len(group) >= 2:
            eids = [g["event_id"] for g in group]
            flagged_event_ids.update(eids)
            alerts.append({
                "alert_id": f"alert-{len(alerts) + 1}",
                "rule": "candidate_lateral_movement",
                "severity": "medium",
                "actor": actor,
                "target_service": ",".join(g["target_service"] for g in group),
                "event_ids": eids,
                "timestamp_utc": corrected_event_time(group[-1]).isoformat(),
                "explanation": (
                    f"Actor {actor} triggered {len(group)} denied unexpected service edges "
                    f"in session {sess} / flow {corr_id}."
                ),
            })

    return {
        "alerts": alerts,
        "flagged_event_ids": flagged_event_ids,
    }


def evaluate_against_labels(events_path: Path, approvals_path: Path, labels_path: Path) -> dict:
    """Evaluate detector output against practice/labels.csv."""
    with events_path.open("r", encoding="utf-8", newline="") as f:
        events = list(csv.DictReader(f))
    approvals = json.loads(approvals_path.read_text(encoding="utf-8"))
    with labels_path.open("r", encoding="utf-8", newline="") as f:
        labels = {row["event_id"]: row["label"] for row in csv.DictReader(f)}

    t0 = time.perf_counter()
    result = analyze_events(events, approvals)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    flagged = result["flagged_event_ids"]
    tp = fp = fn = tn = 0
    for ev in events:
        eid = ev["event_id"]
        is_suspicious = labels[eid] in SUSPICIOUS_LABELS
        is_flagged = eid in flagged
        if is_suspicious and is_flagged:
            tp += 1
        elif not is_suspicious and is_flagged:
            fp += 1
        elif is_suspicious and not is_flagged:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    benign_total = tn + fp
    false_per_1k = (fp / benign_total * 1000.0) if benign_total else 0.0

    return {
        "total_events": len(events),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "median_alert_time_ms": statistics.median([elapsed_ms]),
        "false_alerts_per_1000_benign": false_per_1k,
        "alerts": result["alerts"],
    }
