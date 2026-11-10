"""
TASK 2H: Synthetic Resume Validation and Corruption Recovery Test.
Tests all edge cases in an isolated temporary directory without touching real dataset files.
"""

import os
import sys
import shutil
import tempfile
from pathlib import Path
import numpy as np

# Add project root to sys.path
BASE_DIR = Path(r"D:\Stego")
sys.path.insert(0, str(BASE_DIR / "scripts"))

from generate_suniward_dataset import (
    load_p5_pgm,
    validate_pair,
    atomic_copy_file,
    save_pgm_image_atomic,
    worker_task,
)

def create_synthetic_p5_pgm(path: Path, arr: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    h, w = arr.shape
    header = f"P5\n{w} {h}\n255\n".encode("ascii")
    with open(path, "wb") as f:
        f.write(header)
        f.write(arr.astype(np.uint8).tobytes())

def run_synthetic_tests():
    print("=" * 80)
    print("TASK 2H: ISOLATED SYNTHETIC RESUME VALIDATION TEST SUITE")
    print("=" * 80)

    temp_root = BASE_DIR / "reports" / "suniward_validation" / "temp_synthetic_test"
    if temp_root.exists():
        shutil.rmtree(temp_root)
    temp_root.mkdir(parents=True, exist_ok=True)

    test_results = []

    try:
        raw_dir = temp_root / "raw"
        raw_dir.mkdir(parents=True, exist_ok=True)
        out_cover_dir = temp_root / "processed" / "cover"
        out_cover_dir.mkdir(parents=True, exist_ok=True)
        out_stego_dir = temp_root / "processed" / "stego"
        out_stego_dir.mkdir(parents=True, exist_ok=True)

        # Create standard synthetic 512x512 base array
        np.random.seed(42)
        base_cover = np.random.randint(10, 245, size=(512, 512), dtype=np.uint8)
        base_stego_valid = base_cover.copy()
        # Modify a few pixels by +1 and -1 (valid ternary stego)
        base_stego_valid[10:20, 10:20] += 1
        base_stego_valid[30:40, 30:40] -= 1

        raw_cover_p = raw_dir / "101.pgm"
        create_synthetic_p5_pgm(raw_cover_p, base_cover)

        # -------------------------------------------------------------
        # Test Case 1: Pristine Valid Pair
        # -------------------------------------------------------------
        cov_p1 = out_cover_dir / "101.pgm"
        stego_p1 = out_stego_dir / "101.pgm"
        create_synthetic_p5_pgm(cov_p1, base_cover)
        create_synthetic_p5_pgm(stego_p1, base_stego_valid)

        is_valid, reason, _ = validate_pair(raw_cover_p, cov_p1, stego_p1)
        res_dry = worker_task((101, str(raw_cover_p), str(cov_p1), str(stego_p1), 0.4, 100101, True))
        passed = (is_valid is True) and (res_dry["action"] == "SKIP (Already valid)")
        print(f"Test 1 [Pristine Valid Pair]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Pristine Valid Pair", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 2: Staged Cover, Stego Missing
        # -------------------------------------------------------------
        cov_p2 = out_cover_dir / "102.pgm"
        stego_p2 = out_stego_dir / "102.pgm"
        raw_cov_p2 = raw_dir / "102.pgm"
        create_synthetic_p5_pgm(raw_cov_p2, base_cover)
        create_synthetic_p5_pgm(cov_p2, base_cover)
        # stego_p2 does not exist

        is_valid, reason, _ = validate_pair(raw_cov_p2, cov_p2, stego_p2)
        res_dry = worker_task((102, str(raw_cov_p2), str(cov_p2), str(stego_p2), 0.4, 100102, True))
        passed = (is_valid is False) and (reason == "stego_missing_cover_staged") and (res_dry["action"] == "GENERATE_STEGO_ONLY (Cover staged)")
        print(f"Test 2 [Staged Cover, Stego Missing]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Staged Cover, Stego Missing", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 3: Both Missing
        # -------------------------------------------------------------
        cov_p3 = out_cover_dir / "103.pgm"
        stego_p3 = out_stego_dir / "103.pgm"
        raw_cov_p3 = raw_dir / "103.pgm"
        create_synthetic_p5_pgm(raw_cov_p3, base_cover)

        is_valid, reason, _ = validate_pair(raw_cov_p3, cov_p3, stego_p3)
        res_dry = worker_task((103, str(raw_cov_p3), str(cov_p3), str(stego_p3), 0.4, 100103, True))
        passed = (is_valid is False) and (reason == "both_missing") and (res_dry["action"] == "GENERATE_PAIR (Cover + Stego)")
        print(f"Test 3 [Both Missing]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Both Missing", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 4: Truncated Stego (128 bytes)
        # -------------------------------------------------------------
        cov_p4 = out_cover_dir / "104.pgm"
        stego_p4 = out_stego_dir / "104.pgm"
        raw_cov_p4 = raw_dir / "104.pgm"
        create_synthetic_p5_pgm(raw_cov_p4, base_cover)
        create_synthetic_p5_pgm(cov_p4, base_cover)
        with open(stego_p4, "wb") as f:
            f.write(b"P5\n512 512\n255\n" + b"\x00" * 128)

        is_valid, reason, _ = validate_pair(raw_cov_p4, cov_p4, stego_p4)
        res_dry = worker_task((104, str(raw_cov_p4), str(cov_p4), str(stego_p4), 0.4, 100104, True))
        passed = (is_valid is False) and ("invalid_data_length" in reason) and ("REGENERATE_STEGO" in res_dry["action"])
        print(f"Test 4 [Truncated Stego]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Truncated Stego", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 5: Corrupt Stego Magic (P6 instead of P5)
        # -------------------------------------------------------------
        cov_p5 = out_cover_dir / "105.pgm"
        stego_p5 = out_stego_dir / "105.pgm"
        raw_cov_p5 = raw_dir / "105.pgm"
        create_synthetic_p5_pgm(raw_cov_p5, base_cover)
        create_synthetic_p5_pgm(cov_p5, base_cover)
        with open(stego_p5, "wb") as f:
            f.write(b"P6\n512 512\n255\n" + base_stego_valid.tobytes())

        is_valid, reason, _ = validate_pair(raw_cov_p5, cov_p5, stego_p5)
        res_dry = worker_task((105, str(raw_cov_p5), str(cov_p5), str(stego_p5), 0.4, 100105, True))
        passed = (is_valid is False) and ("invalid_magic" in reason) and ("REGENERATE_STEGO" in res_dry["action"])
        print(f"Test 5 [Corrupt Stego Magic]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Corrupt Stego Magic", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 6: Wrong Dimensions (256x256 Stego)
        # -------------------------------------------------------------
        cov_p6 = out_cover_dir / "106.pgm"
        stego_p6 = out_stego_dir / "106.pgm"
        raw_cov_p6 = raw_dir / "106.pgm"
        create_synthetic_p5_pgm(raw_cov_p6, base_cover)
        create_synthetic_p5_pgm(cov_p6, base_cover)
        small_stego = np.zeros((256, 256), dtype=np.uint8)
        create_synthetic_p5_pgm(stego_p6, small_stego)

        is_valid, reason, _ = validate_pair(raw_cov_p6, cov_p6, stego_p6)
        res_dry = worker_task((106, str(raw_cov_p6), str(cov_p6), str(stego_p6), 0.4, 100106, True))
        passed = (is_valid is False) and ("invalid_dimensions" in reason) and ("REGENERATE_STEGO" in res_dry["action"])
        print(f"Test 6 [Wrong Stego Dimensions]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Wrong Stego Dimensions", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 7: Ternary Constraint Violation (|delta| = 2)
        # -------------------------------------------------------------
        cov_p7 = out_cover_dir / "107.pgm"
        stego_p7 = out_stego_dir / "107.pgm"
        raw_cov_p7 = raw_dir / "107.pgm"
        create_synthetic_p5_pgm(raw_cov_p7, base_cover)
        create_synthetic_p5_pgm(cov_p7, base_cover)
        stego_violation = base_cover.copy()
        stego_violation[50, 50] = int(base_cover[50, 50]) + 2  # delta = +2
        create_synthetic_p5_pgm(stego_p7, stego_violation)

        is_valid, reason, _ = validate_pair(raw_cov_p7, cov_p7, stego_p7)
        res_dry = worker_task((107, str(raw_cov_p7), str(cov_p7), str(stego_p7), 0.4, 100107, True))
        passed = (is_valid is False) and ("ternary_violation_max_diff_2" in reason) and ("REGENERATE_STEGO" in res_dry["action"])
        print(f"Test 7 [Ternary Violation delta=2]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Ternary Violation delta=2", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 8: Cover Mismatch Against Raw BOSSbase
        # -------------------------------------------------------------
        cov_p8 = out_cover_dir / "108.pgm"
        stego_p8 = out_stego_dir / "108.pgm"
        raw_cov_p8 = raw_dir / "108.pgm"
        create_synthetic_p5_pgm(raw_cov_p8, base_cover)
        altered_cover = base_cover.copy()
        altered_cover[0, 0] = 99  # Mismatch with raw cover
        create_synthetic_p5_pgm(cov_p8, altered_cover)
        create_synthetic_p5_pgm(stego_p8, altered_cover)

        is_valid, reason, _ = validate_pair(raw_cov_p8, cov_p8, stego_p8)
        res_dry = worker_task((108, str(raw_cov_p8), str(cov_p8), str(stego_p8), 0.4, 100108, True))
        passed = (is_valid is False) and (reason == "cover_mismatch_with_bossbase") and ("REGENERATE_PAIR" in res_dry["action"])
        print(f"Test 8 [Cover Mismatch with Raw]: valid={is_valid}, action='{res_dry['action']}' -> {'PASS' if passed else 'FAIL'}")
        test_results.append(("Cover Mismatch with Raw", passed, reason, res_dry["action"]))

        # -------------------------------------------------------------
        # Test Case 9: Atomic File Replacement & Temp File Cleanup
        # -------------------------------------------------------------
        atomic_test_p = temp_root / "atomic_test.pgm"
        save_pgm_image_atomic(atomic_test_p, base_cover)
        ok_load, loaded_arr, _ = load_p5_pgm(atomic_test_p)
        leftover_tmps = list(temp_root.glob("*.tmp"))
        passed_atomic = ok_load and np.array_equal(loaded_arr, base_cover) and (len(leftover_tmps) == 0)
        print(f"Test 9 [Atomic Write & Cleanup]: loaded={ok_load}, leftovers={len(leftover_tmps)} -> {'PASS' if passed_atomic else 'FAIL'}")
        test_results.append(("Atomic Write & Cleanup", passed_atomic, "ok", "save_pgm_image_atomic"))

        # -------------------------------------------------------------
        # Test Case 10: Safe Regeneration of Corrupted Pair
        # -------------------------------------------------------------
        # Using Case 4 (truncated stego): run worker_task without dry_run, verify it fixes the stego!
        res_fix = worker_task((104, str(raw_cov_p4), str(cov_p4), str(stego_p4), 0.4, 100104, False))
        is_valid_after, reason_after, _ = validate_pair(raw_cov_p4, cov_p4, stego_p4)
        passed_recovery = (res_fix["status"] == "generated") and is_valid_after
        print(f"Test 10 [Safe Recovery of Corrupted Stego]: fixed_status={res_fix['status']}, valid_after={is_valid_after} -> {'PASS' if passed_recovery else 'FAIL'}")
        test_results.append(("Safe Recovery of Corrupted Stego", passed_recovery, reason_after, res_fix["status"]))

        # Subsequent call must skip it!
        res_subsequent = worker_task((104, str(raw_cov_p4), str(cov_p4), str(stego_p4), 0.4, 100104, False))
        passed_subsequent = (res_subsequent["status"] == "skipped")
        print(f"Test 11 [Subsequent Skip After Recovery]: status={res_subsequent['status']} -> {'PASS' if passed_subsequent else 'FAIL'}")
        test_results.append(("Subsequent Skip After Recovery", passed_subsequent, "valid", res_subsequent["status"]))

    finally:
        # Clean up temporary test files
        shutil.rmtree(temp_root)
        print("\nCleaned up isolated temporary test directory successfully.")

    print("\n" + "=" * 80)
    print("SYNTHETIC TEST SUMMARY:")
    all_passed = all(r[1] for r in test_results)
    for name, passed, reason, action in test_results:
        print(f"  [{'PASS' if passed else 'FAIL'}] {name:<35} | reason: {reason:<30} | action: {action}")
    print("=" * 80)
    print(f"Overall Result: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")

    return all_passed, test_results

if __name__ == "__main__":
    ok, results = run_synthetic_tests()
    sys.exit(0 if ok else 1)

