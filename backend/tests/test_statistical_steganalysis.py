"""
StegoShield AI — Statistical Steganalysis Unit Tests.
Verifies Chi-Square, Sample Pair Analysis, and RS Steganalysis mathematical behavior.
"""

import numpy as np
import pytest
from app.ml.statistical_steganalysis import StatisticalSteganalysis


def test_clean_cover_image_metrics():
    np.random.seed(42)
    # Natural image synthetic simulation: correlated random walk
    clean = np.clip(np.cumsum(np.random.randn(256, 256) * 1.5, axis=1) + 128, 0, 255).astype(np.uint8)
    results = StatisticalSteganalysis.run_all_tests(clean)

    assert results["aggregate_verdict"] == "Cover / Clean"
    assert results["tests_flagged"] == 0
    assert results["tests_passed"] == 3
    assert results["sample_pair"]["estimated_payload_bpp"] < 0.10
    assert results["rs_analysis"]["rs_delta"] < 0.05


def test_lsb_stego_image_detection():
    np.random.seed(42)
    clean = np.clip(np.cumsum(np.random.randn(256, 256) * 1.5, axis=1) + 128, 0, 255).astype(np.uint8)

    # 100% LSB replacement
    stego = clean.copy()
    stego = (stego & np.uint8(0xFE)) | np.random.randint(0, 2, (256, 256), dtype=np.uint8)

    results = StatisticalSteganalysis.run_all_tests(stego)

    assert results["aggregate_verdict"] == "Stego Indicated"
    assert results["tests_flagged"] >= 2
    assert results["sample_pair"]["verdict"] == "Stego Indicated"
    assert results["sample_pair"]["estimated_payload_bpp"] > 0.80
    assert results["rs_analysis"]["verdict"] == "Stego Indicated"
    assert results["rs_analysis"]["rs_delta"] > 0.20
