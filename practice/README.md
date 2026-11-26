# Public practice events

All identities, services, sessions, times, and approvals are invented. These files contain normal-interface event examples. They contain no hidden tests, judge fixtures, exploit instructions, passwords, or keys. Labels support practice and explanation. They are not an official scoring rule or a production security baseline.

## Files

| File | Purpose |
| --- | --- |
| `events.csv` | 22 events in receipt order |
| `labels.csv` | Public explanation for every event |
| `approvals.json` | Authorized change scope and validity |
| `examples.md` | Worked interpretations and their limits |

## Context and field meanings

`viewer` can read `catalog`. `report-reader` can also read `reports` and its nodes during approval validity. `operator` can manage roles. `svc-report-worker` normally calls `catalog` from `reports`. Billing, archive, and identity role enumeration are outside this service's expected scope. No approval exists for `user-blair` to become an operator. The example records that this unexpected role change succeeded; it does not explain how.

`actor` identifies the subject acting with the listed role. For approval and revocation administration events, it identifies the operator; `approvals.json` identifies the affected subject. `source_service` and `target_service` describe the observed service edge, not proof of a network connection or compromise. `session_id` and `correlation_id` support grouping. Their values are synthetic identifiers, not credentials.

`event_time_utc` is the timestamp recorded by the source. `received_time_utc` is the collector timestamp. `source_clock_offset_ms` is known source offset relative to collector time in this exercise. Subtract that offset to estimate event time on the collector clock. Real systems must measure offset and its uncertainty. Do not infer malicious activity from an apparent negative delivery delay alone.

Approval `valid_until_utc` is exclusive. Receipt order differs from event order: `evt-014` arrives before `evt-013`. Keep both timestamps. Sorting a report must not rewrite source evidence. Event IDs identify records; they do not define arrival order.

## Practice procedure

1. Load `events.csv` without loading labels into detection logic.
2. Load `approvals.json` as change-control context.
3. Group events by actor, session, and correlation ID.
4. Report role changes with and without matching authorization.
5. Report unexpected service edges and their supporting event IDs.
6. Explain delayed delivery and source clock offset separately.
7. Compare your explanations with `labels.csv` and `examples.md`.
8. Record limitations in `../templates/evidence-sheet.md`.

These 22 examples support functional demonstrations only. They cannot establish detection accuracy, false-positive rate, resilience, cryptographic security, or event-scale throughput. Use additional representative data and state its origin when measuring those claims.
