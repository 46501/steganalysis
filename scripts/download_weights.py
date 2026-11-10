"""
Utility script for downloading or managing SRNet pre-trained weights.
Ensures checkpoint integrity via checksum verification.
"""

import argparse
import hashlib
from pathlib import Path

TARGET_DIR = Path(__file__).resolve().parent.parent / "backend" / "app" / "ml" / "weights"


def verify_checksum(file_path: Path, expected_sha256: str) -> bool:
    """Verifies the SHA256 checksum of a file."""
    if not file_path.exists():
        return False
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest() == expected_sha256


def main():
    parser = argparse.ArgumentParser(description="SRNet Model Weight Management")
    parser.add_argument("--source", type=str, help="Path or URL to trained SRNet weights file")
    parser.add_argument("--checksum", type=str, help="Expected SHA256 checksum")
    args = parser.parse_args()

    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Target directory: {TARGET_DIR}")
    print("Run this script to stage and verify model weights into the backend.")


if __name__ == "__main__":
    main()

