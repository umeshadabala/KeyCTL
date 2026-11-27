"""Simulated multi-node revocation propagation for keyctl.

Note: This module simulates multi-node policy synchronization in-process for
local demonstration and measurement. It does not implement a real network
transport or distributed consensus protocol.
"""
from datetime import datetime, timezone

from keyctl_core.policy import evaluate_read


class NodeCluster:
    """Tracks simulated nodes, policy epochs, and revocation propagation."""

    def __init__(self, node_ids: list[str]):
        if not node_ids:
            raise ValueError("node_ids must be non-empty.")
        self.policy_epoch = 0
        self.nodes = {
            nid: {
                "node_id": nid,
                "policy_epoch": 0,
                "disabled": set(),
                "available": True,
                "last_sync_utc": None,
            }
            for nid in node_ids
        }
        self.pending_nodes: set[str] = set()
        self.last_revocation: dict | None = None

    def set_node_available(self, node_id: str, available: bool) -> None:
        if node_id not in self.nodes:
            raise KeyError(f"Unknown node: {node_id}")
        self.nodes[node_id]["available"] = bool(available)

    def propagate_revocation(self, actor: str, disabled_list: list[str], now_utc: datetime | None = None) -> dict:
        """Advance policy_epoch and propagate revocation to all available nodes."""
        now = now_utc or datetime.now(timezone.utc)
        self.policy_epoch += 1
        enforced_nodes: list[str] = []
        self.pending_nodes.clear()

        for nid, node in self.nodes.items():
            if node["available"]:
                node["policy_epoch"] = self.policy_epoch
                node["disabled"] = set(disabled_list)
                node["last_sync_utc"] = now.isoformat()
                enforced_nodes.append(nid)
            else:
                self.pending_nodes.add(nid)

        last_enforced = now.isoformat() if not self.pending_nodes else None
        self.last_revocation = {
            "actor": actor,
            "policy_epoch": self.policy_epoch,
            "started_at_utc": now.isoformat(),
            "last_enforced_at_utc": last_enforced,
            "propagation_delay_ms": 0.0 if not self.pending_nodes else None,
            "enforced_nodes": enforced_nodes,
            "pending_nodes": sorted(self.pending_nodes),
        }
        return dict(self.last_revocation)

    def retry_pending(self, disabled_list: list[str], now_utc: datetime | None = None) -> dict:
        """Retry propagation to previously unavailable nodes."""
        now = now_utc or datetime.now(timezone.utc)
        for nid in list(self.pending_nodes):
            node = self.nodes[nid]
            if node["available"]:
                node["policy_epoch"] = self.policy_epoch
                node["disabled"] = set(disabled_list)
                node["last_sync_utc"] = now.isoformat()
                self.pending_nodes.remove(nid)
                if self.last_revocation is not None:
                    self.last_revocation["enforced_nodes"].append(nid)

        if self.last_revocation is not None:
            self.last_revocation["pending_nodes"] = sorted(self.pending_nodes)
            if not self.pending_nodes and self.last_revocation["last_enforced_at_utc"] is None:
                started = datetime.fromisoformat(self.last_revocation["started_at_utc"])
                self.last_revocation["last_enforced_at_utc"] = now.isoformat()
                self.last_revocation["propagation_delay_ms"] = (now - started).total_seconds() * 1000.0
            return dict(self.last_revocation)
        return {"pending_nodes": sorted(self.pending_nodes)}

    def check_node_access(self, node_id: str, actor: str, asset: str, state: dict) -> tuple[str, str]:
        """Fail closed if node is stale; otherwise evaluate zero-trust read policy."""
        node = self.nodes[node_id]
        if node["policy_epoch"] < self.policy_epoch:
            return "deny", "node_stale_epoch"
        if actor in node["disabled"]:
            return "deny", "identity_disabled"
        return evaluate_read(state, actor, asset)
