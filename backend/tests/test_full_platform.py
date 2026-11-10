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
import json
import base64
from pathlib import Path
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

        # Phase 3: Forensic Case Report endpoint verification
        report_resp = client.get(f"/api/v1/history/{record_id}/report")
        assert report_resp.status_code == 200
        report_data = report_resp.json()
        assert "case_number" in report_data
        assert "evidence_profile" in report_data
        assert "forensic_verdict" in report_data
        assert report_data["case_number"].startswith("STEGO-CASE-")
        assert report_data["evidence_profile"]["filename"] == "history_lifecycle_test.png"
        assert "file_hash_sha256" in report_data["evidence_profile"]
        assert "chain_of_custody_verification" in report_data

        # 4. Delete the test record
        del_resp = client.delete(f"/api/v1/history/{record_id}")
        assert del_resp.status_code == 200

        # Verify it is deleted
        get_deleted = client.get(f"/api/v1/history/{record_id}")
        assert get_deleted.status_code == 404


def test_visual_forensics_service():
    """Verifies generation of bitplane, residual heatmap, and amplified diff maps."""
    from app.services.visual_service import VisualForensicsService

    c_arr = np.full((64, 64), 128, dtype=np.uint8)
    s_arr = c_arr.copy()
    s_arr[10, 10] = 129  # +1 change
    s_arr[20, 20] = 127  # -1 change

    # Bit-plane
    bp = VisualForensicsService.generate_bitplane(c_arr, 0)
    assert bp.startswith("data:image/png;base64,")

    # Heatmap
    heat = VisualForensicsService.generate_residual_heatmap(c_arr)
    assert heat.startswith("data:image/png;base64,")

    # Amplified diff
    diff_b64, stats = VisualForensicsService.generate_amplified_diff(c_arr, s_arr)
    assert diff_b64.startswith("data:image/png;base64,")
    assert stats["modified_pixels"] == 2
    assert stats["plus_one_count"] == 1
    assert stats["minus_one_count"] == 1


def test_compare_pair_endpoint(client):
    """Tests the /api/v1/analyze/compare endpoint with two synthetic images."""
    im1 = Image.fromarray(np.full((64, 64), 120, dtype=np.uint8))
    im2 = Image.fromarray(np.full((64, 64), 121, dtype=np.uint8))
    b1, b2 = io.BytesIO(), io.BytesIO()
    im1.save(b1, format="PNG")
    im2.save(b2, format="PNG")
    b1.seek(0)
    b2.seek(0)

    resp = client.post(
        "/api/v1/analyze/compare",
        files={
            "cover_file": ("c.png", b1, "image/png"),
            "stego_file": ("s.png", b2, "image/png"),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "diff_map_b64" in data
    assert "cover_heatmap_b64" in data
    assert "diff_stats" in data
    assert data["diff_stats"]["modified_pixels"] == 64 * 64


def test_statistical_forensics_detector():
    """Verifies classical statistical forensics feature extraction."""
    from app.ml.statistical_detector import StatisticalForensicsDetector

    arr = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    metrics = StatisticalForensicsDetector.extract_metrics(arr)
    assert "lsb_shannon_entropy" in metrics
    assert "laplacian_residual_variance" in metrics
    assert "spatial_gradient_variance" in metrics
    assert "spam_markov_diag_dominance" in metrics
    assert 0.0 <= metrics["lsb_shannon_entropy"] <= 1.0


def test_colab_notebook_validity():
    """Verifies that the Google Colab GPU training notebook is present and valid JSON."""
    nb_path = Path(__file__).resolve().parent.parent.parent / "notebooks" / "train_srnet_colab.ipynb"
    assert nb_path.exists(), f"Notebook not found at {nb_path}"
    with open(nb_path, "r", encoding="utf-8") as f:
        nb_data = json.load(f)
    assert nb_data["nbformat"] >= 4
    assert len(nb_data["cells"]) >= 10


def test_steganography_studio_embed_and_extract(client):
    """Verifies end-to-end secret message embedding and extraction."""
    from app.services.embedding_service import SteganographyStudioService

    # 1. Create a synthetic 128x128 cover image
    cover_img = Image.fromarray(np.full((128, 128), 128, dtype=np.uint8))
    cover_buf = io.BytesIO()
    cover_img.save(cover_buf, format="PNG")
    cover_bytes = cover_buf.getvalue()

    secret = "StegoShield AI Secret Message: 2026 Verification Test!"

    # 2. Embed using LSB Replacement
    res_replace = SteganographyStudioService.embed_secret_message(
        image_bytes=cover_bytes,
        secret_text=secret,
        algorithm="lsb_replace",
    )
    assert res_replace["payload_bytes"] == len(secret.encode("utf-8"))
    assert res_replace["modified_pixel_count"] > 0
    assert res_replace["stego_image_b64"].startswith("data:image/png;base64,")

    # 3. Decode base64 to bytes and extract
    raw_b64 = res_replace["stego_image_b64"].split(",", 1)[1]
    stego_bytes = base64.b64decode(raw_b64)
    extracted = SteganographyStudioService.extract_secret_message(stego_bytes)
    assert extracted["success"] is True
    assert extracted["secret_text"] == secret

    # 4. Embed using LSB Matching (±1)
    res_matching = SteganographyStudioService.embed_secret_message(
        image_bytes=cover_bytes,
        secret_text=secret,
        algorithm="lsb_matching",
    )
    raw_b64_matching = res_matching["stego_image_b64"].split(",", 1)[1]
    stego_bytes_matching = base64.b64decode(raw_b64_matching)
    extracted_matching = SteganographyStudioService.extract_secret_message(stego_bytes_matching)
    assert extracted_matching["secret_text"] == secret

    # 5. Test API endpoints
    cover_buf.seek(0)
    api_embed_resp = client.post(
        "/api/v1/stego/embed",
        files={"file": ("cover.png", cover_buf, "image/png")},
        data={"secret_text": "Classified Project Payload", "algorithm": "lsb_replace"},
    )
    assert api_embed_resp.status_code == 200
    embed_data = api_embed_resp.json()
    assert "stego_image_b64" in embed_data
    assert embed_data["payload_bytes"] > 0

    # Extract via API
    stego_stream = io.BytesIO(base64.b64decode(embed_data["stego_image_b64"].split(",", 1)[1]))
    api_extract_resp = client.post(
        "/api/v1/stego/extract",
        files={"file": ("stego.png", stego_stream, "image/png")},
    )
    assert api_extract_resp.status_code == 200
    extract_data = api_extract_resp.json()
    assert extract_data["secret_text"] == "Classified Project Payload"


def test_fft_spectrum_service():
    """Verifies 2D FFT Power Spectrum generation and spectral metrics."""
    from app.services.visual_service import VisualForensicsService

    arr = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    fft_b64, stats = VisualForensicsService.generate_fft_spectrum(arr)
    assert fft_b64.startswith("data:image/png;base64,")
    assert "hf_spectral_energy_percent" in stats
    assert "spectral_entropy" in stats
    assert 0.0 <= stats["hf_spectral_energy_percent"] <= 100.0
    assert stats["spectral_entropy"] > 0.0


def test_batch_benchmark_endpoint(client):
    """Verifies batch evidence triage endpoint with benchmark samples."""
    resp = client.post("/api/v1/batch/benchmark?count_per_class=2")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_processed" in data
    assert data["total_processed"] >= 2
    assert "stego_count" in data
    assert "cover_count" in data
    assert len(data["results"]) == data["total_processed"]
    assert "total_execution_time_ms" in data


def test_evidence_archive_service_and_endpoints(client):
    """Verifies NIST/ISO-27037 digital evidence archive zip generation and endpoints."""
    import zipfile
    from app.services.evidence_service import DigitalEvidenceArchiveService

    # 1. Test direct service generation
    case_data = {
        "id": 42,
        "filename": "suspect_image_001.png",
        "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "file_size_bytes": 262144,
        "image_format": "PNG",
        "verdict": "Stego",
        "confidence": 0.984,
        "cover_probability": 0.016,
        "stego_probability": 0.984,
        "residual_energy": 853.70,
        "model_name": "StegoNet-Lite",
        "device": "cpu",
        "forensic_explanation": "Test evidence verification archive.",
    }

    dummy_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    artifacts = {
        "residual_heatmap_b64": dummy_b64,
        "bitplane_0_b64": dummy_b64,
        "fft_spectrum_b64": dummy_b64,
    }

    zip_bytes = DigitalEvidenceArchiveService.generate_evidence_archive_zip(case_data, artifacts)
    assert len(zip_bytes) > 0
    assert zipfile.is_zipfile(io.BytesIO(zip_bytes))

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as z:
        names = z.namelist()
        assert "evidence_manifest.json" in names
        assert "forensic_certificate.html" in names
        assert "README_CHAIN_OF_CUSTODY.txt" in names
        assert "evidence_artifacts/residual_heatmap.png" in names
        manifest_data = json.loads(z.read("evidence_manifest.json"))
        assert manifest_data["case_number"] == "STEGO-CASE-000042"
        assert manifest_data["primary_evidence_carrier"]["filename"] == "suspect_image_001.png"

    # 2. Test POST /api/v1/history/evidence-archive endpoint
    post_resp = client.post(
        "/api/v1/history/evidence-archive",
        json={
            "id": 101,
            "filename": "live_test.png",
            "file_hash": "a" * 64,
            "verdict": "Cover",
            "confidence": 0.95,
            "cover_probability": 0.95,
            "stego_probability": 0.05,
            "residual_energy": 851.79,
            "residual_heatmap_b64": dummy_b64,
        },
    )
    assert post_resp.status_code == 200
    assert post_resp.headers["content-type"] == "application/zip"
    assert "evidence_archive_STEGO-CASE-000101.zip" in post_resp.headers.get("content-disposition", "")
    assert zipfile.is_zipfile(io.BytesIO(post_resp.content))




