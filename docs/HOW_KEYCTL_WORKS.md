# How KeyCTL Works

1. **Identity & Access Control**: `team_app.dispatch()` acquires `state_transaction()`, loads and validates `keyctl-state.json`, verifies `audit_chain`, and evaluates `evaluate_read(state, actor, asset)` (deny-by-default).
2. **Key Lifecycle & Rotation**: `rotate_key()` transitions `active` -> `grace` (until `cutoff_at`) -> `retired`, activates `v{N+1}`, and logs `rotate_init`, `key_retire`, and `key_activate` to `audit_chain`.
3. **ML-KEM-768 `protected_read`**: Authorizes `(actor, asset)` first, validates Base64 + 1184-byte ML-KEM-768 public key, encapsulates `(ciphertext, shared_secret)` via `pqcrypto.kem.ml_kem_768.encrypt()`, computes `HMAC-SHA-256(shared_secret, utf8(challenge + stored_body))`, and clears `shared_secret` immediately.
4. **Backup Integrity**: `create_backup()` and `restore_backup()` verify SHA-256 digest + HMAC-SHA-256 MAC and reject rollbacks that would reactivate revoked identities.
5. **Audit Integrity**: `audit_chain` links each record via `prev_hash` and `entry_hash = SHA-256(canonical_json)`. `audit` responses are derived directly from the verified chain.
6. **Threat Detection**: `detector.py` subtracts `source_clock_offset_ms`, checks `approvals.json` windows, and flags unapproved role changes, post-unapproved privilege use, and candidate lateral movement (`>= 2` denied unexpected service edges).
