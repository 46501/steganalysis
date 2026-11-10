"""
SRNet Training Pipeline and Execution Engine.
Implements the training loop, validation loop, optimization, learning rate scheduling,
metrics computation (Loss, Accuracy, Precision, Recall, F1), checkpointing, and resume logic.
Reference: Boroumand et al., IEEE TIFS 2018 (Deep Residual Network for Steganalysis of Digital Images).
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from app.ml.architecture import Srnet


def init_srnet_weights(m: nn.Module) -> None:
    """
    Initializes weights according to original SRNet methodology:
    - Conv2d: Xavier uniform initialization, bias 0.2 if present.
    - Linear: Normal distribution (mean 0.0, std 0.01), bias 0.0.
    """
    if isinstance(m, nn.Conv2d):
        nn.init.xavier_uniform_(m.weight.data)
        if m.bias is not None:
            nn.init.constant_(m.bias.data, 0.2)
    elif isinstance(m, nn.Linear):
        nn.init.normal_(m.weight.data, mean=0.0, std=0.01)
        if m.bias is not None:
            nn.init.constant_(m.bias.data, 0.0)


def compute_binary_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes Accuracy, Precision, Recall, and F1-Score for binary steganalysis (1 = Stego).
    """
    total = len(y_true)
    if total == 0:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0}

    correct = int(np.sum(y_true == y_pred))
    accuracy = correct / total

    # Stego is positive class (label 1)
    tp = int(np.sum((y_pred == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))
    tn = int(np.sum((y_pred == 0) & (y_true == 0)))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }


class SRNetTrainer:
    """
    Trainer class encapsulating the full SRNet training lifecycle.
    """

    def __init__(
        self,
        model: Optional[nn.Module] = None,
        device: Optional[torch.device] = None,
        lr: float = 0.001,
        weight_decay: float = 0.0,
        lr_step_size: int = 30,
        lr_gamma: float = 0.1,
        checkpoints_dir: Union[str, Path] = r"D:\Stego\backend\checkpoints",
        logs_dir: Union[str, Path] = r"D:\Stego\backend\logs",
        patience: int = 15,
        seed: int = 42,
    ) -> None:
        self.seed = seed
        self.device = device or torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self.checkpoints_dir = Path(checkpoints_dir)
        self.logs_dir = Path(logs_dir)
        self.patience = patience

        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        self._setup_logger()

        # Instantiate or assign model
        if model is None:
            self.model = Srnet()
            self.model.apply(init_srnet_weights)
        else:
            self.model = model
        self.model.to(self.device)

        # Loss function: NLLLoss (matching LogSoftmax output in Srnet)
        self.criterion = nn.NLLLoss()

        # Optimizer: Adamax (original SRNet paper specification)
        self.lr = lr
        self.optimizer = torch.optim.Adamax(
            self.model.parameters(),
            lr=self.lr,
            betas=(0.9, 0.999),
            eps=1e-8,
            weight_decay=weight_decay,
        )

        # Learning rate scheduler
        self.scheduler = torch.optim.lr_scheduler.StepLR(
            self.optimizer,
            step_size=lr_step_size,
            gamma=lr_gamma,
        )

        self.start_epoch = 1
        self.best_val_loss = float("inf")
        self.best_val_acc = 0.0
        self.epochs_without_improvement = 0
        self.history: List[Dict[str, Any]] = []

    def _setup_logger(self) -> None:
        self.logger = logging.getLogger("SRNetTrainer")
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            log_file = self.logs_dir / "training.log"
            fh = logging.FileHandler(log_file, encoding="utf-8")
            formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")
            fh.setFormatter(formatter)
            self.logger.addHandler(fh)

            ch = logging.StreamHandler(sys.stdout)
            ch.setFormatter(formatter)
            self.logger.addHandler(ch)

    def train_epoch(self, train_loader: DataLoader, max_batches: Optional[int] = None) -> Dict[str, float]:
        """Runs one full training epoch (or up to max_batches for smoke testing)."""
        self.model.train()
        running_loss = 0.0
        y_true_all = []
        y_pred_all = []

        start_time = time.perf_counter()
        batches_processed = 0

        for i, (images, labels) in enumerate(train_loader):
            if max_batches is not None and i >= max_batches:
                break

            images = images.to(self.device, dtype=torch.float32)
            labels = labels.to(self.device, dtype=torch.long)

            self.optimizer.zero_grad()
            outputs = self.model(images)
            loss = self.criterion(outputs, labels)
            loss.backward()
            self.optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1).detach().cpu().numpy()
            y_true_all.extend(labels.detach().cpu().numpy())
            y_pred_all.extend(preds)
            batches_processed += 1

        total_samples = len(y_true_all)
        epoch_loss = running_loss / total_samples if total_samples > 0 else 0.0
        metrics = compute_binary_metrics(np.array(y_true_all), np.array(y_pred_all))
        metrics["loss"] = round(epoch_loss, 5)
        metrics["duration_sec"] = round(time.perf_counter() - start_time, 2)
        metrics["batches"] = batches_processed
        return metrics

    def validate(self, val_loader: DataLoader, max_batches: Optional[int] = None) -> Dict[str, float]:
        """Runs validation loop."""
        self.model.eval()
        running_loss = 0.0
        y_true_all = []
        y_pred_all = []

        start_time = time.perf_counter()
        batches_processed = 0

        with torch.no_grad():
            for i, (images, labels) in enumerate(val_loader):
                if max_batches is not None and i >= max_batches:
                    break

                images = images.to(self.device, dtype=torch.float32)
                labels = labels.to(self.device, dtype=torch.long)

                outputs = self.model(images)
                loss = self.criterion(outputs, labels)

                running_loss += loss.item() * images.size(0)
                preds = torch.argmax(outputs, dim=1).cpu().numpy()
                y_true_all.extend(labels.cpu().numpy())
                y_pred_all.extend(preds)
                batches_processed += 1

        total_samples = len(y_true_all)
        epoch_loss = running_loss / total_samples if total_samples > 0 else 0.0
        metrics = compute_binary_metrics(np.array(y_true_all), np.array(y_pred_all))
        metrics["loss"] = round(epoch_loss, 5)
        metrics["duration_sec"] = round(time.perf_counter() - start_time, 2)
        metrics["batches"] = batches_processed
        return metrics

    def save_checkpoint(
        self,
        epoch: int,
        train_metrics: Dict[str, Any],
        val_metrics: Dict[str, Any],
        is_best: bool = False,
    ) -> Path:
        """Saves atomic checkpoint containing model, optimizer, scheduler, and metrics."""
        if is_best:
            if "accuracy" in val_metrics:
                self.best_val_acc = val_metrics["accuracy"]
            if "loss" in val_metrics:
                self.best_val_loss = val_metrics["loss"]

        checkpoint_data = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict(),
            "train_metrics": train_metrics,
            "val_metrics": val_metrics,
            "best_val_loss": self.best_val_loss,
            "best_val_acc": self.best_val_acc,
            "seed": self.seed,
            "timestamp": time.time(),
        }

        # Save latest checkpoint atomically
        latest_path = self.checkpoints_dir / "latest_checkpoint.pt"
        tmp_latest = self.checkpoints_dir / f".tmp_latest_{os.getpid()}_{time.time_ns()}.pt"
        torch.save(checkpoint_data, tmp_latest)
        os.replace(tmp_latest, latest_path)

        # If best validation score, save best checkpoint atomically
        if is_best:
            best_path = self.checkpoints_dir / "best_checkpoint.pt"
            tmp_best = self.checkpoints_dir / f".tmp_best_{os.getpid()}_{time.time_ns()}.pt"
            torch.save(checkpoint_data, tmp_best)
            os.replace(tmp_best, best_path)

        return latest_path

    def load_checkpoint(self, checkpoint_path: Union[str, Path]) -> Dict[str, Any]:
        """Loads model weights, optimizer state, scheduler state, and resume epoch."""
        checkpoint_path = Path(checkpoint_path)
        if not checkpoint_path.is_file():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

        ckpt = torch.load(checkpoint_path, map_location=self.device)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.optimizer.load_state_dict(ckpt["optimizer_state_dict"])
        if "scheduler_state_dict" in ckpt:
            self.scheduler.load_state_dict(ckpt["scheduler_state_dict"])

        self.start_epoch = ckpt["epoch"] + 1
        self.best_val_loss = ckpt.get("best_val_loss", float("inf"))
        self.best_val_acc = ckpt.get("best_val_acc", 0.0)

        self.logger.info(
            f"Successfully resumed checkpoint from {checkpoint_path.name} (Next Epoch: {self.start_epoch}, Best Acc: {self.best_val_acc*100:.2f}%)"
        )
        return ckpt

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        num_epochs: int = 50,
        max_train_batches: Optional[int] = None,
        max_val_batches: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes the complete training and validation schedule.
        """
        self.logger.info("=" * 80)
        self.logger.info(f"Starting SRNet Training Pipeline on Device: {self.device}")
        self.logger.info(f"Epochs: {self.start_epoch} -> {num_epochs} | Base LR: {self.lr} | Seed: {self.seed}")
        self.logger.info("=" * 80)

        for epoch in range(self.start_epoch, num_epochs + 1):
            epoch_start = time.perf_counter()

            # Train phase
            train_metrics = self.train_epoch(train_loader, max_batches=max_train_batches)

            # Validation phase
            val_metrics = self.validate(val_loader, max_batches=max_val_batches)

            # Step learning rate scheduler
            current_lr = self.optimizer.param_groups[0]["lr"]
            self.scheduler.step()

            # Check for best model
            is_best = val_metrics["accuracy"] > self.best_val_acc or (
                val_metrics["accuracy"] == self.best_val_acc and val_metrics["loss"] < self.best_val_loss
            )
            if is_best:
                self.best_val_acc = val_metrics["accuracy"]
                self.best_val_loss = val_metrics["loss"]
                self.epochs_without_improvement = 0
            else:
                self.epochs_without_improvement += 1

            # Save checkpoint
            self.save_checkpoint(epoch, train_metrics, val_metrics, is_best=is_best)

            # Record epoch log
            epoch_duration = time.perf_counter() - epoch_start
            log_record = {
                "epoch": epoch,
                "lr": current_lr,
                "train_loss": train_metrics["loss"],
                "train_acc": train_metrics["accuracy"],
                "val_loss": val_metrics["loss"],
                "val_acc": val_metrics["accuracy"],
                "val_precision": val_metrics["precision"],
                "val_recall": val_metrics["recall"],
                "val_f1": val_metrics["f1"],
                "is_best": is_best,
                "duration_sec": round(epoch_duration, 2),
            }
            self.history.append(log_record)

            self.logger.info(
                f"Epoch [{epoch:03d}/{num_epochs:03d}] | "
                f"Train Loss: {train_metrics['loss']:.4f} Acc: {train_metrics['accuracy']*100:5.2f}% | "
                f"Val Loss: {val_metrics['loss']:.4f} Acc: {val_metrics['accuracy']*100:5.2f}% | "
                f"F1: {val_metrics['f1']:.4f} | LR: {current_lr:.6f} | "
                f"{'(BEST)' if is_best else ''} Time: {epoch_duration:.1f}s"
            )

            # Save history JSON
            history_path = self.logs_dir / "training_history.json"
            with open(history_path, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2)

            # Early stopping check
            if self.epochs_without_improvement >= self.patience:
                self.logger.info(
                    f"Early stopping triggered: No validation improvement for {self.patience} consecutive epochs."
                )
                break

        self.logger.info("=" * 80)
        self.logger.info(f"Training completed! Best Validation Accuracy: {self.best_val_acc*100:.2f}%")
        self.logger.info("=" * 80)
        return self.history

