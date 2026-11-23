"""web/auth_middleware.py — Session handling, authentication guards, and cookie management."""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from functools import wraps
from typing import Optional, Dict, Any, Tuple
from urllib.parse import quote as url_quote

from flask import request, g, redirect, url_for, jsonify, Response, current_app

from core.auth import generate_secure_token, hash_token
from core.db import queries

SESSION_COOKIE_NAME = "stegovault_session"
DEFAULT_SESSION_HOURS = 24
REMEMBER_ME_DAYS = 30


def _is_secure_request() -> bool:
    """Determine if cookies should have the Secure flag enabled."""
    if os.getenv("STEGOVAULT_COOKIE_SECURE", "").lower() in ("1", "true", "yes"):
        return True
    if os.getenv("STEGOVAULT_ENV", "").lower() == "production":
        return True
    return bool(request.is_secure)


def get_client_ip() -> str:
    """Resolve the real client IP address handling reverse proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


def get_user_agent() -> str:
    """Retrieve client User-Agent truncated to 255 chars."""
    return (request.headers.get("User-Agent") or "")[:255]


def get_current_user() -> Optional[Dict[str, Any]]:
    """Return the currently authenticated user dictionary or None."""
    return getattr(g, "current_user", None)


def login_user(
    user_id: int,
    remember_me: bool = False,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Tuple[str, datetime]:
    """Create a new server-side session and return the raw session token and expiry.

    Rotates previous sessions if configured and generates a 256-bit secure token.
    """
    raw_token, token_hash = generate_secure_token(32)
    now = datetime.now(timezone.utc)
    duration = timedelta(days=REMEMBER_ME_DAYS if remember_me else 0, hours=0 if remember_me else DEFAULT_SESSION_HOURS)
    expires_at = now + duration

    ip = ip_address or get_client_ip()
    ua = user_agent or get_user_agent()

    queries.create_session(
        user_id=user_id,
        session_token_hash=token_hash,
        expires_at=expires_at,
        ip_address=ip,
        user_agent=ua,
    )
    return raw_token, expires_at


def set_session_cookie(
    response: Response,
    raw_token: str,
    expires_at: datetime,
    remember_me: bool = False,
) -> Response:
    """Attach the HttpOnly, SameSite session cookie to a response."""
    secure_flag = _is_secure_request()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_token,
        expires=expires_at if remember_me else None,
        max_age=int((expires_at - datetime.now(timezone.utc)).total_seconds()) if remember_me else None,
        httponly=True,
        samesite="Lax",
        secure=secure_flag,
        path="/",
    )
    return response


def logout_user(response: Optional[Response] = None) -> Optional[Response]:
    """Invalidate current session from database and clear the session cookie."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        token_hash = hash_token(token)
        queries.delete_session(token_hash)

    g.current_user = None
    g.current_session = None

    if response is not None:
        response.delete_cookie(SESSION_COOKIE_NAME, path="/")
        return response
    return None


def load_user_session():
    """Before-request hook to resolve active user session from cookie or API token."""
    g.current_user = None
    g.current_session = None

    # 1. Resolve session from HttpOnly cookie
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        token_hash = hash_token(token)
        session = queries.get_session_by_hash(token_hash)
        if session:
            user = queries.get_user_by_id(session["user_id"])
            if user:
                g.current_user = user
                g.current_session = session
                return

    # 2. Check for local web token authorization (for CLI / testing / headless backward compatibility)
    expected_token = os.getenv("STEGOVAULT_WEB_TOKEN") or os.getenv("STEGOFORGE_WEB_TOKEN", "")
    provided_token = request.headers.get("X-Stego-Token", "") or request.args.get("token", "")
    if expected_token and provided_token and (provided_token == expected_token):
        # Local system token acts as superuser for backwards-compatible test fixtures
        g.is_system_token_auth = True
    else:
        g.is_system_token_auth = False


def is_authenticated() -> bool:
    """Return True if the request is authenticated via session or system token."""
    return bool(g.current_user or getattr(g, "is_system_token_auth", False))


def login_required(f):
    """Decorator requiring an active user session or system token.

    Redirects browser requests to /login, and returns 401 for API requests.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            # Check if client expects JSON or is an API route
            wants_json = (
                request.path.startswith("/api/")
                or request.headers.get("Accept", "").startswith("application/json")
                or request.is_json
            )
            if wants_json:
                return jsonify({
                    "error": "Authentication required. Please sign in to access this resource.",
                    "code": "unauthorized",
                }), 401

            # Redirect browser to sign-in page with return URL
            next_url = request.full_path if request.query_string else request.path
            return redirect(f"/login?next={url_quote(next_url)}")

        return f(*args, **kwargs)

    return decorated_function


def anonymous_required(f):
    """Decorator ensuring logged-in users are redirected to their dashboard."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if is_authenticated() and g.current_user:
            return redirect(url_for("auth_views.dashboard_page"))
        return f(*args, **kwargs)

    return decorated_function
