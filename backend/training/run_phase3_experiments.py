"""
Phase 3 Controlled Experiments Runner: Steganalysis Learning Performance Investigation.

Executes Experiments 1 to 4 on the 300-pair BOSSbase S-UNIWARD 0.4 bpp pilot dataset
across seeds 42 and 123 (8 experimental runs total).

Experiments:
- Exp 1: Baseline StegoNet-Lite Control (unconstrained prefilter, linear GAP).
- Exp 2: Fixed KV High-Pass Prefilter (zero-sum 5x5 kernel, frozen, linear GAP).
- Exp 3: Absolute-Value Pooling (unconstrained prefilter, torch.abs() before GAP).
- Exp 4: Combined KV Prefilter + Absolute-Value Pooling (fixed KV + torch.abs() before GAP).

Strict Controls:
- Identical dataset: 300 train pairs (IDs 1-300), 100 val pairs (IDs 4001-4100).
- Identical preprocessing: center crop 256x256, [0.0, 1.0] float32.
- Reserved test set IDs 5001-5100 are strictly untouched.
- Identical optimizer: AdamW(lr=1e-3, weight_decay=1e-4), CosineAnnealingLR(T_max=5, eta_min=1e-5).
- Paired batch collation (cover and matching stego in same batch, batch_size=8 pairs = 16 images).
"""

import sys
import json
import time
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import psutil
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("phase3_experiments")

# Also log to file for background inspection
_log_path = Path("backend/training/phase3_experiments.log")
_log_path.parent.mkdir(parents=True, exist_ok=True)
_file_handler = logging.FileHandler(_log_path, encoding="utf-8")
_file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s", "%H:%M:%S"))
logger.addHandler(_file_handler)


# ---------------------------------------------------------------------------
# High-Pass Prefilter & Model Architecture Definitions
# ---------------------------------------------------------------------------

class KVFilter(nn.Module):
    """
    Fixed 5x5 Ker-Vandewalle (KV) high-pass spatial filter.
    Zero-sum: sum(W) = 0 (suppresses smooth image content, isolating stego residuals).
    Boundary handling: reflection padding of 2 on all sides.
    Weights are registered as a non-trainable buffer.
    """

    def __init__(self) -> None:
        super().__init__()
        kv = torch.tensor([
            [-1.0,  2.0,  -2.0,  2.0, -1.0],
            [ 2.0, -6.0,   8.0, -6.0,  2.0],
            [-2.0,  8.0, -12.0,  8.0, -2.0],
            [ 2.0, -6.0,   8.0, -6.0,  2.0],
            [-1.0,  2.0,  -2.0,  2.0, -1.0],
        ], dtype=torch.float32).unsqueeze(0).unsqueeze(0) / 12.0
        self.register_buffer("kv_kernel", kv)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x_pad = F.pad(x, (2, 2, 2, 2), mode="reflect")
        return F.conv2d(x_pad, self.kv_kernel)


class ResidualBlock(nn.Module):
    """Residual building block with projection shortcut when dimensions change."""

    def __init__(self, in_channels: int, out_channels: int, stride: int = 1) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=3,
            stride=stride,
            padding=1,
            bias=False,
        )
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(
            out_channels,
            out_channels,
            kernel_size=3,
            stride=1,
            padding=1,
            bias=False,
        )
        self.bn2 = nn.BatchNorm2d(out_channels)

        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.shortcut = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = self.relu(out + residual)
        return out


class StegoNetVariant(nn.Module):
    """
    Parametric StegoNet architecture supporting:
    - Fixed KV high-pass prefilter (use_kv)
    - Absolute-value activation before spatial pooling (use_abs)
    """

    def __init__(self, use_kv: bool = False, use_abs: bool = False) -> None:
        super().__init__()
        self.use_kv = use_kv
        self.use_abs = use_abs

        if use_kv:
            self.kv = KVFilter()
        else:
            self.kv = None

        # Stage 0: Convolutional feature extraction
        self.prefilter = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
        )

        # Stage 1: Residual extraction (downsampling 256 -> 128)
        self.layer1 = ResidualBlock(16, 32, stride=2)

        # Stage 2: Feature learning (downsampling 128 -> 64)
        self.layer2 = ResidualBlock(32, 64, stride=2)

        # Stage 3: High-level abstraction (downsampling 64 -> 32)
        self.layer3 = ResidualBlock(64, 128, stride=2)

        # Global average pooling & Linear classifier
        self.gap = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(128, 2)
        self.log_softmax = nn.LogSoftmax(dim=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_kv and self.kv is not None:
            x = self.kv(x)

        feat = self.prefilter(x)
        feat = self.layer1(feat)
        feat = self.layer2(feat)
        feat = self.layer3(feat)

        if self.use_abs:
            feat = torch.abs(feat)

        feat = self.gap(feat)
        feat = torch.flatten(feat, 1)
        logits = self.fc(feat)
        return self.log_softmax(logits)


# ---------------------------------------------------------------------------
# In-Memory Paired Dataset
# ---------------------------------------------------------------------------

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
    """In-memory dataset storing paired cover and stego images."""

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
        logger.info(
            f"Pre-loading {len(matched_ids)} pairs ({len(matched_ids)*2} images) "
            f"from {cover_dir.parent.name} into memory..."
        )

        covers = []
        stegos = []
        for img_id in matched_ids:
            c_arr = load_single_p5_pgm(cover_files[img_id], crop_size=crop_size)
            s_arr = load_single_p5_pgm(stego_files[img_id], crop_size=crop_size)
            covers.append(c_arr)
            stegos.append(s_arr)

        self.covers = torch.from_numpy(np.stack(covers)).unsqueeze(1)  # (N, 1, H, W)
        self.stegos = torch.from_numpy(np.stack(stegos)).unsqueeze(1)  # (N, 1, H, W)
        logger.info(f"Loaded tensor shape: {self.covers.shape}, RAM footprint: {self.covers.element_size() * self.covers.nelement() * 2 / 1024 / 1024:.1f} MB")

    def __len__(self) -> int:
        return len(self.matched_ids)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.covers[idx], self.stegos[idx]


def collate_paired_batch(batch: List[Tuple[torch.Tensor, torch.Tensor]]) -> Tuple[torch.Tensor, torch.Tensor]:
    """Combines paired items into a balanced batch (covers: label 0, stegos: label 1)."""
    covers = torch.stack([item[0] for item in batch], dim=0)
    stegos = torch.stack([item[1] for item in batch], dim=0)
    images = torch.cat([covers, stegos], dim=0)
    b = len(batch)
    labels = torch.cat([
        torch.zeros(b, dtype=torch.long),
        torch.ones(b, dtype=torch.long),
    ], dim=0)
    return images, labels


# ---------------------------------------------------------------------------
# Evaluation Routine
# ---------------------------------------------------------------------------

def evaluate_loader(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    criterion: nn.Module,
) -> Dict[str, Any]:
    """Evaluates model on a DataLoader and returns exact empirical loss and metrics."""
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


# ---------------------------------------------------------------------------
# Single Experiment Execution
# ---------------------------------------------------------------------------

def run_single_experiment(
    exp_name: str,
    exp_id: int,
    use_kv: bool,
    use_abs: bool,
    seed: int,
    train_dataset: PairedStegoInMemoryDataset,
    val_dataset: PairedStegoInMemoryDataset,
    epochs: int = 5,
    batch_size: int = 8,
    lr: float = 1e-3,
    weight_decay: float = 1e-4,
    device: Optional[torch.device] = None,
    checkpoint_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Runs a single 5-epoch training and validation cycle with checkpoint persistence."""
    if device is None:
        device = torch.device("cpu")

    # Set seeds strictly
    torch.manual_seed(seed)
    np.random.seed(seed)

    # Train and validation loaders
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

    # Instantiate model
    model = StegoNetVariant(use_kv=use_kv, use_abs=use_abs).to(device)

    # Parameter counts
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    frozen_params = sum(p.numel() for p in model.buffers())

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)
    criterion = nn.NLLLoss()

    logger.info("=" * 60)
    logger.info(f"Starting {exp_name} (Seed {seed})")
    logger.info(f"Config: use_kv={use_kv}, use_abs={use_abs}, trainable_params={trainable_params}")
    logger.info("=" * 60)

    start_epoch = 1
    epoch_logs: List[Dict[str, Any]] = []
    run_start_time = time.time()
    best_val_loss = float("inf")
    best_epoch = 0

    latest_ckpt_path = None
    best_ckpt_path = None
    if checkpoint_dir is not None:
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        latest_ckpt_path = checkpoint_dir / f"phase3_exp{exp_id}_seed{seed}_latest.pt"
        best_ckpt_path = checkpoint_dir / f"phase3_exp{exp_id}_seed{seed}_best.pt"

        if latest_ckpt_path.exists():
            try:
                ckpt = torch.load(latest_ckpt_path, map_location=device)
                saved_epoch = ckpt.get("epoch", 0)
                if 0 < saved_epoch < epochs:
                    model.load_state_dict(ckpt["model_state_dict"])
                    optimizer.load_state_dict(ckpt["optimizer_state_dict"])
                    scheduler.load_state_dict(ckpt["scheduler_state_dict"])
                    epoch_logs = ckpt.get("epoch_logs", [])
                    best_val_loss = ckpt.get("best_val_loss", float("inf"))
                    best_epoch = ckpt.get("best_epoch", 0)
                    start_epoch = saved_epoch + 1
                    logger.info(f"Resuming {exp_name} (Seed {seed}) from epoch {start_epoch} (saved epoch {saved_epoch})")
            except Exception as e:
                logger.warning(f"Could not load checkpoint from {latest_ckpt_path}: {e}")

    for epoch in range(start_epoch, epochs + 1):
        epoch_start = time.time()
        model.train()
        train_loss = 0.0
        train_correct = 0
        total_train = 0

        for bx, by in train_loader:
            bx = bx.to(device)
            by = by.to(device)

            optimizer.zero_grad()
            out = model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * len(by)
            preds = out.argmax(dim=1)
            train_correct += (preds == by).sum().item()
            total_train += len(by)

        scheduler.step()
        epoch_duration = time.time() - epoch_start

        avg_train_loss = train_loss / total_train if total_train > 0 else 0.0
        train_acc = train_correct / total_train if total_train > 0 else 0.0

        # Validation evaluation
        val_metrics = evaluate_loader(model, val_loader, device, criterion)

        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            best_epoch = epoch
            if best_ckpt_path is not None:
                torch.save({
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "val_loss": best_val_loss,
                    "val_metrics": val_metrics,
                    "exp_id": exp_id,
                    "seed": seed,
                }, best_ckpt_path)

        current_lr = scheduler.get_last_lr()[0]
        ram_mb = psutil.Process().memory_info().rss / (1024 * 1024)

        log_entry = {
            "epoch": epoch,
            "train_loss": round(avg_train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_loss": val_metrics["loss"],
            "val_acc": val_metrics["accuracy"],
            "val_roc_auc": val_metrics["roc_auc"],
            "val_precision": val_metrics["precision"],
            "val_recall": val_metrics["recall"],
            "val_f1": val_metrics["f1"],
            "val_confusion_matrix": val_metrics["confusion_matrix"],
            "epoch_duration_sec": round(epoch_duration, 2),
            "lr": round(current_lr, 6),
            "ram_mb": round(ram_mb, 1),
        }
        epoch_logs.append(log_entry)

        if latest_ckpt_path is not None:
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "scheduler_state_dict": scheduler.state_dict(),
                "epoch_logs": epoch_logs,
                "best_val_loss": best_val_loss,
                "best_epoch": best_epoch,
                "exp_id": exp_id,
                "seed": seed,
            }, latest_ckpt_path)

        logger.info(
            f"[{exp_name} | Seed {seed}] Ep {epoch}/{epochs} ({epoch_duration:.1f}s): "
            f"TrLoss={avg_train_loss:.4f}, TrAcc={train_acc*100:.1f}% | "
            f"ValLoss={val_metrics['loss']:.4f}, ValAcc={val_metrics['accuracy']*100:.1f}%, "
            f"ValAUC={val_metrics['roc_auc']:.4f} | RAM={ram_mb:.0f}MB"
        )

    total_run_time = time.time() - run_start_time

    return {
        "exp_id": exp_id,
        "exp_name": exp_name,
        "seed": seed,
        "use_kv": use_kv,
        "use_abs": use_abs,
        "trainable_params": trainable_params,
        "frozen_params": frozen_params,
        "total_run_time_sec": round(total_run_time, 2),
        "avg_epoch_sec": round(total_run_time / epochs, 2),
        "best_epoch": best_epoch,
        "best_val_loss": best_val_loss,
        "final_epoch": epoch_logs[-1],
        "epoch_history": epoch_logs,
    }


# ---------------------------------------------------------------------------
# Main Orchestration Loop
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="StegoShield AI Phase 3 Experiments")
    parser.add_argument("--dataset-dir", type=str, default="dataset/processed/S-UNIWARD_0.4bpp")
    parser.add_argument("--output-json", type=str, default="backend/training/phase3_experiment_results.json")
    parser.add_argument("--checkpoint-dir", type=str, default="backend/training/checkpoints")
    parser.add_argument("--train-pairs", type=int, default=300)
    parser.add_argument("--val-pairs", type=int, default=100)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seeds", type=str, default="42,123")
    parser.add_argument("--experiments", type=str, default="1,2,3,4")
    args = parser.parse_args()

    seeds = [int(s.strip()) for s in args.seeds.split(",")]
    exp_filter = [int(e.strip()) for e in args.experiments.split(",")]

    device = torch.device("cpu")
    torch.set_num_threads(4)

    dataset_root = Path(args.dataset_dir)
    train_cover = dataset_root / "train" / "cover"
    train_stego = dataset_root / "train" / "stego"
    val_cover = dataset_root / "val" / "cover"
    val_stego = dataset_root / "val" / "stego"

    logger.info("=" * 70)
    logger.info("STEGOSHIELD AI — PHASE 3 CONTROLLED EXPERIMENTS")
    logger.info(f"Target Experiments: {exp_filter}")
    logger.info(f"Target Seeds:       {seeds}")
    logger.info(f"Train Pairs:        {args.train_pairs} (IDs 1-{args.train_pairs})")
    logger.info(f"Val Pairs:          {args.val_pairs} (IDs 4001-{4000 + args.val_pairs})")
    logger.info("Reserved Test Set:  IDs 5001-5100 (STRICTLY RESERVED — ZERO ACCESS)")
    logger.info(f"Threads:            {torch.get_num_threads()}")
    logger.info("=" * 70)

    # Preload datasets into memory once
    t0 = time.time()
    train_dataset = PairedStegoInMemoryDataset(
        train_cover, train_stego, max_pairs=args.train_pairs, id_range=(1, 4000)
    )
    val_dataset = PairedStegoInMemoryDataset(
        val_cover, val_stego, max_pairs=args.val_pairs, id_range=(4001, 5000)
    )
    logger.info(f"Dataset preloading completed in {time.time() - t0:.2f}s")

    experiment_definitions = [
        (1, "Exp 1: Baseline StegoNet-Lite Control", False, False),
        (2, "Exp 2: Fixed KV High-Pass Prefilter", True, False),
        (3, "Exp 3: Absolute-Value Pooling", False, True),
        (4, "Exp 4: Fixed KV + ABS Pooling", True, True),
    ]

    out_file = Path(args.output_json)
    ckpt_dir = Path(args.checkpoint_dir)
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    all_results = []
    if out_file.exists():
        try:
            with open(out_file, "r") as f:
                existing_data = json.load(f)
                all_results = existing_data.get("completed_runs", [])
            logger.info(f"Loaded {len(all_results)} existing completed runs from {out_file}")
        except Exception as e:
            logger.warning(f"Could not load existing results from {out_file}: {e}")

    for exp_id, exp_name, use_kv, use_abs in experiment_definitions:
        if exp_id not in exp_filter:
            continue

        for seed in seeds:
            already_done = any(
                r.get("exp_id") == exp_id and r.get("seed") == seed and len(r.get("epoch_history", [])) == args.epochs
                for r in all_results
            )
            if already_done:
                logger.info(f"Skipping {exp_name} (Seed {seed}) - already completed with {args.epochs} epochs.")
                continue

            res = run_single_experiment(
                exp_name=exp_name,
                exp_id=exp_id,
                use_kv=use_kv,
                use_abs=use_abs,
                seed=seed,
                train_dataset=train_dataset,
                val_dataset=val_dataset,
                epochs=args.epochs,
                batch_size=args.batch_size,
                lr=args.lr,
                device=device,
                checkpoint_dir=ckpt_dir,
            )
            # Remove partial prior entry if any, then append
            all_results = [r for r in all_results if not (r.get("exp_id") == exp_id and r.get("seed") == seed)]
            all_results.append(res)

            # Persist intermediate results after each run
            out_file.parent.mkdir(parents=True, exist_ok=True)
            with open(out_file, "w") as f:
                json.dump({"completed_runs": all_results}, f, indent=2)

    logger.info("=" * 70)
    logger.info("ALL EXPERIMENTAL RUNS COMPLETED SUCCESSFULLY.")
    logger.info(f"Results written to {args.output_json}")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()

