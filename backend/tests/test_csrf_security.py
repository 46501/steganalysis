"""
Tests for Anti-CSRF Header Guard and Ambient Cookie Protection (Phase F).
Ensures cookie-authenticated state-changing requests require 'X-StegoShield-Client: 1' or 'X-Requested-With'.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.services.auth_service import REFRESH_COOKIE_NAME

client = TestClient(app)


def unique_email(prefix="csrf_test"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@stegoshield.io"


class TestAntiCSRFProtection:
    def test_refresh_with_ambient_cookie_without_header_blocked(self):
        # Register a user to get valid cookie
        email = unique_email()
        reg_resp = client.post("/api/v1/auth/register", json={
            "full_name": "CSRF Target Analyst",
            "email": email,
            "password": "Password123!",
            "password_confirm": "Password123!",
        })
        assert reg_resp.status_code == status.HTTP_201_CREATED
        cookie_val = reg_resp.cookies.get(REFRESH_COOKIE_NAME)
        assert cookie_val is not None

        # Create isolated client with ONLY cookie and NO custom header and NO body
        isolated_client = TestClient(app)
        isolated_client.cookies.set(REFRESH_COOKIE_NAME, cookie_val)

        # Attempt refresh relying purely on ambient cookie without CSRF header
        csrf_attempt = isolated_client.post("/api/v1/auth/refresh")
        assert csrf_attempt.status_code == status.HTTP_403_FORBIDDEN
        assert "Cross-Site Request Forgery" in csrf_attempt.json().get("detail", "")

    def test_refresh_with_ambient_cookie_with_stegoshield_header_succeeds(self):
        email = unique_email()
        reg_resp = client.post("/api/v1/auth/register", json={
            "full_name": "CSRF Safe Analyst",
            "email": email,
            "password": "Password123!",
            "password_confirm": "Password123!",
        })
        assert reg_resp.status_code == status.HTTP_201_CREATED
        cookie_val = reg_resp.cookies.get(REFRESH_COOKIE_NAME)

        isolated_client = TestClient(app)
        isolated_client.cookies.set(REFRESH_COOKIE_NAME, cookie_val)

        # Attempt refresh with custom client header
        valid_attempt = isolated_client.post(
            "/api/v1/auth/refresh",
            headers={"X-StegoShield-Client": "1"},
        )
        assert valid_attempt.status_code == status.HTTP_200_OK
        assert "access_token" in valid_attempt.json()

    def test_logout_with_ambient_cookie_without_header_blocked(self):
        email = unique_email()
        reg_resp = client.post("/api/v1/auth/register", json={
            "full_name": "CSRF Logout Analyst",
            "email": email,
            "password": "Password123!",
            "password_confirm": "Password123!",
        })
        cookie_val = reg_resp.cookies.get(REFRESH_COOKIE_NAME)

        isolated_client = TestClient(app)
        isolated_client.cookies.set(REFRESH_COOKIE_NAME, cookie_val)

        # Attempt logout without header
        csrf_logout = isolated_client.post("/api/v1/auth/logout")
        assert csrf_logout.status_code == status.HTTP_403_FORBIDDEN
        assert "Cross-Site Request Forgery" in csrf_logout.json().get("detail", "")

    def test_logout_with_ambient_cookie_with_header_succeeds(self):
        email = unique_email()
        reg_resp = client.post("/api/v1/auth/register", json={
            "full_name": "CSRF Legitimate Logout",
            "email": email,
            "password": "Password123!",
            "password_confirm": "Password123!",
        })
        cookie_val = reg_resp.cookies.get(REFRESH_COOKIE_NAME)

        isolated_client = TestClient(app)
        isolated_client.cookies.set(REFRESH_COOKIE_NAME, cookie_val)

        # Attempt logout with header
        valid_logout = isolated_client.post(
            "/api/v1/auth/logout",
            headers={"X-StegoShield-Client": "1"},
        )
        assert valid_logout.status_code == status.HTTP_200_OK
        assert "Successfully signed out" in valid_logout.json().get("message", "")

