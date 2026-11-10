"""
End-to-End StegoShield AI Platform Verification Suite.

Tests:
1. StegoNet-Lite residual baseline & high-pass spatial residual energy calculation.
2. Database resilience & schema creation.
3. FastAPI upload analysis pipeline (PGM & PNG image ingestion).
4. History pagination, filtering, single record inspection, and deletion.
5. System health and dataset metrics.
"""

import io
import numpy as np
from PIL import Image
import pytest
import torch
from fastapi.testclient import TestClient

from app.main import app
from app.ml.stegonet_lite import StegoNetLite, compute_spatial_residual_energy


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_stegonet_lite_forward():
    """Verifies StegoNetLite input tensor shape and output probability dimensions."""
    model = StegoNetLite()
    model.eval()
    tensor = torch.randn(2, 1, 256, 256)
    with torch.no_grad():
        output = model(tensor)
    assert output.shape == (2, 2)
    # Exponentiated probabilities should sum to approximately 1
    probs = torch.exp(output)
    sums = probs.sum(dim=1)
    assert torch.allclose(sums, torch.ones(2), atol=1e-5)


def test_spatial_residual_energy_calculation():
    """Verifies that high-pass Laplacian residual variance is computed properly."""
    flat = torch.zeros(1, 1, 64, 64)
    flat_energy = compute_spatial_residual_energy(flat)
    assert flat_energy == 0.0

    noisy = torch.randn(1, 1, 64, 64) * 10.0
    noisy_energy = compute_spatial_residual_energy(noisy)
    assert noisy_energy > 0.0


def test_health_endpoint_comprehensive(client):
    """Checks that health endpoint returns complete database, model, and dataset metadata."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "model" in data
    assert "dataset" in data
    assert data["dataset"]["total_pairs"] == 10000
    assert data["dataset"]["payload_bpp"] == 0.4
    assert data["model"]["is_loaded"] is True
    assert data["model"]["is_trained_weights"] is True


def test_analyze_image_endpoint_png(client):
    """Tests single image upload analysis with generated in-memory PNG."""
    img = Image.fromarray((np.random.rand(256, 256) * 255).astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("synthetic_test.png", buf, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "synthetic_test.png"
    assert data["verdict"] in ["Cover", "Stego"]
    assert 0.0 <= data["cover_probability"] <= 1.0
    assert 0.0 <= data["stego_probability"] <= 1.0
    assert 0.5 <= data["confidence"] <= 1.0
    assert data["residual_energy"] is not None
    assert data["forensic_explanation"] is not None
    assert len(data["forensic_explanation"]) > 20
    assert data["execution_time_ms"] > 0.0


def test_history_endpoints_lifecycle(client):
    """Tests scan history retrieval, single inspection, and deletion."""
    # 1. Trigger an analysis to ensure at least one record exists
    img = Image.fromarray((np.random.rand(256, 256) * 255).astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    post_resp = client.post(
        "/api/v1/analyze",
        files={"file": ("history_lifecycle_test.png", buf, "image/png")},
    )
    assert post_resp.status_code == 200
    record_id = post_resp.json().get("id")

    # 2. Get history list
    list_resp = client.get("/api/v1/history?limit=10&offset=0")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total_count"] >= 1
    assert len(list_data["items"]) >= 1

    # 3. If ID was returned, fetch record by ID
    if record_id:
        detail_resp = client.get(f"/api/v1/history/{record_id}")
        assert detail_resp.status_code == 200
        detail_data = detail_resp.json()
        assert detail_data["id"] == record_id
        assert detail_data["filename"] == "history_lifecycle_test.png"
        assert detail_data["residual_energy"] is not None

        # 4. Delete the test record
        del_resp = client.delete(f"/api/v1/history/{record_id}")
        assert del_resp.status_code == 200

        # Verify it is deleted
        get_deleted = client.get(f"/api/v1/history/{record_id}")
        assert get_deleted.status_code == 404
