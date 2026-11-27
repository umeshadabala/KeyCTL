# Live Demo Guide

1. Start the local-only API server:
   ```bash
   python3 ui/server.py
   ```
2. Start the React dashboard:
   ```bash
   cd ui && npm run dev
   ```
3. Open `http://127.0.0.1:5173`:
   - **Overview**: Click **Initialize Backend State** to seed synthetic identities (`maya`, `liam`) and assets (`brief`, `notes`).
   - **Access Control**: Execute `read` (`maya` -> `brief`: `allow`), then `protected_read` (ML-KEM-768).
   - **Identities**: Revoke `maya` (with confirmation), return to Access Control, and verify `maya` -> `brief` returns `deny`.
   - **Audit Center**: Click **Verify Audit Hash Chain** to confirm `Verified`.
   - **Key Management**: Click **Rotate Key (300s Grace)** to advance `v1` -> `v2`.
   - **Threat Detection**: Click **Run Detector on practice/events.csv** to view `Precision 1.0`, `Recall 1.0`, `F1 1.0`, and 3 explainable alerts.
   - **Simulation Lab**: Run `[SIMULATED]` `NodeCluster` revocation, replay/recipient-binding, and backup tamper checks.
