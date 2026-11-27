"""Deterministic synthetic dataset generator and evaluator for keyctl (Phase B)."""
from datetime import datetime, timedelta, timezone
import random
import statistics
import time

from keyctl_core.detector import analyze_events


def generate_synthetic_dataset(seed: int = 1337, num_events: int = 500) -> tuple[list[dict], dict, dict[str, str]]:
    """Generate a reproducible labelled dataset with benign bursts, offsets, and attacks."""
    rng = random.Random(seed)
    base = datetime(2026, 2, 1, 10, 0, 0, tzinfo=timezone.utc)
    approvals = {
        "synthetic": True,
        "changes": [
            {
                "approval_id": "chg-001",
                "approved_by": "user-admin",
                "subject": "user-alex",
                "operation": "grant_role",
                "role": "report-reader",
                "scope": ["reports"],
                "valid_from_utc": base.isoformat().replace("+00:00", "Z"),
                "valid_until_utc": (base + timedelta(hours=2)).isoformat().replace("+00:00", "Z"),
            }
        ],
    }

    events: list[dict] = []
    labels: dict[str, str] = {}
    idx = 0

    while len(events) < num_events:
        t = base + timedelta(seconds=idx * 5)
        offset_ms = rng.choice([0, 0, 0, 1500, -1000])
        src_t = (t + timedelta(milliseconds=offset_ms)).isoformat().replace("+00:00", "Z")
        rcv_t = (t + timedelta(milliseconds=rng.randint(50, 300))).isoformat().replace("+00:00", "Z")
        kind = rng.choices(
            ["routine", "approved_admin", "isolated_denial", "unapproved_role", "lateral_movement"],
            weights=[0.70, 0.10, 0.10, 0.05, 0.05],
        )[0]

        if kind == "routine":
            eid = f"syn-{idx:04d}"
            events.append({
                "event_id": eid,
                "event_time_utc": src_t,
                "received_time_utc": rcv_t,
                "source_clock_offset_ms": str(offset_ms),
                "actor": "user-alex",
                "source_service": "portal",
                "target_service": "catalog",
                "action": "read",
                "role_before": "viewer",
                "role_after": "viewer",
                "outcome": "allow",
                "approval_id": "",
                "session_id": f"sess-{idx}",
                "correlation_id": f"flow-{idx}",
            })
            labels[eid] = "routine"
            idx += 1
        elif kind == "approved_admin":
            eid = f"syn-{idx:04d}"
            events.append({
                "event_id": eid,
                "event_time_utc": src_t,
                "received_time_utc": rcv_t,
                "source_clock_offset_ms": str(offset_ms),
                "actor": "user-alex",
                "source_service": "admin-console",
                "target_service": "identity",
                "action": "role_change",
                "role_before": "viewer",
                "role_after": "report-reader",
                "outcome": "success",
                "approval_id": "chg-001",
                "session_id": f"sess-{idx}",
                "correlation_id": f"flow-{idx}",
            })
            labels[eid] = "approved_change"
            idx += 1
        elif kind == "isolated_denial":
            eid = f"syn-{idx:04d}"
            events.append({
                "event_id": eid,
                "event_time_utc": src_t,
                "received_time_utc": rcv_t,
                "source_clock_offset_ms": str(offset_ms),
                "actor": "user-casey",
                "source_service": "portal",
                "target_service": "billing",
                "action": "read",
                "role_before": "viewer",
                "role_after": "viewer",
                "outcome": "deny",
                "approval_id": "",
                "session_id": f"sess-{idx}",
                "correlation_id": f"flow-{idx}",
            })
            labels[eid] = "isolated_denial"
            idx += 1
        elif kind == "unapproved_role":
            eid = f"syn-{idx:04d}"
            events.append({
                "event_id": eid,
                "event_time_utc": src_t,
                "received_time_utc": rcv_t,
                "source_clock_offset_ms": str(offset_ms),
                "actor": "user-blair",
                "source_service": "admin-console",
                "target_service": "identity",
                "action": "role_change",
                "role_before": "viewer",
                "role_after": "operator",
                "outcome": "success",
                "approval_id": "",
                "session_id": f"sess-{idx}",
                "correlation_id": f"flow-{idx}",
            })
            labels[eid] = "unexpected_role_change"
            idx += 1
        elif kind == "lateral_movement" and len(events) + 2 <= num_events:
            sess = f"sess-lm-{idx}"
            flow = f"flow-lm-{idx}"
            for step, tgt in enumerate(("billing", "archive", "identity")):
                eid = f"syn-{idx:04d}"
                events.append({
                    "event_id": eid,
                    "event_time_utc": src_t,
                    "received_time_utc": rcv_t,
                    "source_clock_offset_ms": str(offset_ms),
                    "actor": "svc-report-worker",
                    "source_service": "reports" if step == 0 else "billing",
                    "target_service": tgt,
                    "action": "read",
                    "role_before": "service-reader",
                    "role_after": "service-reader",
                    "outcome": "deny",
                    "approval_id": "",
                    "session_id": sess,
                    "correlation_id": flow,
                })
                labels[eid] = "lateral_movement_candidate"
                idx += 1

    return events[:num_events], approvals, labels


def run_benchmark(seed: int = 1337, num_events: int = 500) -> dict:
    """Evaluate detector on held-out synthetic dataset."""
    events, approvals, labels = generate_synthetic_dataset(seed=seed, num_events=num_events)
    t0 = time.perf_counter()
    res = analyze_events(events, approvals)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    flagged = res["flagged_event_ids"]
    suspicious = {"unexpected_role_change", "lateral_movement_candidate"}
    tp = fp = fn = tn = 0
    for ev in events:
        eid = ev["event_id"]
        is_pos = labels[eid] in suspicious
        is_pred = eid in flagged
        if is_pos and is_pred:
            tp += 1
        elif not is_pos and is_pred:
            fp += 1
        elif is_pos and not is_pred:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    benign = tn + fp
    return {
        "seed": seed,
        "total_events": len(events),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "median_alert_time_ms": statistics.median([elapsed_ms]),
        "false_alerts_per_1000_benign": (fp / benign * 1000.0) if benign else 0.0,
    }
