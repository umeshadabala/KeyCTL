# Security Limitations

1. **Plaintext State at Rest**: `keyctl-state.json` is stored as JSON without at-rest encryption.
2. **Unkeyed Audit Hash Chain**: `audit_chain` uses unkeyed SHA-256; it detects accidental corruption and partial/in-place tampering, but cannot stop an attacker with full write access from rewriting the entire chain from genesis.
3. **In-Process Simulations**: `NodeCluster` and `OrderedChannel` are in-process simulations, not real distributed consensus or network transport.
4. **Synthetic Detection Data**: `practice/events.csv` (22 events) and `benchmark.py` (500 events) are synthetic and do not establish production detection accuracy.
5. **Local `pqcrypto` Availability**: `protected_read` requires `pqcrypto==0.4.0` 