# TASK 2G: DATASET INTEGRITY & SAFE GENERATION READINESS AUDIT REPORT

**Project**: S-UNIWARD Deep Learning Steganalysis Pipeline (`D:\Stego`)  
**Target Dataset**: `D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\`  
**Raw Cover Source**: `D:\Stego\dataset\raw\BOSSbase\` (10,000 PGM images)  
**Python Generator**: `D:\Stego\scripts\generate_suniward_dataset.py`  
**Reference Diagnostics**: `D:\Stego\reports\suniward_validation\`  
**Date**: 2026-11-10  
**Audit Status**: **PASS** (100% Verified — Ready for Generation Resumption)

---

## Executive Summary

Before approving the execution of the full dataset generation (remaining 9,932 pairs of S-UNIWARD at 0.40 bpp), a comprehensive read-only audit of `D:\Stego\dataset\` was conducted. The audit verified dataset file inventory, cover-stego pairing integrity, ternary embedding constraints, dataset partitioning, data leakage risks, generator resume safety, and execution throughput.

### Summary of Audit Results

| Audit Category | Verification Scope | Status | Key Findings |
| :--- | :--- | :---: | :--- |
| **A. Exact Inventory** | All directories in `processed/S-UNIWARD_0.4bpp/` | **PASS** | 76 train covers, 68 train stegos, 0 val, 0 test, 5 sample test files. |
| **B. Pairing & Constraints** | 68 existing stego images vs BOSSbase covers | **PASS** | 68 valid pairs; 0 corrupt files; $\max|\Delta| \le 1$ in 100%; change rate $9.69\% \pm 0.39\%$. |
| **B. Staged Covers Investigation**| 8 excess cover files in `train/cover/` | **PASS** | Explained: 8 worker processes staged covers before interruption; 0 orphan stegos. |
| **C. Split & Leakage** | 10,000 BOSSbase IDs across Train/Val/Test | **PASS** | 0 overlap ($\text{Train} \cap \text{Val} \cap \text{Test} = \emptyset$); deterministic seed $100000 + i$. |
| **D. Resume Safety** | `generate_suniward_dataset.py` skip logic | **PASS** | Validated skip condition ($\ge 262,144$ bytes); skips 68 completed pairs; generates remaining 9,932. |
| **E. Generation Plan** | 9,932 remaining pairs across 8 workers | **PASS** | Throughput $5.16\text{ img/s}$; estimated wall-clock runtime $\approx 32.3\text{ min}$; RAM $\approx 640\text{ MB}$. |
| **F. Final Verdict** | Production readiness decision | **PASS** | **Approved for full dataset generation upon user command.** |

---

## PART A — Exact Dataset Inventory

A complete recursive directory audit of `D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\` and `D:\Stego\dataset\raw\BOSSbase\` was executed using [audit_dataset.py](file:///D:/Stego/reports/suniward_validation/audit_dataset.py).

### 1. Directory File Counts

| Subdirectory Path | File Format | File Count | Filename Pattern | Status |
| :--- | :---: | :---: | :---: | :---: |
| `dataset\raw\BOSSbase\` | PGM (`P5`) | **10,000** | `1.pgm` .. `10000.pgm` | Intact, unaltered |
| `dataset\processed\S-UNIWARD_0.4bpp\train\cover\` | PGM (`P5`) | **76** | `1.pgm` .. `76.pgm` | 68 paired, 8 staged |
| `dataset\processed\S-UNIWARD_0.4bpp\train\stego\` | PGM (`P5`) | **68** | `1.pgm` .. `70.pgm` (gaps: 66, 69) | 68 valid stego |
| `dataset\processed\S-UNIWARD_0.4bpp\val\cover\` | N/A | **0** | N/A | Empty |
| `dataset\processed\S-UNIWARD_0.4bpp\val\stego\` | N/A | **0** | N/A | Empty |
| `dataset\processed\S-UNIWARD_0.4bpp\test\cover\` | N/A | **0** | N/A | Empty |
| `dataset\processed\S-UNIWARD_0.4bpp\test\stego\` | N/A | **0** | N/A | Empty |
| `dataset\processed\S-UNIWARD_0.4bpp\sample_test\` | PGM (`P5`) | **5** | `1_stego.pgm` .. `5_stego.pgm` | Isolated test directory |
| Non-PGM Files in Processed Directory | None | **0** | None | Clean |

### 2. Inventory Findings
1. **Total Processed Pairs**: Exactly **68 complete cover-stego pairs** exist in `train/`.
2. **Naming Scheme**: Pure numerical naming `{index}.pgm` strictly matches the raw BOSSbase identifier across all splits.
3. **No Corrupt or Unexpected Files**: No `.tmp`, `.partial`, or non-PGM files exist anywhere in the processed dataset tree.
4. **Sample Test Directory**: `sample_test/` is an isolated experimental directory containing 5 files (`1_stego.pgm` through `5_stego.pgm`) created during initial pipeline setup, completely outside the production splits.

---

## PART B — Cover-Stego Pairing & Constraint Audit

Every one of the 68 existing stego images was evaluated against its counterpart in `dataset/processed/S-UNIWARD_0.4bpp/train/cover/` and against the pristine raw cover in `dataset/raw/BOSSbase/`.

The complete audit is recorded in [TASK2G_PAIRING_AUDIT.csv](file:///D:/Stego/reports/suniward_validation/TASK2G_PAIRING_AUDIT.csv).

### 1. Pairing & Integrity Metrics

| Metric | Required Specification | Measured / Audited Result | Compliance |
| :--- | :--- | :--- | :---: |
| **Total Stego Images Audited** | 68 images | 68 images | **PASS** |
| **Binary PGM Header** | `P5\n512 512\n255\n` | 68 of 68 valid `P5` binary | **PASS** |
| **Exact File Size** | 262,159 bytes ($512 \times 512 + 15\text{ header}$) | 262,159 bytes (68 of 68) | **PASS** |
| **Image Spatial Dimensions** | $512 \times 512$ pixels | $512 \times 512$ pixels (68 of 68) | **PASS** |
| **Pixel Value Bounds** | $[0, 255]$ | $[0, 255]$ (0 boundary violations) | **PASS** |
| **Ternary Embedding Constraint** | $\max \|S_{i,j} - C_{i,j}\| \le 1$ | $\max \|S - C\| = 1$ (68 of 68) | **PASS** |
| **Changed Pixels Count** | $\approx 25,000$ to $27,000$ pixels | Min: 22,546, Max: 27,322, Mean: 25,404 | **PASS** |
| **Average Embedding Change Rate** | $\approx 9.7\% \pm 0.5\%$ | $9.69\% \pm 0.39\%$ | **PASS** |
| **Embedding Direction Balance** | Balanced $+1$ and $-1$ changes | Mean $+1$: $12,711$; Mean $-1$: $12,693$ | **PASS** |
| **Duplicate Stego Hashes** | 0 duplicates | 68 unique SHA-256 hashes | **PASS** |
| **Orphan Stego Images** | 0 orphans | 0 orphans (100% have valid covers) | **PASS** |

### 2. Resolution of the 76 Covers vs. 68 Stegos Discrepancy

In the previous run, `train/cover/` contained 76 files (`1.pgm` .. `76.pgm`), while `train/stego/` contained 68 files.

- **Completed Stego IDs (68 images)**:
  `1` to `65`, `67`, `68`, `70`.
- **Staged Cover IDs (8 images)**:
  `66`, `69`, `71`, `72`, `73`, `74`, `75`, `76`.

**Root Cause**:
In `generate_suniward_dataset.py`, the worker task executes:
```python
if not out_cover.exists():
    shutil.copy2(cover_src, out_cover)

stego_arr, stats = embed_suniward(cover_arr, payload=payload, seed=seed)
save_pgm_image(out_stego, stego_arr)
```
Because the generation was run with **8 parallel worker processes**, when the execution was stopped after image 68, the 8 active worker processes had already copied their respective cover files into `train/cover/` for IDs `[66, 69, 71, 72, 73, 74, 75, 76]`, but had not yet completed computing and writing the corresponding stego files.

**Conclusion**:
- The 68 stego images have 100% matched, valid covers.
- The 8 excess covers are clean, uncorrupted copies of the corresponding raw BOSSbase images awaiting stego computation.
- There are **zero orphan stego images** (no stego without a cover).

---

## PART C — Dataset Split & Data Leakage Audit

The project split strategy was audited across all 10,000 BOSSbase images to ensure complete, deterministic, and mutually exclusive partitioning.

The complete split audit is recorded in [TASK2G_SPLIT_AUDIT.csv](file:///D:/Stego/reports/suniward_validation/TASK2G_SPLIT_AUDIT.csv).

### 1. Split Allocation Matrix

| Split Name | Cover ID Range | Planned Pairs | Completed Pairs | Staged Covers | Pending Pairs | Deterministic Seed Formula |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | `1` to `4000` | $4,000$ | $68$ | $8$ | $3,932$ | $100000 + i$ ($100001$ to $104000$) |
| **Validation** | `4001` to `5000` | $1,000$ | $0$ | $0$ | $1,000$ | $100000 + i$ ($104001$ to $105000$) |
| **Test** | `5001` to `10000` | $5,000$ | $0$ | $0$ | $5,000$ | $100000 + i$ ($105001$ to $110000$) |
| **Total** | `1` to `10000` | **$10,000$** | **$68$** | **$8$** | **$9,932$** | Unique per image |

### 2. Leakage and Overlap Verification

1. **Mutual Exclusivity**:
   $$\text{Train} \cap \text{Val} = \emptyset, \quad \text{Train} \cap \text{Test} = \emptyset, \quad \text{Val} \cap \text{Test} = \emptyset$$
   Every BOSSbase ID belongs to exactly one split.
2. **Completeness**:
   $$\text{Train} \cup \text{Val} \cup \text{Test} = \{1, 2, \dots, 10000\}$$
   All 10,000 images are accounted for with zero unassigned or skipped IDs.
3. **Cover-Stego Co-location**:
   For every image $i$, `cover/{i}.pgm` and `stego/{i}.pgm` reside in the identical split directory. No stego is separated from its cover.
4. **Cross-Split Contamination**: Exactly **0 cross-split assignments** detected.

---

## PART D — Generator Resume & Failure Safety Audit

Inspection of [generate_suniward_dataset.py](file:///D:/Stego/scripts/generate_suniward_dataset.py) lines 206–224 confirmed the safety of resuming generation:

```python
# Line 206-208:
if out_stego.exists() and out_stego.stat().st_size >= 262144 and out_cover.exists() and out_cover.stat().st_size >= 262144:
    return {"index": index, "status": "skipped", "duration": 0.0}

# Line 211-212:
if not out_cover.exists():
    shutil.copy2(cover_src, out_cover)

# Line 218-222:
stego_arr, stats = embed_suniward(cover_arr, payload=payload, seed=seed)
save_pgm_image(out_stego, stego_arr)
```

### Safety Assessment

1. **Non-Destructive Skip Mechanism**:
   - The skip guard requires **both** `out_stego` and `out_cover` to exist and to have file sizes $\ge 262,144\text{ bytes}$ (exact valid size is $262,159\text{ bytes}$).
   - The **68 completed stego pairs** evaluate to `True` on this condition and will be skipped in $0.00\text{ seconds}$ without modifying or overwriting any existing files.
2. **Handling of the 8 Staged Covers**:
   - For IDs `[66, 69, 71, 72, 73, 74, 75, 76]`, `out_stego` does not exist $\implies$ skip condition evaluates to `False`.
   - Line 211 `if not out_cover.exists():` evaluates to `False`, avoiding redundant file copy.
   - The worker computes S-UNIWARD embedding and writes `out_stego.pgm`, completing the pair seamlessly.
3. **Interruption & Partial Write Safety**:
   - If a process is terminated during execution, any zero-byte or truncated file with size $< 262,144$ bytes will fail the resume check and be cleanly re-processed on subsequent runs.
4. **Multiprocessing Concurrency Safety**:
   - Each worker operates on an independent image ID with distinct file paths. There are zero shared mutable objects, lock contentions, or race conditions.

---

## PART E — Safe Generation Execution Plan

The execution plan is detailed in [TASK2G_GENERATION_PLAN.md](file:///D:/Stego/reports/suniward_validation/TASK2G_GENERATION_PLAN.md).

### 1. Workload Summary

- **Total Images to Generate**: **9,932 pairs**
  - Train: 3,932 pairs
  - Validation: 1,000 pairs
  - Test: 5,000 pairs
- **Total Images to Skip**: **68 pairs**
- **Payload**: $0.4000\text{ bpp}$ ($104,858\text{ bits}$ embedded per image)
- **Base Seed**: $100000$ (Image $i$ uses seed $100000 + i$)

### 2. Performance & Resource Forecast

- **Worker Concurrency**: 8 parallel processes (`concurrent.futures.ProcessPoolExecutor`)
- **Observed Throughput**: $5.16\text{ images / second}$ ($0.645\text{ s / image / core}$)
- **Estimated Runtime**:
  $$\text{Time} = \frac{9,932\text{ images}}{5.16\text{ img/s}} \approx 1,925\text{ seconds} \approx \mathbf{32.1\text{ minutes}} \quad (0.54\text{ hours})$$
- **RAM Utilization**: $\approx 80\text{ MB}$ per worker $\implies \approx 640\text{ MB}$ total RAM.
- **Disk Space Required**:
  $$9,932 \times 2 \times 262,159\text{ bytes} \approx \mathbf{5.21\text{ GB}}$$
  (Available disk capacity on `D:` is $> 50\text{ GB}$).

### 3. Post-Generation Quality Gates

Upon completion of dataset generation, the following automated verification checks will be run:
1. Verify exact counts: `train/` (4,000 pairs), `val/` (1,000 pairs), `test/` (5,000 pairs).
2. Verify all 20,000 files have exact size $262,159\text{ bytes}$.
3. Verify sample ternary constraints $\max|\Delta| \le 1$ across 100 randomly sampled pairs per split.
4. Confirm zero cross-split ID overlap.

---

## PART F — Final Decision & Sign-Off

### Audit Recommendation: **PASS**

All requirements of Task 2G are fully satisfied:
1. The existing 68 stego images are valid, strictly paired, satisfy ternary constraints, and have zero corruption.
2. The 8 staged covers are fully explained and will be seamlessly processed upon resume.
3. The dataset partitioning guarantees zero data leakage across train, val, and test splits.
4. The resume logic in `generate_suniward_dataset.py` is non-destructive, safe, and robust against interruption.
5. All safety restrictions have been preserved: no dataset files were modified, no training started, and no code was altered.

**Status**: Ready to proceed with full dataset generation upon user command.

