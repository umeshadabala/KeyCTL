# keyctl — 5-Minute Fallback Demo Script

## Setup
- Ensure Python 3.12+ is available (with `pqcrypto==0.4.0` for `protected_read`).
- Open a terminal in the repository root.

## Timeline

### 0:00–1:00 | Problem & Architecture Overview
- Explain the lost-device scenario, zero-trust `track4_service.py` -> `team_app.py` adapter, `fcntl.flock` + `os.replace` atomic persistence, and hash-chained `audit_chain`.

### 1:00–2:15 | Live Lost-Device Validator (`validate.py`)
- Run:
  ```sh
  python3 validate.py --entry track4_service.py
  ```
- **Expected output**: All checks `PASS` (`Local scenario passed.`, exit code `0`).
- **Proves**: `setup`, owner `read`, peer `read`, `revoke`, post-revocation `deny`, `audit` correlation, cross-process persistence, and no `key_material` leakage.

### 2:15–3:30 | Full Unit Test Suite (`unittest`)
- Run:
  ```sh
  python3 -m unittest discover -s tests -v
  ```
- **Expected output**: `Ran 25 tests ... OK` (with `test_protected_read_real_ml_kem_768` passing when `pqcrypto==0.4.0` is installed, or skipped otherwise).
- **Proves**: Crash recovery, audit tampering detection, key rotation grace/cutoff, backup tamper/anti-rollback, simulated multi-node revocation (`NodeCluster`), secure messaging, and ML-KEM-768 `protected_read`.
- **Note**: Explicitly state that `NodeCluster` and `OrderedChannel` are in-process simulations.

### 3:30–4:30 | Security Event Detection (`detector.py`)
- Run:
  ```sh
  python3 -c "from pathlib import Path; import json; from keyctl_core.detector import evaluate_against_labels; print(json.dumps(evaluate_against_labels(Path('practice/events.csv'), Path('practice/approvals.json'), Path('practice/labels.csv')), indent=2))"
  ```
- **Expected output**: `precision: 1.0`, `recall: 1.0`, `f1: 1.0`, `false_alerts_per_1000_benign: 0.0`, with 3 explainable alerts (`evt-008`, `evt-009`, `evt-010..012`).

### 4:30–5:00 | Threat Model & Limitations
- Show `threat-model.json` and summarize honest limitations (unencrypted JSON state at rest, unkeyed SHA-256 audit chain, in-process `NodeCluster` simulation, 22-event synthetic dataset).
