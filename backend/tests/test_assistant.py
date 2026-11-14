"""Unit and integration tests for the StegoShield Global AI Assistant."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_assistant_chat_general_query():
    """Checks that the assistant responds to general forensic questions with markdown reply."""
    payload = {
        "message": "What is digital image steganography?",
        "history": [],
        "context": {
            "current_page": "/dashboard",
            "workflow_step": None,
            "analysis_data": None,
        },
    }
    response = client.post("/api/v1/assistant/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert "suggested_prompts" in data
    assert isinstance(data["suggested_prompts"], list)
    assert len(data["suggested_prompts"]) > 0
    assert "timestamp" in data


def test_assistant_chat_context_aware_lab():
    """Checks that the assistant generates step-aware guidance on the forensic lab page."""
    payload = {
        "message": "How do I use this page?",
        "history": [],
        "context": {
            "current_page": "/lab",
            "workflow_step": 2,
            "analysis_data": None,
        },
    }
    response = client.post("/api/v1/assistant/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Forensic Laboratory" in data["reply"] or "Step" in data["reply"]
    # Suggestions should be lab-tailored
    assert any("bit" in p.lower() or "step" in p.lower() or "canvas" in p.lower() for p in data["suggested_prompts"])


def test_assistant_chat_with_active_analysis_data():
    """Checks that the assistant references actual analysis findings instead of inventing metrics."""
    payload = {
        "message": "What did you find in my image?",
        "history": [],
        "context": {
            "current_page": "/detector",
            "workflow_step": None,
            "analysis_data": {
                "verdict": "Stego Indicated",
                "confidence": 0.984,
                "psnr_db": 54.2,
                "changed_pixels": 1280,
                "changed_percent": 0.48,
                "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            },
        },
    }
    response = client.post("/api/v1/assistant/chat", json=payload)
    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "Stego Indicated" in reply
    assert "98.4%" in reply
    assert "1,280 px" in reply
    assert "54.2" in reply


def test_assistant_validation_error_on_empty_message():
    """Checks that empty message payloads are rejected with 422 Unprocessable Entity."""
    response = client.post("/api/v1/assistant/chat", json={"message": "   "})
    assert response.status_code == 422


def test_assistant_chat_beginner_how_to_modify_bits():
    """Checks that asking how to modify bits returns actionable, step-by-step guidance."""
    payload = {
        "message": "How do I modify image bits?",
        "history": [],
        "context": {"current_page": "/lab", "workflow_step": 2},
    }
    response = client.post("/api/v1/assistant/chat", json=payload)
    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "Step 2" in reply or "Modify Bits" in reply
    assert "canvas" in reply.lower() or "coordinate" in reply.lower()
    assert "register" in reply.lower() or "b0" in reply.lower()


def test_assistant_chat_what_should_i_do_next():
    """Checks contextual guidance when user asks what to do next."""
    payload = {
        "message": "What should I do next?",
        "history": [],
        "context": {"current_page": "/lab", "workflow_step": 3},
    }
    response = client.post("/api/v1/assistant/chat", json=payload)
    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "Step 3" in reply
    assert "message" in reply.lower() or "embed" in reply.lower()


def test_assistant_chat_deep_forensic_evidence_audit():
    """Checks that the assistant breaks down Chi-square, RS, Entropy, and residual energy."""
    payload = {
        "message": "Why is this image considered suspicious?",
        "history": [],
        "context": {
            "current_page": "/detector",
            "analysis_data": {
                "verdict": "Stego Indicated",
                "confidence": 0.965,
                "cover_probability": 0.035,
                "stego_probability": 0.965,
                "statistical_metrics": {
                    "chi_square": 248.5,
                    "p_value": 0.0001,
                    "entropy": 7.992,
                    "residual_variance": 48.6,
                    "lsb_ratio": 0.502,
                },
                "statistical_tests": {
                    "rs_analysis": {
                        "rm": 0.28,
                        "sm": 0.24,
                        "verdict": "Steganographic signature detected",
                    }
                },
                "changed_pixels": 2500,
                "changed_percent": 0.95,
                "psnr_db": 49.8,
            },
        },
    }
    response = client.post("/api/v1/assistant/chat", json=payload)
    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "Chi-Square" in reply
    assert "248.5" in reply
    assert "7.992" in reply
    assert "48.6" in reply
    assert "Stego Indicated" in reply
    assert "ISO/IEC 27037" in reply or "probabilistic" in reply.lower()


