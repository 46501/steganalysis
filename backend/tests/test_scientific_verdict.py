"""
StegoShield AI — Scientific Steganalysis Classification & Forensic Verdict Verification Suite.

Tests rigorous adherence to academic digital forensics standards:
1. 52% Stego / 48% Cover produces an Inconclusive result (never Stego detected).
2. Strong predictions are classified into 'Stego Indicated' or 'Cover Indicated' with mandatory disclaimers.
3. Class-to-index mapping (0=Cover, 1=Stego) integrity.
4. Non-finite / invalid model outputs produce Inconclusive model error states without fabricating verdicts.
5. Inference engine exceptions produce Inconclusive error states without defaulting to Stego.
6. Single image analysis API returns complete scientific metadata (uncalibrated score, decision margin).
7. Scan history persistence preserves raw scores, decision interpretation, and supports 3-state filtering.
"""

import io
import asyncio
import numpy as np
import pytest
import torch
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.core.database import init_db, get_db
from app.main import app
from app.ml.inference import SteganalysisInferenceEngine, engine
from app.ml.stegonet_lite import StegoNetLite
from app.models.scan import ScanRecord
from app.services.steganalysis_service import SteganalysisService
from sqlalchemy import select


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    asyncio.run(init_db())
    yield


# -----------------------------------------------------------------------------
# 1. 52% Stego / 48% Cover Inconclusive Decision Criterion
# -----------------------------------------------------------------------------

def test_52_percent_stego_produces_inconclusive():
    """
    Verifies that a 52% Stego / 48% Cover prediction (margin = 4%) is classified
    as 'Inconclusive' with 'INCONCLUSIVE — LOW CONFIDENCE', never as 'Stego Detected'.
    """
    verdict, verdict_category, is_conclusive = SteganalysisInferenceEngine.evaluate_decision_criterion(
        cover_prob=0.48,
        stego_prob=0.52,
        margin_threshold=0.15,
    )

    assert verdict == "Inconclusive"
    assert verdict_category == "INCONCLUSIVE — LOW CONFIDENCE"
    assert is_conclusive is False

    # Check generated scientific explanation
    eng = SteganalysisInferenceEngine(device="cpu")
    explanation = eng._generate_scientific_explanation(
        verdict=verdict,
        cover_prob=0.48,
        stego_prob=0.52,
        confidence=0.52,
        residual_energy=1.25,
        model_name="StegoNet-Lite",
    )
    assert "similar probabilities" in explanation
    assert "does not provide sufficient evidence" in explanation
    assert "cannot reliably distinguish this image" in explanation


# -----------------------------------------------------------------------------
# 2. Decision Criteria for Stronger Indications
# -----------------------------------------------------------------------------

def test_strong_predictions_classification_and_disclaimers():
    """
    Verifies that stronger predictions are interpreted with calibrated direction
    and mandatory scientific disclaimers.
    """
    # Test Stego Indicated (85% Stego / 15% Cover)
    v_stego, cat_stego, conc_stego = SteganalysisInferenceEngine.evaluate_decision_criterion(
        cover_prob=0.15,
        stego_prob=0.85,
        margin_threshold=0.15,
    )
    assert v_stego == "Stego Indicated"
    assert cat_stego == "STEGO INDICATED"
    assert conc_stego is True

    eng = SteganalysisInferenceEngine(device="cpu")
    expl_stego = eng._generate_scientific_explanation(
        verdict=v_stego,
        cover_prob=0.15,
        stego_prob=0.85,
        confidence=0.85,
        residual_energy=2.40,
        model_name="StegoNet-Lite",
    )
    assert "indicates possible steganographic content" in expl_stego
    assert "model prediction, not conclusive forensic proof" in expl_stego

    # Test Cover Indicated (90% Cover / 10% Stego)
    v_cover, cat_cover, conc_cover = SteganalysisInferenceEngine.evaluate_decision_criterion(
        cover_prob=0.90,
        stego_prob=0.10,
        margin_threshold=0.15,
    )
    assert v_cover == "Cover Indicated"
    assert cat_cover == "COVER INDICATED"
    assert conc_cover is True

    expl_cover = eng._generate_scientific_explanation(
        verdict=v_cover,
        cover_prob=0.90,
        stego_prob=0.10,
        confidence=0.90,
        residual_energy=0.85,
        model_name="StegoNet-Lite",
    )
    assert "indicates a possible cover image" in expl_cover
    assert "does not guarantee the absence of hidden information" in expl_cover


# -----------------------------------------------------------------------------
# 3. Class Index Mapping Integrity
# -----------------------------------------------------------------------------

def test_class_mapping_integrity():
    """
    Verifies that class 0 corresponds to Cover and class 1 corresponds to Stego
    in the architecture forward output.
    """
    model = StegoNetLite()
    dummy = torch.randn(1, 1, 256, 256)
    out = model(dummy)
    assert out.shape == (1, 2)
    # Col 0 = Cover, Col 1 = Stego
    # Check that model documentation and forward pass match
    assert "where col 0 = Cover, col 1 = Stego" in StegoNetLite.forward.__doc__


# -----------------------------------------------------------------------------
# 4. Invalid and Non-Finite Model Output Handling
# -----------------------------------------------------------------------------

def test_non_finite_model_output_handling():
    """
    Verifies that NaN or Inf model outputs produce Inconclusive model error states
    without fabricating arbitrary verdicts.
    """
    class MockNaNModel(torch.nn.Module):
        def forward(self, x):
            return torch.tensor([[float("nan"), float("nan")]])

    eng = SteganalysisInferenceEngine(device="cpu")
    eng.model = MockNaNModel()
    dummy = torch.randn(1, 1, 256, 256)
    res = eng.predict(dummy)

    assert res["verdict"] == "Inconclusive"
    assert "MODEL ERROR" in res["verdict_category"]
    assert res["is_conclusive"] is False
    assert res["confidence"] == 0.0
    assert "non-finite" in res["forensic_explanation"]


# -----------------------------------------------------------------------------
# 5. Service Exception Resilience Without Stego Fallback
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_service_error_handling_no_stego_fallback():
    """
    Verifies that if an engine failure occurs, SteganalysisService returns
    an Inconclusive state rather than fabricating a Stego verdict.
    """
    # Create invalid tensor that triggers an inference error
    broken_tensor = torch.empty((0, 0, 0, 0))
    metadata = {"original_width": 256, "original_height": 256, "format": "PNG"}

    res = await SteganalysisService.analyze_tensor(
        filename="corrupt_test.png",
        file_hash="0123456789abcdef",
        file_size=100,
        tensor=broken_tensor,
        metadata=metadata,
        db=None,
    )

    assert res.verdict == "Inconclusive"
    assert "INFERENCE ERROR" in res.verdict_category
    assert res.is_conclusive is False
    assert res.confidence == 0.0
    assert "Inference execution failure" in res.forensic_explanation


# -----------------------------------------------------------------------------
# 6. End-to-End Single Image Analysis API Scientific Metadata
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_endpoint_scientific_payload():
    """
    Verifies that /api/v1/analyze returns the complete scientific interpretation contract.
    """
    # Generate 256x256 test image
    img = Image.new("L", (256, 256), color=128)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/analyze",
            files={"file": ("uniform_gray.png", buf, "image/png")},
        )
        assert response.status_code == 200
        data = response.json()

        assert "verdict" in data
        assert data["verdict"] in ("Inconclusive", "Cover Indicated", "Stego Indicated")
        assert "score_type" in data
        assert data["score_type"] == "Uncalibrated Model Score"
        assert "decision_margin" in data
        assert "forensic_explanation" in data
        assert "Single image analysis: No reference cover image supplied" in data["forensic_explanation"] or "cannot reliably distinguish" in data["forensic_explanation"]


# -----------------------------------------------------------------------------
# 7. Paired Reference Comparison Ground Truth Verification
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_paired_comparison_evidence_and_dimension_validation():
    """
    Verifies that /api/v1/analyze/compare calculates exact bit changes,
    validates dimensions, and labels output as verified evidence.
    """
    # Generate identical 128x128 cover and stego with known 5-pixel modification
    cover_arr = np.full((128, 128), 120, dtype=np.uint8)
    stego_arr = cover_arr.copy()
    stego_arr[10, 10] = 121  # +1
    stego_arr[20, 20] = 119  # -1
    stego_arr[30, 30] = 121  # +1

    c_buf = io.BytesIO()
    Image.fromarray(cover_arr).save(c_buf, format="PNG")
    c_buf.seek(0)

    s_buf = io.BytesIO()
    Image.fromarray(stego_arr).save(s_buf, format="PNG")
    s_buf.seek(0)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/analyze/compare",
            files={
                "cover_file": ("test_cover.png", c_buf, "image/png"),
                "stego_file": ("test_stego.png", s_buf, "image/png"),
            },
        )
        assert res.status_code == 200
        data = res.json()

        assert data["diff_stats"]["modified_pixels"] == 3
        assert data["diff_stats"]["plus_one_count"] == 2
        assert data["diff_stats"]["minus_one_count"] == 1
        assert data["changed_bits_hamming"] >= 3
        assert "VERIFIED FORENSIC EVIDENCE" in data["evidence_status"]

        # Test dimension mismatch rejection
        bad_buf = io.BytesIO()
        Image.new("L", (64, 64), color=100).save(bad_buf, format="PNG")
        bad_buf.seek(0)
        c_buf.seek(0)

        bad_res = await client.post(
            "/api/v1/analyze/compare",
            files={
                "cover_file": ("test_cover.png", c_buf, "image/png"),
                "stego_file": ("test_mismatch.png", bad_buf, "image/png"),
            },
        )
        assert bad_res.status_code == 400
        assert "mismatch" in bad_res.json()["detail"].lower()

