"""
StegoShield AI — Scientific Detector Confidence & Paired Verification Regression Test Suite.

Validates the 7 scientific criteria:
1. Untrained SRNet standalone inference is disabled to prevent misleading random chance (50/50) classifications.
2. StegoNet-Lite single-image blind inference reports honest decision margin and inconclusive status when appropriate.
3. Paired reference comparison with identical cover verifies bit-for-bit identity (0 altered pixels, PSNR = inf).
4. Paired reference comparison with ternary stego identifies symmetric +/-1 perturbations consistent with steganography.
5. Discrimination: Distinguishes +/-1 ternary steganography from ordinary image edits (e.g. global +1 brightness shift).
6. Discrimination: Distinguishes steganography from macro alterations and JPEG recompression (max delta > 1).
7. Dimension mismatch and unrelated images are safely handled without crash or false attribution.
8. Multi-modal statistical suite discloses non-independence of PoV attacks and domain restriction to LSB replacement.
"""

import pytest
import torch
import numpy as np

from app.ml.inference import SteganalysisInferenceEngine
from app.services.steganalysis_service import SteganalysisService
from app.ml.statistical_steganalysis import StatisticalSteganalysis


@pytest.fixture
def inference_engine():
    return SteganalysisInferenceEngine()


def test_srnet_standalone_inference_disabled(inference_engine):
    """Criterion 1: Untrained SRNet standalone inference must be disabled."""
    dummy_tensor = torch.zeros((1, 1, 256, 256), dtype=torch.float32)
    result = inference_engine.predict(dummy_tensor, model_name="srnet")

    assert result["is_conclusive"] is False
    assert result["confidence"] == 0.0
    assert result["verdict"] == "Inconclusive"
    assert "RESEARCH BLUEPRINT" in result["verdict_category"]
    assert "disabled" in result["forensic_explanation"].lower()


def test_stegonet_lite_single_image_honest_margin(inference_engine):
    """Criterion 2 & 3: StegoNet-Lite single image inference reports honest decision margin."""
    dummy_tensor = torch.zeros((1, 1, 256, 256), dtype=torch.float32)
    result = inference_engine.predict(dummy_tensor, model_name="stegonet_lite")

    assert "verdict" in result
    assert "confidence" in result
    assert "decision_margin" in result
    assert "is_conclusive" in result
    # When decision margin is tight (< 0.15), it must be flagged inconclusive
    if result["decision_margin"] < 0.15:
        assert result["is_conclusive"] is False
        assert "INCONCLUSIVE" in result["verdict_category"]


@pytest.mark.asyncio
async def test_paired_reference_identical_images():
    """Criterion 4: Paired reference comparison with identical cover verifies zero differential modification."""
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
    assert result.confidence == 1.0
    assert result.cover_probability == 1.0
    assert result.stego_probability == 0.0
    assert result.is_conclusive is True
    assert result.difference_analysis is not None
    assert result.difference_analysis["changed_pixels"] == 0
    assert result.difference_analysis["pattern_classification"] == "identical_carrier"
    assert "IDENTICAL" in result.verdict_category


@pytest.mark.asyncio
async def test_paired_reference_true_ternary_steganography():
    """Criterion 4 & 5: Authentic paired reference with +/-1 ternary embedding identifies ternary profile."""
    rng = np.random.RandomState(42)
    cover_arr = rng.randint(50, 200, (512, 512), dtype=np.uint8)

    # Simulate S-UNIWARD ternary perturbations (+/-1 on 10% of pixels, balanced)
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

    assert result.verdict == "Modification Detected"
    assert result.is_conclusive is True
    assert result.difference_analysis is not None
    assert result.difference_analysis["changed_pixels"] > 0
    assert result.difference_analysis["max_abs_diff"] == 1
    assert result.difference_analysis["pattern_classification"] == "ternary_steganography_profile"
    assert result.difference_analysis["symmetry_ratio"] >= 0.50
    assert "TERNARY PERTURBATIONS DETECTED" in result.verdict_category


@pytest.mark.asyncio
async def test_paired_reference_distinguishes_global_brightness_shift():
    """Criterion 5: Distinguishes +/-1 perturbations from ordinary global brightness shifts (non-stego)."""
    rng = np.random.RandomState(42)
    cover_arr = rng.randint(50, 200, (512, 512), dtype=np.uint8)

    # Simulate global image edit: +1 brightness shift across all pixels
    edited_arr = np.clip(cover_arr.astype(np.int16) + 1, 0, 255).astype(np.uint8)

    carrier_tensor = torch.from_numpy(edited_arr).float().unsqueeze(0).unsqueeze(0)
    ref_tensor = torch.from_numpy(cover_arr).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 512, "original_height": 512, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="brightness_shifted.png",
        file_hash="test_bright_hash_003",
        file_size=262144,
        tensor=carrier_tensor,
        metadata=meta,
        model_name="stegonet_lite",
        reference_tensor=ref_tensor,
        reference_filename="authentic_original_5001.pgm",
        db=None,
    )

    # Max diff is 1, but changes are 100% unidirectional (+1 only).
    # Must be classified as Global Luminance Shift, NOT Stego!
    assert result.difference_analysis is not None
    assert result.difference_analysis["max_abs_diff"] == 1
    assert result.difference_analysis["pattern_classification"] == "global_directional_shift"
    assert result.difference_analysis["minus_one_changes"] == 0
    assert result.difference_analysis["plus_one_changes"] > 0
    assert result.verdict == "Modification Detected (Non-Stego Edit)"
    assert "GLOBAL LUMINANCE SHIFT" in result.verdict_category


@pytest.mark.asyncio
async def test_paired_reference_distinguishes_macro_recompression():
    """Criterion 5 & 7: Distinguishes steganography from macro alterations and JPEG recompression (max delta > 1)."""
    rng = np.random.RandomState(42)
    cover_arr = rng.randint(50, 200, (512, 512), dtype=np.uint8)

    # Simulate lossy JPEG compression artifacts: perturbations in [-5, 5]
    recompressed = cover_arr.copy().astype(np.int16)
    noise = rng.randint(-5, 6, size=(512, 512))
    recompressed += noise
    recompressed = np.clip(recompressed, 0, 255).astype(np.uint8)

    carrier_tensor = torch.from_numpy(recompressed).float().unsqueeze(0).unsqueeze(0)
    ref_tensor = torch.from_numpy(cover_arr).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 512, "original_height": 512, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="jpeg_recompressed.png",
        file_hash="test_recomp_hash_004",
        file_size=262144,
        tensor=carrier_tensor,
        metadata=meta,
        model_name="stegonet_lite",
        reference_tensor=ref_tensor,
        reference_filename="authentic_original_5001.pgm",
        db=None,
    )

    assert result.difference_analysis is not None
    assert result.difference_analysis["max_abs_diff"] > 1
    assert result.difference_analysis["pattern_classification"] == "macro_alteration_or_recompression"
    assert "MACRO ALTERATIONS" in result.verdict_category
    assert result.is_conclusive is False


@pytest.mark.asyncio
async def test_paired_reference_dimension_mismatch_rejected():
    """Criterion 7: Reference with mismatched dimensions must be safely rejected without crashing."""
    arr1 = np.zeros((512, 512), dtype=np.uint8)
    arr2 = np.zeros((256, 256), dtype=np.uint8)

    carrier_tensor = torch.from_numpy(arr1).float().unsqueeze(0).unsqueeze(0)
    ref_tensor = torch.from_numpy(arr2).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 512, "original_height": 512, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="carrier_512.png",
        file_hash="test_hash_005",
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


def test_statistical_suite_lsb_vs_ternary_independence():
    """Criterion 6: Confirms LSB suite detects LSB replacement, but discloses inefficacy against ternary S-UNIWARD."""
    from scipy.ndimage import gaussian_filter

    rng = np.random.RandomState(42)
    # Natural correlated image
    raw = rng.randint(20, 230, (256, 256)).astype(np.float32)
    cover = gaussian_filter(raw, sigma=2.0).astype(np.uint8)

    # 1. Clean cover test
    res_clean = StatisticalSteganalysis.run_all_tests(cover)
    assert "suite_domain" in res_clean
    assert "independence_disclosure" in res_clean
    assert "PoV" in res_clean["independence_disclosure"]

    # 2. LSB Replacement test (100% LSB replaced with random bits)
    stego_lsb = (cover.copy() & 254) | rng.randint(0, 2, (256, 256), dtype=np.uint8)
    res_lsb = StatisticalSteganalysis.run_all_tests(stego_lsb)
    assert res_lsb["aggregate_verdict"] == "LSB Replacement Detected"
    assert res_lsb["tests_flagged"] >= 2

    # 3. Ternary +/-1 steganography test (S-UNIWARD style: +/-1 increments, not LSB replacement)
    stego_ternary = cover.copy().astype(np.int16)
    mask = rng.rand(256, 256) < 0.10
    stego_ternary[mask] += rng.choice([-1, 1], size=(256, 256))[mask]
    stego_ternary = np.clip(stego_ternary, 0, 255).astype(np.uint8)

    res_ternary = StatisticalSteganalysis.run_all_tests(stego_ternary)
    # LSB replacement attacks must NOT claim definitive stego on ternary embedding
    assert res_lsb["tests_flagged"] > res_ternary["tests_flagged"]
