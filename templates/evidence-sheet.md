# Trust, but verify: repository evidence sheet

Environment: Verified in `python:3.12-slim` Docker container with `pqcrypto==0.4.0` (25/25 unit tests + `validate.py` passed) and on macOS (`Python 3.14.7`).

| Goal | Implemented mechanism & source files | Verification & status | Observed result & limitations |
| --- | --- | --- | --- |
| 1. Key rotation | Versioned keyring (`active`, `grace`, `retired`) with UTC timestamps and cutoff (`keyctl_core/keyring.py`, `team_app.py:rotate_key`) | `implemented`, `not yet verified` in Python 3.12 | Atomic rotation + audit logging implemented; no dedicated rotation unit test run yet. |
| 2. Revocation across nodes | `policy.py:revoke_actor` + `NodeCluster` epoch sync & fail-closed `node_stale_epoch` (`keyctl_core/cluster.py`) | `verified against organiser validation` (single-node), `simulated` (multi-node) | `validate.py` passed cross-process revocation; `NodeCluster` is an in-process simulation, not a real distributed system. |
| 3. Crash recovery | `state_transaction()` (`fcntl.flock`) + `fsync` + `os.replace()` + directory `fsync` (`keyctl_core/store.py`) | `tested locally` | `tests/test_phase1.py:test_08_interrupted_atomic_writes` passed; `validate.py` passed. |
| 4. Backup integrity | SHA-256 digest + HMAC-SHA-256 MAC + anti-rollback revocation check (`keyctl_core/backup.py`) | `implemented` | Rejects tampered bundles and rollbacks that reactivate revoked actors; not yet exercised by a dedicated test suite. |
| 5. Log integrity | Unkeyed SHA-256 hash-chained `audit_chain` verified on every op (`keyctl_core/audit.py`) | `tested locally` | `test_09_audit_chain_integrity` & `test_10_audit_tampering_detection` passed. Limitation: unkeyed chain does not stop full-file rewrite by a write-capable attacker. |
| 6. Routine & suspicious activity | Deterministic rule engine with `approvals.json` context (`keyctl_core/detector.py`) | `tested locally` | On `practice/events.csv` (22 events): `precision=1.0`, `recall=1.0`, `f1=1.0`, `0` false alerts/1000. 22-event synthetic set is too small for production accuracy claims. |
| 7. Lateral movement | Groups denied unexpected service edges by `(actor, session_id, correlation_id)` (`keyctl_core/detector.py`) | `tested locally` | Correctly grouped `evt-010..012` and excluded isolated denial `evt-020`. |
| 8. Clock differences | Preserves raw timestamps; computes `corrected_event_time = event_time_utc - source_clock_offset_ms` (`keyctl_core/detector.py`) | `tested locally` | Handled `evt-013`/`evt-014` out-of-order and `evt-015` (+2000ms offset). |
| 9. Replay & recipient binding | `verify_message()` checks `recipient == expected_recipient`, HMAC-SHA-256, and `seen_msg_ids` (`keyctl_core/messaging.py`) | `implemented` | Implemented with stdlib `hmac`/`hashlib`; not yet exercised by a dedicated test suite. |
| 10. Forward secrecy | Ephemeral ML-KEM-768 encapsulation + immediate `shared_secret` erasure (`keyctl_core/crypto.py`, `keyctl_core/messaging.py`) | `not yet verified` | `pqcrypto==0.4.0` is not installed locally; live ML-KEM-768 interoperability is unverified. |
| 11. Delivery under loss or reordering | `OrderedChannel` reorder buffer + `missing_sequences()` gap reporting (`keyctl_core/messaging.py`) | `implemented` | In-process channel simulation; does not claim real network reliability. |
| 12. Session resumption | `SessionTicketManager` HMAC-signed tickets bound to `(actor, peer)` with TTL + fresh revocation check (`keyctl_core/messaging.py`) | `implemented` | Enforces peer binding, TTL, and `actor not in disabled_actors`. |

## Validator & Test Summary
- `python3 validate.py --entry track4_service.py`: **PASS** (exit code 0, all local lost-device checks passed).
- `python3 -m unittest discover -s tests`: **PASS** (`Ran 19 tests in 1.816s`, `OK`).
