"""
Comprehensive numerical verification script for S-UNIWARD.
Generates exact numerical measurements for:
- Filter bank specifications
- Wavelet residuals and convolution tolerances
- Distortion costs (rho+, rho-)
- Embedding probabilities, lambda, and ternary entropy
- Payload vs Pixel Change Rate
- Stego output integrity and boundary constraints
Saves all outputs and logs strictly inside D:\Stego\reports\suniward_validation\
"""

import sys
import json
import hashlib
from pathlib import Path
import numpy as np
import scipy.signal
from PIL import Image

sys.path.append(str(Path("D:/Stego/scripts")))
from generate_suniward_dataset import (
    HPDF, LPDF, F_LH, F_HL, F_HH,
    compute_suniward_costs, calc_lambda, ternary_entropy, embed_suniward
)

VALIDATION_DIR = Path("D:/Stego/reports/suniward_validation")
RAW_DIR = Path("D:/Stego/dataset/raw/BOSSbase")


def run_numerical_verification():
    images = [1, 2]
    payload = 0.4
    results = {}

    # Section A: Filter Bank Verification
    # MATLAB exact coefficients as defined in S_UNIWARD.m lines 38-45
    matlab_hpdf = np.array([
        -0.0544158422,  0.3128715909, -0.6756307363,  0.5853546837,
         0.0158291053, -0.2840155430, -0.0004724846,  0.1287474266,
         0.0173693010, -0.0440882539, -0.0139810279,  0.0087460940,
         0.0048703530, -0.0003917404, -0.0006754494, -0.0001174768
    ], dtype=np.float64)

    matlab_lpdf = ((-1.0) ** np.arange(len(matlab_hpdf))) * matlab_hpdf[::-1]
    matlab_F1 = np.outer(matlab_lpdf, matlab_hpdf)
    matlab_F2 = np.outer(matlab_hpdf, matlab_lpdf)
    matlab_F3 = np.outer(matlab_hpdf, matlab_hpdf)

    hpdf_diff = float(np.max(np.abs(HPDF - matlab_hpdf)))
    lpdf_diff = float(np.max(np.abs(LPDF - matlab_lpdf)))
    F1_diff = float(np.max(np.abs(F_LH - matlab_F1)))
    F2_diff = float(np.max(np.abs(F_HL - matlab_F2)))
    F3_diff = float(np.max(np.abs(F_HH - matlab_F3)))

    results["filter_bank"] = {
        "hpdf_max_diff": hpdf_diff,
        "lpdf_max_diff": lpdf_diff,
        "F_LH_max_diff": F1_diff,
        "F_HL_max_diff": F2_diff,
        "F_HH_max_diff": F3_diff,
        "F_LH_shape": list(F_LH.shape),
        "F_HL_shape": list(F_HL.shape),
        "F_HH_shape": list(F_HH.shape),
    }

    # Section B: Convolution Algorithm Precision Verification
    # Compare direct 2D spatial convolution against FFT convolution on 512x512 with 16x16 kernel
    test_patch = np.random.RandomState(42).randn(128, 128)
    direct_conv = scipy.signal.convolve2d(test_patch, F_LH, mode='same')
    fft_conv = scipy.signal.fftconvolve(test_patch, F_LH, mode='same')
    conv_precision_diff = float(np.max(np.abs(direct_conv - fft_conv)))
    results["conv_precision_diff"] = conv_precision_diff

    # Section C to F: Process each image
    results["images"] = {}

    for idx in images:
        cover_path = RAW_DIR / f"{idx}.pgm"
        with Image.open(cover_path) as img:
            cover = np.array(img, dtype=np.int32)

        N = cover.size
        msg_len = payload * N  # 104857.6 bits

        # Distortion Costs
        rho_plus, rho_minus = compute_suniward_costs(cover)
        finite_mask = (rho_plus < 1e8) & (rho_minus < 1e8)

        rho_min = float(np.min(rho_plus[finite_mask]))
        rho_max = float(np.max(rho_plus[finite_mask]))
        rho_mean = float(np.mean(rho_plus[finite_mask]))
        rho_median = float(np.median(rho_plus[finite_mask]))

        # Boundary checks
        num_255 = int(np.sum(cover == 255))
        num_0 = int(np.sum(cover == 0))
        rho_plus_wet = int(np.sum(rho_plus >= 1e8))
        rho_minus_wet = int(np.sum(rho_minus >= 1e8))

        # Lambda Solver & Probabilities
        lam = calc_lambda(rho_plus, rho_minus, msg_len)

        exp_p = np.exp(-lam * rho_plus)
        exp_m = np.exp(-lam * rho_minus)
        denom = 1.0 + exp_p + exp_m
        p_plus = exp_p / denom
        p_minus = exp_m / denom
        p_zero = 1.0 - p_plus - p_minus

        # Entropy & Payload
        achieved_entropy_bits = ternary_entropy(p_plus, p_minus)
        achieved_payload_bpp = achieved_entropy_bits / N
        payload_error_bpp = abs(achieved_payload_bpp - payload)
        payload_relative_error_pct = (payload_error_bpp / payload) * 100

        # Change Rates
        expected_change_rate = float(np.mean(p_plus + p_minus))
        expected_changes = expected_change_rate * N

        # Simulation
        seed = 100000 + idx
        stego, stats = embed_suniward(cover, payload=payload, seed=seed)

        actual_changes = stats["total_changes"]
        actual_change_rate = stats["change_rate"]
        actual_plus = stats["plus_changes"]
        actual_minus = stats["minus_changes"]

        # Pixel delta verification
        diff = stego.astype(int) - cover
        max_abs_diff = int(np.max(np.abs(diff)))
        min_pixel = int(np.min(stego))
        max_pixel = int(np.max(stego))

        results["images"][f"{idx}.pgm"] = {
            "resolution": f"{cover.shape[1]}x{cover.shape[0]}",
            "total_pixels": N,
            "target_payload_bpp": payload,
            "target_entropy_bits": msg_len,
            "cost_stats": {
                "min": rho_min,
                "max": rho_max,
                "mean": round(rho_mean, 4),
                "median": round(rho_median, 4),
                "wet_cost_plus_count": rho_plus_wet,
                "wet_cost_minus_count": rho_minus_wet,
                "boundary_255_pixels": num_255,
                "boundary_0_pixels": num_0,
            },
            "lambda": round(lam, 6),
            "probabilities": {
                "p_plus_mean": float(np.mean(p_plus)),
                "p_minus_mean": float(np.mean(p_minus)),
                "p_zero_mean": float(np.mean(p_zero)),
                "p_plus_max": float(np.max(p_plus)),
                "p_minus_max": float(np.max(p_minus)),
                "sum_probabilities_check": float(np.max(np.abs(p_plus + p_minus + p_zero - 1.0))),
            },
            "payload_verification": {
                "achieved_entropy_bits": round(achieved_entropy_bits, 4),
                "achieved_payload_bpp": round(achieved_payload_bpp, 6),
                "payload_error_bpp": round(payload_error_bpp, 8),
                "payload_relative_error_pct": round(payload_relative_error_pct, 6),
            },
            "change_rate_comparison": {
                "expected_change_rate_pct": round(expected_change_rate * 100, 4),
                "actual_change_rate_pct": round(actual_change_rate * 100, 4),
                "expected_changes_count": round(expected_changes),
                "actual_changes_count": actual_changes,
                "plus1_changes": actual_plus,
                "minus1_changes": actual_minus,
                "plus1_ratio": round(actual_plus / actual_changes, 4) if actual_changes > 0 else 0,
            },
            "output_constraints": {
                "max_abs_delta": max_abs_diff,
                "strict_ternary_satisfied": max_abs_diff <= 1,
                "min_pixel_value": min_pixel,
                "max_pixel_value": max_pixel,
                "range_0_255_satisfied": (min_pixel >= 0 and max_pixel <= 255),
            },
        }

    out_json = VALIDATION_DIR / "numerical_verification_results.json"
    with open(out_json, "w") as f:
        json.dump(results, f, indent=2)

    print("Numerical verification completed successfully.")
    print(f"Results written to: {out_json}")
    return results


if __name__ == "__main__":
    run_numerical_verification()

