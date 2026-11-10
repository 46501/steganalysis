"""
TASK 2F.2: Comprehensive End-to-End Audit Script
Gathers all empirical and numerical metrics across Parts A, B, C, D, E, F.
"""

import sys
import os
import json
import time
import hashlib
from pathlib import Path
import numpy as np
import scipy.io as sio
from PIL import Image

sys.path.insert(0, r"D:\Stego\scripts")
from generate_suniward_dataset import (
    HPDF, LPDF, FILTERS, ROTATED_KERNELS,
    conv2_matlab, compute_suniward_costs, calc_lambda, ternary_entropy, embed_suniward
)

OCTAVE_TEST_DIR = Path(r"D:\Stego\reports\suniward_validation\octave_test")
RAW_DIR = Path(r"D:\Stego\dataset\raw\BOSSbase")
PROCESSED_DIR = Path(r"D:\Stego\dataset\processed\S-UNIWARD_0.4bpp")
REPORTS_DIR = Path(r"D:\Stego\reports\suniward_validation")
PAYLOAD = 0.4

def sha256_bytes(arr: np.ndarray) -> str:
    return hashlib.sha256(arr.tobytes()).hexdigest()

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def run_audit():
    print("=" * 85)
    print("TASK 2F.2: FINAL COMPREHENSIVE S-UNIWARD VALIDATION AUDIT")
    print("=" * 85)

    audit_results = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "python_version": sys.version,
            "numpy_version": np.__version__,
            "scipy_version": sio.__version__ if hasattr(sio, "__version__") else "scipy",
            "octave_version": "GNU Octave 9.4.0 (x86_64-w64-mingw32)",
        },
        "images": {},
        "performance": {},
        "safety_audit": {}
    }

    # Audit for Image 1 and Image 2
    for idx in [1, 2]:
        print(f"\n=================== AUDITING IMAGE {idx}.pgm ===================")
        cover_path = RAW_DIR / f"{idx}.pgm"
        with Image.open(cover_path) as img:
            cover = np.array(img, dtype=np.int32)
        
        k, l = cover.shape
        N = cover.size
        msg_len = PAYLOAD * N
        pad = 16
        cover_padded = np.pad(cover, pad, mode='symmetric')

        # Load Octave detail
        oct_data = sio.loadmat(str(OCTAVE_TEST_DIR / f"{idx}_octave_detail.mat"))
        rho_oct = oct_data["rho"]
        rhoP_oct = oct_data["rhoP1"]
        rhoM_oct = oct_data["rhoM1"]
        R_oct = [oct_data["R1"], oct_data["R2"], oct_data["R3"]]
        xi_oct = [oct_data["xi1"], oct_data["xi2"], oct_data["xi3"]]

        if idx == 1:
            oct_lambda = 0.16605854034423828
            oct_entropy_bpp = 0.39974801511252916
            oct_iter = 25
        else:
            oct_lambda = 0.058144330978393555
            oct_entropy_bpp = 0.40019821211171414
            oct_iter = 27

        # ---------------- PART A: ALGORITHM VERIFICATION ----------------
        t_start_cost = time.perf_counter()
        rhoP_py, rhoM_py = compute_suniward_costs(cover)
        cost_duration = time.perf_counter() - t_start_cost

        # Residuals
        R_py = [conv2_matlab(cover_padded, F) for F in FILTERS]
        R_errs = []
        for f_idx in range(3):
            r_diff = np.abs(R_oct[f_idx] - R_py[f_idx])
            R_errs.append({
                "max_abs": float(np.max(r_diff)),
                "mean_abs": float(np.mean(r_diff))
            })

        # Distortion costs on finite elements
        finite_mask_P = (rhoP_oct < 1e8) & (rhoP_py < 1e8)
        diff_rhoP = np.abs(rhoP_oct[finite_mask_P] - rhoP_py[finite_mask_P])
        rel_diff_rhoP = diff_rhoP / (rhoP_oct[finite_mask_P] + 1e-12)

        finite_mask_M = (rhoM_oct < 1e8) & (rhoM_py < 1e8)
        diff_rhoM = np.abs(rhoM_oct[finite_mask_M] - rhoM_py[finite_mask_M])
        rel_diff_rhoM = diff_rhoM / (rhoM_oct[finite_mask_M] + 1e-12)

        oct_rhoP_mean = float(np.mean(rhoP_oct[finite_mask_P]))
        py_rhoP_mean = float(np.mean(rhoP_py[finite_mask_P]))

        oct_rhoM_mean = float(np.mean(rhoM_oct[finite_mask_M]))
        py_rhoM_mean = float(np.mean(rhoM_py[finite_mask_M]))

        # Saturated counts
        sat_255 = int(np.sum(cover == 255))
        sat_0 = int(np.sum(cover == 0))

        # ---------------- PART B: LAMBDA & PROBABILITIES ----------------
        t_start_lam = time.perf_counter()
        py_lambda = calc_lambda(rhoP_py, rhoM_py, msg_len)
        lam_duration = time.perf_counter() - t_start_lam

        # Probabilities
        denom_oct = 1.0 + np.exp(-oct_lambda * rhoP_oct) + np.exp(-oct_lambda * rhoM_oct)
        pP_oct = np.exp(-oct_lambda * rhoP_oct) / denom_oct
        pM_oct = np.exp(-oct_lambda * rhoM_oct) / denom_oct
        p0_oct = 1.0 - pP_oct - pM_oct

        denom_py = 1.0 + np.exp(-py_lambda * rhoP_py) + np.exp(-py_lambda * rhoM_py)
        pP_py = np.exp(-py_lambda * rhoP_py) / denom_py
        pM_py = np.exp(-py_lambda * rhoM_py) / denom_py
        p0_py = 1.0 - pP_py - pM_py

        diff_pP = np.abs(pP_oct - pP_py)
        diff_pM = np.abs(pM_oct - pM_py)
        diff_p0 = np.abs(p0_oct - p0_py)

        py_entropy = ternary_entropy(pP_py, pM_py)
        py_entropy_bpp = py_entropy / N

        exp_chg_oct = float(np.mean(pP_oct + pM_oct))
        exp_chg_py = float(np.mean(pP_py + pM_py))

        # ---------------- PART C: EMBEDDING DECISION AUDIT ----------------
        seed = 100000 + idx
        rng = np.random.default_rng(seed)
        shared_rand = rng.random(cover.shape, dtype=np.float64)

        # Simulation on Octave P
        modP_oct = shared_rand < pP_oct
        modM_oct = (shared_rand >= pP_oct) & (shared_rand < (pP_oct + pM_oct))
        stego_oct_sim = cover.copy()
        stego_oct_sim[modP_oct] += 1
        stego_oct_sim[modM_oct] -= 1

        # Simulation on Python P
        modP_py = shared_rand < pP_py
        modM_py = (shared_rand >= pP_py) & (shared_rand < (pP_py + pM_py))
        stego_py_sim = cover.copy()
        stego_py_sim[modP_py] += 1
        stego_py_sim[modM_py] -= 1

        # Compare decisions
        disagree_mask = (stego_oct_sim != stego_py_sim)
        disagree_count = int(np.sum(disagree_mask))
        agree_pct = (N - disagree_count) / N * 100.0

        diff_sim = np.abs(stego_oct_sim - stego_py_sim)
        max_delta_between_stegos = int(np.max(diff_sim))

        sha_oct_sim = sha256_bytes(stego_oct_sim.astype(np.uint8))
        sha_py_sim = sha256_bytes(stego_py_sim.astype(np.uint8))

        # Ternary & Boundary checks
        is_ternary_oct = bool(np.max(np.abs(stego_oct_sim - cover)) <= 1)
        is_ternary_py = bool(np.max(np.abs(stego_py_sim - cover)) <= 1)
        bound_oct = bool((np.sum((cover == 255) & (stego_oct_sim > 255)) == 0) and (np.sum((cover == 0) & (stego_oct_sim < 0)) == 0))
        bound_py = bool((np.sum((cover == 255) & (stego_py_sim > 255)) == 0) and (np.sum((cover == 0) & (stego_py_sim < 0)) == 0))

        # ---------------- PART D: REPRODUCIBILITY ----------------
        run1_stego, stats1 = embed_suniward(cover, payload=PAYLOAD, seed=seed)
        run2_stego, stats2 = embed_suniward(cover, payload=PAYLOAD, seed=seed)
        run1_sha = sha256_bytes(run1_stego)
        run2_sha = sha256_bytes(run2_stego)
        reproducible = bool((run1_sha == run2_sha) and np.array_equal(run1_stego, run2_stego))

        img_report = {
            "image": f"{idx}.pgm",
            "resolution": f"{k}x{l}",
            "part_a_algorithm": {
                "residual_max_diffs": [e["max_abs"] for e in R_errs],
                "rhoP_octave_mean": round(oct_rhoP_mean, 6),
                "rhoP_python_mean": round(py_rhoP_mean, 6),
                "rhoP_mean_diff_percent": round(abs(oct_rhoP_mean - py_rhoP_mean) / oct_rhoP_mean * 100, 6),
                "rhoP_max_abs_diff": float(np.max(diff_rhoP)),
                "rhoP_mean_abs_diff": float(np.mean(diff_rhoP)),
                "rhoM_octave_mean": round(oct_rhoM_mean, 6),
                "rhoM_python_mean": round(py_rhoM_mean, 6),
                "rhoM_mean_diff_percent": round(abs(oct_rhoM_mean - py_rhoM_mean) / oct_rhoM_mean * 100, 6),
                "rhoM_max_abs_diff": float(np.max(diff_rhoM)),
                "rhoM_mean_abs_diff": float(np.mean(diff_rhoM)),
                "saturated_255_pixels": sat_255,
                "saturated_0_pixels": sat_0,
            },
            "part_b_lambda_prob": {
                "octave_lambda": round(oct_lambda, 6),
                "python_lambda": round(py_lambda, 6),
                "lambda_abs_diff": round(abs(oct_lambda - py_lambda), 8),
                "octave_entropy_bpp": round(oct_entropy_bpp, 6),
                "python_entropy_bpp": round(py_entropy_bpp, 6),
                "entropy_diff_bpp": round(abs(oct_entropy_bpp - py_entropy_bpp), 8),
                "pP_max_diff": float(np.max(diff_pP)),
                "pP_mean_diff": float(np.mean(diff_pP)),
                "pP_99th_percentile_diff": float(np.percentile(diff_pP, 99)),
                "p0_max_diff": float(np.max(diff_p0)),
                "p0_mean_diff": float(np.mean(diff_p0)),
                "p0_99th_percentile_diff": float(np.percentile(diff_p0, 99)),
                "expected_change_rate_oct": round(exp_chg_oct, 4),
                "expected_change_rate_py": round(exp_chg_py, 4),
            },
            "part_c_decisions": {
                "seed": seed,
                "shared_rand_sha256": sha256_bytes(shared_rand),
                "decision_agreement_percent": round(agree_pct, 4),
                "decision_disagreement_count": disagree_count,
                "stego_oct_sim_changes": int(np.sum(stego_oct_sim != cover)),
                "stego_py_sim_changes": int(np.sum(stego_py_sim != cover)),
                "stego_oct_sim_rate": round(float(np.mean(stego_oct_sim != cover)), 4),
                "stego_py_sim_rate": round(float(np.mean(stego_py_sim != cover)), 4),
                "max_pixel_delta_between_stegos": max_delta_between_stegos,
                "sha256_oct_sim": sha_oct_sim,
                "sha256_py_sim": sha_py_sim,
                "is_ternary_satisfied_oct": is_ternary_oct,
                "is_ternary_satisfied_py": is_ternary_py,
                "boundary_satisfied_oct": bound_oct,
                "boundary_satisfied_py": bound_py,
            },
            "part_d_reproducibility": {
                "run1_sha256": run1_sha,
                "run2_sha256": run2_sha,
                "is_deterministic_and_reproducible": reproducible,
                "duration_total_sec": round(cost_duration + lam_duration, 3),
            }
        }

        audit_results["images"][f"image_{idx}"] = img_report

        print(f"Algorithm: rhoP Rel Diff = {img_report['part_a_algorithm']['rhoP_mean_diff_percent']:.6f}%")
        print(f"Lambda:    Octave = {oct_lambda:.6f}, Python = {py_lambda:.6f} (Diff: {abs(oct_lambda - py_lambda):.8f})")
        print(f"Entropy:   Octave = {oct_entropy_bpp:.6f} bpp, Python = {py_entropy_bpp:.6f} bpp")
        print(f"Decisions: Agreement = {agree_pct:.3f}%, Disagreements = {disagree_count} / {N}")
        print(f"Reproducibility: {reproducible} (SHA256: {run1_sha})")

    # ---------------- PART E: PERFORMANCE & SCALABILITY ----------------
    t1_tot = audit_results["images"]["image_1"]["part_d_reproducibility"]["duration_total_sec"]
    t2_tot = audit_results["images"]["image_2"]["part_d_reproducibility"]["duration_total_sec"]
    avg_img_time = (t1_tot + t2_tot) / 2.0
    workers = min(os.cpu_count() or 4, 8)
    est_total_sec = (10000 * avg_img_time) / workers
    est_total_min = est_total_sec / 60.0

    audit_results["performance"] = {
        "avg_seconds_per_image": round(avg_img_time, 3),
        "workers_configured": workers,
        "cpu_count": os.cpu_count(),
        "throughput_images_per_sec": round(workers / avg_img_time, 2),
        "estimated_10000_duration_minutes": round(est_total_min, 1),
        "estimated_10000_duration_hours": round(est_total_min / 60.0, 2),
        "memory_per_process_mb_estimate": 80.0,
        "total_worker_memory_mb_estimate": round(workers * 80.0, 1),
    }
    print(f"\n--- PERFORMANCE ---")
    print(f"Avg time/image: {avg_img_time:.2f}s | Workers: {workers} | Throughput: {workers/avg_img_time:.2f} img/s")
    print(f"Estimated full 10,000 generation: {est_total_min:.1f} minutes ({est_total_min/60:.2f} hours)")

    # ---------------- PART F: SAFETY & DATASET INTEGRITY AUDIT ----------------
    train_stego_files = list((PROCESSED_DIR / "train" / "stego").glob("*.pgm"))
    train_cover_files = list((PROCESSED_DIR / "train" / "cover").glob("*.pgm"))
    val_stego_files = list((PROCESSED_DIR / "val" / "stego").glob("*.pgm")) if (PROCESSED_DIR / "val" / "stego").exists() else []
    test_stego_files = list((PROCESSED_DIR / "test" / "stego").glob("*.pgm")) if (PROCESSED_DIR / "test" / "stego").exists() else []
    raw_files = list(RAW_DIR.glob("*.pgm"))

    # Sample hash check on existing stego
    sample_stego_hash = sha256_file(train_stego_files[0]) if train_stego_files else ""
    matlab_m_stat = Path(r"D:\Stego\dataset\algorithms\S-UNIWARD\matlab\matlab\S_UNIWARD.m").stat()

    audit_results["safety_audit"] = {
        "train_stego_count": len(train_stego_files),
        "train_cover_count": len(train_cover_files),
        "val_stego_count": len(val_stego_files),
        "test_stego_count": len(test_stego_files),
        "raw_bossbase_count": len(raw_files),
        "all_68_stego_preserved": len(train_stego_files) == 68,
        "all_76_covers_preserved": len(train_cover_files) == 76,
        "raw_10000_preserved": len(raw_files) == 10000,
        "matlab_suniward_m_last_modified": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(matlab_m_stat.st_mtime)),
        "matlab_suniward_m_size": matlab_m_stat.st_size,
    }
    print(f"\n--- SAFETY AUDIT ---")
    print(f"Existing stego images: {len(train_stego_files)} (expected 68): {len(train_stego_files) == 68}")
    print(f"Existing staged covers: {len(train_cover_files)} (expected 76): {len(train_cover_files) == 76}")
    print(f"Raw BOSSbase covers: {len(raw_files)} (expected 10000): {len(raw_files) == 10000}")
    print(f"MATLAB S_UNIWARD.m timestamp: {audit_results['safety_audit']['matlab_suniward_m_last_modified']} (size: {matlab_m_stat.st_size})")

    # Save complete json
    out_json = REPORTS_DIR / "final_generation_readiness_audit.json"
    with open(out_json, "w") as f:
        json.dump(audit_results, f, indent=2)
    print(f"\nAudit completed. Full JSON saved to: {out_json}")

if __name__ == "__main__":
    run_audit()

