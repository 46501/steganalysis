"""
Reproducibility Verification for Python S-UNIWARD implementation.
Verifies that executing the algorithm twice on identical images with identical seeds
produces bit-for-bit identical stego outputs with identical SHA-256 hashes.
Outputs remain strictly within D:\Stego\reports\suniward_validation\
"""

import sys
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.append(str(Path("D:/Stego/scripts")))
from generate_suniward_dataset import embed_suniward, save_pgm_image

VALIDATION_DIR = Path("D:/Stego/reports/suniward_validation")
RAW_DIR = Path("D:/Stego/dataset/raw/BOSSbase")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def test_reproducibility():
    print("=" * 80)
    print("PHASE 4: PYTHON S-UNIWARD DETERMINISTIC REPRODUCIBILITY TEST")
    print("=" * 80)

    images = [1, 2]
    payload = 0.4
    results = {}

    for idx in images:
        cover_path = RAW_DIR / f"{idx}.pgm"
        with Image.open(cover_path) as img:
            cover = np.array(img, dtype=np.int32)

        seed = 100000 + idx
        print(f"\nTesting Image {idx}.pgm (Payload: {payload} bpp, Seed: {seed})...")

        # Run 1
        stego1, stats1 = embed_suniward(cover, payload=payload, seed=seed)
        out1_path = VALIDATION_DIR / f"temp_{idx}_run1.pgm"
        save_pgm_image(out1_path, stego1)
        hash1 = sha256_bytes(out1_path.read_bytes())

        # Run 2
        stego2, stats2 = embed_suniward(cover, payload=payload, seed=seed)
        out2_path = VALIDATION_DIR / f"temp_{idx}_run2.pgm"
        save_pgm_image(out2_path, stego2)
        hash2 = sha256_bytes(out2_path.read_bytes())

        # Comparison
        diff = np.abs(stego1.astype(int) - stego2.astype(int))
        max_diff = int(np.max(diff))
        match = (hash1 == hash2) and (max_diff == 0)

        print(f"  Run 1 SHA-256: {hash1}")
        print(f"  Run 2 SHA-256: {hash2}")
        print(f"  Bit-for-bit identical: {match}")
        print(f"  Max pixel diff: {max_diff}")
        print(f"  Changes in Run 1: {stats1['total_changes']} | Changes in Run 2: {stats2['total_changes']}")

        assert match, f"Error: Reproducibility failure on {idx}.pgm!"
        results[idx] = {
            "seed": seed,
            "hash": hash1,
            "changes": stats1["total_changes"],
            "rate": stats1["change_rate"],
            "lambda": stats1["lambda"],
        }

    print("\n" + "=" * 80)
    print("REPRODUCIBILITY CONFIRMED: 100% Deterministic Bit-for-Bit Identity")
    print("=" * 80)
    return results


if __name__ == "__main__":
    test_reproducibility()

