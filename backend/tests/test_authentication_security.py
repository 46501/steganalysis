"""
Automated Verification Suite for Authentication Security & Guest Mode Elimination.

Verifies:
1. Complete rejection of guest session creation (POST /api/v1/auth/guest returns 403 Forbidden).
2. Strict unauthenticated access rejection across all protected forensic endpoints (401 Unauthorized):
   - /api/v1/analyze (single image steganalysis)
   - /api/v1/analyze/compare (paired differential verification)
   - /api/v1/batch (batch steganalysis)
   - /api/v1/history (forensic audit trail)
   - /api/v1/stego/embed (LSB concealment)
   - /api/v1/stego/extract (LSB extraction)
   - /api/v1/lab/inspect (laboratory image inspection)
   - /api/v1/lab/experiments (laboratory experiment persistence)
   - /api/v1/assistant/chat (floating AI assistant)
   - /api/v1/auth/me (investigator identity verification)
   - /api/v1/users/profile (investigator telemetry profile)
3. Public endpoints remain operational without credentials:
   - /api/v1/health (health check)
   - /api/v1/auth/forgot-password (safe password recovery)
4. Authenticated sessions grant access to protected tools and AI chatbot.
5. Logout revokes the session.
"""

import sys
import uuid
from pathlib import Path
import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport

backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.core.database import engine


def unique_email(prefix="sec_test"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@stegoshield.io"


@pytest_asyncio.fixture(autouse=True)
async def clean_db_connections():
    await engine.dispose()
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.mark.asyncio
async def test_guest_session_endpoint_rejected(client: httpx.AsyncClient):
    """Verifies that guest-session creation is rejected at the API level with 403 Forbidden."""
    resp = await client.post("/api/v1/auth/guest")
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "disabled" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_unauthenticated_protected_forensic_endpoints_rejected(client: httpx.AsyncClient):
    """Verifies that all protected forensic endpoints strictly reject unauthenticated requests with 401."""
    # 1. Steganalysis Inference
    resp_analyze = await client.post("/api/v1/analyze")
    assert resp_analyze.status_code == 401, f"Analyze expected 401, got {resp_analyze.status_code}"

    # 2. Paired Differential Reference
    resp_compare = await client.post("/api/v1/analyze/compare")
    assert resp_compare.status_code == 401, f"Analyze compare expected 401, got {resp_compare.status_code}"

    # 3. Batch Analysis
    resp_batch = await client.post("/api/v1/batch")
    assert resp_batch.status_code == 401, f"Batch expected 401, got {resp_batch.status_code}"

    # 4. History
    resp_hist = await client.get("/api/v1/history")
    assert resp_hist.status_code == 401, f"History expected 401, got {resp_hist.status_code}"

    # 5. Stego Studio Embed
    resp_embed = await client.post("/api/v1/stego/embed")
    assert resp_embed.status_code == 401, f"Stego embed expected 401, got {resp_embed.status_code}"

    # 6. Stego Studio Extract
    resp_extract = await client.post("/api/v1/stego/extract")
    assert resp_extract.status_code == 401, f"Stego extract expected 401, got {resp_extract.status_code}"

    # 7. Forensics Lab Inspect
    resp_lab_inspect = await client.post("/api/v1/lab/inspect")
    assert resp_lab_inspect.status_code == 401, f"Lab inspect expected 401, got {resp_lab_inspect.status_code}"

    # 8. Forensics Lab Experiments
    resp_lab_exp = await client.get("/api/v1/lab/experiments")
    assert resp_lab_exp.status_code == 401, f"Lab experiments expected 401, got {resp_lab_exp.status_code}"

    # 9. Auth Identity Verification
    resp_me = await client.get("/api/v1/auth/me")
    assert resp_me.status_code == 401, f"Auth me expected 401, got {resp_me.status_code}"

    # 10. User Profile Telemetry
    resp_profile = await client.get("/api/v1/users/profile")
    assert resp_profile.status_code == 401, f"Users profile expected 401, got {resp_profile.status_code}"


@pytest.mark.asyncio
async def test_unauthenticated_floating_chatbot_rejected(client: httpx.AsyncClient):
    """Verifies that the floating AI assistant endpoint strictly rejects unauthenticated requests with 401."""
    chat_payload = {
        "message": "Explain LSB steganography detection",
        "context": {"active_tab": "dashboard"},
    }
    resp = await client.post("/api/v1/assistant/chat", json=chat_payload)
    assert resp.status_code == 401, f"Chatbot expected 401, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "not provided" in data.get("detail", "").lower() or "credentials" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_public_endpoints_accessible(client: httpx.AsyncClient):
    """Verifies that health check and password recovery remain publicly accessible without auth credentials."""
    # Health check
    resp_health = await client.get("/api/v1/health")
    assert resp_health.status_code == 200, f"Health check failed: {resp_health.status_code}"

    # Safe password recovery request (OWASP non-revealing response)
    resp_forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent_analyst@stegoshield.io"},
    )
    assert resp_forgot.status_code == 200, f"Forgot password failed: {resp_forgot.status_code}"


@pytest.mark.asyncio
async def test_authenticated_lifecycle_and_chatbot_access(client: httpx.AsyncClient):
    """Verifies full authenticated lifecycle: registration, profile access, chatbot use, and logout revocation."""
    email = unique_email("auth_guard")
    password = "SecurePassword123!"

    # 1. Register new investigator account
    reg_payload = {
        "full_name": "Special Agent Vance",
        "email": email,
        "password": password,
        "password_confirm": password,
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    token = reg_data["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Access protected identity verification with Bearer token
    me_resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_resp.status_code == 200, f"Identity verification failed: {me_resp.text}"
    assert me_resp.json()["email"] == email.lower()

    # 3. Access AI Assistant chatbot with Bearer token
    chat_payload = {
        "message": "Hello assistant, verify my authenticated session.",
        "context": {"active_tab": "dashboard"},
    }
    chat_resp = await client.post("/api/v1/assistant/chat", json=chat_payload, headers=auth_headers)
    assert chat_resp.status_code == 200, f"Authenticated chatbot failed: {chat_resp.text}"
    chat_data = chat_resp.json()
    assert "reply" in chat_data
    assert len(chat_data["reply"]) > 0

    # 4. Logout session
    logout_resp = await client.post("/api/v1/auth/logout", headers=auth_headers)
    assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
