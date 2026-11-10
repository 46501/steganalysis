"""
SRNet Dataset Loader for Steganalysis.
Loads 512x512 binary P5 PGM cover and stego images directly from disk.
Preserves cover-stego pairing within mini-batches to eliminate BatchNorm covariate bias.
Provides strict split isolation, deterministic seeding, and efficient DataLoader setup.
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Callable, Union

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader


def load_p5_pgm_tensor(path: Union[str, Path]) -> torch.Tensor:
    """
    Directly reads a binary P5 PGM image into a normalized PyTorch float32 tensor.
    Shape: (1, 512, 512), values in range [0.0, 1.0].
    
    Raises:
        FileNotFoundError: If image does not exist.
        ValueError: If image header or byte length is invalid.
    """
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"PGM file not found: {path}")

    with open(path, "rb") as f:
        magic = f.readline().strip()
        if magic != b"P5":
            raise ValueError(f"Invalid PGM magic header in {path}: {magic}")

        dim_line = f.readline()
        while dim_line.startswith(b"#"):
            dim_line = f.readline()
        dims = dim_line.split()
        if len(dims) != 2:
            raise ValueError(f"Invalid dimensions line in {path}: {dim_line}")
        w, h = map(int, dims)
        if w != 512 or h != 512:
            raise ValueError(f"Unsupported dimensions in {path}: {w}x{h} (expected 512x512)")

        maxval_line = f.readline()
        while maxval_line.startswith(b"#"):
            maxval_line = f.readline()
        maxval = int(maxval_line.strip())
        if maxval != 255:
            raise ValueError(f"Unsupported maxval in {path}: {maxval} (expected 255)")

        raw_bytes = f.read()
        if len(raw_bytes) != 512 * 512:
            raise ValueError(
                f"Corrupt PGM payload in {path}: read {len(raw_bytes)} bytes, expected 262144 bytes"
            )

    arr = np.frombuffer(raw_bytes, dtype=np.uint8).copy().reshape((1, 512, 512))
    # Convert to float32 and normalize [0, 255] -> [0.0, 1.0]
    tensor = torch.from_numpy(arr).to(dtype=torch.float32) / 255.0
    return tensor


class StegoPairDataset(Dataset):
    """
    PyTorch Dataset returning corresponding cover and stego pairs.
    Preserves strict pairing to support paired mini-batch training.
    
    Splits:
        - train: IDs 1..4000
        - val:   IDs 4001..5000
        - test:  IDs 5001..10000
    """

    SPLIT_BOUNDS = {
        "train": (1, 4000),
        "val": (4001, 5000),
        "test": (5001, 10000),
    }

    def __init__(
        self,
        dataset_dir: Union[str, Path],
        split: str = "train",
        limit: Optional[int] = None,
        transform: Optional[Callable[[torch.Tensor], torch.Tensor]] = None,
    ) -> None:
        super().__init__()
        self.dataset_dir = Path(dataset_dir)
        self.split = split.lower()
        if self.split not in self.SPLIT_BOUNDS:
            raise ValueError(
                f"Invalid split '{split}'. Expected one of {list(self.SPLIT_BOUNDS.keys())}"
            )

        self.transform = transform
        self.cover_dir = self.dataset_dir / self.split / "cover"
        self.stego_dir = self.dataset_dir / self.split / "stego"

        if not self.cover_dir.exists():
            raise FileNotFoundError(f"Cover directory missing for split '{split}': {self.cover_dir}")
        if not self.stego_dir.exists():
            raise FileNotFoundError(f"Stego directory missing for split '{split}': {self.stego_dir}")

        min_id, max_id = self.SPLIT_BOUNDS[self.split]

        # Scan and strictly enforce split boundaries
        cover_files = {int(p.stem): p for p in self.cover_dir.glob("*.pgm")}
        stego_files = {int(p.stem): p for p in self.stego_dir.glob("*.pgm")}

        # Find common matched IDs
        matched_ids = sorted(list(cover_files.keys() & stego_files.keys()))

        # Check for cross-split leakage
        invalid_ids = [i for i in matched_ids if not (min_id <= i <= max_id)]
        if invalid_ids:
            raise ValueError(
                f"Split leakage detected in '{self.split}'! IDs outside [{min_id}, {max_id}]: {invalid_ids[:10]}"
            )

        if limit is not None and limit > 0:
            matched_ids = matched_ids[:limit]

        self.pair_ids = matched_ids
        if len(self.pair_ids) == 0:
            raise RuntimeError(f"No valid cover-stego pairs found in {self.dataset_dir} for split '{split}'")

    def __len__(self) -> int:
        return len(self.pair_ids)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        image_id = self.pair_ids[idx]
        cover_path = self.cover_dir / f"{image_id}.pgm"
        stego_path = self.stego_dir / f"{image_id}.pgm"

        cover_tensor = load_p5_pgm_tensor(cover_path)
        stego_tensor = load_p5_pgm_tensor(stego_path)

        if self.transform is not None:
            cover_tensor = self.transform(cover_tensor)
            stego_tensor = self.transform(stego_tensor)

        return {
            "image_id": image_id,
            "cover": cover_tensor,
            "stego": stego_tensor,
            "cover_label": 0,
            "stego_label": 1,
        }


def collate_stego_pairs(batch: List[Dict[str, Any]]) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Collate function that concatenates cover and stego tensors into a balanced mini-batch.
    For B pairs, returns:
        images: shape (2B, 1, 512, 512), covers at [0..B-1], stegos at [B..2B-1]
        labels: shape (2B,), with zeros for covers and ones for stegos.
    """
    covers = torch.stack([item["cover"] for item in batch], dim=0)
    stegos = torch.stack([item["stego"] for item in batch], dim=0)

    images = torch.cat([covers, stegos], dim=0)

    b = len(batch)
    labels = torch.cat(
        [
            torch.zeros(b, dtype=torch.long),
            torch.ones(b, dtype=torch.long),
        ],
        dim=0,
    )

    return images, labels


def get_dataloaders(
    dataset_dir: Union[str, Path] = r"D:\Stego\dataset\processed\S-UNIWARD_0.4bpp",
    batch_size: int = 8,
    num_workers: int = 0,
    pin_memory: Optional[bool] = None,
    seed: int = 42,
    train_limit: Optional[int] = None,
    val_limit: Optional[int] = None,
    test_limit: Optional[int] = None,
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Builds isolated, reproducible PyTorch DataLoaders for train, val, and test splits.
    
    Args:
        dataset_dir: Root dataset directory containing train/, val/, test/.
        batch_size: Number of pairs per batch (batch will contain 2*batch_size images).
        num_workers: Number of DataLoader worker subprocesses (0 for Windows stability).
        pin_memory: Whether to pin memory (defaults to True if CUDA is available).
        seed: Random seed for reproducible shuffling.
        train_limit: Optional limit for fast testing.
        val_limit: Optional limit for fast testing.
        test_limit: Optional limit for fast testing.
    
    Returns:
        (train_loader, val_loader, test_loader)
    """
    if pin_memory is None:
        pin_memory = torch.cuda.is_available()

    train_dataset = StegoPairDataset(dataset_dir, split="train", limit=train_limit)
    val_dataset = StegoPairDataset(dataset_dir, split="val", limit=val_limit)
    test_dataset = StegoPairDataset(dataset_dir, split="test", limit=test_limit)

    def seed_worker(worker_id: int):
        worker_seed = (seed + worker_id) % (2**32)
        np.random.seed(worker_seed)

    generator = torch.Generator()
    generator.manual_seed(seed)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
        collate_fn=collate_stego_pairs,
        generator=generator,
        worker_init_fn=seed_worker,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        collate_fn=collate_stego_pairs,
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        collate_fn=collate_stego_pairs,
    )

    return train_loader, val_loader, test_loader

