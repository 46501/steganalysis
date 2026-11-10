"""
S-UNIWARD (Spatial Universal Wavelet Relative Distortion) Stego Generator.
Implements the exact mathematical model by Holub and Fridrich (Binghamton University).
Generates 0.4 bpp stego images from 512x512 PGM cover images with reproducible seeds.
Organizes into train (4,000 pairs), validation (1,000 pairs), and test (5,000 pairs).
Supports parallel multiprocessing and checkpoint resumption.
"""

import os
import sys
import time
import shutil
import argparse
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional
from concurrent.futures import ProcessPoolExecutor, as_completed

import numpy as np
import scipy.signal
from PIL import Image

# 1D Daubechies 8 decomposition filter coefficients (16-tap)
HPDF = np.array([
    -0.0544158422,  0.3128715909, -0.6756307363,  0.5853546837,
     0.0158291053, -0.2840155430, -0.0004724846,  0.1287474266,
     0.0173693010, -0.0440882539, -0.0139810279,  0.0087460940,
     0.0048703530, -0.0003917404, -0.0006754494, -0.0001174768
], dtype=np.float64)

LPDF = ((-1.0) ** np.arange(len(HPDF))) * HPDF[::-1]

# 2D Wavelet Directional Filters: LH, HL, HH
F_LH = np.outer(LPDF, HPDF)
F_HL = np.outer(HPDF, LPDF)
F_HH = np.outer(HPDF, HPDF)
FILTERS = [F_LH, F_HL, F_HH]
ROTATED_KERNELS = [np.rot90(np.abs(F), 2) for F in FILTERS]


def conv2_matlab(arr: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """
    2D linear convolution matching MATLAB/Octave conv2(arr, kernel, 'same') centering.
    For an even kernel of shape (k_h, k_w), MATLAB begins extraction at:
        0-indexed start = (k_h // 2, k_w // 2).
    SciPy's default mode='same' starts at (k_h - 1) // 2, which introduces a 1-pixel shift.
    """
    full_conv = scipy.signal.fftconvolve(arr, kernel, mode='full')
    r_start = kernel.shape[0] // 2
    c_start = kernel.shape[1] // 2
    return full_conv[r_start:r_start + arr.shape[0], c_start:c_start + arr.shape[1]]


def compute_suniward_costs(cover: np.ndarray, wet_cost: float = 1e8) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes S-UNIWARD distortion costs rho_plus and rho_minus for cover image.
    Uses MATLAB-aligned convolution centering to eliminate even-kernel spatial shift.
    """
    k, l = cover.shape
    sgm = 10.0 * np.finfo(np.float64).eps
    pad = 16
    cover_padded = np.pad(cover, pad, mode='symmetric')

    xi_total = np.zeros((k, l), dtype=np.float64)

    for F, K_rot in zip(FILTERS, ROTATED_KERNELS):
        R = conv2_matlab(cover_padded, F)
        suitability = conv2_matlab(1.0 / (np.abs(R) + sgm), K_rot)
        suitability = np.roll(suitability, (1, 1), axis=(0, 1))
        xi_crop = suitability[pad:pad + k, pad:pad + l]
        xi_total += xi_crop

    rho = xi_total
    rho[rho > wet_cost] = wet_cost
    rho[np.isnan(rho)] = wet_cost

    rho_plus = rho.copy()
    rho_minus = rho.copy()

    rho_plus[cover >= 255] = wet_cost
    rho_minus[cover <= 0] = wet_cost

    return rho_plus, rho_minus


def ternary_entropy(p_plus: np.ndarray, p_minus: np.ndarray) -> float:
    """Calculates ternary Shannon entropy in bits for change probabilities."""
    p0 = 1.0 - p_plus - p_minus
    p_all = np.concatenate([p0.ravel(), p_plus.ravel(), p_minus.ravel()])
    eps = np.finfo(np.float64).eps
    mask = (p_all > eps) & (p_all < (1.0 - eps))
    return float(-np.sum(p_all[mask] * np.log2(p_all[mask])))


def calc_lambda(rho_plus: np.ndarray, rho_minus: np.ndarray, msg_len: float, max_iter: int = 30) -> float:
    """
    Solves for Lagrange multiplier lambda via bisection search.
    Matches official MATLAB S_UNIWARD stopping criterion (alpha / 1000.0, max 30 iterations).
    """
    n = rho_plus.size
    alpha = msg_len / n
    l1 = 0.0
    l3 = 1e3
    iterations = 0

    while True:
        exp_p = np.exp(-l3 * rho_plus)
        exp_m = np.exp(-l3 * rho_minus)
        denom = 1.0 + exp_p + exp_m
        p_p = exp_p / denom
        p_m = exp_m / denom
        m3 = ternary_entropy(p_p, p_m)
        iterations += 1
        if m3 <= msg_len:
            break
        if iterations > 10:
            return l3
        l3 *= 2.0

    m1 = float(n)
    lambda_val = 0.0

    while ((m1 - m3) / n > alpha / 1000.0) and (iterations < max_iter):
        lambda_val = l1 + (l3 - l1) / 2.0
        exp_p = np.exp(-lambda_val * rho_plus)
        exp_m = np.exp(-lambda_val * rho_minus)
        denom = 1.0 + exp_p + exp_m
        p_p = exp_p / denom
        p_m = exp_m / denom
        m2 = ternary_entropy(p_p, p_m)
        if m2 < msg_len:
            l3 = lambda_val
            m3 = m2
        else:
            l1 = lambda_val
            m1 = m2
        iterations += 1

    return lambda_val


def embed_suniward(cover: np.ndarray, payload: float = 0.4, seed: int = 42) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Simulates optimal ternary S-UNIWARD embedding for a given payload and random seed."""
    start_time = time.perf_counter()
    n = cover.size
    msg_len = payload * n

    rho_plus, rho_minus = compute_suniward_costs(cover)
    lam = calc_lambda(rho_plus, rho_minus, msg_len)

    exp_p = np.exp(-lam * rho_plus)
    exp_m = np.exp(-lam * rho_minus)
    denom = 1.0 + exp_p + exp_m
    p_plus = exp_p / denom
    p_minus = exp_m / denom

    rng = np.random.default_rng(seed)
    rand_vals = rng.random(cover.shape, dtype=np.float64)

    stego = cover.copy()
    mod_plus = rand_vals < p_plus
    mod_minus = (rand_vals >= p_plus) & (rand_vals < (p_plus + p_minus))

    stego[mod_plus] += 1
    stego[mod_minus] -= 1

    stego = np.clip(stego, 0, 255).astype(np.uint8)

    duration = time.perf_counter() - start_time
    total_changes = int(np.sum(cover != stego))
    plus_changes = int(np.sum(mod_plus))
    minus_changes = int(np.sum(mod_minus))
    change_rate = total_changes / n

    stats = {
        "payload_bpp": payload,
        "seed": seed,
        "total_changes": total_changes,
        "plus_changes": plus_changes,
        "minus_changes": minus_changes,
        "change_rate": round(change_rate, 4),
        "duration_sec": round(duration, 3),
        "lambda": round(lam, 6),
    }

    return stego, stats


def load_p5_pgm(path: Path) -> Tuple[bool, Optional[np.ndarray], str]:
    """
    Reads a binary P5 PGM image.
    Validates:
    1. Regular file exists.
    2. Header magic is 'P5'.
    3. Dimensions are exactly 512x512.
    4. Maxval is 255.
    5. Exactly 512*512 pixel bytes exist.
    Returns (is_valid, ndarray_uint8, error_message).
    """
    if not path.is_file():
        return False, None, "file_not_found"
    try:
        with open(path, "rb") as f:
            magic = f.readline()
            if magic.strip() != b"P5":
                return False, None, f"invalid_magic_{magic.strip()[:10]}"
            dim_line = f.readline()
            while dim_line.startswith(b"#"):
                dim_line = f.readline()
            dims = dim_line.split()
            if len(dims) != 2:
                return False, None, "invalid_dimension_format"
            w, h = map(int, dims)
            if w != 512 or h != 512:
                return False, None, f"invalid_dimensions_{w}x{h}"
            maxval_line = f.readline()
            while maxval_line.startswith(b"#"):
                maxval_line = f.readline()
            if int(maxval_line.strip()) != 255:
                return False, None, f"invalid_maxval_{maxval_line.strip()}"
            raw_data = f.read()
            if len(raw_data) != 512 * 512:
                return False, None, f"invalid_data_length_{len(raw_data)}"
            arr = np.frombuffer(raw_data, dtype=np.uint8).reshape((512, 512))
            return True, arr, "ok"
    except Exception as e:
        return False, None, f"exception_{type(e).__name__}_{e}"


def validate_pair(cover_src: Path, out_cover: Path, out_stego: Path) -> Tuple[bool, str, Optional[np.ndarray]]:
    """
    Performs full integrity validation of a cover-stego pair:
    - Cover and stego existence
    - Readable 512x512 P5 format
    - Pixel values valid [0, 255]
    - Cover matching raw BOSSbase cover
    - Stego adhering strictly to ternary embedding constraint (|stego - cover| <= 1)
    - Boundary clamping satisfaction
    Returns (is_valid, reason, cover_arr_or_None).
    """
    has_cov = out_cover.is_file()
    has_stego = out_stego.is_file()

    if not has_cov and not has_stego:
        return False, "both_missing", None
    if not has_cov:
        return False, "cover_missing", None

    # Load and validate raw cover source first
    raw_ok, raw_arr, raw_err = load_p5_pgm(cover_src)
    if not raw_ok:
        return False, f"raw_cover_invalid_{raw_err}", None

    # Validate out_cover
    cov_ok, cov_arr, cov_err = load_p5_pgm(out_cover)
    if not cov_ok:
        return False, f"out_cover_invalid_{cov_err}", None

    # Compare cover against pristine raw BOSSbase cover
    if not np.array_equal(cov_arr, raw_arr):
        return False, "cover_mismatch_with_bossbase", None

    # Cover is valid and matches raw BOSSbase
    if not has_stego:
        return False, "stego_missing_cover_staged", cov_arr

    # Both exist: validate stego
    stego_ok, stego_arr, stego_err = load_p5_pgm(out_stego)
    if not stego_ok:
        return False, f"out_stego_invalid_{stego_err}", cov_arr

    # Check ternary constraint: max absolute pixel difference <= 1
    diff = stego_arr.astype(int) - cov_arr.astype(int)
    max_diff = int(np.max(np.abs(diff)))
    if max_diff > 1:
        return False, f"ternary_violation_max_diff_{max_diff}", cov_arr

    # Check boundary clamping: no overflow above 255 or underflow below 0
    if np.any((cov_arr == 255) & (stego_arr > 255)):
        return False, "boundary_overflow_255", cov_arr
    if np.any((cov_arr == 0) & (stego_arr < 0)):
        return False, "boundary_underflow_0", cov_arr

    # All criteria passed!
    return True, "valid", cov_arr


def atomic_copy_file(src: Path, dst: Path) -> None:
    """Copies src to dst via unique temporary file and atomic replace."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    temp_dst = dst.with_name(f".tmp_{dst.stem}_{os.getpid()}_{time.time_ns()}.tmp")
    try:
        shutil.copy2(src, temp_dst)
        os.replace(temp_dst, dst)
    except Exception:
        if temp_dst.exists():
            try:
                temp_dst.unlink()
            except OSError:
                pass
        raise


def save_pgm_image_atomic(path: Path, arr: np.ndarray) -> None:
    """Writes an 8-bit grayscale array to PGM (P5 binary) file via unique temporary file and atomic replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".tmp_{path.stem}_{os.getpid()}_{time.time_ns()}.tmp")
    h, w = arr.shape
    header = f"P5\n{w} {h}\n255\n".encode("ascii")
    try:
        with open(temp_path, "wb") as f:
            f.write(header)
            f.write(arr.tobytes())
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, path)
    except Exception:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise


# Backward compatibility alias
save_pgm_image = save_pgm_image_atomic


def worker_task(args: Tuple[int, str, str, str, float, int, bool]) -> Dict[str, Any]:
    """Worker function for validating and processing a single image pair."""
    index, cover_src_str, out_cover_str, out_stego_str, payload, seed, dry_run = args

    cover_src = Path(cover_src_str)
    out_cover = Path(out_cover_str)
    out_stego = Path(out_stego_str)

    # Full integrity validation
    is_valid, reason, cov_arr = validate_pair(cover_src, out_cover, out_stego)

    if dry_run:
        if is_valid:
            action = "SKIP (Already valid)"
        elif reason == "stego_missing_cover_staged":
            action = "GENERATE_STEGO_ONLY (Cover staged)"
        elif reason == "both_missing":
            action = "GENERATE_PAIR (Cover + Stego)"
        elif cov_arr is not None:
            action = f"REGENERATE_STEGO ({reason})"
        else:
            action = f"REGENERATE_PAIR ({reason})"
        return {
            "index": index,
            "status": "dry_run",
            "action": action,
            "reason": reason,
            "cover_src": str(cover_src),
            "out_cover": str(out_cover),
            "out_stego": str(out_stego),
            "seed": seed,
            "duration": 0.0,
        }

    # If already fully valid, preserve existing files without modification
    if is_valid:
        return {"index": index, "status": "skipped", "duration": 0.0}

    # Ensure output cover is valid (preserve staged cover if already valid)
    if cov_arr is None:
        atomic_copy_file(cover_src, out_cover)
        _, cov_arr, _ = load_p5_pgm(out_cover)
        if cov_arr is None:
            with Image.open(cover_src) as img:
                cov_arr = np.array(img, dtype=np.uint8)

    # Run S-UNIWARD embedding
    stego_arr, stats = embed_suniward(cov_arr.astype(np.int32), payload=payload, seed=seed)

    # Save stego image atomically
    save_pgm_image_atomic(out_stego, stego_arr.astype(np.uint8))

    return {
        "index": index,
        "status": "generated",
        "seed": seed,
        "changes": stats["total_changes"],
        "rate": stats["change_rate"],
        "duration": stats["duration_sec"],
    }


def main():
    parser = argparse.ArgumentParser(description="Generate S-UNIWARD 0.4bpp dataset with train/val/test splits.")
    parser.add_argument("--raw-dir", type=str, default="D:/Stego/dataset/raw/BOSSbase", help="Path to raw BOSSbase images")
    parser.add_argument("--out-dir", type=str, default="D:/Stego/dataset/processed/S-UNIWARD_0.4bpp", help="Output directory")
    parser.add_argument("--payload", type=float, default=0.4, help="Embedding payload in bpp (default: 0.4)")
    parser.add_argument("--base-seed", type=int, default=100000, help="Base random seed offset")
    parser.add_argument("--workers", type=int, default=min(os.cpu_count() or 4, 8), help="Worker processes count")
    parser.add_argument("--limit", type=int, default=10000, help="Maximum images to process (default: 10000)")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without generating or modifying images")
    parser.add_argument("--test-ids", type=str, default="", help="Comma-separated list of image IDs to process (e.g. '1,66,4001,5001')")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    out_dir = Path(args.out_dir)

    train_cover_dir = out_dir / "train" / "cover"
    train_stego_dir = out_dir / "train" / "stego"
    val_cover_dir = out_dir / "val" / "cover"
    val_stego_dir = out_dir / "val" / "stego"
    test_cover_dir = out_dir / "test" / "cover"
    test_stego_dir = out_dir / "test" / "stego"

    if not args.dry_run:
        for d in [train_cover_dir, train_stego_dir, val_cover_dir, val_stego_dir, test_cover_dir, test_stego_dir]:
            d.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("S-UNIWARD 0.4 bpp Dataset Generation Pipeline")
    print(f"Source: {raw_dir}")
    print(f"Destination: {out_dir}")
    print(f"Splits: Train (1..4000), Val (4001..5000), Test (5001..10000)")
    print(f"Workers: {args.workers} | Payload: {args.payload} bpp | Base Seed: {args.base_seed} | Dry Run: {args.dry_run}")
    print("=" * 80)

    # Determine IDs to evaluate
    if args.test_ids.strip():
        selected_ids = [int(x.strip()) for x in args.test_ids.split(",") if x.strip()]
    else:
        selected_ids = list(range(1, min(10000, args.limit) + 1))

    # Build work queue
    tasks: List[Tuple[int, str, str, str, float, int, bool]] = []
    for i in selected_ids:
        cover_src = raw_dir / f"{i}.pgm"
        if not cover_src.exists():
            continue

        seed = args.base_seed + i
        if i <= 4000:
            out_c = train_cover_dir / f"{i}.pgm"
            out_s = train_stego_dir / f"{i}.pgm"
        elif i <= 5000:
            out_c = val_cover_dir / f"{i}.pgm"
            out_s = val_stego_dir / f"{i}.pgm"
        else:
            out_c = test_cover_dir / f"{i}.pgm"
            out_s = test_stego_dir / f"{i}.pgm"

        tasks.append((i, str(cover_src), str(out_c), str(out_s), args.payload, seed, args.dry_run))

    print(f"Total queued tasks: {len(tasks)}")

    # Dry-run execution
    if args.dry_run:
        print(f"\n--- DRY RUN RESULTS ({len(tasks)} tasks evaluated) ---")
        action_counts = {}
        for task in tasks:
            res = worker_task(task)
            action = res["action"]
            action_counts[action] = action_counts.get(action, 0) + 1
            if len(tasks) <= 20 or res["index"] in [1, 66, 4001, 5001]:
                print(f"ID {res['index']:5d} | Action: {res['action']:<35} | Cover: {res['out_cover']} | Stego: {res['out_stego']}")
        print("\nDry Run Action Breakdown:")
        for action, count in sorted(action_counts.items()):
            print(f"  {action}: {count}")
        print("Dry run completed successfully. No files created or modified.")
        return

    # Normal execution with process pool
    start_all = time.perf_counter()
    completed_count = 0
    generated_count = 0
    skipped_count = 0

    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(worker_task, task): task[0] for task in tasks}

        for future in as_completed(futures):
            res = future.result()
            completed_count += 1
            if res["status"] == "generated":
                generated_count += 1
            else:
                skipped_count += 1

            if completed_count % 100 == 0 or completed_count == len(tasks):
                elapsed = time.perf_counter() - start_all
                rate = completed_count / elapsed if elapsed > 0 else 0
                remaining = len(tasks) - completed_count
                eta_sec = remaining / rate if rate > 0 else 0
                print(
                    f"Progress: [{completed_count:5d}/{len(tasks):5d}] "
                    f"({completed_count/len(tasks)*100:5.1f}%) | "
                    f"Generated: {generated_count} | Skipped: {skipped_count} | "
                    f"Speed: {rate:4.1f} img/s | ETA: {eta_sec/60:4.1f} min"
                )

    total_time = time.perf_counter() - start_all
    print("=" * 80)
    print(f"Generation Complete in {total_time/60:.2f} minutes!")
    print(f"Total processed: {completed_count} (Generated: {generated_count}, Resumed: {skipped_count})")
    print("=" * 80)


if __name__ == "__main__":
    main()
