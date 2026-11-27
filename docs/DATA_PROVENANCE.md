# Data Provenance

- **LIVE BACKEND DATA**: `owners`, `disabled`, `keyring`, `audit_chain`, and `read`/`revoke`/`audit`/`protected_read` results originate from `keyctl-state.json` via `track4_service.py` and `keyctl_core/store.py`.
- **PRACTICE DATASET**: `practice/events.csv` (22 events), `practice/approvals.json`, and `practice/labels.csv` are organizer-provided synthetic datasets used by `keyctl_core/detector.py`.
- **SYNTHETIC BENCHMARK**: `keyctl_core/benchmark.py` (`seed=1337`, 500 events) is a deterministic synthetic generator.
- **SIMULATED**: `keyctl_core/cluster.py` (`NodeCluster`) and `keyctl_core/messaging.py` (`OrderedChannel`) are in-process simulations, explicitly labeled `SIMULATED — IN-PROCESS` in the UI.
