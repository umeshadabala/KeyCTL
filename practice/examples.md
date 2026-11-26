# Worked examples

## Approved role change

`evt-003` approves `change-100`. `evt-004` changes `user-alex` from `viewer` to `report-reader`. The subject, role, scope, and time match `approvals.json`. `evt-005` reads reports during the approved interval. Classify the change as approved. A role increase alone does not establish suspicious activity.

## Unexpected role change

`evt-008` gives `user-blair` the `operator` role with no matching approval. `evt-009` records a subsequent allowed read in `sess-blair`. Flag the change for review. Record both event IDs and the missing authorization. These records do not prove the cause of the change or the actor's intent.

## Candidate lateral movement

`evt-010`, `evt-011`, and `evt-012` show three unexpected service edges in `flow-005` and `sess-worker`. The requests are denied. Group them as a candidate lateral-movement sequence. Do not report successful compromise or successful access. In comparison, `evt-020` is one isolated denial and does not establish a movement sequence.

## Delivery order and clock offset

`evt-013` occurred before `evt-014` but arrived later. Preserve receipt order for ingestion analysis and event order for timeline analysis. `evt-015` has a source clock offset of +2000 ms. Its corrected event time is `2026-01-15T09:06:01.000Z`; collector delay is 200 ms. Neither case establishes replay. No duplicate event appears in this dataset.

## Revocation observation

`change-101` revokes Alex's reports role at `09:07:00Z`. Nodes A and B deny later reads in `evt-017` and `evt-018`. `evt-021` confirms an allowed catalog read in this synthetic story. These records illustrate expected outcomes. They do not measure a real system's propagation bound, restart behavior, or revocation coverage.
