"""
StegoShield AI — Scientific Detector Confidence & Paired Verification Regression Test Suite.
Validates:
1. Untrained SRNet standalone inference is disabled to prevent random chance (50/50) classifications.
2. Single-image blind inference reports honest decision margin and inconclusive status when appropriate.
3. Paired reference comparison with identical cover proves pristine cover status (99.9% confidence).
4. Paired reference comparison with ternary stego directly proves S-UNIWARD payload (99.9% confidence).
5. Dimension mismatch between suspected carrier and reference cover is safely rejected.
"""

import pytest
import torch
import numpy as np

from app.ml.inference import SteganalysisInferenceEngine
from app.services.steganalysis_service import SteganalysisService


@pytest.fixture
def inference_engine():
    return SteganalysisInferenceEngine()


def test_srnet_standalone_inference_disabled(inference_engine):
    """Phase 1: Untrained SRNet standalone inference must be disabled."""
    dummy_tensor = torch.zeros((1, 1, 256, 256), dtype=torch.float32)
    result = inference_engine.predict(dummy_tensor, model_name="srnet")

    assert result["is_conclusive"] is False
    assert result["confidence"] == 0.0
    assert result["verdict"] == "Inconclusive"
    assert "RESEARCH BLUEPRINT" in result["verdict_category"]
    assert "disabled" in result["forensic_explanation"].lower()


def test_stegonet_lite_single_image_honest_margin(inference_engine):
    """Phase 2 & 5: StegoNet-Lite single image inference reports honest decision margin."""
    dummy_tensor = torch.zeros((1, 1, 256, 256), dtype=torch.float32)
    result = inference_engine.predict(dummy_tensor, model_name="stegonet_lite")

    assert "verdict" in result
    assert "confidence" in result
    assert "decision_margin" in result
    assert "is_conclusive" in result
    # If decision margin is tight (< 0.15), it must be flagged inconclusive
    if result["decision_margin"] < 0.15:
        assert result["is_conclusive"] is False
        assert "INCONCLUSIVE" in result["verdict_category"]


@pytest.mark.asyncio
async def test_paired_reference_identical_cover_proof():
    """Phase 4: Authentic paired reference with identical cover gives 99.9% confidence."""
    rng = np.random.RandomState(42)
    cover_arr = rng.randint(50, 200, (512, 512), dtype=np.uint8)

    carrier_tensor = torch.from_numpy(cover_arr).float().unsqueeze(0).unsqueeze(0)
    ref_tensor = torch.from_numpy(cover_arr).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 512, "original_height": 512, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="suspect_cover.png",
        file_hash="test_cover_hash_001",
        file_size=262144,
        tensor=carrier_tensor,
        metadata=meta,
        model_name="stegonet_lite",
        reference_tensor=ref_tensor,
        reference_filename="authentic_original_5001.pgm",
        db=None,
    )

    assert result.verdict == "Cover Indicated"
    assert result.confidence >= 0.99
    assert result.cover_probability == 1.0
    assert result.stego_probability == 0.0
    assert result.is_conclusive is True
    assert result.difference_analysis is not None
    assert result.difference_analysis["changed_pixels"] == 0
    assert "PRISTINE COVER VERIFIED" in result.verdict_category


@pytest.mark.asyncio
async def test_paired_reference_ternary_stego_proof():
    """Phase 4: Authentic paired reference with +/-1 ternary embedding gives 99.9% confidence."""
    rng = np.random.RandomState(42)
    cover_arr = rng.randint(50, 200, (512, 512), dtype=np.uint8)

    # Simulate S-UNIWARD ternary perturbations (+/-1 on 10% of pixels)
    stego_arr = cover_arr.copy().astype(np.int16)
    mask = rng.rand(512, 512) < 0.10
    perturbations = rng.choice([-1, 1], size=(512, 512))
    stego_arr[mask] += perturbations[mask]
    stego_arr = np.clip(stego_arr, 0, 255).astype(np.uint8)

    carrier_tensor = torch.from_numpy(stego_arr).float().unsqueeze(0).unsqueeze(0)
    ref_tensor = torch.from_numpy(cover_arr).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 512, "original_height": 512, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="suspect_stego_0.4bpp.png",
        file_hash="test_stego_hash_002",
        file_size=262144,
        tensor=carrier_tensor,
        metadata=meta,
        model_name="stegonet_lite",
        reference_tensor=ref_tensor,
        reference_filename="authentic_original_5001.pgm",
        db=None,
    )

    assert result.verdict == "Stego Indicated"
    assert result.confidence >= 0.99
    assert result.stego_probability == 1.0
    assert result.cover_probability == 0.0
    assert result.is_conclusive is True
    assert result.difference_analysis is not None
    assert result.difference_analysis["changed_pixels"] > 0
    assert result.difference_analysis["max_abs_diff"] == 1
    assert "STEGO VERIFIED" in result.verdict_category


@pytest.mark.asyncio
async def test_paired_reference_dimension_mismatch_rejected():
    """Phase 4: Reference with mismatched dimensions must not crash and reject paired comparison."""
    arr1 = np.zeros((512, 512), dtype=np.uint8)
    arr2 = np.zeros((256, 256), dtype=np.uint8)

    carrier_tensor = torch.from_numpy(arr1).float().unsqueeze(0).unsqueeze(0)
    ref_tensor = torch.from_numpy(arr2).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 512, "original_height": 512, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="carrier_512.png",
        file_hash="test_hash_003",
        file_size=262144,
        tensor=carrier_tensor,
        metadata=meta,
        model_name="stegonet_lite",
        reference_tensor=ref_tensor,
        reference_filename="mismatched_ref_256.png",
        db=None,
    )

    # Difference analysis should be None due to dimension mismatch guard
    assert result.difference_analysis is None
