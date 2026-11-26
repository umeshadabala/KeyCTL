"""Local practice only: plaintext state, no cryptography or concurrency safety."""
import json
import os
import tempfile
from pathlib import Path

STATE = Path(os.environ.get("TRACK4_STATE_DIR") or tempfile.gettempdir()) / "track4-practice-state.json"


def dispatch(request):
    op = request.get("op")
    if op == "setup":
        state = {"owners": request["owners"], "contents": request["contents"],
                 "disabled": list(request.get("disabled", [])), "events": {}}
        response = {"ready": True}
    elif op in ("read", "revoke", "audit"):
        state = json.loads(STATE.read_text(encoding="utf-8"))
        if op == "revoke":
            if request["actor"] not in state["disabled"]:
                state["disabled"].append(request["actor"])
            response = {}
        elif op == "audit":
            response = state["events"].get(request["request_id"], {"error": "unknown_request"})
        else:
            actor, asset = request["actor"], request["asset"]
            if actor in state["disabled"]:
                rule = "identity_disabled"
            elif asset not in state["owners"] or state["owners"][asset] != actor:
                rule = "owner_required"
            else:
                rule = "owner_allowed"
            response = {"decision": "allow" if rule == "owner_allowed" else "deny", "rule": rule}
            if response["decision"] == "allow":
                response["body"] = state["contents"][asset]
            state["events"][request["request_id"]] = {
                "request_id": request["request_id"], "decision": response["decision"], "rule": rule}
    else:
        return {"error": "unsupported_operation"}
    STATE.write_text(json.dumps(state), encoding="utf-8")
    return response
