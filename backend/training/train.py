"""
SRNet Training Pipeline CLI Entry Point.
Executes training with dataset loading, GPU auto-detection, checkpointing, and smoke-test modes.
"""

import os
import sys
import argparse
import random
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import numpy as np
import torch

from app.ml.dataset import get_dataloaders
from app.ml.trainer import SRNetTrainer


def set_seed(seed: int = 42) -> None:
    """Sets global random seeds for full deterministic reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def main():
    parser = argparse.ArgumentParser(description="SRNet Steganalysis Training Pipeline")
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default=r"D:\Stego\dataset\processed\S-UNIWARD_0.4bpp",
        help="Path to processed dataset root containing train/, val/, test/",
    )
    parser.add_argument(
        "--checkpoints-dir",
        type=str,
        default=r"D:\Stego\backend\checkpoints",
        help="Directory to save model checkpoints",
    )
    parser.add_argument(
        "--logs-dir",
        type=str,
        default=r"D:\Stego\backend\logs",
        help="Directory to store training logs and metrics history",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Total number of training epochs (default: 50)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Batch size in pairs (auto-detected if None: 16 on GPU, 2 on CPU)",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=0.001,
        help="Initial learning rate for Adamax optimizer (default: 0.001)",
    )
    parser.add_argument(
        "--lr-step-size",
        type=int,
        default=30,
        help="Step size for learning rate decay by factor 0.1 (default: 30 epochs)",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=15,
        help="Patience epochs for early stopping (default: 15)",
    )
    parser.add_argument(
        "--num-workers",
        type=int,
        default=0,
        help="Number of DataLoader worker subprocesses (default: 0)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume training from latest checkpoint if available",
    )
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Execute quick verification smoke test with 2 train and 1 val batches",
    )
    parser.add_argument(
        "--smoke-batches-train",
        type=int,
        default=2,
        help="Number of training batches for smoke test (default: 2)",
    )
    parser.add_argument(
        "--smoke-batches-val",
        type=int,
        default=1,
        help="Number of validation batches for smoke test (default: 1)",
    )

    args = parser.parse_args()

    # Set seeds
    set_seed(args.seed)

    # Determine device and batch size
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    if args.batch_size is None:
        batch_size = 16 if torch.cuda.is_available() else 2
    else:
        batch_size = args.batch_size

    print("=" * 80)
    print("SRNet Steganalysis PyTorch Training Pipeline")
    print(f"Device:          {device} (CUDA: {torch.cuda.is_available()})")
    print(f"Dataset:         {args.dataset_dir}")
    print(f"Checkpoints Dir: {args.checkpoints_dir}")
    print(f"Logs Dir:        {args.logs_dir}")
    print(f"Batch Size:      {batch_size} pairs ({batch_size * 2} images per batch)")
    print(f"Epochs:          {args.epochs}")
    print(f"Initial LR:      {args.lr}")
    print(f"Smoke Test:      {args.smoke_test}")
    print("=" * 80)

    # Build DataLoaders (Note: test_loader is completely isolated and never passed to trainer)
    train_loader, val_loader, test_loader = get_dataloaders(
        dataset_dir=args.dataset_dir,
        batch_size=batch_size,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda"),
        seed=args.seed,
    )

    print(f"Dataset Loaded:")
    print(f"  Train:      {len(train_loader.dataset):5d} pairs ({len(train_loader)} batches)")
    print(f"  Validation: {len(val_loader.dataset):5d} pairs ({len(val_loader)} batches)")
    print(f"  Test:       {len(test_loader.dataset):5d} pairs ({len(test_loader)} batches) [ISOLATED]")

    trainer = SRNetTrainer(
        device=device,
        lr=args.lr,
        lr_step_size=args.lr_step_size,
        checkpoints_dir=args.checkpoints_dir,
        logs_dir=args.logs_dir,
        patience=args.patience,
        seed=args.seed,
    )

    # Check for resume
    if args.resume:
        latest_ckpt = Path(args.checkpoints_dir) / "latest_checkpoint.pt"
        if latest_ckpt.exists():
            print(f"Resuming from checkpoint: {latest_ckpt}")
            trainer.load_checkpoint(latest_ckpt)
        else:
            print("No latest checkpoint found. Starting fresh training.")

    # Execute training
    if args.smoke_test:
        print("\nExecuting Smoke Test (1 epoch, minimal batches)...")
        history = trainer.fit(
            train_loader=train_loader,
            val_loader=val_loader,
            num_epochs=trainer.start_epoch,
            max_train_batches=args.smoke_batches_train,
            max_val_batches=args.smoke_batches_val,
        )
        print("\nSmoke test completed successfully!")
    else:
        history = trainer.fit(
            train_loader=train_loader,
            val_loader=val_loader,
            num_epochs=args.epochs,
        )

    return history


if __name__ == "__main__":
    main()

