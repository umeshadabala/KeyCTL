"""Zero-trust, deny-by-default authorization policy for keyctl."""


def evaluate_read(state: dict, actor: object, asset: object) -> tuple[str, str]:
    """Evaluate whether actor may read asset. Returns (decision, rule)."""
    if not isinstance(actor, str) or not actor:
        return "deny", "invalid_actor"
    if not isinstance(asset, str) or not asset:
        return "deny", "invalid_asset"
    if actor in state["disabled"]:
        return "deny", "identity_disabled"
    if asset not in state["owners"] or state["owners"][asset] != actor:
        return "deny", "owner_required"
    if asset not in state["contents"]:
        return "deny", "asset_missing"
    return "allow", "owner_allowed"


def revoke_actor(state: dict, actor: object) -> None:
    """Revoke actor access idempotently."""
    if not isinstance(actor, str) or not actor:
        raise ValueError("actor must be a non-empty string.")
    if actor not in state["disabled"]:
        state["disabled"].append(actor)
