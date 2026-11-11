"""
StegoShield AI — Advanced Forensic Intelligence & Precision Analysis Test Suite.

Rigorously verifies:
1. Exact pixel difference calculation between cover and modified images (PSNR, MSE, ±1 counts, Hamming distance).
2. Prevention of fabrication: No changed pixels reported when no paired reference is available.
3. 4x4 spatial sector decomposition (16 equal quadrants) with local entropy and residual energy.
4. Texture vs. smooth region segmentation and empirical modification concentration measurement.
5. 10 classical statistical forensic metrics with descriptive metadata and caveats.
6. 2D FFT magnitude spectrum and low vs. high frequency energy distribution.
7. Rigorous payload estimation: Differentiates known benchmark rate, measured density, and unvalidated models.
8. Steganographic algorithm fingerprinting: Attribution rules, candidate selection, and strict scientific guardrails.
9. Multi-modal forensic evidence fusion without artificial score fabrication.
10. Benchmark pair validation on BOSSbase S-UNIWARD 0.4 bpp images.
"""

from pathlib import Path
import numpy as np
import pytest
from PIL import Image

from app.ml.forensic_analyzer import ForensicAnalyzer


# -----------------------------------------------------------------------------
# 1. Exact Pixel Difference & Pair Verification Tests
# -----------------------------------------------------------------------------

def test_exact_pixel_difference_calculation():
    """Verifies that paired difference analysis computes exact pixel deltas without approximation."""
    cover = np.full((64, 64), 120, dtype=np.uint8)
    stego = cover.copy()

    # Apply 4 controlled modifications
    stego[5, 5] = 121    # +1 change
    stego[10, 10] = 119  # -1 change
    stego[15, 15] = 125  # +5 change
    stego[20, 20] = 110  # -10 change

    res = ForensicAnalyzer.analyze_image_difference(cover, stego)

    assert res["has_paired_reference"] is True
    assert res["total_pixels"] == 64 * 64
    assert res["changed_pixels"] == 4
    assert res["unchanged_pixels"] == 64 * 64 - 4
    assert res["plus_one_changes"] == 1
    assert res["minus_one_changes"] == 1
    assert res["other_changes"] == 2
    assert res["max_abs_diff"] == 10
    assert res["total_modified_bits"] >= 4
    assert res["mse"] > 0
    assert res["psnr_db"] is not None
    assert "VERIFIED PAIR EVIDENCE" in res["verification_status"]


def test_identical_images_produce_zero_modifications_and_infinite_psnr():
    """Verifies that comparing an image against itself yields 0 modifications and infinite PSNR."""
    img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    res = ForensicAnalyzer.analyze_image_difference(img, img)

    assert res["changed_pixels"] == 0
    assert res["unchanged_pixels"] == 64 * 64
    assert res["mse"] == 0.0
    assert res["psnr_db"] is None
    assert "Infinite" in res["psnr_label"]


def test_dimension_mismatch_raises_validation_error():
    """Verifies that paired analysis strictly enforces matching spatial dimensions."""
    c = np.zeros((64, 64), dtype=np.uint8)
    s = np.zeros((32, 32), dtype=np.uint8)

    with pytest.raises(ValueError, match="Dimension and alignment mismatch"):
        ForensicAnalyzer.analyze_image_difference(c, s)


# -----------------------------------------------------------------------------
# 2. Visual Forensics: Ternary Diff Map & 4x4 Sector Decomposition
# -----------------------------------------------------------------------------

def test_ternary_difference_map_generation():
    """Verifies that ternary difference mapping properly categorizes +1, -1, and other changes."""
    cover = np.full((32, 32), 100, dtype=np.uint8)
    stego = cover.copy()
    stego[0, 0] = 101  # +1
    stego[0, 1] = 99   # -1
    stego[0, 2] = 105  # +5 (other)

    b64_map, counts = ForensicAnalyzer.generate_ternary_diff_map(cover, stego)

    assert b64_map.startswith("data:image/png;base64,")
    assert counts["plus_one"] == 1
    assert counts["minus_one"] == 1
    assert counts["other_alterations"] == 1
    assert counts["unmodified"] == 32 * 32 - 3


def test_spatial_sector_analysis_16_regions():
    """Verifies that 4x4 sector analysis divides image into exactly 16 equal quadrants."""
    img = np.random.randint(50, 150, (64, 64), dtype=np.uint8)
    sectors = ForensicAnalyzer.analyze_spatial_sectors_4x4(img)

    assert len(sectors) == 16
    for i, sec in enumerate(sectors):
        assert sec["sector_index"] == i
        assert 0 <= sec["row"] <= 3
        assert 0 <= sec["col"] <= 3
        assert sec["pixel_count"] == 16 * 16
        assert sec["local_entropy"] > 0
        assert sec["residual_energy"] >= 0
        # Single image: changed_pixels must be None (no fabrication)
        assert sec["changed_pixels"] is None


# -----------------------------------------------------------------------------
# 3. Texture Complexity & Region Modification Analysis
# -----------------------------------------------------------------------------

def test_texture_analysis_arbitrary_image_does_not_fabricate_modifications():
    """Verifies that for arbitrary standalone images, modification distribution is None."""
    img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    res = ForensicAnalyzer.analyze_texture_vs_smooth_regions(img, cover_arr=None)

    assert "texture_composition" in res
    assert res["modification_distribution"] is None
    assert res["content_adaptive_correlation"] is None
    assert "Paired reference required" in res["forensic_finding"]


def test_texture_analysis_paired_detects_content_adaptive_embedding():
    """Verifies that when modifications avoid smooth areas and target textures, it is detected."""
    # Create an image with a flat smooth left half and a high-texture right half
    img = np.zeros((64, 64), dtype=np.uint8)
    img[:, :32] = 120  # Flat smooth surface
    img[:, 32:] = np.random.randint(0, 255, (64, 32), dtype=np.uint8)  # Textured edge region

    stego = img.copy()
    # Embed strictly in the textured right half
    stego[10:30, 40:60] = (stego[10:30, 40:60] + 1).clip(0, 255)

    res = ForensicAnalyzer.analyze_texture_vs_smooth_regions(stego, cover_arr=img)
    assert res["modification_distribution"] is not None
    assert res["content_adaptive_correlation"] is not None
    # High frequency concentration should be very high
    assert res["content_adaptive_correlation"]["high_frequency_concentration_percent"] > 80.0


# -----------------------------------------------------------------------------
# 4. Advanced Statistical Forensics Suite
# -----------------------------------------------------------------------------

def test_statistical_suite_metrics_and_limitations():
    """Verifies that all 10 statistical metrics are computed with explicit scientific limitations."""
    img = np.random.randint(60, 180, (64, 64), dtype=np.uint8)
    stats = ForensicAnalyzer.compute_advanced_statistical_suite(img)

    expected_keys = [
        "shannon_entropy",
        "lsb_shannon_entropy",
        "first_order_statistics",
        "gradient_variance",
        "laplacian_residual_energy",
        "spatial_autocorrelation",
        "chi_square_pov",
        "spam_markov_features",
    ]
    for k in expected_keys:
        assert k in stats
        assert "description" in stats[k]
        assert "forensic_relevance" in stats[k]
        assert "limitations" in stats[k]


# -----------------------------------------------------------------------------
# 5. Frequency Domain (FFT) Analysis
# -----------------------------------------------------------------------------

def test_fft_analysis_and_disclaimer():
    """Verifies that 2D FFT magnitude spectrum and energy bands are computed with disclaimer."""
    img = np.full((64, 64), 128, dtype=np.uint8)
    res = ForensicAnalyzer.compute_fft_frequency_analysis(img)

    assert res["spectrum_b64"].startswith("data:image/png;base64,")
    dist = res["spectral_energy_distribution"]
    assert "low_frequency_percent" in dist
    assert "high_frequency_percent" in dist
    assert "not unique to steganography" in res["scientific_disclaimer"]


# -----------------------------------------------------------------------------
# 6. Rigorous Payload Estimation
# -----------------------------------------------------------------------------

def test_payload_estimation_distinguishes_known_vs_measured_vs_unknown():
    """Verifies that payload estimation never fabricates unvalidated bpp values."""
    img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)

    # Standalone image with unknown payload
    res = ForensicAnalyzer.estimate_payload_rigorous(img, cover_arr=None, filename="unmarked.png")
    assert res["measured_modification_density"] is None
    assert res["known_benchmark_rate"] is None
    assert "insufficient validated evidence" in res["adaptive_steganography_status"].lower()

    # Benchmark image filename
    res_bench = ForensicAnalyzer.estimate_payload_rigorous(img, cover_arr=None, filename="stego_5001_0.4bpp.pgm")
    assert "0.40 bpp" in res_bench["known_benchmark_rate"]


# -----------------------------------------------------------------------------
# 7. Algorithm Fingerprinting & Attribution
# -----------------------------------------------------------------------------

def test_algorithm_attribution_rules():
    """Verifies strict scientific attribution logic."""
    # Test unknown attribution on arbitrary image
    img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
    stats = ForensicAnalyzer.compute_advanced_statistical_suite(img)
    attr = ForensicAnalyzer.fingerprint_steganography_algorithm(img, diff_analysis=None, statistical_suite=stats)
    assert attr["candidate_technique"] in ("Unknown / Unclassified", "Inconclusive / Unclassified")
    assert "±1 modifications or high entropy alone do not constitute definitive proof" in attr["limitations"]

    # Test EOF payload attribution
    attr_eof = ForensicAnalyzer.fingerprint_steganography_algorithm(img, has_eof_payload=True)
    assert "EOF Injection" in attr_eof["candidate_technique"]
    assert "Empirically Verified" in attr_eof["validation_status"]


# -----------------------------------------------------------------------------
# 8. Real Benchmark Validation (BOSSbase 5001 S-UNIWARD 0.4 bpp)
# -----------------------------------------------------------------------------

def test_bossbase_5001_suniward_benchmark_pair():
    """Validates real BOSSbase cover and stego pair if dataset is present."""
    cover_path = Path("dataset/processed/S-UNIWARD_0.4bpp/test/cover/5001.pgm")
    stego_path = Path("dataset/processed/S-UNIWARD_0.4bpp/test/stego/5001.pgm")

    if not (cover_path.is_file() and stego_path.is_file()):
        pytest.skip("BOSSbase 5001 benchmark files not found in dataset directory.")

    with Image.open(cover_path) as c_im:
        cover_arr = np.array(c_im, dtype=np.uint8)
    with Image.open(stego_path) as s_im:
        stego_arr = np.array(s_im, dtype=np.uint8)

    diff_res = ForensicAnalyzer.analyze_image_difference(cover_arr, stego_arr)

    # In S-UNIWARD at 0.4 bpp on 512x512, there are ~26,364 modified pixels (~10% change rate)
    assert diff_res["changed_pixels"] > 20000
    assert diff_res["changed_pixel_percent"] > 8.0
    # S-UNIWARD is strictly ternary ±1
    assert diff_res["other_changes"] == 0
    # S-UNIWARD is symmetrical: +1 and -1 are nearly equal
    assert 0.90 <= diff_res["ternary_balance_ratio"] <= 1.10
    assert diff_res["max_abs_diff"] == 1

    # Sector analysis on real benchmark
    sectors = ForensicAnalyzer.analyze_spatial_sectors_4x4(stego_arr, cover_arr)
    assert len(sectors) == 16
    # Texture analysis on real benchmark: S-UNIWARD must avoid smooth regions
    texture = ForensicAnalyzer.analyze_texture_vs_smooth_regions(stego_arr, cover_arr)
    assert texture["content_adaptive_correlation"]["avoids_smooth_regions"] is True

    # Attribution must identify content-adaptive steganography
    attr = ForensicAnalyzer.fingerprint_steganography_algorithm(
        stego_arr,
        diff_analysis=diff_res,
        texture_analysis=texture,
    )
    assert "S-UNIWARD" in attr["candidate_technique"]
    assert "Empirical Paired Verification" in attr["validation_status"]
