"""core/auth.py — Argon2id password hashing, token generation, and password validation."""
from __future__ import annotations

import hashlib
import re
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# Production Argon2id parameters (m=65536 KiB, t=3, p=4)
_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Verify a password against an Argon2id hash with timing attack resistance."""
    try:
        return _HASHER.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    """Check if the hash needs upgrading to newer parameters."""
    try:
        return _HASHER.check_needs_rehash(password_hash)
    except Exception:
        return True


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password against security policy:

    - Minimum 8 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one digit (0-9)
    - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]", password):
        return False, "Password must contain at least one special character."
    return True, ""


def validate_username(username: str) -> tuple[bool, str]:
    """Validate username format:

    - 3 to 30 characters
    - Alphanumeric, underscores, hyphens only
    - Must start with a letter or digit
    """
    if not username:
        return False, "Username is required."
    clean = username.strip()
    if len(clean) < 3 or len(clean) > 30:
        return False, "Username must be between 3 and 30 characters."
    if not re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$", clean):
        return False, "Username can only contain letters, numbers, hyphens, and underscores."
    return True, ""


def validate_email(email: str) -> tuple[bool, str]:
    """Validate email format."""
    if not email:
        return False, "Email address is required."
    clean = email.strip()
    if len(clean) > 255:
        return False, "Email address is too long."
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_regex, clean):
        return False, "Please enter a valid email address."
    return True, ""


def generate_secure_token(nbytes: int = 32) -> tuple[str, str]:
    """Generate a cryptographically secure random token and its SHA-256 hash.

    Returns:
        (raw_token, token_hash)
    """
    raw = secrets.token_urlsafe(nbytes)
    h = hash_token(raw)
    return raw, h


def hash_token(raw_token: str) -> str:
    """Return the SHA-256 hexadecimal digest of a token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
