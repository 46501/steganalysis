"""
Compare numerical results between GNU Octave official S-UNIWARD and Python implementation.
Saves all outputs only inside D:\\Stego\\reports\\suniward_validation\\octave_test\\.
"""

import sys
import os
import json
import re
import time
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, r"D:\Stego\scripts")
from generate_suniward_dataset import (
    compute_suniward_costs,
    calc_lambda,
    ternary_entropy,
    embed_suniward,
    save_pgm_image,
)

OCTAVE_TEST_DIR = Path(r"D:\Stego\reports\suniward_validation\octave_test")
RAW_DIR = Path(r"D:\Stego\dataset\raw\BOSSbase")
PAYLOAD = 0.4

def parse_octave_text_mat(path: Path) -> dict:
    data = {}
    current_name = None
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith("# name:"):
            current_name = line.split(":", 1)[1].strip()
        elif current_name and not line.startswith("#") and len(line) > 0:
            try:
                data[current_name] = float(line)
            except ValueError:
                pass
            current_name = None
    return data

def run_comparison():
    report_data = {}

    for idx in [1, 2]:
        cover_path = RAW_DIR / f"{idx}.pgm"
        with Image.open(cover_path) as img:
            cover = np.array(img, dtype=np.int32)
        
        N = cover.size
        msg_len = PAYLOAD * N

        # 1. Load Octave stego & stats
        octave_stego_path = OCTAVE_TEST_DIR / f"{idx}_stego_octave.pgm"
        with Image.open(octave_stego_path) as img:
            stego_octave = np.array(img, dtype=np.int32)
        
        octave_data = parse_octave_text_mat(OCTAVE_TEST_DIR / f"{idx}_octave_stats.mat")
        
        octave_diff = stego_octave - cover
        octave_abs_diff = np.abs(octave_diff)
        oct_max_diff = int(np.max(octave_abs_diff))
        oct_changes = int(np.sum(octave_diff != 0))
        oct_plus = int(np.sum(octave_diff == 1))
        oct_minus = int(np.sum(octave_diff == -1))
        oct_change_rate = float(oct_changes / N)
        oct_lambda = float(octave_data["lambda"])
        oct_entropy = float(octave_data["achievedEntropy"])
        oct_payload_bpp = float(octave_data["achievedPayloadBpp"])
        oct_cost_min = float(octave_data["minCost"])
        oct_cost_max = float(octave_data["maxCost"])
        oct_cost_mean = float(octave_data["meanCost"])
        oct_cost_median = float(octave_data["medianCost"])
        oct_elapsed = float(octave_data["elapsedTime"])

        # Boundary checks for Octave
        boundary_255_violations_oct = int(np.sum((cover == 255) & (stego_octave > 255)))
        boundary_0_violations_oct = int(np.sum((cover == 0) & (stego_octave < 0)))

        # 2. Run Python S-UNIWARD implementation
        t0 = time.perf_counter()
        rho_p_py, rho_m_py = compute_suniward_costs(cover)
        py_cost_time = time.perf_counter() - t0

        rho_py_finite = rho_p_py[rho_p_py < 1e8]
        py_cost_min = float(np.min(rho_py_finite))
        py_cost_max = float(np.max(rho_py_finite))
        py_cost_mean = float(np.mean(rho_py_finite))
        py_cost_median = float(np.median(rho_py_finite))

        # Solve lambda in Python
        t0 = time.perf_counter()
        py_lambda = calc_lambda(rho_p_py, rho_m_py, msg_len)
        py_lambda_time = time.perf_counter() - t0

        exp_p = np.exp(-py_lambda * rho_p_py)
        exp_m = np.exp(-py_lambda * rho_m_py)
        denom = 1.0 + exp_p + exp_m
        p_plus_py = exp_p / denom
        p_minus_py = exp_m / denom
        py_entropy = ternary_entropy(p_plus_py, p_minus_py)
        py_payload_bpp = py_entropy / N

        # Embed using Python
        seed = 100000 + idx
        stego_py, stats_py = embed_suniward(cover, payload=PAYLOAD, seed=seed)
        py_stego_path = OCTAVE_TEST_DIR / f"{idx}_stego_python.pgm"
        save_pgm_image(py_stego_path, stego_py)

        py_diff = stego_py.astype(np.int32) - cover
        py_abs_diff = np.abs(py_diff)
        py_max_diff = int(np.max(py_abs_diff))
        py_changes = int(np.sum(py_diff != 0))
        py_plus = int(np.sum(py_diff == 1))
        py_minus = int(np.sum(py_diff == -1))
        py_change_rate = float(py_changes / N)

        boundary_255_violations_py = int(np.sum((cover == 255) & (stego_py > 255)))
        boundary_0_violations_py = int(np.sum((cover == 0) & (stego_py < 0)))

        # Compare costs between Octave and Python
        cost_diff_abs = abs(py_cost_mean - oct_cost_mean)
        cost_diff_rel = cost_diff_abs / oct_cost_mean

        report_data[f"image_{idx}"] = {
            "cover": f"{idx}.pgm",
            "resolution": f"{cover.shape[0]}x{cover.shape[1]}",
            "octave": {
                "elapsed_sec": round(oct_elapsed, 3),
                "cost_min": round(oct_cost_min, 4),
                "cost_max": round(oct_cost_max, 2),
                "cost_mean": round(oct_cost_mean, 4),
                "cost_median": round(oct_cost_median, 4),
                "lambda": round(oct_lambda, 6),
                "achieved_entropy_bits": round(oct_entropy, 2),
                "achieved_payload_bpp": round(oct_payload_bpp, 6),
                "payload_error_bpp": round(abs(oct_payload_bpp - PAYLOAD), 6),
                "total_changes": oct_changes,
                "change_rate": round(oct_change_rate, 4),
                "plus_changes": oct_plus,
                "minus_changes": oct_minus,
                "max_abs_diff": oct_max_diff,
                "boundary_255_violations": boundary_255_violations_oct,
                "boundary_0_violations": boundary_0_violations_oct,
            },
            "python": {
                "elapsed_sec": round(stats_py["duration_sec"], 3),
                "cost_min": round(py_cost_min, 4),
                "cost_max": round(py_cost_max, 2),
                "cost_mean": round(py_cost_mean, 4),
                "cost_median": round(py_cost_median, 4),
                "lambda": round(float(py_lambda), 6),
                "achieved_entropy_bits": round(float(py_entropy), 2),
                "achieved_payload_bpp": round(float(py_payload_bpp), 6),
                "payload_error_bpp": round(abs(py_payload_bpp - PAYLOAD), 6),
                "total_changes": py_changes,
                "change_rate": round(py_change_rate, 4),
                "plus_changes": py_plus,
                "minus_changes": py_minus,
                "max_abs_diff": py_max_diff,
                "boundary_255_violations": boundary_255_violations_py,
                "boundary_0_violations": boundary_0_violations_py,
            },
            "comparison": {
                "lambda_difference": round(abs(oct_lambda - py_lambda), 6),
                "cost_mean_diff_abs": round(cost_diff_abs, 6),
                "cost_mean_diff_rel_percent": round(cost_diff_rel * 100.0, 6),
                "entropy_diff_bits": round(abs(oct_entropy - py_entropy), 2),
                "change_rate_diff": round(abs(oct_change_rate - py_change_rate), 4),
                "both_satisfy_ternary": (oct_max_diff <= 1) and (py_max_diff <= 1),
                "both_satisfy_boundaries": (boundary_255_violations_oct == 0) and (boundary_0_violations_oct == 0) and (boundary_255_violations_py == 0) and (boundary_0_violations_py == 0),
            }
        }

    # Save JSON report
    json_path = OCTAVE_TEST_DIR / "comparison_summary.json"
    with open(json_path, "w") as f:
        json.dump(report_data, f, indent=2)

    print("=== COMPARISON SUMMARY JSON GENERATED ===")
    print(json.dumps(report_data, indent=2))

if __name__ == "__main__":
    run_comparison()
