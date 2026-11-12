"""API endpoints test suite."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Checks root endpoint responds with basic metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert "version" in data


def test_health_endpoint():
    """Checks health endpoint returns model and system status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model" in data
    assert data["model"]["architecture"].startswith("SRNet")


def test_http_security_headers():
    """Verifies NIST SP 800-86 defense-in-depth HTTP security headers."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert "strict-origin-when-cross-origin" in response.headers.get("Referrer-Policy", "")
    assert "default-src" in response.headers.get("Content-Security-Policy", "")
    assert "Permissions-Policy" in response.headers

