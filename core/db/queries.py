"""core/db/queries.py — High-level parameterized queries for StegoVault database entities."""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from core.db.database import get_db, transaction


def _now() -> str:
    """Return current UTC time formatted for ISO 8601 SQLite storage."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _row_to_dict(row: sqlite3.Row | None) -> Optional[Dict[str, Any]]:
    """Convert an SQLite Row to a standard Python dictionary."""
    if row is None:
        return None
    return dict(row)


# ── User Queries ─────────────────────────────────────────────────────────────

def create_user(
    full_name: str,
    username: str,
    email: str,
    password_hash: str,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Insert a new user record and return the generated user ID."""
    now = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            INSERT INTO users (full_name, username, email, password_hash, email_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            (full_name.strip(), username.strip(), email.strip().lower(), password_hash, now, now),
        )
        return int(cursor.lastrowid)


def get_user_by_id(user_id: int, conn: sqlite3.Connection | None = None) -> Optional[Dict[str, Any]]:
    """Retrieve user dictionary by primary key ID."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    cursor.close()
    return _row_to_dict(row)


def get_user_by_email(email: str, conn: sqlite3.Connection | None = None) -> Optional[Dict[str, Any]]:
    """Retrieve user dictionary by email (case-insensitive)."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email.strip().lower(),))
    row = cursor.fetchone()
    cursor.close()
    return _row_to_dict(row)


def get_user_by_username(username: str, conn: sqlite3.Connection | None = None) -> Optional[Dict[str, Any]]:
    """Retrieve user dictionary by username (case-insensitive)."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? COLLATE NOCASE", (username.strip(),))
    row = cursor.fetchone()
    cursor.close()
    return _row_to_dict(row)


def get_user_by_login(identifier: str, conn: sqlite3.Connection | None = None) -> Optional[Dict[str, Any]]:
    """Retrieve user by either email or username."""
    clean = identifier.strip()
    user = get_user_by_email(clean, conn=conn)
    if not user:
        user = get_user_by_username(clean, conn=conn)
    return user


def update_user_profile(
    user_id: int,
    full_name: str,
    username: str,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Update user's display name and username."""
    now = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET full_name = ?, username = ?, updated_at = ?
            WHERE id = ?
            """,
            (full_name.strip(), username.strip(), now, user_id),
        )
        return cursor.rowcount > 0


def update_user_password(
    user_id: int,
    password_hash: str,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Update user's password hash and timestamp."""
    now = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET password_hash = ?, updated_at = ?
            WHERE id = ?
            """,
            (password_hash, now, user_id),
        )
        return cursor.rowcount > 0


def set_email_verified(
    user_id: int,
    verified: bool = True,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Update user's email verification status."""
    now = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET email_verified = ?, updated_at = ?
            WHERE id = ?
            """,
            (1 if verified else 0, now, user_id),
        )
        return cursor.rowcount > 0


def delete_user(user_id: int, conn: sqlite3.Connection | None = None) -> bool:
    """Permanently delete user and cascade associated sessions/tokens/activity."""
    with transaction(conn) as cursor:
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        return cursor.rowcount > 0


# ── Session Queries ──────────────────────────────────────────────────────────

def create_session(
    user_id: int,
    session_token_hash: str,
    expires_at: datetime,
    ip_address: str | None = None,
    user_agent: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Store a new user session with SHA-256 token hash and expiration."""
    exp_str = expires_at.strftime("%Y-%m-%d %H:%M:%S")
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            INSERT INTO sessions (user_id, session_token_hash, ip_address, user_agent, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, session_token_hash, ip_address, user_agent, exp_str, now_str),
        )
        return int(cursor.lastrowid)


def get_session_by_hash(
    session_token_hash: str,
    conn: sqlite3.Connection | None = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve session record joined with user details if not expired."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute(
        """
        SELECT s.*, u.full_name, u.username, u.email, u.email_verified
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token_hash = ? AND s.expires_at > ?
        """,
        (session_token_hash, _now()),
    )
    row = cursor.fetchone()
    cursor.close()
    return _row_to_dict(row)


def delete_session(
    session_token_hash: str,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Delete a session by its token hash (logout)."""
    with transaction(conn) as cursor:
        cursor.execute("DELETE FROM sessions WHERE session_token_hash = ?", (session_token_hash,))
        return cursor.rowcount > 0


def delete_all_user_sessions(
    user_id: int,
    except_session_hash: str | None = None,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Revoke all sessions for a user, optionally preserving the current one."""
    with transaction(conn) as cursor:
        if except_session_hash:
            cursor.execute(
                "DELETE FROM sessions WHERE user_id = ? AND session_token_hash != ?",
                (user_id, except_session_hash),
            )
        else:
            cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        return cursor.rowcount


def get_user_active_sessions(
    user_id: int,
    conn: sqlite3.Connection | None = None,
) -> List[Dict[str, Any]]:
    """Return all active, non-expired sessions for a user."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute(
        """
        SELECT id, ip_address, user_agent, expires_at, created_at, session_token_hash
        FROM sessions
        WHERE user_id = ? AND expires_at > ?
        ORDER BY created_at DESC
        """,
        (user_id, _now()),
    )
    rows = cursor.fetchall()
    cursor.close()
    return [dict(r) for r in rows]


def cleanup_expired_sessions(conn: sqlite3.Connection | None = None) -> int:
    """Delete all expired sessions from the database."""
    with transaction(conn) as cursor:
        cursor.execute("DELETE FROM sessions WHERE expires_at <= ?", (_now(),))
        return cursor.rowcount


# ── Email Verification Token Queries ─────────────────────────────────────────

def create_email_verification_token(
    user_id: int,
    token_hash: str,
    expires_at: datetime,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Create an email verification token record."""
    exp_str = expires_at.strftime("%Y-%m-%d %H:%M:%S")
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            INSERT INTO email_verification_tokens (user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, token_hash, exp_str, now_str),
        )
        return int(cursor.lastrowid)


def get_email_verification_token(
    token_hash: str,
    conn: sqlite3.Connection | None = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve an unused, valid email verification token record."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute(
        """
        SELECT * FROM email_verification_tokens
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
        """,
        (token_hash, _now()),
    )
    row = cursor.fetchone()
    cursor.close()
    return _row_to_dict(row)


def mark_email_verification_token_used(
    token_id: int,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Mark an email verification token as consumed."""
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            "UPDATE email_verification_tokens SET used_at = ? WHERE id = ?",
            (now_str, token_id),
        )
        return cursor.rowcount > 0


# ── Password Reset Token Queries ─────────────────────────────────────────────

def create_password_reset_token(
    user_id: int,
    token_hash: str,
    expires_at: datetime,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Create a single-use password reset token record."""
    exp_str = expires_at.strftime("%Y-%m-%d %H:%M:%S")
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, token_hash, exp_str, now_str),
        )
        return int(cursor.lastrowid)


def get_password_reset_token(
    token_hash: str,
    conn: sqlite3.Connection | None = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve an unused, valid password reset token."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute(
        """
        SELECT * FROM password_reset_tokens
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
        """,
        (token_hash, _now()),
    )
    row = cursor.fetchone()
    cursor.close()
    return _row_to_dict(row)


def mark_password_reset_token_used(
    token_id: int,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Mark a password reset token as consumed."""
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
            (now_str, token_id),
        )
        return cursor.rowcount > 0


def invalidate_pending_reset_tokens(
    user_id: int,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Invalidate all pending password reset tokens for a user."""
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
            (now_str, user_id),
        )
        return cursor.rowcount


# ── User Non-Sensitive Activity Queries ──────────────────────────────────────

def log_user_activity(
    user_id: int,
    operation_type: str,
    carrier_name: str | None,
    status: str,
    conn: sqlite3.Connection | None = None,
) -> int:
    """Log an operation event. NEVER logs payload data, keys, or passwords."""
    clean_carrier = carrier_name.strip() if carrier_name else None
    clean_status = "success" if status.lower() in ("success", "ok", "true") else "failed"
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            INSERT INTO user_activity (user_id, operation_type, carrier_name, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, operation_type.lower(), clean_carrier, clean_status, now_str),
        )
        return int(cursor.lastrowid)


def get_user_activity(
    user_id: int,
    limit: int = 20,
    offset: int = 0,
    conn: sqlite3.Connection | None = None,
) -> List[Dict[str, Any]]:
    """Retrieve recent non-sensitive activity log for a user."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute(
        """
        SELECT id, operation_type, carrier_name, status, created_at
        FROM user_activity
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        (user_id, max(1, limit), max(0, offset)),
    )
    rows = cursor.fetchall()
    cursor.close()
    return [dict(r) for r in rows]


def get_user_activity_stats(
    user_id: int,
    conn: sqlite3.Connection | None = None,
) -> Dict[str, int]:
    """Retrieve aggregate counts of operations performed by user."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute(
        """
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN operation_type = 'encode' THEN 1 ELSE 0 END) as encode_count,
            SUM(CASE WHEN operation_type = 'decode' THEN 1 ELSE 0 END) as decode_count,
            SUM(CASE WHEN operation_type IN ('detect', 'ctf') THEN 1 ELSE 0 END) as forensic_count,
            SUM(CASE WHEN operation_type IN ('capacity', 'diff', 'survive') THEN 1 ELSE 0 END) as inspect_count
        FROM user_activity
        WHERE user_id = ?
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    if not row:
        return {"total": 0, "encode_count": 0, "decode_count": 0, "forensic_count": 0, "inspect_count": 0}
    return {
        "total": row["total"] or 0,
        "encode_count": row["encode_count"] or 0,
        "decode_count": row["decode_count"] or 0,
        "forensic_count": row["forensic_count"] or 0,
        "inspect_count": row["inspect_count"] or 0,
    }


# ── Rate Limiting Queries ────────────────────────────────────────────────────

def record_login_attempt(
    ip_address: str,
    identifier: str,
    success: bool = False,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Record an authentication attempt for IP/identifier rate limiting."""
    now_str = _now()
    with transaction(conn) as cursor:
        cursor.execute(
            """
            INSERT INTO login_attempts (ip_address, identifier, attempt_time, success)
            VALUES (?, ?, ?, ?)
            """,
            (ip_address, identifier.strip().lower(), now_str, 1 if success else 0),
        )


def is_login_rate_limited(
    ip_address: str,
    identifier: str,
    max_attempts: int = 5,
    window_seconds: int = 300,
    conn: sqlite3.Connection | None = None,
) -> bool:
    """Check if failed login attempts exceed limit within the sliding window."""
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=window_seconds)).strftime("%Y-%m-%d %H:%M:%S")
    c = conn or get_db()
    cursor = c.cursor()
    # Check by IP or by Identifier to prevent distributed attacks on one user or single-IP attacks on many
    cursor.execute(
        """
        SELECT COUNT(*) as failed_count
        FROM login_attempts
        WHERE (ip_address = ? OR identifier = ?)
          AND success = 0
          AND attempt_time > ?
        """,
        (ip_address, identifier.strip().lower(), cutoff),
    )
    row = cursor.fetchone()
    cursor.close()
    return bool(row and row["failed_count"] >= max_attempts)


def cleanup_login_attempts(conn: sqlite3.Connection | None = None) -> int:
    """Prune login attempt records older than 24 hours."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    with transaction(conn) as cursor:
        cursor.execute("DELETE FROM login_attempts WHERE attempt_time < ?", (cutoff,))
        return cursor.rowcount
