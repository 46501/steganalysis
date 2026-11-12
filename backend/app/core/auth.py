"""Authentication, Cryptography, and Session Security Utilities."""

import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
from uuid import uuid4

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

# OAuth2 scheme configured with optional auto_error so guest requests fall through gracefully
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)

# In-memory IP/Email rate limiter storage: {key: [(timestamp)]}
_login_rate_limiter: Dict[str, list] = {}
_sliding_rate_limiters: Dict[str, Dict[str, list]] = {}


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with 12 salt rounds."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Timing-safe verification of plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def generate_secure_token() -> str:
    """Generates a high-entropy URL-safe cryptographic token (256-bit)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Computes SHA-256 hash of a refresh token or password reset token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: int,
    email: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates a signed, short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodes and validates a JWT access token, checking signature and expiration."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def check_login_rate_limit(identifier: str) -> None:
    """Enforces rate limiting on login attempts to thwart brute-force password guessing."""
    now = time.time()
    window = settings.RATE_LIMIT_WINDOW_SECONDS
    max_attempts = settings.RATE_LIMIT_LOGIN_ATTEMPTS

    attempts = _login_rate_limiter.get(identifier, [])
    # Filter attempts within sliding window
    attempts = [t for t in attempts if now - t < window]
    _login_rate_limiter[identifier] = attempts

    if len(attempts) >= max_attempts:
        retry_after = int(window - (now - attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please wait {max(1, retry_after)} seconds before trying again.",
            headers={"Retry-After": str(max(1, retry_after))},
        )


def record_failed_login(identifier: str) -> None:
    """Records a failed authentication attempt."""
    now = time.time()
    attempts = _login_rate_limiter.get(identifier, [])
    attempts.append(now)
    _login_rate_limiter[identifier] = attempts


def reset_login_rate_limit(identifier: str) -> None:
    """Resets rate limiting counter upon successful authentication."""
    if identifier in _login_rate_limiter:
        del _login_rate_limiter[identifier]


def check_rate_limit(
    key: str,
    category: str,
    max_requests: int,
    window_seconds: int,
    custom_message: Optional[str] = None,
) -> None:
    """
    Enforces a sliding-window rate limit on sensitive actions (e.g. registration,
    password reset, high-cost ML compute).
    Tracks requests per category and key within the specified sliding window.
    Raises HTTPException(429) if threshold is exceeded.
    """
    now = time.time()
    if category not in _sliding_rate_limiters:
        _sliding_rate_limiters[category] = {}

    category_store = _sliding_rate_limiters[category]
    attempts = category_store.get(key, [])
    # Evict timestamps outside sliding window
    attempts = [t for t in attempts if now - t < window_seconds]

    if len(attempts) >= max_requests:
        retry_after = int(window_seconds - (now - attempts[0]))
        msg = custom_message or f"Rate limit exceeded. Please wait {max(1, retry_after)} seconds before trying again."
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg,
            headers={"Retry-After": str(max(1, retry_after))},
        )

    attempts.append(now)
    category_store[key] = attempts


def reset_rate_limit(key: str, category: str) -> None:
    """Clears rate limit state for a specific key within a category."""
    if category in _sliding_rate_limiters and key in _sliding_rate_limiters[category]:
        del _sliding_rate_limiters[category][key]


def reset_all_rate_limiters() -> None:
    """Clears all in-memory rate limiting state (useful for test resets)."""
    _login_rate_limiter.clear()
    _sliding_rate_limiters.clear()


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Returns the authenticated User if a valid Bearer token is provided.
    Returns None if no token is present or invalid (Guest Mode).
    """
    if not token:
        return None

    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = int(user_id_str)
    except Exception:
        return None

    stmt = select(User).where(User.id == user_id, User.is_active == True)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Requires a valid authenticated user session.
    Raises 401 Unauthorized if not authenticated.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated",
        )

    return user
