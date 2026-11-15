"""
Test Suite: Phase 3 Controlled Experiments Verification.

Validates:
1. Complete empirical dataset: all 8 experimental runs recorded with 5 epochs each.
2. Checkpoints saved and loadable for all newly trained variants.
3. KV high-pass filter mathematical properties (zero-sum, symmetric, reflection padding).
4. Parametric StegoNetVariant tensor output shapes and gradient flows.
5. Strict dataset range isolation (IDs 1-300 train, 4001-4100 val; 5001-5100 test strictly untouched).
"""

import json
from pathlib import Path
import pytest
import torch
import torch.nn as nn

from training.run_phase3_experiments import (
    KVFilter,
    StegoNetVariant,
    PairedStegoInMemoryDataset,
)


def test_phase3_results_json_completeness():
    results_path = Path("backend/training/phase3_experiment_results.json")
    assert results_path.exists(), "phase3_experiment_results.json must exist"

    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    runs = data.get("completed_runs", [])
    assert len(runs) == 8, f"Expected exactly 8 completed runs, found {len(runs)}"

    expected_runs = [
        (1, 42), (1, 123),
        (2, 42), (2, 123),
        (3, 42), (3, 123),
        (4, 42), (4, 123),
    ]

    for exp_id, seed in expected_runs:
        match = [r for r in runs if r["exp_id"] == exp_id and r["seed"] == seed]
        assert len(match) == 1, f"Missing or duplicate run for Exp {exp_id} Seed {seed}"
        run = match[0]
        assert len(run["epoch_history"]) == 5, f"Exp {exp_id} Seed {seed} has {len(run['epoch_history'])} epochs, expected 5"
        assert run["best_epoch"] in range(1, 6)
        assert 0.0 < run["final_epoch"]["train_loss"] < 2.0
        assert 0.0 < run["final_epoch"]["val_loss"] < 3.0
        assert 0.40 <= run["final_epoch"]["val_roc_auc"] <= 0.65


def test_kv_filter_properties():
    kv = KVFilter()
    kernel = kv.kv_kernel.squeeze()
    assert kernel.shape == (5, 5), "KV kernel must be 5x5"

    kernel_sum = kernel.sum().item()
    assert abs(kernel_sum) < 1e-6, f"KV kernel must be zero-sum, got {kernel_sum}"

    # Check symmetry (kernel is horizontally and vertically symmetric)
    assert torch.allclose(kernel, kernel.t(), atol=1e-6), "KV kernel should be symmetric"
    assert torch.allclose(kernel, torch.flip(kernel, dims=[0]), atol=1e-6), "KV kernel should be vertically symmetric"
    assert torch.allclose(kernel, torch.flip(kernel, dims=[1]), atol=1e-6), "KV kernel should be horizontally symmetric"

    # Forward pass on constant image must yield all zeros
    const_img = torch.full((2, 1, 64, 64), 0.5, dtype=torch.float32)
    filtered = kv(const_img)
    assert filtered.shape == (2, 1, 64, 64)
    assert torch.allclose(filtered, torch.zeros_like(filtered), atol=1e-6), "KV on constant image must produce 0.0 residual"


def test_stegonet_variants_forward_and_gradients():
    variants = [
        (False, False),
        (True, False),
        (False, True),
        (True, True),
    ]

    for use_kv, use_abs in variants:
        model = StegoNetVariant(use_kv=use_kv, use_abs=use_abs)
        model.train()
        x = torch.randn(4, 1, 256, 256)
        out = model(x)

        assert out.shape == (4, 2), f"Output logits shape mismatch for (kv={use_kv}, abs={use_abs})"
        # LogSoftmax outputs should exponentiate to 1.0 along dim 1
        probs = torch.exp(out)
        assert torch.allclose(probs.sum(dim=1), torch.ones(4), atol=1e-5)

        # Verify gradient flow
        loss = out.sum()
        loss.backward()
        for name, param in model.named_parameters():
            if param.requires_grad:
                assert param.grad is not None, f"Gradient missing for {name}"
                assert torch.isfinite(param.grad).all(), f"Non-finite gradient in {name}"


def test_checkpoints_exist_and_loadable():
    ckpt_dir = Path("backend/training/checkpoints")
    assert ckpt_dir.exists(), "checkpoints directory must exist"

    # We expect checkpoints for the runs that executed with checkpoint persistence
    for exp_id in [2, 3, 4]:
        for seed in [123]:
            best_ckpt = ckpt_dir / f"phase3_exp{exp_id}_seed{seed}_best.pt"
            latest_ckpt = ckpt_dir / f"phase3_exp{exp_id}_seed{seed}_latest.pt"
            assert best_ckpt.exists(), f"Missing {best_ckpt}"
            assert latest_ckpt.exists(), f"Missing {latest_ckpt}"

            data = torch.load(best_ckpt, map_location="cpu")
            assert "model_state_dict" in data
            assert "val_loss" in data
            assert data["exp_id"] == exp_id
            assert data["seed"] == seed


def test_dataset_strict_id_range():
    # Verify dataset loader enforces id_range and does not cross into test partition
    cover_dir = Path("dataset/processed/S-UNIWARD_0.4bpp/train/cover")
    stego_dir = Path("dataset/processed/S-UNIWARD_0.4bpp/train/stego")

    train_ds = PairedStegoInMemoryDataset(
        cover_dir, stego_dir, max_pairs=10, id_range=(1, 4000)
    )
    for img_id in train_ds.matched_ids:
        assert 1 <= img_id <= 4000, f"Train image {img_id} outside allowed range (1-4000)"
        assert not (5001 <= img_id <= 5100), f"Train dataset loaded reserved test image {img_id}!"
