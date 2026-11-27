"""Post-quantum ML-KEM-768 and HMAC-SHA-256 primitives for keyctl."""
import base64
import binascii
import hashlib
import hmac

ML_KEM_768_PUBLIC_KEY_SIZE = 1184


class CryptoError(Exception):
    """Raised when cryptographic input validation or execution fails."""


def _load_ml_kem_768():
    """Lazy import of pqcrypto ML-KEM-768 so non-crypto ops work without it."""
    try:
        from pqcrypto.kem import ml_kem_768
    except ImportError as exc:
        raise CryptoError("pqcrypto ML-KEM-768 is not available in this runtime.") from exc
    return ml_kem_768


def decode_ml_kem_public_key(public_key_b64: object) -> bytes:
    """Decode and validate a standard Base64-encoded raw ML-KEM-768 public key."""
    if not isinstance(public_key_b64, str) or not public_key_b64:
        raise CryptoError("public_key must be a non-empty Base64 string.")
    try:
        raw = base64.b64decode(public_key_b64.encode("ascii"), validate=True)
    except (ValueError, binascii.Error, UnicodeEncodeError) as exc:
        raise CryptoError("public_key is not valid standard Base64.") from exc
    if len(raw) != ML_KEM_768_PUBLIC_KEY_SIZE:
        raise CryptoError(
            f"ML-KEM-768 public key must be {ML_KEM_768_PUBLIC_KEY_SIZE} bytes, got {len(raw)}."
        )
    return raw


def encapsulate_ml_kem_768(public_key_bytes: bytes) -> tuple[bytes, bytes]:
    """Encapsulate a fresh shared secret against a raw ML-KEM-768 public key."""
    ml_kem_768 = _load_ml_kem_768()
    ciphertext, shared_secret = ml_kem_768.encrypt(public_key_bytes)
    return bytes(ciphertext), bytes(shared_secret)


def compute_protected_read_proof(shared_secret: bytes, challenge: str, stored_body: str) -> str:
    """Compute lowercase hex HMAC-SHA-256 over UTF-8(challenge + stored_body)."""
    if not isinstance(challenge, str) or not challenge:
        raise CryptoError("challenge must be a non-empty string.")
    if not isinstance(stored_body, str):
        raise CryptoError("stored_body must be a string.")
    message = (challenge + stored_body).encode("utf-8")
    return hmac.new(shared_secret, message, hashlib.sha256).hexdigest()


def protected_read_response(public_key_b64: object, challenge: object, stored_body: str) -> dict:
    """Execute ML-KEM-768 encapsulation and HMAC-SHA-256 proof generation."""
    public_key_bytes = decode_ml_kem_public_key(public_key_b64)
    if not isinstance(challenge, str) or not challenge:
        raise CryptoError("challenge must be a non-empty string.")
    ciphertext, shared_secret = encapsulate_ml_kem_768(public_key_bytes)
    try:
        proof = compute_protected_read_proof(shared_secret, challenge, stored_body)
    finally:
        # Clear reference to ephemeral shared secret immediately after proof generation.
        shared_secret = b""
    return {
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
        "proof": proof,
    }
