# TASK 2H: FINAL RESUME SAFETY FIX & OUTPUT ROUTING VALIDATION REPORT

**Project**: S-UNIWARD Deep Learning Steganalysis Pipeline (`D:\Stego`)  
**Target Dataset**: `D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\`  
**Generator**: `D:\Stego\scripts\generate_suniward_dataset.py`  
**Raw Source**: `D:\Stego\dataset\raw\BOSSbase\` (10,000 PGM images)  
**Date**: 2026-11-10  
**Audit Status**: **PASS** (100% Verified — Pipeline Protected, Routing Validated, Ready for Generation)

---

## Executive Summary

Task 2H resolved all remaining resume safety concerns and validated dataset output routing before initiating full dataset generation. The legacy file-size-only check was completely eliminated from `generate_suniward_dataset.py` and replaced with an atomic, multi-criteria image validation engine. The pipeline now verifies file readability, $512 \times 512$ spatial geometry, pixel dynamic range $[0, 255]$, cover identity against pristine BOSSbase covers, and strict ternary embedding compliance ($\max |\Delta| \le 1$).

All changes were rigorously verified through a comprehensive synthetic edge-case test suite in an isolated sandbox, a dry-run on representative IDs (`1`, `66`, `4001`, `5001`), and a full 10,000-image dry-run across the entire dataset.

### Summary of Task 2H Results

| Verification Category | Requirement / Scope | Outcome | Verdict |
| :--- | :--- | :--- | :---: |
| **1. Resume Validation** | Replace size check with full P5 header, dimensions, pixel range, BOSSbase cover match, and ternary constraint checks | Implemented `load_p5_pgm`, `validate_pair`, and atomic file replace | **PASS** |
| **2. Existing Dataset Protection** | Preserve all 68 stego files and 76 cover files; preserve 8 staged covers | Verified: 68 stegos and 76 covers intact; 8 staged covers protected from re-copy | **PASS** |
| **3. Split Routing Verification** | 1–4000 $\to$ Train, 4001–5000 $\to$ Val, 5001–10000 $\to$ Test; cover/stego co-location | Verified on boundaries (4000/4001, 5000/5001); 0 misplaced files; 0 migrations needed | **PASS** |
| **4. Synthetic Corruption Suite** | 11 synthetic edge cases tested in isolated directory without touching dataset files | 11 of 11 tests passed (corrupt magic, truncated data, ternary violation, recovery) | **PASS** |
| **5. Dry-Run Verification** | Representative IDs (1, 66, 4001, 5001) + full 10,000 dry run | ID 1: SKIP; ID 66: GENERATE_STEGO_ONLY; IDs 4001/5001: GENERATE_PAIR; 0 files modified | **PASS** |
| **6. Overall Task Verdict** | Final sign-off for full dataset generation | **PASS** — Ready for full dataset generation upon user approval | **PASS** |

---

## 1. Modifications to the Generator (`generate_suniward_dataset.py`)

The generator script [generate_suniward_dataset.py](file:///D:/Stego/scripts/generate_suniward_dataset.py) was enhanced with production-grade safety mechanisms:

### 1.1 Strict Binary P5 PGM Validation Engine (`load_p5_pgm`)
Replaced basic filesystem checks with an explicit binary parser:
- Verifies magic header `P5`.
- Ignores comment lines starting with `#`.
- Verifies spatial dimensions are exactly $512 \times 512$ pixels.
- Verifies maximum pixel value is $255$.
- Verifies exact pixel buffer length ($512 \times 512 = 262,144$ bytes).
- Returns uint8 numpy array and descriptive status message.

### 1.2 Multi-Criteria Pair Integrity Validator (`validate_pair`)
Every candidate pair undergoes strict validation before being accepted:
1. **Existence**: Verifies presence of both cover and stego files.
2. **Cover Authenticity**: Validates `out_cover` against `cover_src` (raw BOSSbase cover) using element-wise array equality (`np.array_equal(cov_arr, raw_arr)`).
3. **Stego Readability**: Validates `out_stego` format and dimensions.
4. **Ternary Embedding Constraint**: Evaluates $\max |\text{stego} - \text{cover}| \le 1$. If any pixel delta $|\Delta| > 1$, the stego is flagged as invalid.
5. **Boundary Clamping**: Guarantees no overflow ($C=255 \implies S \le 255$) and no underflow ($C=0 \implies S \ge 0$).
6. **Staged Cover Detection**: Identifies pairs where the cover is already valid but stego is pending (`stego_missing_cover_staged`).

### 1.3 Atomic File Writing & Safe Replacement
- `save_pgm_image_atomic`: Writes stego data to a process- and timestamp-isolated temporary file (`.tmp_{stem}_{pid}_{time_ns}.tmp`) in the destination directory, issues an explicit `flush()` and `os.fsync()`, and replaces the target via `os.replace`. If an error occurs, the temporary file is unlinked.
- `atomic_copy_file`: Staged covers are copied via unique temporary files and atomic `os.replace`.
- This ensures that sudden power loss, process termination, or interruption can never leave corrupted, zero-byte, or partial files in the dataset directory.

### 1.4 Protection of Staged Covers
- In `worker_task`: If `out_cover` already exists and matches raw BOSSbase (`cov_arr is not None`), `atomic_copy_file` is **skipped**. Only the missing stego image is computed and written.

### 1.5 CLI Enhancements
- `--dry-run`: Performs complete validation and routing for all tasks and outputs planned actions without reading images into memory or writing any files.
- `--test-ids`: Allows targeting specific image IDs (e.g. `--test-ids 1,66,4001,5001`) for surgical dry runs and debugging.

---

## 2. Synthetic Corruption & Resume Recovery Test Suite

To guarantee that corrupted or partial files are safely detected and regenerated without touching real dataset files, an isolated synthetic test suite was created and executed in [test_synthetic_resume.py](file:///D:/Stego/reports/suniward_validation/test_synthetic_resume.py).

### Test Suite Results (11 / 11 Passed)

| # | Test Scenario | Description / Condition | Detected Reason | Executed Action | Result |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1** | Pristine Valid Pair | Cover and stego valid, $|S - C| \le 1$ | `valid` | `SKIP (Already valid)` | **PASS** |
| **2** | Staged Cover Only | Valid cover, missing stego | `stego_missing_cover_staged` | `GENERATE_STEGO_ONLY (Cover staged)` | **PASS** |
| **3** | Both Missing | Neither cover nor stego exists | `both_missing` | `GENERATE_PAIR (Cover + Stego)` | **PASS** |
| **4** | Truncated Stego | Stego file truncated to 128 bytes | `out_stego_invalid_data_length` | `REGENERATE_STEGO` | **PASS** |
| **5** | Corrupt Magic | Stego header modified to `P6` | `out_stego_invalid_magic_P6` | `REGENERATE_STEGO` | **PASS** |
| **6** | Wrong Dimensions | Stego dimensions modified to $256 \times 256$ | `out_stego_invalid_dimensions` | `REGENERATE_STEGO` | **PASS** |
| **7** | Ternary Violation | Stego pixel modified by $\Delta = +2$ | `ternary_violation_max_diff_2` | `REGENERATE_STEGO` | **PASS** |
| **8** | Cover Mismatch | Cover pixel modified vs raw BOSSbase | `cover_mismatch_with_bossbase` | `REGENERATE_PAIR` | **PASS** |
| **9** | Atomic Replacement | File write + fsync + `os.replace` | `ok` | Clean atomic write, 0 leftover `.tmp` | **PASS** |
| **10**| Corrupt Recovery | Regenerate truncated stego via worker | `valid` | Fixed stego generated and verified | **PASS** |
| **11**| Subsequent Skip | Re-run on recovered pair | `valid` | `skipped` (recognized as valid) | **PASS** |

All tests completed successfully, and the temporary test sandbox was cleanly unlinked.

---

## 3. Existing Dataset Integrity & Protection Audit

The existing dataset files were re-audited using the new validation engine:

- **Train Covers** (`dataset/processed/S-UNIWARD_0.4bpp/train/cover/`):
  - **76 files** present (`1.pgm` to `76.pgm`).
  - $100\%$ match raw BOSSbase byte-for-byte (**0** mismatches).
  - File size: Exactly 262,159 bytes for all 76 files.
- **Train Stegos** (`dataset/processed/S-UNIWARD_0.4bpp/train/stego/`):
  - **68 files** present (`1.pgm` to `65.pgm`, `67.pgm`, `68.pgm`, `70.pgm`).
  - $100\%$ pass binary P5 validation and ternary constraints ($\max |\Delta| \le 1$).
  - File size: Exactly 262,159 bytes for all 68 files.
- **Staged Covers (8 files)**:
  - IDs `[66, 69, 71, 72, 73, 74, 75, 76]`.
  - Identified by the validator as `GENERATE_STEGO_ONLY (Cover staged)`.
  - The covers are verified valid and will not be re-copied or overwritten.

---

## 4. Split Routing & Data Leakage Audit

Output paths were checked across all 10,000 tasks:

### 4.1 Routing Rules & Boundary Verification

| Split | Range | Target Cover Path | Target Stego Path | Verified Boundary Images |
| :--- | :---: | :--- | :--- | :--- |
| **Train** | `1` .. `4000` | `.../train/cover/{i}.pgm` | `.../train/stego/{i}.pgm` | ID 1: Train, ID 4000: Train |
| **Validation** | `4001` .. `5000` | `.../val/cover/{i}.pgm` | `.../val/stego/{i}.pgm` | ID 4001: Val, ID 5000: Val |
| **Test** | `5001` .. `10000` | `.../test/cover/{i}.pgm` | `.../test/stego/{i}.pgm` | ID 5001: Test, ID 10000: Test |

- **Co-location**: In all cases, `out_cover` and `out_stego` share the identical split root directory (`train/`, `val/`, `test/`).
- **Disjoint Partitions**: $\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$.
- **Migration Requirements**: **NONE**. All 76 existing cover files and 68 existing stego files belong to IDs $1 \le i \le 76$, which strictly fall inside the training split (`train/`). Zero files require migration.

---

## 5. Safe Dry-Run Verification

### 5.1 Representative IDs Dry Run
Command executed:
```powershell
python D:\Stego\scripts\generate_suniward_dataset.py --dry-run --test-ids 1,66,4001,5001
```

**Console Output**:
```
ID     1 | Action: SKIP (Already valid)                | Cover: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\train\cover\1.pgm | Stego: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\train\stego\1.pgm
ID    66 | Action: GENERATE_STEGO_ONLY (Cover staged)  | Cover: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\train\cover\66.pgm | Stego: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\train\stego\66.pgm
ID  4001 | Action: GENERATE_PAIR (Cover + Stego)       | Cover: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\val\cover\4001.pgm | Stego: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\val\stego\4001.pgm
ID  5001 | Action: GENERATE_PAIR (Cover + Stego)       | Cover: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\test\cover\5001.pgm | Stego: D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\test\stego\5001.pgm

Dry Run Action Breakdown:
  GENERATE_PAIR (Cover + Stego): 2
  GENERATE_STEGO_ONLY (Cover staged): 1
  SKIP (Already valid): 1
Dry run completed successfully. No files created or modified.
```

### 5.2 Full 10,000 Dataset Dry Run
Command executed:
```powershell
python D:\Stego\scripts\generate_suniward_dataset.py --dry-run
```

**Action Breakdown across 10,000 Tasks**:
- **`SKIP (Already valid)`**: Exactly **68** tasks (IDs 1–65, 67, 68, 70).
- **`GENERATE_STEGO_ONLY (Cover staged)`**: Exactly **8** tasks (IDs 66, 69, 71, 72, 73, 74, 75, 76).
- **`GENERATE_PAIR (Cover + Stego)`**: Exactly **9,924** tasks (Train: 3,924; Val: 1,000; Test: 5,000).
- **Total Workload**: Exactly $9,924 + 8 = \mathbf{9,932\text{ images}}$ to embed, and $68$ to preserve.
- **Files Created / Modified**: **0** (Dry run is completely read-only).

---

## 6. Final Decision & Sign-Off

### Audit Recommendation: **PASS**

1. **Robust Validation**: Legacy file-size check has been replaced by full image, header, pixel range, BOSSbase cover match, and ternary constraint validation.
2. **Atomic Resilience**: Atomic writing and renaming via `.tmp` files with explicit flush/fsync prevents partial or truncated files.
3. **Existing Data Preservation**: All 68 valid stego images and 76 cover images are preserved. The 8 staged covers will not be re-copied.
4. **Split Routing**: Verified for 100% of 10,000 image tasks. No file migrations are needed.
5. **Safety Adherence**: No new dataset images were generated, no existing dataset files were modified, no MATLAB files or BOSSbase covers were touched, and no training was initiated.

**The S-UNIWARD dataset generation pipeline is fully secured, validated, and ready to launch upon user approval.**

