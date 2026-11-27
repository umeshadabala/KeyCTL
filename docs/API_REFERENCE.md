# KeyCTL Local API Reference (`ui/server.py`, `127.0.0.1:8765`)

- `GET /api/health` -> `{"status": "ok", "python": "...", "pqcrypto": bool}`
- `GET /api/overview` -> Persisted `owners`, `disabled`, `keyring`, `audit_chain`, `audit_verified`, `python_version`, `pqcrypto_available`.
- `POST /api/setup` -> Invokes `track4_service.py` `setup` op.
- `POST /api/access/read` -> `{actor, asset, request_id}` -> invokes `track4_service.py` `read` op.
- `POST /api/access/revoke` -> `{actor}` -> invokes `track4_service.py` `revoke` op.
- `POST /api/access/audit` -> `{request_id}` -> invokes `track4_service.py` `audit` op.
- `POST /api/access/protected-read` -> `{actor, asset, challenge}` -> generates ephemeral ML-KEM-768 keypair, invokes `track4_service.py` `protected_read`, decapsulates, and verifies HMAC-SHA-256 proof.
- `POST /api/keys/rotate` -> `{actor, grace_period_seconds}` -> invokes `team_app.rotate_key()`.
- `POST /api/audit/verify` -> Invokes `audit.verify_audit_chain()`.
- `POST /api/backup/demo` -> Runs `backup.create_backup()` and verifies tamper rejection.
- `POST /api/simulations/revocation` -> `[SIMULATED]` `cluster.NodeCluster.propagate_revocation()`.
- `POST /api/simulations/messaging` -> `[SIMULATED]` `messaging.OrderedChannel` replay & recipient-mismatch checks.
- `POST /api/detection/run` -> Invokes `detector.evaluate_against_labels()` on `practice/`.
