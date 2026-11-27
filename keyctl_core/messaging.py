"""Secure messaging primitives for keyctl (Phase 4).

Covers:
1. Replay protection (unique msg_id + persistent/scoped seen_msg_ids).
2. Recipient binding (HMAC-SHA-256 over sender, recipient, seq, msg_id, payload).
3. Forward secrecy (ephemeral ML-KEM-768 key establishment via crypto.py;
   completed session keys are cleared and never persisted).
4. Delivery under loss and reordering (OrderedChannel with reorder buffer).
5. Session resumption (HMAC-authenticated tickets bound to actor & peer,
   with TTL expiry and fresh revocation checks).
"""
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from keyctl_core.crypto import decode_ml_kem_public_key, encapsulate_ml_kem_768


class MessagingError(Exception):
    """Raised when message authentication, binding, replay, or resumption fails."""


def _compute_msg_mac(
    session_key: bytes,
    msg_id: str,
    sender: str,
    recipient: str,
    seq: int,
    timestamp_utc: str,
    payload: str,
) -> str:
    data = f"{msg_id}|{sender}|{recipient}|{seq}|{timestamp_utc}|{payload}".encode("utf-8")
    return hmac.new(session_key, data, hashlib.sha256).hexdigest()


def build_message(
    session_key: bytes,
    sender: str,
    recipient: str,
    seq: int,
    payload: str,
    msg_id: str | None = None,
) -> dict:
    """Create an authenticated, recipient-bound message envelope."""
    if not isinstance(session_key, (bytes, bytearray)) or not session_key:
        raise MessagingError("session_key must be non-empty bytes.")
    if not sender or not recipient:
        raise MessagingError("sender and recipient must be non-empty.")
    mid = msg_id or f"msg-{secrets.token_hex(8)}"
    ts = datetime.now(timezone.utc).isoformat()
    mac = _compute_msg_mac(bytes(session_key), mid, sender, recipient, seq, ts, payload)
    return {
        "msg_id": mid,
        "sender": sender,
        "recipient": recipient,
        "seq": seq,
        "timestamp_utc": ts,
        "payload": payload,
        "mac": mac,
    }


def verify_message(
    envelope: dict,
    session_key: bytes,
    expected_recipient: str,
    seen_msg_ids: set[str],
) -> dict:
    """Verify MAC, recipient binding, and replay protection."""
    if not isinstance(envelope, dict):
        raise MessagingError("Envelope must be a dict.")
    for field in ("msg_id", "sender", "recipient", "seq", "timestamp_utc", "payload", "mac"):
        if field not in envelope:
            raise MessagingError(f"Envelope missing {field}.")
    if envelope["recipient"] != expected_recipient:
        raise MessagingError("Recipient mismatch: message not intended for this identity.")

    expected_mac = _compute_msg_mac(
        bytes(session_key),
        str(envelope["msg_id"]),
        str(envelope["sender"]),
        str(envelope["recipient"]),
        int(envelope["seq"]),
        str(envelope["timestamp_utc"]),
        str(envelope["payload"]),
    )
    if not hmac.compare_digest(expected_mac, str(envelope["mac"])):
        raise MessagingError("Message authentication failed.")

    mid = str(envelope["msg_id"])
    if mid in seen_msg_ids:
        raise MessagingError(f"Replay detected for msg_id {mid}.")
    seen_msg_ids.add(mid)
    return envelope


def establish_ephemeral_session(peer_public_key_b64: str) -> tuple[bytes, bytes]:
    """Establish an ephemeral session key using ML-KEM-768 encapsulation."""
    pk_bytes = decode_ml_kem_public_key(peer_public_key_b64)
    ciphertext, shared_secret = encapsulate_ml_kem_768(pk_bytes)
    session_key = hmac.new(shared_secret, b"keyctl-session-v1", hashlib.sha256).digest()
    shared_secret = b""
    return ciphertext, session_key


class OrderedChannel:
    """Handles out-of-order buffering, loss detection, and replay protection."""

    def __init__(self, expected_recipient: str, session_key: bytes):
        self.expected_recipient = expected_recipient
        self.session_key = bytes(session_key)
        self.seen_msg_ids: set[str] = set()
        self.next_seq = 0
        self.buffer: dict[int, dict] = {}
        self.delivered: list[dict] = []

    def receive(self, envelope: dict) -> list[dict]:
        """Verify and buffer/deliver a message; returns newly delivered in-order messages."""
        verified = verify_message(envelope, self.session_key, self.expected_recipient, self.seen_msg_ids)
        seq = int(verified["seq"])
        if seq < self.next_seq:
            raise MessagingError(f"Stale sequence number {seq} < {self.next_seq}.")
        self.buffer[seq] = verified
        newly_delivered: list[dict] = []
        while self.next_seq in self.buffer:
            msg = self.buffer.pop(self.next_seq)
            self.delivered.append(msg)
            newly_delivered.append(msg)
            self.next_seq += 1
        return newly_delivered

    def missing_sequences(self) -> list[int]:
        """Return sequence numbers missing before the highest buffered message."""
        if not self.buffer:
            return []
        max_seq = max(self.buffer)
        return [s for s in range(self.next_seq, max_seq) if s not in self.buffer]

    def close(self) -> None:
        """Discard ephemeral session key."""
        self.session_key = b""


class SessionTicketManager:
    """Issues and verifies peer-bound session resumption tickets."""

    def __init__(self, ticket_key: bytes):
        if not isinstance(ticket_key, (bytes, bytearray)) or not ticket_key:
            raise ValueError("ticket_key must be non-empty bytes.")
        self._ticket_key = bytes(ticket_key)

    def _sign(self, session_id: str, actor: str, peer: str, issued_at: str, expires_at: str) -> str:
        payload = f"{session_id}|{actor}|{peer}|{issued_at}|{expires_at}".encode("utf-8")
        return hmac.new(self._ticket_key, payload, hashlib.sha256).hexdigest()

    def issue_ticket(self, actor: str, peer: str, ttl_seconds: int = 300, now_utc: datetime | None = None) -> dict:
        now = now_utc or datetime.now(timezone.utc)
        sid = f"sess-{secrets.token_hex(8)}"
        issued = now.isoformat()
        expires = (now + timedelta(seconds=ttl_seconds)).isoformat()
        mac = self._sign(sid, actor, peer, issued, expires)
        return {
            "session_id": sid,
            "actor": actor,
            "peer": peer,
            "issued_at": issued,
            "expires_at": expires,
            "mac": mac,
        }

    def resume_ticket(
        self,
        ticket: dict,
        actor: str,
        peer: str,
        disabled_actors: list[str],
        now_utc: datetime | None = None,
    ) -> bool:
        """Verify ticket MAC, peer binding, TTL, and fresh revocation status."""
        if not isinstance(ticket, dict):
            return False
        for field in ("session_id", "actor", "peer", "issued_at", "expires_at", "mac"):
            if field not in ticket:
                return False
        if ticket["actor"] != actor or ticket["peer"] != peer:
            return False
        if actor in disabled_actors:
            return False
        expected_mac = self._sign(
            str(ticket["session_id"]),
            str(ticket["actor"]),
            str(ticket["peer"]),
            str(ticket["issued_at"]),
            str(ticket["expires_at"]),
        )
        if not hmac.compare_digest(expected_mac, str(ticket["mac"])):
            return False
        now = now_utc or datetime.now(timezone.utc)
        return now < datetime.fromisoformat(str(ticket["expires_at"]))
