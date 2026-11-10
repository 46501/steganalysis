"""
TASK 2G: Dataset Integrity & Safe Generation Readiness Audit Script
Read-only inspection of dataset, pairing verification, split verification, and safety analysis.
"""

import os
import sys
import csv
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image

BASE_DIR = Path(r"D:\Stego")
PROCESSED_DIR = BASE_DIR / "dataset" / "processed" / "S-UNIWARD_0.4bpp"
RAW_DIR = BASE_DIR / "dataset" / "raw" / "BOSSbase"
REPORTS_DIR = BASE_DIR / "reports" / "suniward_validation"

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def audit_dataset():
    print("=" * 80)
    print("TASK 2G READ-ONLY AUDIT EXECUTION")
    print("=" * 80)

    # ---------------- PART A: INVENTORY ----------------
    train_covers = sorted(list((PROCESSED_DIR / "train" / "cover").glob("*.pgm")), key=lambda p: int(p.stem))
    train_stegos = sorted(list((PROCESSED_DIR / "train" / "stego").glob("*.pgm")), key=lambda p: int(p.stem))
    
    val_covers = sorted(list((PROCESSED_DIR / "val" / "cover").glob("*.pgm")), key=lambda p: int(p.stem)) if (PROCESSED_DIR / "val" / "cover").exists() else []
    val_stegos = sorted(list((PROCESSED_DIR / "val" / "stego").glob("*.pgm")), key=lambda p: int(p.stem)) if (PROCESSED_DIR / "val" / "stego").exists() else []
    
    test_covers = sorted(list((PROCESSED_DIR / "test" / "cover").glob("*.pgm")), key=lambda p: int(p.stem)) if (PROCESSED_DIR / "test" / "cover").exists() else []
    test_stegos = sorted(list((PROCESSED_DIR / "test" / "stego").glob("*.pgm")), key=lambda p: int(p.stem)) if (PROCESSED_DIR / "test" / "stego").exists() else []

    sample_test_files = sorted(list((PROCESSED_DIR / "sample_test").glob("*.pgm"))) if (PROCESSED_DIR / "sample_test").exists() else []
    
    # Check for non-pgm or unexpected files in processed dir
    all_processed_files = list(PROCESSED_DIR.rglob("*"))
    all_files = [f for f in all_processed_files if f.is_file()]
    non_pgm_files = [f for f in all_files if f.suffix.lower() != ".pgm"]

    raw_covers = sorted(list(RAW_DIR.glob("*.pgm")), key=lambda p: int(p.stem))

    print(f"Inventory Summary:")
    print(f"  Raw BOSSbase covers: {len(raw_covers)}")
    print(f"  Train covers:        {len(train_covers)}")
    print(f"  Train stegos:        {len(train_stegos)}")
    print(f"  Val covers:          {len(val_covers)}")
    print(f"  Val stegos:          {len(val_stegos)}")
    print(f"  Test covers:         {len(test_covers)}")
    print(f"  Test stegos:         {len(test_stegos)}")
    print(f"  Sample test files:   {len(sample_test_files)}")
    print(f"  Non-PGM files:       {len(non_pgm_files)}")

    # ---------------- PART B: COVER-STEGO PAIRING AUDIT ----------------
    print("\nAuditing cover-stego pairing for all existing stego images...")
    pairing_rows = []
    seen_stego_hashes = {}
    duplicate_stego_hashes = []
    
    corrupt_count = 0
    ternary_violations = 0
    boundary_violations = 0

    train_cover_dict = {int(p.stem): p for p in train_covers}
    raw_cover_dict = {int(p.stem): p for p in raw_covers}

    for stego_path in train_stegos:
        idx = int(stego_path.stem)
        stego_size = stego_path.stat().st_size
        stego_sha = sha256_file(stego_path)

        # Duplicate check
        if stego_sha in seen_stego_hashes:
            duplicate_stego_hashes.append((idx, seen_stego_hashes[stego_sha]))
        else:
            seen_stego_hashes[stego_sha] = idx

        # Cover pairing check
        has_train_cover = idx in train_cover_dict
        has_raw_cover = idx in raw_cover_dict

        cover_path = train_cover_dict.get(idx)
        raw_path = raw_cover_dict.get(idx)

        # File size and readable check
        is_valid_pgm = True
        shape_match = False
        shape_str = ""
        diff_max = -1
        chg_total = -1
        chg_plus = -1
        chg_minus = -1
        chg_rate = -1.0
        val_min = -1
        val_max = -1
        boundary_ok = False
        ternary_ok = False

        try:
            with Image.open(stego_path) as s_img:
                stego_arr = np.array(s_img, dtype=np.int32)
            with Image.open(cover_path) as c_img:
                cover_arr = np.array(c_img, dtype=np.int32)
            
            shape_match = (stego_arr.shape == cover_arr.shape == (512, 512))
            shape_str = f"{stego_arr.shape[0]}x{stego_arr.shape[1]}"
            val_min = int(np.min(stego_arr))
            val_max = int(np.max(stego_arr))

            diff = stego_arr - cover_arr
            diff_max = int(np.max(np.abs(diff)))
            chg_total = int(np.sum(diff != 0))
            chg_plus = int(np.sum(diff == 1))
            chg_minus = int(np.sum(diff == -1))
            chg_rate = float(chg_total / stego_arr.size)

            ternary_ok = (diff_max <= 1)
            boundary_ok = bool((np.sum((cover_arr == 255) & (stego_arr > 255)) == 0) and (np.sum((cover_arr == 0) & (stego_arr < 0)) == 0))

            if not ternary_ok:
                ternary_violations += 1
            if not boundary_ok:
                boundary_violations += 1

        except Exception as e:
            is_valid_pgm = False
            corrupt_count += 1

        pairing_rows.append({
            "image_id": idx,
            "split": "train",
            "stego_path": str(stego_path.relative_to(BASE_DIR)),
            "cover_path": str(cover_path.relative_to(BASE_DIR)) if cover_path else "MISSING",
            "stego_size_bytes": stego_size,
            "stego_sha256": stego_sha,
            "is_valid_p5_pgm": is_valid_pgm,
            "shape": shape_str,
            "pixel_min": val_min,
            "pixel_max": val_max,
            "ternary_constraint_passed": ternary_ok,
            "max_abs_diff": diff_max,
            "boundary_clamping_passed": boundary_ok,
            "total_changes": chg_total,
            "plus_changes": chg_plus,
            "minus_changes": chg_minus,
            "change_rate": round(chg_rate, 4),
        })

    # Save pairing CSV
    pairing_csv_path = REPORTS_DIR / "TASK2G_PAIRING_AUDIT.csv"
    with open(pairing_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(pairing_rows[0].keys()))
        writer.writeheader()
        writer.writerows(pairing_rows)

    print(f"Pairing audit completed for {len(pairing_rows)} stego images.")
    print(f"  Corrupt files: {corrupt_count}")
    print(f"  Ternary violations: {ternary_violations}")
    print(f"  Boundary violations: {boundary_violations}")
    print(f"  Duplicate stego hashes: {len(duplicate_stego_hashes)}")
    print(f"  Saved pairing CSV: {pairing_csv_path}")

    # Identify staged covers (covers without stegos)
    stego_ids = set(int(p.stem) for p in train_stegos)
    staged_covers = [p for p in train_covers if int(p.stem) not in stego_ids]
    print(f"  Staged covers count: {len(staged_covers)} (IDs: {[int(p.stem) for p in staged_covers]})")

    # ---------------- PART C: DATASET SPLIT & LEAKAGE AUDIT ----------------
    print("\nAuditing dataset split assignments for all 10,000 BOSSbase covers...")
    split_rows = []
    
    # Target split definition:
    # Train: 1..4000
    # Val: 4001..5000
    # Test: 5001..10000
    split_counts = {"train": 0, "val": 0, "test": 0}
    split_overlap = False

    for idx in range(1, 10001):
        if idx <= 4000:
            assigned_split = "train"
        elif idx <= 5000:
            assigned_split = "val"
        else:
            assigned_split = "test"
        
        split_counts[assigned_split] += 1
        
        has_raw = idx in raw_cover_dict
        has_train_stego = (PROCESSED_DIR / "train" / "stego" / f"{idx}.pgm").exists()
        has_val_stego = (PROCESSED_DIR / "val" / "stego" / f"{idx}.pgm").exists()
        has_test_stego = (PROCESSED_DIR / "test" / "stego" / f"{idx}.pgm").exists()
        
        stego_locations = []
        if has_train_stego: stego_locations.append("train")
        if has_val_stego: stego_locations.append("val")
        if has_test_stego: stego_locations.append("test")

        is_leakage = (len(stego_locations) > 1) or (len(stego_locations) == 1 and stego_locations[0] != assigned_split)
        if is_leakage:
            split_overlap = True

        status = "pending"
        if len(stego_locations) == 1 and stego_locations[0] == assigned_split:
            status = "completed"
        elif idx in [int(p.stem) for p in staged_covers]:
            status = "staged_cover"

        if idx <= 100 or idx in range(3995, 4005) or idx in range(4995, 5005) or idx >= 9995 or status != "pending":
            split_rows.append({
                "image_id": idx,
                "assigned_split": assigned_split,
                "deterministic_seed": 100000 + idx,
                "raw_cover_exists": has_raw,
                "actual_stego_split": stego_locations[0] if stego_locations else "none",
                "status": status,
                "leakage_detected": is_leakage,
            })

    split_csv_path = REPORTS_DIR / "TASK2G_SPLIT_AUDIT.csv"
    with open(split_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(split_rows[0].keys()))
        writer.writeheader()
        writer.writerows(split_rows)

    print(f"Split audit completed:")
    print(f"  Target split counts: {split_counts}")
    print(f"  Total IDs checked: 10,000")
    print(f"  Leakage or cross-split overlap detected: {split_overlap}")
    print(f"  Saved split CSV: {split_csv_path}")

    return {
        "raw_count": len(raw_covers),
        "train_cover_count": len(train_covers),
        "train_stego_count": len(train_stegos),
        "staged_cover_ids": [int(p.stem) for p in staged_covers],
        "pairing_rows": pairing_rows,
        "split_counts": split_counts,
        "duplicate_stego_hashes": duplicate_stego_hashes,
        "ternary_violations": ternary_violations,
        "boundary_violations": boundary_violations,
        "corrupt_count": corrupt_count,
        "non_pgm_files": [str(f) for f in non_pgm_files],
        "sample_test_files": [str(f) for f in sample_test_files],
    }

if __name__ == "__main__":
    audit_dataset()

