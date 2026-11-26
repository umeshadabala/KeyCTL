# Adapter contract v1

This contract covers the protected-resource interface used by the Track 4 worker. The twelve security goals also include capabilities outside this interface. Use the evidence sheet to identify the behavior your team has demonstrated.

## Process and state

Put exactly one entry point at the **root of the submission repository**: `track4_service.py`, `track4_service.cjs`, `track4_service.js` or `track4_service.mjs`. Keep your application code alongside it. The adapter translates requests and calls your application. The team owns the decisions, data handling and cryptography.

The worker starts a new process for **each request** from the submission directory. Read one UTF-8 JSON object from standard input through end-of-file. Write one JSON object to standard output, then exit. Send diagnostics to standard error. Keep keys, shared secrets and protected contents out of diagnostics. Treat identifiers as opaque strings.

The judging runtime is an offline Linux container with Python 3.12, `pqcrypto==0.4.0` and Node.js 24.11.1. Its root filesystem is read-only. Use a writable temporary path for state that must survive between calls in the same container. Persist the application state before acknowledging a change. A fresh container starts empty. The local checker sets `TRACK4_STATE_DIR` for practice. In the judging container, fall back to the operating system's temp directory. The worker does not install dependencies from a submission during a run.

## Operations

| Operation | Request fields besides `op` | Response and effect |
| --- | --- | --- |
| `setup` | `owners` maps asset ID to actor ID. `contents` maps asset ID to string body. `disabled` lists actor IDs. `key_material` is a synthetic sensitive value. | Initialize from the supplied data. Return `{"ready":true}` after setup succeeds. Keep the sensitive value out of stdout and stderr. |
| `read` | `actor`, `asset`, `request_id` | For an authorized owner, return `{"decision":"allow","body":"<exact stored body>"}`. For denied access, return `{"decision":"deny"}` and disclose no protected content. Record the decision against the supplied request ID. |
| `revoke` | `actor` | Revoke the actor's access and persist the change. Return a JSON object, for example `{}`. Other actors retain their permissions. |
| `audit` | `request_id` | Return the recorded `request_id` and `decision` for that read. |
| `protected_read` | `actor`, `asset`, `challenge`, `public_key` | For an authorized request, return `ciphertext` and `proof` as specified below. Enforce your application's access policy. |

### A round trip

A setup request can contain:

```json
{"op":"setup","owners":{"brief":"maya"},"contents":{"brief":"demo note"},"disabled":[],"key_material":"synthetic-only"}
```

After setup, this read and response use the synthetic record:

```json
{"op":"read","actor":"maya","asset":"brief","request_id":"r01"}
```

```json
{"decision":"allow","body":"demo note"}
```

After `{"op":"revoke","actor":"maya"}`, a new read with request ID `r02` must return `{"decision":"deny"}`. An audit request for `r02` must return `{"request_id":"r02","decision":"deny"}`. The decision label alone cannot establish that access was denied if the reply also discloses the file.

### Protected read interoperability

The request carries a standard Base64-encoded **raw ML-KEM-768 public key** and a fresh challenge string. After authorization, encapsulate with that public key using a vetted implementation. Return the KEM ciphertext as standard Base64 in `ciphertext`. Return a lowercase hexadecimal HMAC-SHA-256 in `proof`, keyed by the shared secret, over the UTF-8 bytes of `challenge + stored_body`, in that order, without a separator. Keep the shared secret inside the application.

This exchange demonstrates interoperability for an authorized resource read. End-to-end messaging, replay protection and forward secrecy each require separate evidence. The bundled access-control demo covers the four basic operations only. The public lost-device check does not validate the KEM exchange.

### Project documentation

Describe the actual protected asset, trust boundary and known limits in the brief. For a matching implementation, the worker recognizes these two fields in a root-level `threat-model.json`:

```json
{"asset":"protected-resource","boundary":"identity-check"}
```

Use them only when they accurately describe the design. The practice event dataset is a separate exercise. Its file format does not add an operation to the judging adapter.
