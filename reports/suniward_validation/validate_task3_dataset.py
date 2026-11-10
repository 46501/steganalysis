"""
TASK 3: Post-Generation Dataset Validation Script.
Validates all 10,000 pairs (20,000 images) in D:\\Stego\\dataset\\processed\\S-UNIWARD_0.4bpp\\.
Compares against raw BOSSbase covers, checks image integrity, ternary constraints,
boundary constraints, change rates, and split leakage.
Generates TASK3_PAIR_VALIDATION.csv and comprehensive summary statistics.
"""

import os
import sys
import csv
import time
import hashlib
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Dict, Any, List, Tuple

import numpy as np

BASE_DIR = Path(r"D:\Stego")
PROCESSED_DIR = BASE_DIR / "dataset" / "processed" / "S-UNIWARD_0.4bpp"
RAW_DIR = BASE_DIR / "dataset" / "raw" / "BOSSbase"
REPORTS_DIR = BASE_DIR / "reports" / "suniward_validation"

def load_p5_pgm_fast(path: Path) -> Tuple[bool, np.ndarray, str]:
    """
    Reads a binary P5 PGM image fast.
    Returns (is_valid, ndarray_uint8_or_empty, error_message).
    """
    if not path.is_file():
        return False, np.empty(0, dtype=np.uint8), "file_not_found"
    try:
        with open(path, "rb") as f:
            magic = f.readline()
            if magic.strip() != b"P5":
                return False, np.empty(0, dtype=np.uint8), f"invalid_magic_{magic.strip()[:10]}"
            dim_line = f.readline()
            while dim_line.startswith(b"#"):
                dim_line = f.readline()
            dims = dim_line.split()
            if len(dims) != 2:
                return False, np.empty(0, dtype=np.uint8), "invalid_dimension_format"
            w, h = map(int, dims)
            if w != 512 or h != 512:
                return False, np.empty(0, dtype=np.uint8), f"invalid_dimensions_{w}x{h}"
            maxval_line = f.readline()
            while maxval_line.startswith(b"#"):
                maxval_line = f.readline()
            if int(maxval_line.strip()) != 255:
                return False, np.empty(0, dtype=np.uint8), f"invalid_maxval_{maxval_line.strip()}"
            raw_data = f.read()
            if len(raw_data) != 512 * 512:
                return False, np.empty(0, dtype=np.uint8), f"invalid_data_length_{len(raw_data)}"
            arr = np.frombuffer(raw_data, dtype=np.uint8).reshape((512, 512))
            return True, arr, "ok"
    except Exception as e:
        return False, np.empty(0, dtype=np.uint8), f"exception_{type(e).__name__}_{e}"


def validate_single_pair(args: Tuple[int, str, str, str, str]) -> Dict[str, Any]:
    """
    Validates a single cover-stego pair.
    args: (image_id, split, raw_cover_path_str, proc_cover_path_str, proc_stego_path_str)
    """
    image_id, split, raw_str, cov_str, stego_str = args
    raw_p = Path(raw_str)
    cov_p = Path(cov_str)
    stego_p = Path(stego_str)

    cov_size = cov_p.stat().st_size if cov_p.exists() else -1
    stego_size = stego_p.stat().st_size if stego_p.exists() else -1

    # Load raw cover
    ok_raw, raw_arr, raw_err = load_p5_pgm_fast(raw_p)

    # Load processed cover
    ok_cov, cov_arr, cov_err = load_p5_pgm_fast(cov_p)

    # Load processed stego
    ok_stego, stego_arr, stego_err = load_p5_pgm_fast(stego_p)

    # Cover matches raw BOSSbase
    cov_matches_bossbase = False
    if ok_raw and ok_cov:
        cov_matches_bossbase = np.array_equal(cov_arr, raw_arr)

    # Stego validation against cover
    ternary_ok = False
    boundary_ok = False
    max_diff = -1
    total_changes = 0
    plus_changes = 0
    minus_changes = 0
    change_rate = 0.0
    stego_min = -1
    stego_max = -1
    stego_sha = ""

    if ok_cov and ok_stego:
        stego_min = int(np.min(stego_arr))
        stego_max = int(np.max(stego_arr))

        diff = stego_arr.astype(np.int16) - cov_arr.astype(np.int16)
        abs_diff = np.abs(diff)
        max_diff = int(np.max(abs_diff))
        ternary_ok = (max_diff <= 1)

        plus_changes = int(np.sum(diff == 1))
        minus_changes = int(np.sum(diff == -1))
        total_changes = plus_changes + minus_changes
        change_rate = total_changes / (512 * 512)

        overflow = np.any((cov_arr == 255) & (stego_arr > 255))
        underflow = np.any((cov_arr == 0) & (stego_arr < 0))
        boundary_ok = not (overflow or underflow)

        # Hash
        h = hashlib.sha256()
        with open(stego_p, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        stego_sha = h.hexdigest()

    pair_passed = (
        ok_cov
        and ok_stego
        and cov_matches_bossbase
        and ternary_ok
        and boundary_ok
        and (cov_size == 262159)
        and (stego_size == 262159)
    )

    return {
        "image_id": image_id,
        "split": split,
        "cover_path": f"dataset/processed/S-UNIWARD_0.4bpp/{split}/cover/{image_id}.pgm",
        "stego_path": f"dataset/processed/S-UNIWARD_0.4bpp/{split}/stego/{image_id}.pgm",
        "cover_size_bytes": cov_size,
        "stego_size_bytes": stego_size,
        "cover_valid_p5": ok_cov,
        "stego_valid_p5": ok_stego,
        "cover_matches_bossbase": cov_matches_bossbase,
        "stego_shape": "512x512" if ok_stego else "invalid",
        "cover_shape": "512x512" if ok_cov else "invalid",
        "stego_min": stego_min,
        "stego_max": stego_max,
        "max_abs_diff": max_diff,
        "ternary_constraint_passed": ternary_ok,
        "boundary_clamping_passed": boundary_ok,
        "total_changes": total_changes,
        "plus_changes": plus_changes,
        "minus_changes": minus_changes,
        "change_rate": round(change_rate, 4),
        "pair_passed": pair_passed,
        "stego_sha256": stego_sha,
    }


def main():
    print("=" * 80)
    print("TASK 3: POST-GENERATION DATASET VALIDATION (10,000 PAIRS / 20,000 IMAGES)")
    print("=" * 80)

    # 1. Exact Dataset Inventory
    train_covs = list((PROCESSED_DIR / "train" / "cover").glob("*.pgm"))
    train_stegos = list((PROCESSED_DIR / "train" / "stego").glob("*.pgm"))
    val_covs = list((PROCESSED_DIR / "val" / "cover").glob("*.pgm"))
    val_stegos = list((PROCESSED_DIR / "val" / "stego").glob("*.pgm"))
    test_covs = list((PROCESSED_DIR / "test" / "cover").glob("*.pgm"))
    test_stegos = list((PROCESSED_DIR / "test" / "stego").glob("*.pgm"))

    print("\n--- 1. EXACT DATASET COUNTS ---")
    print(f"Train:      Covers = {len(train_covs):5d} | Stegos = {len(train_stegos):5d} | Pairs = {min(len(train_covs), len(train_stegos)):5d}")
    print(f"Validation: Covers = {len(val_covs):5d} | Stegos = {len(val_stegos):5d} | Pairs = {min(len(val_covs), len(val_stegos)):5d}")
    print(f"Test:       Covers = {len(test_covs):5d} | Stegos = {len(test_stegos):5d} | Pairs = {min(len(test_covs), len(test_stegos)):5d}")
    total_covs = len(train_covs) + len(val_covs) + len(test_covs)
    total_stegos = len(train_stegos) + len(val_stegos) + len(test_stegos)
    print(f"Total:      Covers = {total_covs:5d} | Stegos = {total_stegos:5d} | Total Images = {total_covs + total_stegos:5d}")

    # Check for any unexpected non-PGM files
    all_files = [f for f in PROCESSED_DIR.rglob("*") if f.is_file() and "sample_test" not in str(f)]
    non_pgm = [f for f in all_files if f.suffix.lower() != ".pgm"]
    print(f"Extraneous non-PGM files in production splits: {len(non_pgm)}")

    # 2. Build Work Items for all 10,000 pairs
    tasks = []
    for idx in range(1, 10001):
        if idx <= 4000:
            split = "train"
        elif idx <= 5000:
            split = "val"
        else:
            split = "test"
        
        raw_p = RAW_DIR / f"{idx}.pgm"
        cov_p = PROCESSED_DIR / split / "cover" / f"{idx}.pgm"
        stego_p = PROCESSED_DIR / split / "stego" / f"{idx}.pgm"
        tasks.append((idx, split, str(raw_p), str(cov_p), str(stego_p)))

    print(f"\n--- 2. PARALLEL INTEGRITY & PAIR VALIDATION ({len(tasks)} PAIRS) ---")
    start_t = time.perf_counter()
    results = []
    
    workers = min(os.cpu_count() or 4, 8)
    with ProcessPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(validate_single_pair, task): task[0] for task in tasks}
        completed = 0
        for f in as_completed(futures):
            res = f.result()
            results.append(res)
            completed += 1
            if completed % 2000 == 0 or completed == len(tasks):
                elapsed = time.perf_counter() - start_t
                rate = completed / elapsed if elapsed > 0 else 0
                print(f"Progress: [{completed:5d}/{len(tasks):5d}] ({completed/len(tasks)*100:5.1f}%) | Speed: {rate:5.1f} pairs/s")

    # Sort results by image_id
    results.sort(key=lambda x: x["image_id"])

    # 3. Save CSV
    csv_path = REPORTS_DIR / "TASK3_PAIR_VALIDATION.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = list(results[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"\nSaved machine-readable pair validation CSV to: {csv_path}")

    # 4. Aggregated Statistical Analysis
    all_passed = all(r["pair_passed"] for r in results)
    cov_boss_mismatches = [r["image_id"] for r in results if not r["cover_matches_bossbase"]]
    ternary_failures = [r["image_id"] for r in results if not r["ternary_constraint_passed"]]
    boundary_failures = [r["image_id"] for r in results if not r["boundary_clamping_passed"]]
    invalid_cov_pgm = [r["image_id"] for r in results if not r["cover_valid_p5"]]
    invalid_stego_pgm = [r["image_id"] for r in results if not r["stego_valid_p5"]]

    # Duplicate Stego SHA256 check
    sha_map = {}
    duplicate_stegos = []
    for r in results:
        sha = r["stego_sha256"]
        if sha in sha_map:
            duplicate_stegos.append((r["image_id"], sha_map[sha]))
        else:
            sha_map[sha] = r["image_id"]

    print("\n--- 3. PAIR VALIDATION SUMMARY ---")
    print(f"Total pairs audited:                 {len(results):5d}")
    print(f"Pairs fully passing all checks:      {sum(1 for r in results if r['pair_passed']):5d}")
    print(f"Cover-BOSSbase mismatches:           {len(cov_boss_mismatches):5d}")
    print(f"Ternary constraint violations:       {len(ternary_failures):5d}")
    print(f"Boundary clamping violations:        {len(boundary_failures):5d}")
    print(f"Invalid Cover PGM files:             {len(invalid_cov_pgm):5d}")
    print(f"Invalid Stego PGM files:             {len(invalid_stego_pgm):5d}")
    print(f"Duplicate Stego hashes:              {len(duplicate_stegos):5d}")

    # 5. Change Rate Statistics
    change_rates = [r["change_rate"] for r in results]
    train_rates = [r["change_rate"] for r in results if r["split"] == "train"]
    val_rates = [r["change_rate"] for r in results if r["split"] == "val"]
    test_rates = [r["change_rate"] for r in results if r["split"] == "test"]

    print("\n--- 4. EMBEDDING CHANGE RATE STATISTICS ---")
    print(f"Overall:    Min = {np.min(change_rates):.4f} | Max = {np.max(change_rates):.4f} | Mean = {np.mean(change_rates):.4f} +/- {np.std(change_rates):.4f}")
    print(f"Train:      Min = {np.min(train_rates):.4f} | Max = {np.max(train_rates):.4f} | Mean = {np.mean(train_rates):.4f} +/- {np.std(train_rates):.4f}")
    print(f"Validation: Min = {np.min(val_rates):.4f} | Max = {np.max(val_rates):.4f} | Mean = {np.mean(val_rates):.4f} +/- {np.std(val_rates):.4f}")
    print(f"Test:       Min = {np.min(test_rates):.4f} | Max = {np.max(test_rates):.4f} | Mean = {np.mean(test_rates):.4f} +/- {np.std(test_rates):.4f}")

    # 6. Leakage Audit
    train_ids = set(int(p.stem) for p in train_covs)
    val_ids = set(int(p.stem) for p in val_covs)
    test_ids = set(int(p.stem) for p in test_covs)

    train_stego_ids = set(int(p.stem) for p in train_stegos)
    val_stego_ids = set(int(p.stem) for p in val_stegos)
    test_stego_ids = set(int(p.stem) for p in test_stegos)

    cov_overlap_tr_val = train_ids.intersection(val_ids)
    cov_overlap_tr_te = train_ids.intersection(test_ids)
    cov_overlap_val_te = val_ids.intersection(test_ids)

    stego_overlap_tr_val = train_stego_ids.intersection(val_stego_ids)
    stego_overlap_tr_te = train_stego_ids.intersection(test_stego_ids)
    stego_overlap_val_te = val_stego_ids.intersection(test_stego_ids)

    cov_stego_mismatch_train = train_ids.symmetric_difference(train_stego_ids)
    cov_stego_mismatch_val = val_ids.symmetric_difference(val_stego_ids)
    cov_stego_mismatch_test = test_ids.symmetric_difference(test_stego_ids)

    all_ids = train_ids.union(val_ids).union(test_ids)
    missing_ids = set(range(1, 10001)) - all_ids
    unexpected_ids = all_ids - set(range(1, 10001))

    print("\n--- 5. DATASET LEAKAGE & PARTITIONING AUDIT ---")
    print(f"Cover ID Overlaps (Train/Val):       {len(cov_overlap_tr_val)}")
    print(f"Cover ID Overlaps (Train/Test):      {len(cov_overlap_tr_te)}")
    print(f"Cover ID Overlaps (Val/Test):        {len(cov_overlap_val_te)}")
    print(f"Stego ID Overlaps (Train/Val):       {len(stego_overlap_tr_val)}")
    print(f"Stego ID Overlaps (Train/Test):      {len(stego_overlap_tr_te)}")
    print(f"Stego ID Overlaps (Val/Test):        {len(stego_overlap_val_te)}")
    print(f"Cover-Stego Co-location Mismatch (Train): {len(cov_stego_mismatch_train)}")
    print(f"Cover-Stego Co-location Mismatch (Val):   {len(cov_stego_mismatch_val)}")
    print(f"Cover-Stego Co-location Mismatch (Test):  {len(cov_stego_mismatch_test)}")
    print(f"Missing BOSSbase IDs:                {len(missing_ids)}")
    print(f"Unexpected / Out-of-Range IDs:       {len(unexpected_ids)}")

    # 7. Class Balance
    print("\n--- 6. CLASS BALANCE AUDIT ---")
    for name, c_count, s_count in [("Train", len(train_covs), len(train_stegos)),
                                    ("Val", len(val_covs), len(val_stegos)),
                                    ("Test", len(test_covs), len(test_stegos)),
                                    ("Total", total_covs, total_stegos)]:
        total_p = c_count + s_count
        ratio = (c_count / s_count) if s_count > 0 else 0
        print(f"{name:<10} | Cover (Label 0): {c_count:5d} ({c_count/total_p*100:5.1f}%) | Stego (Label 1): {s_count:5d} ({s_count/total_p*100:5.1f}%) | Ratio: {ratio:.4f}")

    final_verdict = "PASS" if (
        all_passed
        and total_covs == 10000
        and total_stegos == 10000
        and len(cov_overlap_tr_val) == 0
        and len(cov_overlap_tr_te) == 0
        and len(cov_overlap_val_te) == 0
        and len(stego_overlap_tr_val) == 0
        and len(stego_overlap_tr_te) == 0
        and len(stego_overlap_val_te) == 0
        and len(missing_ids) == 0
        and len(duplicate_stegos) == 0
    ) else "FAIL"

    print("\n" + "=" * 80)
    print(f"FINAL AUDIT VERDICT: {final_verdict}")
    print("=" * 80)

if __name__ == "__main__":
    main()

