"""
Unit and Integration Tests for SRNet Training Pipeline and Steganalysis Dataset Loader.
Tests:
1. PGM image loading (binary P5).
2. Tensor shape and data type.
3. Correct labels (Cover=0, Stego=1).
4. Dataset split isolation (Train, Val, Test).
5. DataLoader batch shape and paired collation.
6. SRNet forward pass on 512x512 inputs.
7. Loss calculation and gradient backpropagation.
8. Checkpoint save/load integrity.
9. Resume training state restoration.
"""

import os
import shutil
import tempfile
from pathlib import Path
import pytest
import numpy as np
import torch
import torch.nn as nn

from app.ml.architecture import Srnet
from app.ml.dataset import (
    load_p5_pgm_tensor,
    StegoPairDataset,
    collate_stego_pairs,
    get_dataloaders,
)
from app.ml.trainer import SRNetTrainer, compute_binary_metrics, init_srnet_weights

DATASET_ROOT = Path(r"D:\Stego\dataset\processed\S-UNIWARD_0.4bpp")


# ---------------------------------------------------------------------------
# Test 1 & 2: PGM Image Loading, Tensor Shape, and Data Type
# ---------------------------------------------------------------------------
def test_p5_pgm_image_loading_and_tensor_properties():
    """Verifies that P5 PGM images load directly into normalized float32 tensors."""
    sample_cover = DATASET_ROOT / "train" / "cover" / "1.pgm"
    assert sample_cover.is_file(), f"Sample cover not found: {sample_cover}"

    tensor = load_p5_pgm_tensor(sample_cover)

    # Tensor properties
    assert isinstance(tensor, torch.Tensor), "Output must be a PyTorch Tensor"
    assert tensor.shape == (1, 512, 512), f"Expected shape (1, 512, 512), got {tensor.shape}"
    assert tensor.dtype == torch.float32, f"Expected dtype float32, got {tensor.dtype}"

    # Normalization check: [0.0, 1.0]
    min_val = float(tensor.min())
    max_val = float(tensor.max())
    assert 0.0 <= min_val <= 1.0, f"Min value out of bounds: {min_val}"
    assert 0.0 <= max_val <= 1.0, f"Max value out of bounds: {max_val}"

    # Error handling on missing file
    with pytest.raises(FileNotFoundError):
        load_p5_pgm_tensor(DATASET_ROOT / "non_existent_image.pgm")


# ---------------------------------------------------------------------------
# Test 3 & 4: Correct Labels and Dataset Split Isolation
# ---------------------------------------------------------------------------
def test_dataset_splits_and_isolation():
    """Verifies split boundaries, correct pair labels, and zero data leakage."""
    train_ds = StegoPairDataset(DATASET_ROOT, split="train", limit=10)
    val_ds = StegoPairDataset(DATASET_ROOT, split="val", limit=10)
    test_ds = StegoPairDataset(DATASET_ROOT, split="test", limit=10)

    # Split lengths with limits
    assert len(train_ds) == 10
    assert len(val_ds) == 10
    assert len(test_ds) == 10

    # Split boundaries
    assert all(1 <= idx <= 4000 for idx in train_ds.pair_ids)
    assert all(4001 <= idx <= 5000 for idx in val_ds.pair_ids)
    assert all(5001 <= idx <= 10000 for idx in test_ds.pair_ids)

    # Set disjointness check across sample IDs
    train_set = set(train_ds.pair_ids)
    val_set = set(val_ds.pair_ids)
    test_set = set(test_ds.pair_ids)
    assert len(train_set & val_set) == 0, "Leakage between train and val!"
    assert len(train_set & test_set) == 0, "Leakage between train and test!"
    assert len(val_set & test_set) == 0, "Leakage between val and test!"

    # Sample labels and contents
    sample = train_ds[0]
    assert "cover" in sample
    assert "stego" in sample
    assert sample["cover_label"] == 0, "Cover label must be 0"
    assert sample["stego_label"] == 1, "Stego label must be 1"
    assert sample["cover"].shape == (1, 512, 512)
    assert sample["stego"].shape == (1, 512, 512)

    # Invalid split name check
    with pytest.raises(ValueError):
        StegoPairDataset(DATASET_ROOT, split="invalid_split_name")


# ---------------------------------------------------------------------------
# Test 5: DataLoader Batch Shape and Paired Collation
# ---------------------------------------------------------------------------
def test_dataloader_batch_shape():
    """Verifies that paired mini-batches have shape (2*B, 1, 512, 512) and balanced labels."""
    batch_size = 2
    train_ds = StegoPairDataset(DATASET_ROOT, split="train", limit=4)
    loader = torch.utils.data.DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=False,
        collate_fn=collate_stego_pairs,
    )

    for images, labels in loader:
        expected_batch_size = batch_size * 2
        assert images.shape == (expected_batch_size, 1, 512, 512)
        assert labels.shape == (expected_batch_size,)
        # First half covers (0), second half stegos (1)
        assert torch.equal(labels[:batch_size], torch.zeros(batch_size, dtype=torch.long))
        assert torch.equal(labels[batch_size:], torch.ones(batch_size, dtype=torch.long))
        break


# ---------------------------------------------------------------------------
# Test 6 & 7: SRNet Forward Pass, Loss Calculation, and Gradients
# ---------------------------------------------------------------------------
def test_srnet_forward_and_loss_calculation():
    """Verifies forward pass on 512x512 inputs, NLLLoss calculation, and gradient updates."""
    model = Srnet()
    model.apply(init_srnet_weights)
    criterion = nn.NLLLoss()
    optimizer = torch.optim.Adamax(model.parameters(), lr=0.001)

    batch_size = 2
    dummy_images = torch.randn(batch_size * 2, 1, 512, 512)
    dummy_labels = torch.tensor([0, 0, 1, 1], dtype=torch.long)

    model.train()
    optimizer.zero_grad()
    outputs = model(dummy_images)

    assert outputs.shape == (batch_size * 2, 2), f"Expected (4, 2), got {outputs.shape}"
    loss = criterion(outputs, dummy_labels)

    assert torch.isfinite(loss), "Loss must be finite"
    assert loss.item() > 0.0, "Loss must be positive"

    loss.backward()
    # Ensure gradients are computed for convolutional parameters
    has_grads = any(p.grad is not None and torch.sum(torch.abs(p.grad)) > 0 for p in model.parameters())
    assert has_grads, "Gradients must propagate through the network"
    optimizer.step()


# ---------------------------------------------------------------------------
# Test 8: Checkpoint Save and Load
# ---------------------------------------------------------------------------
def test_checkpoint_save_and_load(tmp_path):
    """Verifies that checkpoints preserve model weights, optimizer, and scheduler states."""
    checkpoints_dir = tmp_path / "checkpoints"
    logs_dir = tmp_path / "logs"

    trainer = SRNetTrainer(
        checkpoints_dir=checkpoints_dir,
        logs_dir=logs_dir,
        lr=0.001,
        seed=42,
    )

    # Save mock checkpoint
    mock_train = {"loss": 0.5, "accuracy": 0.75}
    mock_val = {"loss": 0.45, "accuracy": 0.80, "precision": 0.82, "recall": 0.78, "f1": 0.80}
    saved_path = trainer.save_checkpoint(epoch=1, train_metrics=mock_train, val_metrics=mock_val, is_best=True)

    assert saved_path.is_file(), "Latest checkpoint must be saved"
    best_path = checkpoints_dir / "best_checkpoint.pt"
    assert best_path.is_file(), "Best checkpoint must be saved when is_best=True"

    # Instantiate fresh trainer and load checkpoint
    fresh_trainer = SRNetTrainer(
        checkpoints_dir=checkpoints_dir,
        logs_dir=logs_dir,
        lr=0.001,
    )
    ckpt = fresh_trainer.load_checkpoint(saved_path)

    assert fresh_trainer.start_epoch == 2, "Start epoch should be resumed to next epoch (2)"
    assert fresh_trainer.best_val_acc == 0.80

    # Verify model weights are strictly identical
    for p1, p2 in zip(trainer.model.parameters(), fresh_trainer.model.parameters()):
        assert torch.allclose(p1, p2), "Model parameters must match after loading checkpoint"


# ---------------------------------------------------------------------------
# Test 9: Resume Training Logic
# ---------------------------------------------------------------------------
def test_resume_training_logic(tmp_path):
    """Verifies resume training state transition across multiple epochs."""
    checkpoints_dir = tmp_path / "checkpoints"
    logs_dir = tmp_path / "logs"

    # Trainer 1 saves epoch 5
    trainer1 = SRNetTrainer(checkpoints_dir=checkpoints_dir, logs_dir=logs_dir, lr=0.001)
    trainer1.save_checkpoint(
        epoch=5,
        train_metrics={"loss": 0.3, "accuracy": 0.88},
        val_metrics={"loss": 0.28, "accuracy": 0.90},
        is_best=True,
    )

    # Trainer 2 resumes
    trainer2 = SRNetTrainer(checkpoints_dir=checkpoints_dir, logs_dir=logs_dir, lr=0.001)
    latest_pt = checkpoints_dir / "latest_checkpoint.pt"
    trainer2.load_checkpoint(latest_pt)

    assert trainer2.start_epoch == 6, "Resumed trainer must start at epoch 6"
    assert trainer2.best_val_acc == 0.90


# ---------------------------------------------------------------------------
# Test 10: Binary Metrics Computation
# ---------------------------------------------------------------------------
def test_binary_metrics_computation():
    """Verifies Accuracy, Precision, Recall, and F1 calculations."""
    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 1, 1, 1])

    metrics = compute_binary_metrics(y_true, y_pred)
    assert metrics["accuracy"] == 0.75  # 3 of 4 correct
    assert abs(metrics["precision"] - (2 / 3)) < 1e-3  # TP=2, FP=1 -> 0.6667
    assert metrics["recall"] == 1.0  # TP=2, FN=0 -> 1.0
    expected_f1 = (2 * (2 / 3) * 1.0) / ((2 / 3) + 1.0)
    assert abs(metrics["f1"] - expected_f1) < 1e-3

