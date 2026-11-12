"""
Tests for Multi-Tier Sliding Window Rate Limiting and DoS Defense (Phase E).
Verifies rate limiting on registration, password recovery, and ML compute endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import status, HTTPException

from app.main import app
from app.core.auth import check_rate_limit, reset_all_rate_limiters, reset_rate_limit

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_rate_limiters():
    """Ensure in-memory rate limiters are cleared before and after each test."""
    reset_all_rate_limiters()
    yield
    reset_all_rate_limiters()


class TestRateLimitingCore:
    def test_check_rate_limit_allows_under_threshold(self):
        # 3 requests allowed in 60s
        for _ in range(3):
            check_rate_limit(key="user:123", category="test_cat", max_requests=3, window_seconds=60)

    def test_check_rate_limit_blocks_over_threshold(self):
        for _ in range(2):
            check_rate_limit(key="ip:1.2.3.4", category="test_cat", max_requests=2, window_seconds=60)

        with pytest.raises(HTTPException) as exc_info:
            check_rate_limit(key="ip:1.2.3.4", category="test_cat", max_requests=2, window_seconds=60)

        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Retry-After" in exc_info.value.headers
        assert int(exc_info.value.headers["Retry-After"]) > 0

    def test_reset_rate_limit_allows_subsequent_request(self):
        check_rate_limit(key="ip:5.6.7.8", category="test_cat", max_requests=1, window_seconds=60)
        reset_rate_limit(key="ip:5.6.7.8", category="test_cat")
        # Should succeed now
        check_rate_limit(key="ip:5.6.7.8", category="test_cat", max_requests=1, window_seconds=60)


class TestRateLimitingEndpoints:
    def test_forgot_password_rate_limiting(self):
        # Trigger requests up to limit
        from app.core.config import settings

        max_allowed = settings.RATE_LIMIT_FORGOT_PW_PER_HOUR
        for i in range(max_allowed):
            resp = client.post("/api/v1/auth/forgot-password", json={"email": f"flood{i}@example.com"})
            assert resp.status_code == status.HTTP_200_OK

        # The next attempt should return 429
        blocked = client.post("/api/v1/auth/forgot-password", json={"email": "flood_next@example.com"})
        assert blocked.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Retry-After" in blocked.headers
        assert "Too many password recovery requests" in blocked.json().get("detail", "")

