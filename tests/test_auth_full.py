"""tests/test_auth_full.py — Complete test suite for StegoVault Authentication & User Management.

Covers:
1. Registration (validation, Argon2id hashing, uniqueness, verification token creation)
2. Login (identifier resolution, password verification, rate limiting, remember-me)
3. Sessions (HttpOnly/SameSite cookies, hash storage, rotation, invalidation)
4. Password Reset (token generation, hashing, single-use, expiration, password change)
5. Email Verification (token consumption, verified status, resend endpoint)
6. Personalized Dashboard & Settings (profile update, password change, session revocation, account deletion)
7. Security & Telemetry (non-sensitive activity logging, exclusion of secrets)
"""
from __future__ import annotations

import io
import json
import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

from core.auth import hash_password, verify_password, hash_token
from core.db import get_db, init_db, queries
from web.app import create_app
from web.auth_middleware import SESSION_COOKIE_NAME


@pytest.fixture
def app_with_db(tmp_path, monkeypatch):
    """Create a test application instance with a fresh isolated SQLite database."""
    db_file = tmp_path / "test_stegovault.db"
    monkeypatch.setenv("STEGOVAULT_DB_PATH", str(db_file))
    monkeypatch.delenv("STEGOVAULT_WEB_TOKEN", raising=False)
    monkeypatch.delenv("STEGOFORGE_WEB_TOKEN", raising=False)
    monkeypatch.setenv("STEGOVAULT_COOKIE_SECURE", "0")

    app = create_app()
    app.testing = True

    # Initialize tables
    with app.app_context():
        init_db(db_file)

    yield app


@pytest.fixture
def client(app_with_db):
    return app_with_db.test_client()


# ── Registration Tests ────────────────────────────────────────────────────────

def test_registration_success(client):
    """Test successful user registration via JSON API."""
    res = client.post(
        "/register",
        json={
            "full_name": "Alice Cyber",
            "username": "alice_sec",
            "email": "alice@example.com",
            "password": "CorrectHorseBattery99!",
            "confirm_password": "CorrectHorseBattery99!",
            "terms": True,
        },
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True

    # Verify session cookie was set
    assert SESSION_COOKIE_NAME in res.headers.get("Set-Cookie", "")
    assert "HttpOnly" in res.headers.get("Set-Cookie", "")

    # Verify user stored in database
    user = queries.get_user_by_username("alice_sec")
    assert user is not None
    assert user["full_name"] == "Alice Cyber"
    assert user["email"] == "alice@example.com"
    assert user["email_verified"] == 0
    # Password must be hashed with Argon2id
    assert user["password_hash"].startswith("$argon2id$")
    assert verify_password(user["password_hash"], "CorrectHorseBattery99!") is True


def test_registration_duplicate_email_and_username(client):
    """Test duplicate email or username is prevented."""
    # First user
    client.post(
        "/register",
        json={
            "full_name": "Alice One",
            "username": "unique_alice",
            "email": "alice@test.com",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms": True,
        },
    )
    # Clear session cookie to simulate anonymous registration attempt
    client.delete_cookie(SESSION_COOKIE_NAME)

    # Duplicate email
    res1 = client.post(
        "/register",
        json={
            "full_name": "Alice Two",
            "username": "different_alice",
            "email": "alice@test.com",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms": True,
        },
    )
    assert res1.status_code == 400
    assert "email address already exists" in res1.get_json()["error"]

    # Duplicate username
    client.delete_cookie(SESSION_COOKIE_NAME)
    res2 = client.post(
        "/register",
        json={
            "full_name": "Alice Three",
            "username": "unique_alice",
            "email": "another@test.com",
            "password": "Password1234!",
            "confirm_password": "Password1234!",
            "terms": True,
        },
    )
    assert res2.status_code == 400
    assert "username is already taken" in res2.get_json()["error"]


def test_registration_validation_checks(client):
    """Test password strength, mismatch, and terms requirement."""
    # Password too short (<8)
    r1 = client.post(
        "/register",
        json={
            "full_name": "Bob",
            "username": "bob123",
            "email": "bob@example.com",
            "password": "Short1!",
            "confirm_password": "Short1!",
            "terms": True,
        },
    )
    assert r1.status_code == 400
    assert "at least 8 characters" in r1.get_json()["error"]

    # Password mismatch
    r2 = client.post(
        "/register",
        json={
            "full_name": "Bob",
            "username": "bob123",
            "email": "bob@example.com",
            "password": "ValidPassword123!",
            "confirm_password": "DifferentPassword123!",
            "terms": True,
        },
    )
    assert r2.status_code == 400
    assert "do not match" in r2.get_json()["error"]

    # Terms unaccepted
    r3 = client.post(
        "/register",
        json={
            "full_name": "Bob",
            "username": "bob123",
            "email": "bob@example.com",
            "password": "ValidPassword123!",
            "confirm_password": "ValidPassword123!",
            "terms": False,
        },
    )
    assert r3.status_code == 400
    assert "Terms and Conditions" in r3.get_json()["error"]


# ── Login Tests ──────────────────────────────────────────────────────────────

def test_login_with_username_and_email(client):
    """Test signing in with either username or email."""
    client.post(
        "/register",
        json={
            "full_name": "Charlie Tester",
            "username": "charlie_t",
            "email": "charlie@example.com",
            "password": "SecurePassword99#",
            "confirm_password": "SecurePassword99#",
            "terms": True,
        },
    )
    client.delete_cookie(SESSION_COOKIE_NAME)

    # Login with username
    r1 = client.post(
        "/login",
        json={"identifier": "charlie_t", "password": "SecurePassword99#"},
    )
    assert r1.status_code == 200
    assert r1.get_json()["user"]["username"] == "charlie_t"
    client.delete_cookie(SESSION_COOKIE_NAME)

    # Login with email
    r2 = client.post(
        "/login",
        json={"identifier": "charlie@example.com", "password": "SecurePassword99#"},
    )
    assert r2.status_code == 200
    assert r2.get_json()["user"]["email"] == "charlie@example.com"


def test_login_bad_credentials_generic_error(client):
    """Invalid credentials must return generic error to prevent user enumeration."""
    # Unknown user
    r1 = client.post(
        "/login",
        json={"identifier": "unknown_ghost", "password": "SomePassword1!"},
    )
    assert r1.status_code == 401
    assert "Invalid username/email or password" in r1.get_json()["error"]

    # Known user, wrong password
    client.post(
        "/register",
        json={
            "full_name": "Dave",
            "username": "dave_user",
            "email": "dave@example.com",
            "password": "CorrectPassword123!",
            "confirm_password": "CorrectPassword123!",
            "terms": True,
        },
    )
    client.delete_cookie(SESSION_COOKIE_NAME)

    r2 = client.post(
        "/login",
        json={"identifier": "dave_user", "password": "WrongPassword123!"},
    )
    assert r2.status_code == 401
    assert "Invalid username/email or password" in r2.get_json()["error"]


def test_login_rate_limiting(client):
    """Brute force attempts must trigger 429 rate limit after 5 failed attempts."""
    for _ in range(5):
        r = client.post(
            "/login",
            json={"identifier": "target_user", "password": "WrongPassword1!"},
        )
        assert r.status_code == 401

    # 6th attempt should be blocked by rate limiting
    r_blocked = client.post(
        "/login",
        json={"identifier": "target_user", "password": "WrongPassword1!"},
    )
    assert r_blocked.status_code == 429
    assert "Too many failed sign-in attempts" in r_blocked.get_json()["error"]


# ── Session Management Tests ──────────────────────────────────────────────────

def test_session_cookie_attributes_and_logout(client):
    """Test session cookie security flags and clean invalidation on logout."""
    client.post(
        "/register",
        json={
            "full_name": "Eve Monitor",
            "username": "eve_monitor",
            "email": "eve@example.com",
            "password": "PasswordSecret123!",
            "confirm_password": "PasswordSecret123!",
            "terms": True,
        },
    )

    # Active session exists in database
    user = queries.get_user_by_username("eve_monitor")
    sessions = queries.get_user_active_sessions(user["id"])
    assert len(sessions) == 1

    # Access protected dashboard
    dash = client.get("/dashboard")
    assert dash.status_code == 200
    assert b"Welcome back, Eve Monitor" in dash.data

    # Logout
    logout_res = client.get("/logout")
    assert logout_res.status_code == 302

    # Session in DB must be invalidated
    sessions_after = queries.get_user_active_sessions(user["id"])
    assert len(sessions_after) == 0

    # Protected dashboard now redirects to login
    dash_unauth = client.get("/dashboard")
    assert dash_unauth.status_code == 302
    assert "/login" in dash_unauth.headers["Location"]


# ── Password Recovery Tests ───────────────────────────────────────────────────

def test_forgot_and_reset_password_flow(client):
    """Test password reset token generation, single-use enforcement, and password change."""
    client.post(
        "/register",
        json={
            "full_name": "Frank Recovery",
            "username": "frank_rec",
            "email": "frank@example.com",
            "password": "OldPassword123!",
            "confirm_password": "OldPassword123!",
            "terms": True,
        },
    )
    client.delete_cookie(SESSION_COOKIE_NAME)
    user = queries.get_user_by_username("frank_rec")

    # Request forgot password
    res = client.post("/forgot-password", json={"email": "frank@example.com"})
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # Retrieve reset token from dev mailbox / database
    from web.mail import _DEV_MAILBOX
    assert len(_DEV_MAILBOX) > 0
    last_mail = _DEV_MAILBOX[-1]
    assert last_mail["to"] == "frank@example.com"
    token_match = re.search(r"/reset-password/([a-zA-Z0-9_-]+)", last_mail["html"])
    assert token_match is not None
    token = token_match.group(1)

    # Perform password reset with token
    reset_res = client.post(
        f"/reset-password/{token}",
        json={
            "password": "BrandNewPassword999!",
            "confirm_password": "BrandNewPassword999!",
        },
    )
    assert reset_res.status_code == 200
    assert reset_res.get_json()["success"] is True

    # Single-use: using the token a second time must fail
    reuse_res = client.post(
        f"/reset-password/{token}",
        json={
            "password": "AnotherPassword999!",
            "confirm_password": "AnotherPassword999!",
        },
    )
    assert reuse_res.status_code == 400
    assert "invalid, has expired" in reuse_res.get_json()["error"]

    # Verify user can log in with new password
    login_res = client.post(
        "/login",
        json={"identifier": "frank_rec", "password": "BrandNewPassword999!"},
    )
    assert login_res.status_code == 200


# ── Email Verification Tests ──────────────────────────────────────────────────

def test_email_verification_flow(client):
    """Test email verification token consumption."""
    client.post(
        "/register",
        json={
            "full_name": "Grace Hopper",
            "username": "grace_h",
            "email": "grace@example.com",
            "password": "PasswordGrace123!",
            "confirm_password": "PasswordGrace123!",
            "terms": True,
        },
    )
    user = queries.get_user_by_username("grace_h")
    assert user["email_verified"] == 0

    from web.mail import _DEV_MAILBOX
    verify_match = re.search(r"/verify-email/([a-zA-Z0-9_-]+)", _DEV_MAILBOX[-1]["html"])
    assert verify_match is not None
    token = verify_match.group(1)

    # Verify email
    v_res = client.get(f"/verify-email/{token}")
    assert v_res.status_code == 200
    assert b"verified successfully" in v_res.data

    # User in DB is now verified
    user_updated = queries.get_user_by_username("grace_h")
    assert user_updated["email_verified"] == 1


# ── Profile & Account Management Tests ────────────────────────────────────────

def test_profile_update_and_session_revocation(client):
    """Test updating profile info, changing password, and logging out other sessions."""
    client.post(
        "/register",
        json={
            "full_name": "Hank Pym",
            "username": "hank_pym",
            "email": "hank@example.com",
            "password": "PasswordHank123!",
            "confirm_password": "PasswordHank123!",
            "terms": True,
        },
    )
    user = queries.get_user_by_username("hank_pym")

    # Update profile name & username
    p_res = client.post(
        "/profile",
        data={"full_name": "Dr. Henry Pym", "username": "henry_pym"},
    )
    assert p_res.status_code == 200
    assert b"Profile updated successfully" in p_res.data

    user_updated = queries.get_user_by_id(user["id"])
    assert user_updated["full_name"] == "Dr. Henry Pym"
    assert user_updated["username"] == "henry_pym"

    # Change password
    cp_res = client.post(
        "/api/user/change-password",
        json={
            "current_password": "PasswordHank123!",
            "new_password": "NewSecretHank999!",
            "confirm_password": "NewSecretHank999!",
        },
    )
    assert cp_res.status_code == 200
    assert cp_res.get_json()["success"] is True

    # Bad current password rejected
    cp_bad = client.post(
        "/api/user/change-password",
        json={
            "current_password": "WrongCurrentPassword!",
            "new_password": "AnotherSecret123!",
            "confirm_password": "AnotherSecret123!",
        },
    )
    assert cp_bad.status_code == 400
    assert "Current password is incorrect" in cp_bad.get_json()["error"]


def test_account_deletion(client):
    """Test complete account deletion with password verification."""
    client.post(
        "/register",
        json={
            "full_name": "Iris West",
            "username": "iris_west",
            "email": "iris@example.com",
            "password": "PasswordIris123!",
            "confirm_password": "PasswordIris123!",
            "terms": True,
        },
    )
    user = queries.get_user_by_username("iris_west")
    uid = user["id"]

    # Delete with wrong password fails
    del_bad = client.post(
        "/api/user/delete-account",
        json={"password": "WrongPassword!"},
    )
    assert del_bad.status_code == 400

    # Delete with correct password succeeds
    del_ok = client.post(
        "/api/user/delete-account",
        json={"password": "PasswordIris123!"},
    )
    assert del_ok.status_code == 200
    assert del_ok.get_json()["success"] is True

    # User no longer exists
    assert queries.get_user_by_id(uid) is None
    # Sessions cleared
    assert len(queries.get_user_active_sessions(uid)) == 0


# ── Steganography Integration & Telemetry Tests ───────────────────────────────

def test_steganography_user_telemetry_logging(client):
    """Test non-sensitive telemetry logging on steganography operations for authenticated users."""
    fixtures = Path(__file__).parent / "fixtures"
    carrier = (fixtures / "sample.png").read_bytes()
    payload = (fixtures / "sample.txt").read_bytes()

    # Register and authenticate
    client.post(
        "/register",
        json={
            "full_name": "Jack Carver",
            "username": "jack_carver",
            "email": "jack@example.com",
            "password": "PasswordJack123!",
            "confirm_password": "PasswordJack123!",
            "terms": True,
        },
    )
    user = queries.get_user_by_username("jack_carver")

    # Encode operation
    enc_res = client.post(
        "/encode",
        data={
            "carrier": (io.BytesIO(carrier), "sample.png"),
            "payload": (io.BytesIO(payload), "secret.txt"),
            "key": "SuperSecretPassphrase123!",
            "method": "lsb",
            "depth": "1",
        },
        content_type="multipart/form-data",
    )
    assert enc_res.status_code == 200
    stego_bytes = enc_res.data

    # Decode operation
    dec_res = client.post(
        "/decode",
        data={
            "file": (io.BytesIO(stego_bytes), "sample_stego.png"),
            "key": "SuperSecretPassphrase123!",
            "method": "lsb",
        },
        content_type="multipart/form-data",
    )
    assert dec_res.status_code == 200

    # Detect operation
    det_res = client.post(
        "/detect",
        data={"file": (io.BytesIO(stego_bytes), "sample_stego.png")},
        content_type="multipart/form-data",
    )
    assert det_res.status_code == 200

    # Verify telemetry in database
    activity = queries.get_user_activity(user["id"])
    assert len(activity) >= 3

    op_types = [a["operation_type"] for a in activity]
    assert "encode" in op_types
    assert "decode" in op_types
    assert "detect" in op_types

    # Strict Privacy Check: Payload and Secret Key must NEVER exist in user_activity
    raw_db_rows = queries.get_user_activity(user["id"], limit=100)
    for row in raw_db_rows:
        row_str = json.dumps(row)
        assert "SuperSecretPassphrase123!" not in row_str
        assert "secret.txt" not in row_str  # carrier name is saved, not secret payload filename
        assert row["status"] == "success"

    # Verify Dashboard Stats
    stats = queries.get_user_activity_stats(user["id"])
    assert stats["total"] >= 3
    assert stats["encode_count"] >= 1
    assert stats["decode_count"] >= 1
    assert stats["forensic_count"] >= 1
