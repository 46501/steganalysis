"""
TASK 2F: Comprehensive verification of MATLAB-compatible S-UNIWARD fix in generate_suniward_dataset.py.
Compares Python outputs directly against GNU Octave 9.4.0 ground truth.
Tests SHA-256 determinism and reproducibility.
"""

import hashlib
import json
import sys
import time
from pathlib import Path
import numpy as np
import scipy.io as sio
from PIL import Image

sys.path.insert(0, r"D:\Stego\scripts")
from generate_suniward_dataset import (
    compute_suniward_costs,
    calc_lambda,
    ternary_entropy,
    embed_suniward,
)

OCTAVE_TEST_DIR = Path(r"D:\Stego\reports\suniward_validation\octave_test")
RAW_DIR = Path(r"D:\Stego\dataset\raw\BOSSbase")
REPORTS_DIR = Path(r"D:\Stego\reports\suniward_validation")
PAYLOAD = 0.4


def sha256_bytes(arr: np.ndarray) -> str:
    return hashlib.sha256(arr.tobytes()).hexdigest()


def main():
    print("=" * 85)
    print("TASK 2F VERIFICATION: PYTHON GENERATOR (WITH MATLAB-COMPATIBLE FIX) VS OCTAVE")
    print("=" * 85)

    results = {}

    for idx in [1, 2]:
        cover_path = RAW_DIR / f"{idx}.pgm"
        with Image.open(cover_path) as img:
            cover = np.array(img, dtype=np.int32)

        N = cover.size
        msg_len = PAYLOAD * N

        # 1. Load Octave ground truth
        oct_data = sio.loadmat(str(OCTAVE_TEST_DIR / f"{idx}_octave_detail.mat"))
        rho_oct = oct_data["rho"]
        rhoP_oct = oct_data["rhoP1"]
        rhoM_oct = oct_data["rhoM1"]

        oct_finite = rho_oct[rho_oct < 1e8]
        oct_mean_cost = float(np.mean(oct_finite))
        oct_min_cost = float(np.min(oct_finite))
        oct_max_cost = float(np.max(oct_finite))
        oct_median_cost = float(np.median(oct_finite))

        oct_rhoP_finite = rhoP_oct[rhoP_oct < 1e8]
        oct_rhoP_mean = float(np.mean(oct_rhoP_finite))

        # Expected Octave lambda from Task 2E
        if idx == 1:
            oct_lambda = 0.16605854034423828
            oct_entropy_bpp = 0.39974801511252916
        else:
            oct_lambda = 0.058144330978393555
            oct_entropy_bpp = 0.40019821211171414

        # Octave P arrays with exact Octave lambda
        denom_oct = 1.0 + np.exp(-oct_lambda * rhoP_oct) + np.exp(-oct_lambda * rhoM_oct)
        pP_oct = np.exp(-oct_lambda * rhoP_oct) / denom_oct
        pM_oct = np.exp(-oct_lambda * rhoM_oct) / denom_oct
        p0_oct = 1.0 - pP_oct - pM_oct

        # 2. Run Updated Python Implementation
        t0 = time.perf_counter()
        rho_p_py, rho_m_py = compute_suniward_costs(cover)
        cost_time = time.perf_counter() - t0

        # Raw rho before clamping (we can reconstruct from rho_p_py where cover < 255)
        # or evaluate rho directly
        py_rhoP_finite = rho_p_py[rho_p_py < 1e8]
        py_rhoP_mean = float(np.mean(py_rhoP_finite))
        py_min_cost = float(np.min(py_rhoP_finite))
        py_max_cost = float(np.max(py_rhoP_finite))
        py_median_cost = float(np.median(py_rhoP_finite))

        # Lambda solver
        t0 = time.perf_counter()
        py_lambda = calc_lambda(rho_p_py, rho_m_py, msg_len)
        lambda_time = time.perf_counter() - t0

        denom_py = 1.0 + np.exp(-py_lambda * rho_p_py) + np.exp(-py_lambda * rho_m_py)
        pP_py = np.exp(-py_lambda * rho_p_py) / denom_py
        pM_py = np.exp(-py_lambda * rho_m_py) / denom_py
        p0_py = 1.0 - pP_py - pM_py

        py_entropy = ternary_entropy(pP_py, pM_py)
        py_entropy_bpp = py_entropy / N

        # Cost comparison: rhoP finite mean comparison
        rel_cost_mean_diff = abs(oct_rhoP_mean - py_rhoP_mean) / oct_rhoP_mean * 100.0

        # P arrays comparison
        pP_max_diff = float(np.max(np.abs(pP_oct - pP_py)))
        pP_mean_diff = float(np.mean(np.abs(pP_oct - pP_py)))
        p0_max_diff = float(np.max(np.abs(p0_oct - p0_py)))
        p0_mean_diff = float(np.mean(np.abs(p0_oct - p0_py)))

        # 3. Embedding Simulation & Constraints
        seed = 100000 + idx
        stego1, stats1 = embed_suniward(cover, payload=PAYLOAD, seed=seed)
        stego2, stats2 = embed_suniward(cover, payload=PAYLOAD, seed=seed)

        # Reproducibility check
        sha1 = sha256_bytes(stego1)
        sha2 = sha256_bytes(stego2)
        is_reproducible = bool((sha1 == sha2) and (np.max(np.abs(stego1.astype(int) - stego2.astype(int))) == 0))

        # Ternary & Boundary constraints
        diff = stego1.astype(int) - cover
        abs_diff = np.abs(diff)
        max_abs_diff = int(np.max(abs_diff))
        is_ternary = bool(max_abs_diff <= 1)

        overflow_255 = int(np.sum((cover == 255) & (stego1 > 255)))
        underflow_0 = int(np.sum((cover == 0) & (stego1 < 0)))
        satisfies_boundaries = bool((overflow_255 == 0) and (underflow_0 == 0))

        total_changes = int(np.sum(diff != 0))
        plus_changes = int(np.sum(diff == 1))
        minus_changes = int(np.sum(diff == -1))
        change_rate = float(total_changes / N)
        expected_change_rate = float(np.mean(pP_py + pM_py))

        img_report = {
            "image": f"{idx}.pgm",
            "resolution": f"{cover.shape[0]}x{cover.shape[1]}",
            "distortion_costs": {
                "octave_rhoP_mean": round(oct_rhoP_mean, 6),
                "python_rhoP_mean": round(py_rhoP_mean, 6),
                "relative_mean_diff_percent": round(rel_cost_mean_diff, 8),
                "octave_min": round(oct_min_cost, 4),
                "python_min": round(py_min_cost, 4),
                "octave_median": round(oct_median_cost, 4),
                "python_median": round(py_median_cost, 4),
                "octave_max": round(oct_max_cost, 2),
                "python_max": round(py_max_cost, 2),
            },
            "lambda_solver": {
                "octave_lambda": round(oct_lambda, 6),
                "python_lambda": round(py_lambda, 6),
                "lambda_diff": round(abs(oct_lambda - py_lambda), 8),
            },
            "achieved_entropy": {
                "target_bpp": PAYLOAD,
                "octave_entropy_bpp": round(oct_entropy_bpp, 6),
                "python_entropy_bpp": round(py_entropy_bpp, 6),
                "entropy_diff_bpp": round(abs(oct_entropy_bpp - py_entropy_bpp), 8),
            },
            "probability_distributions": {
                "p_plus_max_abs_diff": pP_max_diff,
                "p_plus_mean_abs_diff": pP_mean_diff,
                "p_zero_max_abs_diff": p0_max_diff,
                "p_zero_mean_abs_diff": p0_mean_diff,
            },
            "embedding_simulation": {
                "seed": seed,
                "sha256": sha1,
                "is_deterministic_and_reproducible": is_reproducible,
                "max_abs_delta": max_abs_diff,
                "is_ternary_satisfied": is_ternary,
                "overflow_255_count": overflow_255,
                "underflow_0_count": underflow_0,
                "is_boundary_satisfied": satisfies_boundaries,
                "total_changes": total_changes,
                "change_rate": round(change_rate, 4),
                "expected_change_rate": round(expected_change_rate, 4),
                "plus_changes": plus_changes,
                "minus_changes": minus_changes,
            },
            "performance": {
                "cost_time_sec": round(cost_time, 3),
                "lambda_time_sec": round(lambda_time, 3),
            }
        }

        results[f"image_{idx}"] = img_report

        print(f"\n--- IMAGE {idx}.pgm RESULTS ---")
        print(f"Distortion Cost rhoP Finite Mean: Octave = {oct_rhoP_mean:.6f}, Python = {py_rhoP_mean:.6f} (Rel Diff: {rel_cost_mean_diff:.6f}%)")
        print(f"Lambda:                          Octave = {oct_lambda:.6f}, Python = {py_lambda:.6f} (Diff: {abs(oct_lambda - py_lambda):.8f})")
        print(f"Entropy:                         Octave = {oct_entropy_bpp:.6f} bpp, Python = {py_entropy_bpp:.6f} bpp")
        print(f"P(+1) Arrays:                    Max Diff = {pP_max_diff:.4e}, Mean Diff = {pP_mean_diff:.4e}")
        print(f"P(0) Arrays:                     Max Diff = {p0_max_diff:.4e}, Mean Diff = {p0_mean_diff:.4e}")
        print(f"Ternary Constraint (max |delta| <= 1): {is_ternary} (max = {max_abs_diff})")
        print(f"Boundary Clamp (0 & 255 violations):   {satisfies_boundaries} (255: {overflow_255}, 0: {underflow_0})")
        print(f"Reproducibility (Run 1 == Run 2):       {is_reproducible} (SHA256: {sha1})")
        print(f"Changes: {total_changes} ({change_rate*100:.2f}%) [Expected: {expected_change_rate*100:.2f}%]")

    # Save JSON report
    json_path = REPORTS_DIR / "task2f_verification_summary.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nVerification summary saved to: {json_path}")

if __name__ == "__main__":
    main()
