# KeyCTL Architecture

- **Adapter & CLI**: `track4_service.py` -> `team_app.py` (stdin/stdout JSON per process, `TRACK4_STATE_DIR` persistence).
- **Security Core (`keyctl_core/`)**:
  - `store.py`: `fcntl.flock` cross-process locking + `fsync` + `os.replace()` + directory `fsync`.
  - `policy.py`: Deny-by-default `evaluate_read()` and `revoke_actor()`.
  - `audit.py`: Unkeyed SHA-256 hash-chained `audit_chain` + `verify_audit_chain()` + `find_audit_decision()`.
  - `crypto.py` & `keyring.py`: ML-KEM-768 encapsulation + HMAC-SHA-256 proof, versioned key lifecycle (`active`, `grace`, `retired`).
  - `backup.py`: SHA-256 + HMAC-SHA-256 backup/restore with anti-rollback revocation checks.
  - `cluster.py`: `[SIMULATED]` in-process `NodeCluster` revocation propagation.
  - `messaging.py`: `[SIMULATED]` `OrderedChannel`, replay/recipient binding, and `SessionTicketManager`.
  - `detector.py` & `benchmark.py`: Deterministic rule-based event detection with `approvals.json` context and clock-offset correction.
- **Local Observability UI (`ui/`)**:
  - `ui/server.py`: `127.0.0.1:8765` stdlib HTTP/JSON server invoking `track4_service.py` via subprocess argument arrays and `keyctl_core/` modules.
  - `ui/src/`: React 19 + TypeScript + Vite 6 + Tailwind 4 dashboard polling `/api/overview` every 2.5s.
