"""
StegoShield AI — StegoNet-Lite Training Pipeline.

Features:
- Configurable dataset sizes (train and validation pairs from BOSSbase 1.01 S-UNIWARD 0.4 bpp).
- Pair-preserving mini-batch construction (cover and matching stego in the same batch).
- Early stopping based on validation loss.
- Learning rate scheduling with Cosine Annealing.
- Best validation checkpoint saving (state dict + full checkpoint with optimizer state).
- Comprehensive metadata export: training history, hardware profile, and architecture details.
- Device auto-detection (GPU if available, CPU fallback).
"""

import os
import sys
import json
import time
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.ml.stegonet_lite import StegoNetLite

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("train_stegonet_lite")


def load_single_p5_pgm(path: Path, crop_size: int = 256) -> np.ndarray:
    """Reads a binary P5 PGM image, center-crops to crop_size, and normalizes to [0.0, 1.0]."""
    with Image.open(path) as img:
        w, h = img.size
        if w > crop_size or h > crop_size:
            left = (w - crop_size) // 2
            top = (h - crop_size) // 2
            img = img.crop((left, top, left + crop_size, top + crop_size))
        arr = np.array(img, dtype=np.float32) / 255.0
    return arr


class PairedStegoInMemoryDataset(Dataset):
    """
    In-memory dataset storing paired cover and stego images.
    Preserves image ID correspondence to enable paired batching.
    """

    def __init__(
        self,
        cover_dir: Path,
        stego_dir: Path,
        max_pairs: Optional[int] = None,
        crop_size: int = 256,
        id_range: Optional[Tuple[int, int]] = None,
    ) -> None:
        super().__init__()
        self.crop_size = crop_size

        cover_files = {int(p.stem): p for p in cover_dir.glob("*.pgm") if p.stem.isdigit()}
        stego_files = {int(p.stem): p for p in stego_dir.glob("*.pgm") if p.stem.isdigit()}

        matched_ids = sorted(list(cover_files.keys() & stego_files.keys()))
        if id_range is not None:
            min_id, max_id = id_range
            matched_ids = [i for i in matched_ids if min_id <= i <= max_id]

        if max_pairs is not None and max_pairs > 0:
            matched_ids = matched_ids[:max_pairs]

        self.matched_ids = matched_ids
        logger.info(f"Loading {len(matched_ids)} pairs ({len(matched_ids)*2} images) from {cover_dir.parent.name}...")

        self.covers = []
        self.stegos = []
        for img_id in matched_ids:
            c_arr = load_single_p5_pgm(cover_files[img_id], crop_size=crop_size)
            s_arr = load_single_p5_pgm(stego_files[img_id], crop_size=crop_size)
            self.covers.append(c_arr)
            self.stegos.append(s_arr)

        self.covers = torch.from_numpy(np.stack(self.covers)).unsqueeze(1)  # (N, 1, H, W)
        self.stegos = torch.from_numpy(np.stack(self.stegos)).unsqueeze(1)  # (N, 1, H, W)

    def __len__(self) -> int:
        return len(self.matched_ids)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.covers[idx], self.stegos[idx]


def collate_paired_batch(batch: List[Tuple[torch.Tensor, torch.Tensor]]) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Combines paired items into a balanced batch.
    For B pairs: returns images of shape (2B, 1, H, W) and labels of shape (2B,).
    Covers at indices 0..B-1 (label 0), stegos at indices B..2B-1 (label 1).
    """
    covers = torch.stack([item[0] for item in batch], dim=0)
    stegos = torch.stack([item[1] for item in batch], dim=0)
    images = torch.cat([covers, stegos], dim=0)

    b = len(batch)
    labels = torch.cat([
        torch.zeros(b, dtype=torch.long),
        torch.ones(b, dtype=torch.long),
    ], dim=0)

    return images, labels


def evaluate_loader(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    criterion: nn.Module,
) -> Dict[str, Any]:
    """Evaluates model on a DataLoader and computes loss and discrimination metrics."""
    model.eval()
    total_loss = 0.0
    total_samples = 0
    all_targets: List[int] = []
    all_probs: List[float] = []
    all_preds: List[int] = []

    with torch.no_grad():
        for bx, by in loader:
            bx = bx.to(device)
            by = by.to(device)
            out = model(bx)
            loss = criterion(out, by)

            total_loss += loss.item() * len(by)
            total_samples += len(by)

            probs = torch.exp(out)
            stego_probs = probs[:, 1].cpu().numpy().tolist()
            preds = out.argmax(dim=1).cpu().numpy().tolist()
            targets = by.cpu().numpy().tolist()

            all_probs.extend(stego_probs)
            all_preds.extend(preds)
            all_targets.extend(targets)

    avg_loss = total_loss / total_samples if total_samples > 0 else 0.0
    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)
    y_prob = np.array(all_probs)

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        auc = 0.50

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    return {
        "loss": round(avg_loss, 4),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(auc, 4),
        "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
        "total_samples": total_samples,
    }


def train_stegonet_lite(
    dataset_dir: str = "D:/Stego/dataset/processed/S-UNIWARD_0.4bpp",
    output_dir: str = "D:/Stego/backend/app/ml/weights",
    num_train_pairs: int = 300,
    num_val_pairs: int = 100,
    epochs: int = 15,
    batch_size: int = 8,
    lr: float = 0.001,
    weight_decay: float = 1e-4,
    patience: int = 6,
    seed: int = 42,
    resume: bool = False,
) -> Dict[str, Any]:
    """
    Executes training for StegoNet-Lite with pair-preserving mini-batches,
    Cosine Annealing LR scheduling, and validation early stopping.
    """
    torch.manual_seed(seed)
    np.random.seed(seed)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    logger.info("=" * 70)
    logger.info("StegoNet-Lite Training Pipeline (Phase 2)")
    logger.info(f"Device:           {device}")
    logger.info(f"Dataset root:     {dataset_dir}")
    logger.info(f"Train pairs:      {num_train_pairs} ({num_train_pairs * 2} images)")
    logger.info(f"Val pairs:        {num_val_pairs} ({num_val_pairs * 2} images)")
    logger.info(f"Batch size:       {batch_size} pairs ({batch_size * 2} images per batch)")
    logger.info(f"Epochs:           {epochs}")
    logger.info(f"Learning rate:    {lr} (AdamW + CosineAnnealing)")
    logger.info(f"Early stop limit: {patience} epochs patience")
    logger.info(f"Random seed:      {seed}")
    logger.info("=" * 70)

    train_cover = Path(dataset_dir) / "train" / "cover"
    train_stego = Path(dataset_dir) / "train" / "stego"
    val_cover = Path(dataset_dir) / "val" / "cover"
    val_stego = Path(dataset_dir) / "val" / "stego"

    # Strict split bounds check
    train_dataset = PairedStegoInMemoryDataset(
        train_cover, train_stego, max_pairs=num_train_pairs, id_range=(1, 4000)
    )
    val_dataset = PairedStegoInMemoryDataset(
        val_cover, val_stego, max_pairs=num_val_pairs, id_range=(4001, 5000)
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        collate_fn=collate_paired_batch,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        collate_fn=collate_paired_batch,
    )

    model = StegoNetLite().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)
    criterion = nn.NLLLoss()

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    best_val_loss = float("inf")
    best_epoch = 0
    best_val_metrics: Dict[str, Any] = {}
    best_state_dict: Optional[Dict[str, Any]] = None
    patience_counter = 0
    history: List[Dict[str, Any]] = []
    start_epoch = 1

    ckpt_resume_path = out_path / "stegonet_lite_checkpoint.pt"
    if resume and ckpt_resume_path.exists():
        try:
            ckpt_data = torch.load(ckpt_resume_path, map_location=device, weights_only=False)
            model.load_state_dict(ckpt_data["model_state_dict"])
            optimizer.load_state_dict(ckpt_data["optimizer_state_dict"])
            if "scheduler_state_dict" in ckpt_data:
                scheduler.load_state_dict(ckpt_data["scheduler_state_dict"])
            best_val_loss = ckpt_data.get("best_val_loss", float("inf"))
            best_epoch = ckpt_data.get("best_epoch", 0)
            best_val_metrics = ckpt_data.get("best_val_metrics", {})
            history = ckpt_data.get("history", [])
            start_epoch = ckpt_data.get("epoch", 0) + 1
            logger.info(f"[*] Resuming training from epoch {start_epoch} (previous best val loss: {best_val_loss:.4f} at epoch {best_epoch})")
        except Exception as e:
            logger.warning(f"Failed to resume checkpoint: {e}. Starting fresh.")

    start_time = time.time()
    total_batches = len(train_loader)

    for epoch in range(start_epoch, epochs + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        total_train = 0

        for batch_idx, (bx, by) in enumerate(train_loader, start=1):
            bx = bx.to(device)
            by = by.to(device)

            optimizer.zero_grad()
            out = model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

            batch_size_curr = len(by)
            train_loss += loss.item() * batch_size_curr
            train_correct += (out.argmax(dim=1) == by).sum().item()
            total_train += batch_size_curr

            if batch_idx % 10 == 0 or batch_idx == total_batches:
                curr_acc = (out.argmax(dim=1) == by).float().mean().item()
                logger.info(
                    f"Epoch [{epoch:02d}/{epochs}] - Batch [{batch_idx:02d}/{total_batches}] - "
                    f"Step Loss: {loss.item():.4f}, Batch Acc: {curr_acc:.4f}"
                )

        scheduler.step()
        current_lr = scheduler.get_last_lr()[0]

        train_loss_epoch = train_loss / total_train if total_train > 0 else 0.0
        train_acc_epoch = train_correct / total_train if total_train > 0 else 0.0

        # Evaluate on validation partition
        val_res = evaluate_loader(model, val_loader, device, criterion)

        epoch_record = {
            "epoch": epoch,
            "train_loss": round(train_loss_epoch, 4),
            "train_acc": round(train_acc_epoch, 4),
            "val_loss": val_res["loss"],
            "val_acc": val_res["accuracy"],
            "val_f1": val_res["f1"],
            "val_roc_auc": val_res["roc_auc"],
            "lr": round(current_lr, 6),
        }
        history.append(epoch_record)

        logger.info(
            f"=== Completed Epoch [{epoch:02d}/{epochs}] ===\n"
            f"    Train: Loss={train_loss_epoch:.4f}, Acc={train_acc_epoch:.4f}\n"
            f"    Val:   Loss={val_res['loss']:.4f}, Acc={val_res['accuracy']:.4f}, AUC={val_res['roc_auc']:.4f}\n"
            f"    LR:    {current_lr:.6f}"
        )

        # Periodic checkpoint saving at each epoch
        periodic_ckpt = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
            "best_val_loss": best_val_loss,
            "best_epoch": best_epoch,
            "best_val_metrics": best_val_metrics,
            "history": history,
        }
        torch.save(periodic_ckpt, out_path / "stegonet_lite_checkpoint.pt")

        # Checkpoint selection: save best validation loss checkpoint
        if val_res["loss"] < best_val_loss:
            best_val_loss = val_res["loss"]
            best_epoch = epoch
            best_val_metrics = val_res
            best_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            patience_counter = 0

            # Save best validation model
            best_ckpt_path = out_path / "stegonet_lite_best.pt"
            torch.save(best_state_dict, best_ckpt_path)
            # Also update stegonet_lite_demo.pt for backward compatibility
            torch.save(best_state_dict, out_path / "stegonet_lite_demo.pt")
            logger.info(f"[*] New best validation loss: {best_val_loss:.4f} at epoch {epoch}. Saved to {best_ckpt_path.name}")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info(f"[!] Early stopping triggered: validation loss did not improve for {patience} epochs.")
                break

    duration_s = round(time.time() - start_time, 2)
    logger.info("=" * 70)
    logger.info(f"Training completed in {duration_s} seconds.")
    logger.info(f"Best Validation Epoch: {best_epoch}")
    logger.info(f"Best Validation Metrics: {best_val_metrics}")
    logger.info("=" * 70)

    # Save complete training metadata
    metadata = {
        "model_name": "StegoNet-Lite",
        "checkpoint_file": "backend/app/ml/weights/stegonet_lite_best.pt",
        "dataset_name": "BOSSbase 1.01 S-UNIWARD 0.4 bpp",
        "dataset_splits": {
            "train_pairs": num_train_pairs,
            "train_images": num_train_pairs * 2,
            "train_id_range": [1, 4000],
            "val_pairs": num_val_pairs,
            "val_images": num_val_pairs * 2,
            "val_id_range": [4001, 5000],
            "test_status": "Strictly held-out; not accessed during training",
        },
        "training_configuration": {
            "epochs_configured": epochs,
            "epochs_completed": len(history),
            "batch_size_pairs": batch_size,
            "batch_size_images": batch_size * 2,
            "optimizer": "AdamW",
            "initial_lr": lr,
            "weight_decay": weight_decay,
            "scheduler": "CosineAnnealingLR",
            "patience": patience,
            "seed": seed,
            "device": str(device),
            "duration_seconds": duration_s,
        },
        "best_epoch": best_epoch,
        "best_validation_metrics": best_val_metrics,
        "training_history": history,
        "hardware_profile": {
            "device": str(device),
            "cpu_threads": os.cpu_count(),
        },
    }

    meta_path = out_path / "stegonet_lite_training_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved training metadata to: {meta_path}")

    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train StegoNet-Lite on BOSSbase S-UNIWARD dataset")
    parser.add_argument("--num_train_pairs", type=int, default=300, help="Number of training pairs (default: 300)")
    parser.add_argument("--num_val_pairs", type=int, default=100, help="Number of validation pairs (default: 100)")
    parser.add_argument("--epochs", type=int, default=15, help="Number of epochs (default: 15)")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size in pairs (default: 8 = 16 images)")
    parser.add_argument("--lr", type=float, default=0.001, help="Initial learning rate (default: 0.001)")
    parser.add_argument("--patience", type=int, default=6, help="Early stopping patience (default: 6)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    parser.add_argument("--resume", action="store_true", help="Resume training from previous checkpoint if available")
    args = parser.parse_args()

    train_stegonet_lite(
        num_train_pairs=args.num_train_pairs,
        num_val_pairs=args.num_val_pairs,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
        seed=args.seed,
        resume=args.resume,
    )
