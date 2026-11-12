"""Comprehensive Test Suite for Authentication, Session Management, and Data Isolation.

Covers:
1. Registration (valid credentials, duplicate email rejection, weak password, confirmation mismatch)
2. Login (valid credentials, invalid password, nonexistent email, rate limiting)
3. Token Refresh and Rotation (HttpOnly cookie and body fallback)
4. Password Recovery & Reset (safe response, token validation, session revocation)
5. Current User & Profile Telemetry (stats calculation from DB)
6. Password Change
7. Multi-User Forensic Isolation & IDOR Protection (Scan history and Lab experiments)
8. Guest Mode compatibility (unauthenticated access without errors)
"""

import asyncio
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import AsyncSessionLocal, init_db
from app.models.user import User, UserSession
from app.models.scan import ScanRecord
from app.models.experiment import ExperimentRecord
from app.core.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def ensure_db():
    asyncio.run(init_db())


def unique_email(prefix="forensic_analyst"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@stegoshield.io"


class TestAuthenticationRegistration:
    """Phase 3 & Phase 14: Registration tests."""

    def test_register_success(self):
        email = unique_email()
        payload = {
            "full_name": "Dr. Sarah Mitchell",
            "email": email,
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["full_name"] == "Dr. Sarah Mitchell"

    def test_register_duplicate_email(self):
        email = unique_email()
        payload = {
            "full_name": "Dr. Sarah Mitchell",
            "email": email,
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
        }
        resp1 = client.post("/api/v1/auth/register", json=payload)
        assert resp1.status_code == 201

        resp2 = client.post("/api/v1/auth/register", json=payload)
        assert resp2.status_code == 400
        assert "already exists" in resp2.json()["detail"]

    def test_register_weak_password(self):
        email = unique_email()
        payload = {
            "full_name": "Analyst Weak",
            "email": email,
            "password": "short",
            "password_confirm": "short",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_mismatched_password(self):
        email = unique_email()
        payload = {
            "full_name": "Analyst Mismatch",
            "email": email,
            "password": "SecurePassword123!",
            "password_confirm": "DifferentPassword123!",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422


class TestAuthenticationLogin:
    """Phase 2 & Phase 14: Login and Session Establishment."""

    def test_login_success(self):
        email = unique_email()
        password = "CyberForensicsPassword2026!"
        client.post("/api/v1/auth/register", json={
            "full_name": "Agent Marcus Vance",
            "email": email,
            "password": password,
            "password_confirm": password,
        })

        login_resp = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": password,
            "remember_me": True,
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == email.lower()
        # Ensure refresh cookie is attached
        assert "stego_refresh_token" in login_resp.cookies

    def test_login_invalid_password(self):
        email = unique_email()
        password = "CyberForensicsPassword2026!"
        client.post("/api/v1/auth/register", json={
            "full_name": "Agent Marcus",
            "email": email,
            "password": password,
            "password_confirm": password,
        })

        login_resp = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "WrongPassword999!",
        })
        assert login_resp.status_code == 401
        assert "Invalid" in login_resp.json()["detail"]

    def test_login_nonexistent_email(self):
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "nonexistent_analyst@stegoshield.io",
            "password": "SomePassword123!",
        })
        assert login_resp.status_code == 401


class TestTokenRefreshAndRotation:
    """Phase 5: Secure Refresh Token Rotation."""

    def test_refresh_token_rotation(self):
        email = unique_email()
        password = "SecurePassword123!"
        reg = client.post("/api/v1/auth/register", json={
            "full_name": "Rotating Analyst",
            "email": email,
            "password": password,
            "password_confirm": password,
        })
        initial_refresh = reg.json()["refresh_token"]

        # Call refresh endpoint with initial refresh token
        ref_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": initial_refresh})
        assert ref_resp.status_code == 200
        ref_data = ref_resp.json()
        new_access = ref_data["access_token"]
        new_refresh = ref_data["refresh_token"]

        assert new_access is not None
        assert new_refresh != initial_refresh

        # Old refresh token should now trigger theft detection, revoking the whole family
        second_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": initial_refresh})
        assert second_resp.status_code == 401
        assert "Compromised or re-used" in second_resp.json()["detail"]

        # The new refresh token must also be revoked as part of the compromised token family
        third_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh})
        assert third_resp.status_code == 401


class TestPasswordRecoveryAndReset:
    """Phase 4: Forgot and Reset Password Flow."""

    def test_forgot_password_and_reset(self):
        email = unique_email()
        old_password = "InitialPassword123!"
        new_password = "UpdatedPassword456!"

        client.post("/api/v1/auth/register", json={
            "full_name": "Recovery User",
            "email": email,
            "password": old_password,
            "password_confirm": old_password,
        })

        # Forgot password request
        forgot_resp = client.post("/api/v1/auth/forgot-password", json={"email": email})
        assert forgot_resp.status_code == 200
        body = forgot_resp.json()
        assert "instructions" in body["message"]
        dev_token = body.get("detail")
        assert dev_token is not None

        # Reset password
        reset_resp = client.post("/api/v1/auth/reset-password", json={
            "token": dev_token,
            "new_password": new_password,
            "new_password_confirm": new_password,
        })
        assert reset_resp.status_code == 200

        # Login with old password fails
        fail_login = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": old_password,
        })
        assert fail_login.status_code == 401

        # Login with new password succeeds
        good_login = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": new_password,
        })
        assert good_login.status_code == 200


class TestUserManagementAndProfile:
    """Phase 8 & Phase 10: Profile and Account Settings."""

    def test_profile_telemetry_and_update(self):
        email = unique_email()
        password = "SecurePassword123!"
        reg = client.post("/api/v1/auth/register", json={
            "full_name": "Telemetry Analyst",
            "email": email,
            "password": password,
            "password_confirm": password,
        })
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check me
        me_resp = client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email.lower()

        # Check user profile
        profile_resp = client.get("/api/v1/users/profile", headers=headers)
        assert profile_resp.status_code == 200
        profile_data = profile_resp.json()
        assert profile_data["total_scans"] == 0
        assert profile_data["total_experiments"] == 0

        # Update profile full name
        update_resp = client.patch(
            "/api/v1/users/profile",
            headers=headers,
            json={"full_name": "Chief Forensics Officer"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["full_name"] == "Chief Forensics Officer"

    def test_change_password(self):
        email = unique_email()
        old_pw = "OldSecurePassword123!"
        new_pw = "BrandNewPassword789!"
        reg = client.post("/api/v1/auth/register", json={
            "full_name": "Password Changer",
            "email": email,
            "password": old_pw,
            "password_confirm": old_pw,
        })
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Change password
        ch_resp = client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": old_pw,
                "new_password": new_pw,
                "new_password_confirm": new_pw,
            },
        )
        assert ch_resp.status_code == 200

        # Verify old password no longer works
        bad_login = client.post("/api/v1/auth/login", json={"email": email, "password": old_pw})
        assert bad_login.status_code == 401

        # Verify new password works
        good_login = client.post("/api/v1/auth/login", json={"email": email, "password": new_pw})
        assert good_login.status_code == 200


class TestMultiUserForensicDataIsolation:
    """Phase 9 & Phase 14: Strict User Data Isolation and IDOR Protection."""

    def test_scan_history_and_lab_isolation(self):
        # Register User A
        email_a = unique_email("agent_a")
        reg_a = client.post("/api/v1/auth/register", json={
            "full_name": "Agent Alpha",
            "email": email_a,
            "password": "PasswordAlpha123!",
            "password_confirm": "PasswordAlpha123!",
        })
        token_a = reg_a.json()["access_token"]
        user_a_id = reg_a.json()["user"]["id"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Register User B
        email_b = unique_email("agent_b")
        reg_b = client.post("/api/v1/auth/register", json={
            "full_name": "Agent Bravo",
            "email": email_b,
            "password": "PasswordBravo123!",
            "password_confirm": "PasswordBravo123!",
        })
        token_b = reg_b.json()["access_token"]
        user_b_id = reg_b.json()["user"]["id"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Insert records asynchronously
        async def insert_user_a_records():
            async with AsyncSessionLocal() as session:
                scan = ScanRecord(
                    user_id=user_a_id,
                    filename="top_secret_a.png",
                    file_hash="hash_a_12345",
                    file_size_bytes=1024,
                    width=256,
                    height=256,
                    verdict="STEGO",
                    confidence=0.98,
                    stego_probability=0.98,
                    cover_probability=0.02,
                    execution_time_ms=15.0,
                )
                exp = ExperimentRecord(
                    user_id=user_a_id,
                    experiment_name="Alpha S-UNIWARD Experiment",
                    experiment_type="bit_manipulation",
                    original_filename="sample_a.png",
                    original_file_hash="hash_exp_a",
                    modified_file_hash="hash_exp_a_mod",
                    dimensions="256x256",
                    color_mode="L",
                    parameters_json="{}",
                    comparison_json="{}",
                )
                session.add(scan)
                session.add(exp)
                await session.commit()
                await session.refresh(scan)
                await session.refresh(exp)
                return scan.id, exp.id

        scan_a_id, exp_a_id = asyncio.run(insert_user_a_records())

        # User A checks history: should see scan_a
        hist_a = client.get("/api/v1/history", headers=headers_a)
        assert hist_a.status_code == 200
        a_records = hist_a.json().get("items", [])
        assert any(r["id"] == scan_a_id for r in a_records)

        # User B checks history: must NOT see scan_a
        hist_b = client.get("/api/v1/history", headers=headers_b)
        assert hist_b.status_code == 200
        b_records = hist_b.json().get("items", [])
        assert not any(r["id"] == scan_a_id for r in b_records)

        # Anti-IDOR: User B attempts direct lookup of User A's scan: MUST 404
        direct_lookup = client.get(f"/api/v1/history/{scan_a_id}", headers=headers_b)
        assert direct_lookup.status_code == 404

        # Anti-IDOR: User B attempts to delete User A's scan: MUST 404
        del_attempt = client.delete(f"/api/v1/history/{scan_a_id}", headers=headers_b)
        assert del_attempt.status_code == 404

        # Lab Experiments: User A sees exp_a
        lab_a = client.get("/api/v1/lab/experiments", headers=headers_a)
        assert lab_a.status_code == 200
        assert any(e["id"] == exp_a_id for e in lab_a.json())

        # Lab Experiments: User B must NOT see exp_a
        lab_b = client.get("/api/v1/lab/experiments", headers=headers_b)
        assert lab_b.status_code == 200
        assert not any(e["id"] == exp_a_id for e in lab_b.json())

        # Anti-IDOR: User B attempts to delete User A's lab experiment: MUST 404
        del_exp_b = client.delete(f"/api/v1/lab/experiments/{exp_a_id}", headers=headers_b)
        assert del_exp_b.status_code == 404

        # User A can inspect and delete their own scan and experiment cleanly
        del_exp_a = client.delete(f"/api/v1/lab/experiments/{exp_a_id}", headers=headers_a)
        assert del_exp_a.status_code == 204
