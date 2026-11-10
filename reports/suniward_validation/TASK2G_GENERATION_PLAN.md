# Task 2G: S-UNIWARD Safe Dataset Generation & Execution Plan

**Location**: `D:\Stego\reports\suniward_validation\TASK2G_GENERATION_PLAN.md`  
**Date**: 2026-11-10  
**Generator**: `D:\Stego\scripts\generate_suniward_dataset.py`  
**Dataset Root**: `D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\`  
**Raw Source**: `D:\Stego\dataset\raw\BOSSbase\` (10,000 PGM images, intact)  
**Target Embedding Payload**: $0.4000\text{ bpp}$  

---

## 1. Verified Inventory & Remaining Workload

Based on the recursive read-only audit of `dataset/processed/S-UNIWARD_0.4bpp/`:

| Dataset Split | Cover ID Range | Target Pairs | Currently Completed | Staged Covers Pending Stego | Remaining Pairs to Generate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Train** | `1` to `4000` | $4,000$ | $68$ | $8$ (IDs: 66, 69, 71–76) | **$3,932$** |
| **Validation** | `4001` to `5000` | $1,000$ | $0$ | $0$ | **$1,000$** |
| **Test** | `5001` to `10000` | $5,000$ | $0$ | $0$ | **$5,000$** |
| **Total** | `1` to `10000` | **$10,000$** | **$68$** | **$8$** | **$9,932$** |

---

## 2. Directory Structure & File Organization

The generator organizes images into disjoint, strictly separated directories to guarantee zero data leakage between training, validation, and testing sets:

```
D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\
├── train\
│   ├── cover\      (4,000 files: 1.pgm .. 4000.pgm)
│   └── stego\      (4,000 files: 1.pgm .. 4000.pgm)
├── val\
│   ├── cover\      (1,000 files: 4001.pgm .. 5000.pgm)
│   └── stego\      (1,000 files: 4001.pgm .. 5000.pgm)
└── test\
    ├── cover\      (5,000 files: 5001.pgm .. 10000.pgm)
    └── stego\      (5,000 files: 5001.pgm .. 10000.pgm)
```

- **Naming Convention**: Clean numeric filenames matching the raw BOSSbase identifier: `{index}.pgm`.
- **Pair Matching**: In all splits, `cover/{index}.pgm` corresponds strictly to `stego/{index}.pgm`.
- **Deterministic Seeding**: For every image $i$, the random seed is given by:
  $$\text{seed}_i = \text{base\_seed} + i = 100000 + i$$
  guaranteeing full reproducibility across runs and independent pseudorandom keys per image.

---

## 3. Resume Safety & Execution Order

### 3.1 Non-Destructive Skip Mechanism
When generation is launched, `generate_suniward_dataset.py` checks both files for each task:
```python
if out_stego.exists() and out_stego.stat().st_size >= 262144 and out_cover.exists() and out_cover.stat().st_size >= 262144:
    return {"index": index, "status": "skipped", "duration": 0.0}
```
- For the **68 completed stego pairs**, both `out_stego` and `out_cover` exist with size $262,159\text{ bytes} \ge 262,144$. They are safely and instantly skipped.
- For the **8 staged covers** (IDs 66, 69, 71–76), `out_stego` does not exist. The generator will compute their S-UNIWARD embedding and write their stego files.
- For the remaining **3,924 train, 1,000 val, and 5,000 test pairs**, neither file exists. The generator will stage the cover and compute the stego image.

### 3.2 Execution Command
```powershell
python D:\Stego\scripts\generate_suniward_dataset.py --workers 8 --payload 0.4 --base-seed 100000
```
- **Workers**: 8 parallel worker processes (`concurrent.futures.ProcessPoolExecutor`).
- **Memory Footprint**: $\approx 80\text{ MB}$ per process $\implies \approx 640\text{ MB}$ total RAM.
- **Throughput**: Measured at $5.16\text{ images / second}$.
- **Estimated Completion Time**: $\approx \mathbf{32.3\text{ minutes}}$ ($0.54\text{ hours}$).

---

## 4. Post-Generation Integrity & Quality Gates

Immediately after full generation completes, the following automated post-generation checks should be executed:

1. **File Count Verification**:
   - `train/cover`: Exactly 4,000 files
   - `train/stego`: Exactly 4,000 files
   - `val/cover`: Exactly 1,000 files
   - `val/stego`: Exactly 1,000 files
   - `test/cover`: Exactly 5,000 files
   - `test/stego`: Exactly 5,000 files
2. **File Size & Format Consistency**:
   - Every file must have exact size `262,159 bytes` ($512 \times 512$ 8-bit binary PGM `P5`).
3. **Cover-Stego Ternary Constraint**:
   - Random sample check across 100 pairs per split verifying $\max |\text{stego} - \text{cover}| \le 1$.
   - Dynamic range bound $[0, 255]$ verified with 0 boundary violations.
4. **Data Leakage Check**:
   - Verify intersection of cover IDs across splits:
     $$\text{Train} \cap \text{Val} = \emptyset, \quad \text{Train} \cap \text{Test} = \emptyset, \quad \text{Val} \cap \text{Test} = \emptyset$$
     $$\text{Train} \cup \text{Val} \cup \text{Test} = \{1, 2, \dots, 10000\}$$

