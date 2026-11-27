"""Phase 1 & Phase 2 application dispatch for keyctl."""
import hashlib

from keyctl_core.audit import append_audit_record, find_audit_decision, verify_audit_chain
from keyctl_core.crypto import protected_read_response
from keyctl_core.keyring import initialize_keyring, retire_expired_versions, rotate_keyring
from keyctl_core.policy import evaluate_read, revoke_actor
from keyctl_core.store import StateError, load_state, save_state, state_transaction


def _require_str(request: dict, field: str) -> str:
    value = request.get(field)
    if not isinstance(value, str) or not value:
        raise ValueError(f"{field} must be a non-empty string.")
    return value


def rotate_key(actor: str = "system", grace_period_seconds: int | None = None) -> dict:
    """Internal atomic key-rotation interface with hash-chained audit logging."""
    if not isinstance(actor, str) or not actor:
        raise ValueError("actor must be a non-empty string.")
    with state_transaction():
        state = load_state()
        ok, bad_idx = verify_audit_chain(state["audit_chain"])
        if not ok:
            raise StateError(f"Audit chain integrity check failed at index {bad_idx}.")
        keyring = state.setdefault("keyring", initialize_keyring())
        append_audit_record(
            state,
            request_id=f"rotate-init-{len(state['audit_chain'])}",
            actor=actor,
            action="rotate_init",
            asset=None,
            decision="allow",
            rule=f"from_{keyring['active_version']}",
        )
        prev_ver, new_ver, retired = rotate_keyring(keyring, grace_period_seconds=grace_period_seconds)
        for ver in retired:
            append_audit_record(
                state,
                request_id=f"key-retire-{ver}-{len(state['audit_chain'])}",
                actor=actor,
                action="key_retire",
                asset=None,
                decision="allow",
                rule=f"retired_{ver}",
            )
        append_audit_record(
            state,
            request_id=f"rotate-done-{new_ver}-{len(state['audit_chain'])}",
            actor=actor,
            action="key_activate",
            asset=None,
            decision="allow",
            rule=f"activated_{new_ver}_from_{prev_ver}",
        )
        save_state(state)
        return {"previous_version": prev_ver, "active_version": new_ver, "retired": retired}


def dispatch(request: dict) -> dict:
    """Dispatch a single Track 4 adapter request."""
    if not isinstance(request, dict):
        raise ValueError("Request must be a JSON object.")

    op = request.get("op")
    if op == "setup":
        owners = request.get("owners")
        contents = request.get("contents")
        disabled = request.get("disabled", [])
        if not isinstance(owners, dict) or not isinstance(contents, dict) or not isinstance(disabled, list):
            raise ValueError("Invalid setup payload.")
        # Never persist or log raw key_material; store only a non-secret digest.
        key_material = request.get("key_material", "")
        key_digest = hashlib.sha256(str(key_material).encode("utf-8")).hexdigest() if key_material else ""
        state = {
            "owners": dict(owners),
            "contents": dict(contents),
            "disabled": list(disabled),
            "events": {},
            "audit_chain": [],
            "key_digest": key_digest,
            "keyring": initialize_keyring(),
        }
        with state_transaction():
            save_state(state)
        return {"ready": True}

    if op in ("read", "revoke", "audit", "protected_read"):
        with state_transaction():
            state = load_state()
            ok, bad_idx = verify_audit_chain(state["audit_chain"])
            if not ok:
                raise StateError(f"Audit chain integrity check failed at index {bad_idx}.")

            if "keyring" in state:
                retire_expired_versions(state["keyring"])

            if op == "revoke":
                actor = _require_str(request, "actor")
                revoke_actor(state, actor)
                append_audit_record(
                    state,
                    request_id=f"revoke-{len(state['audit_chain'])}",
                    actor=actor,
                    action="revoke",
                    asset=None,
                    decision="allow",
                    rule="actor_revoked",
                )
                save_state(state)
                return {}

            if op == "audit":
                request_id = _require_str(request, "request_id")
                derived = find_audit_decision(state["audit_chain"], request_id)
                if derived is None:
                    return {"request_id": request_id, "decision": "deny", "error": "unknown_request"}
                return derived

            if op == "protected_read":
                actor = _require_str(request, "actor")
                asset = _require_str(request, "asset")
                challenge = _require_str(request, "challenge")
                public_key = _require_str(request, "public_key")
                decision, rule = evaluate_read(state, actor, asset)
                append_audit_record(
                    state,
                    request_id=f"protected-{len(state['audit_chain'])}",
                    actor=actor,
                    action="protected_read",
                    asset=asset,
                    decision=decision,
                    rule=rule,
                )
                if decision != "allow":
                    save_state(state)
                    return {"decision": "deny"}
                response = protected_read_response(public_key, challenge, state["contents"][asset])
                save_state(state)
                return response

            # op == "read"
            actor = _require_str(request, "actor")
            asset = _require_str(request, "asset")
            request_id = _require_str(request, "request_id")
            decision, rule = evaluate_read(state, actor, asset)
            append_audit_record(
                state,
                request_id=request_id,
                actor=actor,
                action="read",
                asset=asset,
                decision=decision,
                rule=rule,
            )
            save_state(state)
            if decision == "allow":
                return {"decision": "allow", "body": state["contents"][asset]}
            return {"decision": "deny"}

    return {"error": "unsupported_operation"}
