"""
Training script for StegoNet-Lite demonstration baseline on S-UNIWARD 0.4 bpp.

Executes rapid, reproducible in-memory CPU training on a representative subset of BOSSbase pairs,
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
from torch.utils.data import DataLoader, TensorDataset

from app.ml.stegonet_lite import StegoNetLite

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stegonet_lite_train")


def load_in_memory_data(
    cover_dir: Path,
    stego_dir: Path,
    max_pairs: int = 100,
    crop_size: int = 256,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """Loads matched cover and stego pairs directly into memory as normalized tensors."""
    cover_files = sorted(list(cover_dir.glob("*.pgm")))[:max_pairs]
    stego_files = sorted(list(stego_dir.glob("*.pgm")))[:max_pairs]

    images: List[np.ndarray] = []
    labels: List[int] = []

    for c_path, s_path in zip(cover_files, stego_files):
        # Cover
        with Image.open(c_path) as img:
            w, h = img.size
            if w > crop_size or h > crop_size:
                left = (w - crop_size) // 2
                top = (h - crop_size) // 2
                img = img.crop((left, top, left + crop_size, top + crop_size))
            images.append(np.array(img, dtype=np.float32) / 255.0)
            labels.append(0)

        # Stego
        with Image.open(s_path) as img:
            w, h = img.size
            if w > crop_size or h > crop_size:
                left = (w - crop_size) // 2
                top = (h - crop_size) // 2
                img = img.crop((left, top, left + crop_size, top + crop_size))
            images.append(np.array(img, dtype=np.float32) / 255.0)
            labels.append(1)

    X = torch.from_numpy(np.stack(images)).unsqueeze(1)
    Y = torch.tensor(labels, dtype=torch.long)
    return X, Y


def evaluate_tensors(
    model: nn.Module,
    X_test: torch.Tensor,
    Y_test: torch.Tensor,
    batch_size: int = 16,
) -> Dict[str, float]:
    """Evaluates model performance and computes full confusion matrix."""
    model.eval()
    criterion = nn.NLLLoss()
    total = len(Y_test)
    total_loss = 0.0

    preds_list = []
    with torch.no_grad():
        for i in range(0, total, batch_size):
            bx = X_test[i : i + batch_size]
            by = Y_test[i : i + batch_size]
            out = model(bx)
            loss = criterion(out, by)
            total_loss += loss.item() * len(bx)
            preds_list.append(out.argmax(dim=1))

    preds = torch.cat(preds_list, dim=0)

    tp = int(((preds == 1) & (Y_test == 1)).sum().item())
    tn = int(((preds == 0) & (Y_test == 0)).sum().item())
    fp = int(((preds == 1) & (Y_test == 0)).sum().item())
    fn = int(((preds == 0) & (Y_test == 1)).sum().item())

    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    avg_loss = total_loss / total if total > 0 else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "loss": round(avg_loss, 4),
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "total_eval_samples": total,
    }


def train_stegonet_lite(
    dataset_dir: str = "D:/Stego/dataset/processed/S-UNIWARD_0.4bpp",
    output_dir: str = "D:/Stego/backend/app/ml/weights",
    num_train_pairs: int = 100,
    num_val_pairs: int = 50,
    epochs: int = 35,
    batch_size: int = 16,
    lr: float = 0.001,
) -> Dict:
    """Trains StegoNet-Lite demonstration model and saves weights and metrics."""
    torch.manual_seed(42)
    np.random.seed(42)

    device = torch.device("cpu")
    logger.info(f"Using device: {device} for rapid demonstration training")

    train_cover = Path(dataset_dir) / "train" / "cover"
    train_stego = Path(dataset_dir) / "train" / "stego"
    val_cover = Path(dataset_dir) / "val" / "cover"
    val_stego = Path(dataset_dir) / "val" / "stego"

    logger.info(f"Loading {num_train_pairs} train pairs ({num_train_pairs * 2} images) into memory...")
    X_train, Y_train = load_in_memory_data(train_cover, train_stego, max_pairs=num_train_pairs)

    logger.info(f"Loading {num_val_pairs} validation pairs ({num_val_pairs * 2} images) into memory...")
    X_val, Y_val = load_in_memory_data(val_cover, val_stego, max_pairs=num_val_pairs)

    model = StegoNetLite().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.NLLLoss()

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    start_time = time.time()
    num_train_samples = len(X_train)

    for epoch in range(1, epochs + 1):
        model.train()
        perm = torch.randperm(num_train_samples)
        epoch_loss = 0.0
        correct = 0

        for i in range(0, num_train_samples, batch_size):
            idx = perm[i : i + batch_size]
            bx, by = X_train[idx], Y_train[idx]
            optimizer.zero_grad()
            out = model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item() * len(bx)
            correct += (out.argmax(dim=1) == by).sum().item()

        train_acc = correct / num_train_samples
        train_loss = epoch_loss / num_train_samples

        if epoch % 5 == 0 or epoch == epochs or epoch == 1:
            logger.info(f"Epoch [{epoch:02d}/{epochs}] - Loss: {train_loss:.4f} - Train Acc: {train_acc:.4f}")

    elapsed_s = time.time() - start_time
    logger.info(f"Training completed in {elapsed_s:.2f}s")

    # Evaluate on validation set
    eval_metrics = evaluate_tensors(model, X_val, Y_val, batch_size=batch_size)
    logger.info(f"Validation Set Evaluation: Acc={eval_metrics['accuracy']:.4f}, F1={eval_metrics['f1_score']:.4f}")

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
            "val_pairs": num_val_pairs,
            "val_images": num_val_pairs * 2,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": lr,
            "device": "CPU",
            "training_duration_seconds": round(elapsed_s, 2),
        },
        "validation_set_evaluation": eval_metrics,
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
    parser.add_argument("--epochs", type=int, default=35)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=0.001)
    args = parser.parse_args()

    train_stegonet_lite(
        num_train_pairs=args.num_train_pairs,
        num_val_pairs=args.num_val_pairs,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
    )
