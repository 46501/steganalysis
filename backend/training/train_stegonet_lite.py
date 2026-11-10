"""
Training script for StegoNet-Lite demonstration baseline on S-UNIWARD 0.4 bpp.

Executes rapid, reproducible CPU training on a representative subset of BOSSbase pairs,
producing a trained checkpoint for live project demonstration.
"""

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

from app.ml.stegonet_lite import StegoNetLite

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stegonet_lite_train")


class StegoSubsetDataset(Dataset):
    """Loads matched cover and stego image pairs from processed dataset splits."""

    def __init__(self, cover_dir: Path, stego_dir: Path, max_pairs: int = 100, crop_size: int = 256) -> None:
        self.crop_size = crop_size
        cover_files = sorted(list(cover_dir.glob("*.pgm")))[:max_pairs]
        stego_files = sorted(list(stego_dir.glob("*.pgm")))[:max_pairs]

        self.samples: List[Tuple[Path, int]] = []
        for c_file, s_file in zip(cover_files, stego_files):
            self.samples.append((c_file, 0))  # Cover = 0
            self.samples.append((s_file, 1))  # Stego = 1

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        file_path, label = self.samples[idx]
        with Image.open(file_path) as img:
            # Crop to target dimensions
            w, h = img.size
            if w > self.crop_size or h > self.crop_size:
                left = (w - self.crop_size) // 2
                top = (h - self.crop_size) // 2
                img = img.crop((left, top, left + self.crop_size, top + self.crop_size))
            arr = np.array(img, dtype=np.float32)

        tensor = torch.from_numpy(arr).unsqueeze(0)  # Shape: (1, H, W)
        return tensor, label


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> Dict[str, float]:
    """Evaluates model accuracy, precision, recall, and loss on a dataset."""
    model.eval()
    criterion = nn.NLLLoss()
    total_loss = 0.0
    correct = 0
    total = 0

    true_positives = 0
    false_positives = 0
    false_negatives = 0

    with torch.no_grad():
        for tensors, labels in loader:
            tensors, labels = tensors.to(device), labels.to(device)
            outputs = model(tensors)
            loss = criterion(outputs, labels)
            total_loss += loss.item() * tensors.size(0)

            preds = torch.argmax(outputs, dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

            true_positives += ((preds == 1) & (labels == 1)).sum().item()
            false_positives += ((preds == 1) & (labels == 0)).sum().item()
            false_negatives += ((preds == 0) & (labels == 1)).sum().item()

    accuracy = correct / total if total > 0 else 0.0
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    avg_loss = total_loss / total if total > 0 else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "loss": round(avg_loss, 4),
        "total_eval_samples": total,
    }


def train_stegonet_lite(
    dataset_dir: str = "D:/Stego/dataset/processed/S-UNIWARD_0.4bpp",
    output_dir: str = "D:/Stego/backend/app/ml/weights",
    num_train_pairs: int = 100,
    num_val_pairs: int = 50,
    epochs: int = 3,
    batch_size: int = 8,
    lr: float = 0.001,
) -> Dict:
    """Trains StegoNet-Lite demonstration model and saves weights and metrics."""
    torch.manual_seed(42)
    np.random.seed(42)

    device = torch.device("cpu")
    logger.info(f"Using device: {device} for rapid demonstration training")

    train_cover = Path(dataset_dir) / "train" / "cover"
    train_stego = Path(dataset_dir) / "train" / "stego"
    test_cover = Path(dataset_dir) / "test" / "cover"
    test_stego = Path(dataset_dir) / "test" / "stego"

    logger.info(f"Loading {num_train_pairs} train pairs ({num_train_pairs * 2} images)...")
    train_dataset = StegoSubsetDataset(train_cover, train_stego, max_pairs=num_train_pairs)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    logger.info(f"Loading {num_val_pairs} evaluation pairs ({num_val_pairs * 2} images)...")
    test_dataset = StegoSubsetDataset(test_cover, test_stego, max_pairs=num_val_pairs)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    model = StegoNetLite().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.NLLLoss()

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    start_time = time.time()
    history = []

    for epoch in range(1, epochs + 1):
        model.train()
        epoch_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (images, targets) in enumerate(train_loader):
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == targets).sum().item()
            total += targets.size(0)

        train_acc = correct / total
        train_loss = epoch_loss / total
        logger.info(f"Epoch [{epoch}/{epochs}] - Loss: {train_loss:.4f} - Accuracy: {train_acc:.4f}")

        eval_metrics = evaluate(model, test_loader, device)
        logger.info(f"  -> Test Eval: Acc={eval_metrics['accuracy']:.4f}, F1={eval_metrics['f1_score']:.4f}")

        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_accuracy": round(train_acc, 4),
            **eval_metrics,
        })

    elapsed_s = time.time() - start_time
    logger.info(f"Training completed in {elapsed_s:.2f}s")

    # Save weights
    weights_path = out_path / "stegonet_lite_demo.pt"
    torch.save(model.state_dict(), weights_path)
    logger.info(f"Saved model weights to: {weights_path}")

    # Save metadata & evaluation summary
    metrics_summary = {
        "model_name": "StegoNet-Lite",
        "description": "Compact Residual Baseline for Live Demonstration",
        "architecture_details": {
            "stages": 4,
            "parameters": sum(p.numel() for p in model.parameters()),
            "prefilter": "3x3 spatial residual extraction (16 filters)",
            "residual_blocks": 3,
            "pooling": "Adaptive Global Average Pooling (GAP)",
            "head": "Linear(128, 2) + LogSoftmax",
        },
        "training_config": {
            "dataset": "S-UNIWARD 0.4 bpp (BOSSbase 1.01)",
            "train_pairs": num_train_pairs,
            "train_images": num_train_pairs * 2,
            "test_pairs": num_val_pairs,
            "test_images": num_val_pairs * 2,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": lr,
            "device": "CPU",
            "training_duration_seconds": round(elapsed_s, 2),
        },
        "final_evaluation": history[-1],
        "training_history": history,
        "demonstration_note": (
            "Demonstration baseline trained on CPU for live presentation. "
            "Primary research architecture (SRNet 12-layer deep residual network) "
            "requires GPU cluster training (~360 hours for 50 epochs)."
        ),
    }

    metrics_path = out_path / "stegonet_lite_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)
    logger.info(f"Saved metrics summary to: {metrics_path}")

    return metrics_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train StegoNet-Lite on S-UNIWARD dataset subset")
    parser.add_argument("--num_train_pairs", type=int, default=100)
    parser.add_argument("--num_val_pairs", type=int, default=50)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=0.001)
    args = parser.parse_args()

    train_stegonet_lite(
        num_train_pairs=args.num_train_pairs,
        num_val_pairs=args.num_val_pairs,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
    )

