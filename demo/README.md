# Local practice mock

Python 3.10+ and Node.js 18+ are sufficient for these mocks.

To practice manually, copy `starters/python/track4_service.py` and
`demo/python/team_app.py` into an empty practice folder, then run
`python track4_service.py` there with one JSON object on stdin.
For Node, use `starters/node/track4_service.cjs`, `demo/node/team_app.cjs`,
and `node track4_service.cjs`. Each invocation returns one JSON object on stdout.
Each request starts a new process. The mock persists state in `TRACK4_STATE_DIR`
when set, or in the operating system's temporary directory otherwise. This directory must exist.

The demos support `setup`, `read`, `revoke`, and `audit` for local interface practice.
They return `unsupported_operation` for `protected_read`. They do not implement
post-quantum cryptography, key lifecycle security, secure messaging, or log detection.
State is plaintext. There is no concurrent-write protection or tamper-evident audit log.
Actor values are trusted local inputs, not authenticated identities.
Setup resets practice state. Use synthetic data only.

These mocks are not secure products or complete submissions. Connect each starter's
`team_app` dispatch function to your own implementation. Keep application logs off
stdout, avoid logging secrets, and persist required state between invocations.
The adapters perform JSON transport only; they do not supply application behavior.
