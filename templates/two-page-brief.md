# keyctl: Zero-Trust Post-Quantum Access Control & Auditable Telemetry

**One-line value proposition:** A dependency-light, crash-safe access-control and audit service combining ML-KEM-768 `protected_read` interoperability, atomic persistence, and deterministic security-event detection.

## 1. Problem & Proposed Solution
Lost or compromised devices require immediate revocation that persists across restarts, resists concurrent-write race conditions, and leaves tamper-evident audit trails. `keyctl` implements the Track 4 stdin/stdout JSON adapter (`track4_service.py` -> `team_app.py`) backed by modular stdlib + `pqcrypto` components (`keyctl_core/`), enforcing deny-by-default authorization before any resource disclosure or cryptographic encapsulation.

## 2. System Architecture & Key Lifecycle
- **Adapter & Persistence (`track4_service.py`, `keyctl_core/store.py`)**: One JSON request per process. Read-modify-write transactions are serialized with `fcntl.flock` (`state_transaction()`) and committed via `os.fsync()` + `os.replace()` + directory `fsync` in `TRACK4_STATE_DIR`.
- **Policy & Audit (`keyctl_core/policy.py`, `keyctl_core/audit.py`)**: Deny-by-default `evaluate_read()` checks `disabled` and `owners`. Every `read`, `revoke`, and `protected_read` appends to a SHA-256 hash-chained `audit_chain`; `audit` responses are derived directly from the verified chain.
- **Key Rotation (`keyctl_core/keyring.py`)**: Versioned key ring (`active`, `grace`, `retired`) with UTC activation/cutoff timestamps (`rotate_key()`).
- **Backup & Multi-Node Simulation (`keyctl_core/backup.py`, `keyctl_core/cluster.py`)**: SHA-256 + HMAC-SHA-256 backup bundles with anti-rollback checks that reject restoring older states if revoked identities would be reactivated. `NodeCluster` simulates multi-node epoch propagation and fail-closed stale-epoch denial.

## 3. Cryptography & Secure Messaging
- **`protected_read` (`keyctl_core/crypto.py`)**: Validates Base64 and 1184-byte ML-KEM-768 public keys, encapsulates via `pqcrypto.kem.ml_kem_768.encrypt()`, computes lowercase hex `HMAC-SHA-256(shared_secret, utf8(challenge + stored_body))`, and clears `shared_secret` immediately.
- **Messaging (`keyctl_core/messaging.py`)**: Provides HMAC-SHA-256 recipient binding, `seen_msg_ids` replay rejection, `OrderedChannel` out-of-order buffering/gap detection, and `SessionTicketManager` peer-bound resumption with fresh revocation checks.

## 4. Monitoring, Evaluation & Threat Model
- **Detection (`keyctl_core/detector.py`)**: Deterministic rules correlate `events.csv` with `approvals.json` and correct `source_clock_offset_ms`. On the 22-event `practice/` dataset: **Precision 1.0, Recall 1.0, F1 1.0, 0 false alerts/1,000 benign events**.
- **Validator & Tests**: `validate.py --entry track4_service.py` passed (exit 0); `unittest` passed (19/19 tests).
- **Threat Model (`threat-model.json`)**: Protects `protected-resource` at the `identity-check` boundary.

## 5. Limitations & Future Work
- `pqcrypto==0.4.0` on Python 3.12 is not yet verified locally (local environment is Python 3.14.7 without `pqcrypto`).
- `NodeCluster` is an in-process simulation, not a real distributed consensus system.
- The 22-event synthetic dataset does not establish production detection accuracy.
- State at rest is unencrypted JSON; an attacker with full write access can rewrite the unkeyed SHA-256 audit chain.
