"""
Runs S-UNIWARD embedding test on 5 sample BOSSbase images.
Measures modifications, timing, payload integrity, and output validity.
"""

import hashlib
import time
from pathlib import Path
import numpy as np
from PIL import Image

from generate_suniward_dataset import embed_suniward, save_pgm_image

RAW_DIR = Path("D:/Stego/dataset/raw/BOSSbase")
SAMPLE_OUTPUT_DIR = Path("D:/Stego/dataset/processed/S-UNIWARD_0.4bpp/sample_test")


def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def test_samples():
    SAMPLE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sample_indices = [1, 2, 3, 4, 5]
    base_seed = 100000

    print("=" * 80)
    print("S-UNIWARD 0.4 bpp Sample Generation Test (5 Images at 512x512)")
    print("=" * 80)

    results = []

    for idx in sample_indices:
        cover_path = RAW_DIR / f"{idx}.pgm"
        stego_path = SAMPLE_OUTPUT_DIR / f"{idx}_stego.pgm"

        cover_hash_before = sha256_file(cover_path)

        with Image.open(cover_path) as img:
            cover_arr = np.array(img, dtype=np.int32)
            orig_shape = img.size  # (width, height)
            orig_mode = img.mode

        seed = base_seed + idx
        stego_arr, stats = embed_suniward(cover_arr, payload=0.4, seed=seed)

        # Save stego image
        save_pgm_image(stego_path, stego_arr)

        # Check cover was not modified
        cover_hash_after = sha256_file(cover_path)
        assert cover_hash_before == cover_hash_after, f"Cover image {idx}.pgm was modified!"

        # Verify stego image with Pillow
        with Image.open(stego_path) as stego_img:
            stego_shape = stego_img.size
            stego_mode = stego_img.mode
            stego_format = stego_img.format
            stego_loaded = np.array(stego_img)

        # Numerical diff checks
        diff = stego_loaded.astype(int) - cover_arr.astype(int)
        abs_diff = np.abs(diff)
        max_diff = int(np.max(abs_diff))
        min_pixel = int(np.min(stego_loaded))
        max_pixel = int(np.max(stego_loaded))

        # Pixel changes must only be -1, 0, or +1
        assert max_diff <= 1, f"Error: Pixel modifications exceed +/-1 (max={max_diff})"
        assert min_pixel >= 0 and max_pixel <= 255, "Error: Pixel out of [0, 255] bounds"
        assert stego_shape == (512, 512), f"Error: Dimension mismatch ({stego_shape})"
        assert stego_mode == "L", f"Error: Mode mismatch ({stego_mode})"

        res = {
            "index": idx,
            "filename": f"{idx}.pgm",
            "seed": seed,
            "dimensions": f"{stego_shape[0]}x{stego_shape[1]}",
            "mode": stego_mode,
            "total_pixels": cover_arr.size,
            "changes": stats["total_changes"],
            "plus1": stats["plus_changes"],
            "minus1": stats["minus_changes"],
            "change_rate_pct": round(stats["change_rate"] * 100, 2),
            "duration_s": stats["duration_sec"],
            "lambda": stats["lambda"],
            "min_val": min_pixel,
            "max_val": max_pixel,
            "stego_hash": sha256_file(stego_path)[:16] + "...",
        }
        results.append(res)

        print(
            f"Image {idx:02d}.pgm | Seed: {seed} | Changes: {res['changes']} ({res['change_rate_pct']}%) | "
            f"+1: {res['plus1']} | -1: {res['minus1']} | Lambda: {res['lambda']} | Time: {res['duration_s']}s"
        )

    print("=" * 80)
    print("All 5 sample images generated and verified successfully!")
    print(f"Output directory: {SAMPLE_OUTPUT_DIR}")
    print("=" * 80)


if __name__ == "__main__":
    test_samples()

