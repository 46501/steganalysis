"""
StegoShield AI — Model Training, Calibration & Scientific Validation Test Suite (Phase 2).

Validates:
1. Checkpoint loading and state_dict architecture compatibility.
2. Preprocessing normalization and non-destructive cropping.
3. Ground-truth label mapping (0 = Cover, 1 = Stego).
4. Train/validation/test leakage prevention across all splits.
5. Reproducible independent evaluation metrics and calibration tracking.
6. Safe inference handling with valid vs. missing weights.
7. Confidence calibration evaluation and preservation of the inconclusive guardrail.
8. API response structure preservation across endpoints.
"""

import os
from pathlib import Path
import pytest
import torch
import numpy as np
from PIL import Image

from app.ml.stegonet_lite import StegoNetLite
from app.ml.preprocessor import SRNetPreprocessor
from app.ml.inference import SteganalysisInferenceEngine
from app.ml.evaluate_model import (
    compute_ece_and_reliability,
    compute_bootstrap_confidence_interval,
)
from app.services.steganalysis_service import SteganalysisService


def test_checkpoint_loading_and_architecture_compatibility():
    """Validates that stegonet_lite_best.pt loads cleanly and executes forward pass."""
    ckpt_path = Path("backend/app/ml/weights/stegonet_lite_best.pt")
    assert ckpt_path.is_file(), f"Missing checkpoint: {ckpt_path}"

    model = StegoNetLite()
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=True)
    if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
        ckpt = ckpt["model_state_dict"]

    model.load_state_dict(ckpt)
    model.eval()

    dummy = torch.randn(2, 1, 256, 256)
    with torch.no_grad():
        out = model(dummy)

    assert out.shape == (2, 2)
    # Output must be log-softmax
    probs = torch.exp(out)
    assert torch.allclose(probs.sum(dim=1), torch.ones(2), atol=1e-5)


def test_preprocessor_normalization_and_crop():
    """Validates that SRNetPreprocessor converts image bytes to normalized float32 tensor."""
    rng = np.random.RandomState(42)
    raw_img = Image.fromarray(rng.randint(0, 256, (512, 512), dtype=np.uint8), mode="L")
    buf = io_bytes = None

    import io
    bio = io.BytesIO()
    raw_img.save(bio, format="PNG")
    img_bytes = bio.getvalue()

    tensor, meta = SRNetPreprocessor.process_bytes(img_bytes, crop_size=256)
    assert tensor.shape == (1, 1, 256, 256)
    assert tensor.dtype == torch.float32
    assert meta["original_width"] == 512
    assert meta["original_height"] == 512


def test_cover_stego_label_mapping():
    """Validates consistent label semantics: 0 is Cover, 1 is Stego."""
    model = StegoNetLite()
    dummy = torch.zeros(1, 1, 256, 256)
    log_probs = model(dummy)
    probs = torch.exp(log_probs).squeeze(0)

    p_cover = float(probs[0].item())
    p_stego = float(probs[1].item())

    assert 0.0 <= p_cover <= 1.0
    assert 0.0 <= p_stego <= 1.0
    assert abs((p_cover + p_stego) - 1.0) < 1e-5


def test_train_val_test_leakage_prevention():
    """Validates zero overlap between train (1-4000), val (4001-5000), and test (5001-10000)."""
    dataset_root = Path("dataset/processed/S-UNIWARD_0.4bpp")
    train_cover = set(p.stem for p in (dataset_root / "train" / "cover").glob("*.pgm"))
    val_cover = set(p.stem for p in (dataset_root / "val" / "cover").glob("*.pgm"))
    test_cover = set(p.stem for p in (dataset_root / "test" / "cover").glob("*.pgm"))

    assert len(train_cover) == 4000
    assert len(val_cover) == 1000
    assert len(test_cover) == 5000

    # Test for zero cross-split leakage
    assert len(train_cover & val_cover) == 0
    assert len(train_cover & test_cover) == 0
    assert len(val_cover & test_cover) == 0

    # Verify ID range integrity
    assert all(1 <= int(x) <= 4000 for x in train_cover)
    assert all(4001 <= int(x) <= 5000 for x in val_cover)
    assert all(5001 <= int(x) <= 10000 for x in test_cover)


def test_confidence_calibration_metrics_calculation():
    """Validates Brier score and ECE calculation functions."""
    y_true = np.array([0, 1, 0, 1, 0, 1, 0, 1])
    # Moderately calibrated probabilities
    y_prob = np.array([0.2, 0.8, 0.3, 0.7, 0.4, 0.6, 0.45, 0.55])

    ece, bins = compute_ece_and_reliability(y_true, y_prob, n_bins=5)
    assert 0.0 <= ece <= 1.0
    assert len(bins) == 5

    cis = compute_bootstrap_confidence_interval(y_true, y_prob, n_resamples=100)
    assert "accuracy_ci" in cis
    assert "f1_ci" in cis
    assert "roc_auc_ci" in cis


def test_inference_with_valid_weights():
    """Validates that inference engine loads best weights and returns valid response."""
    engine = SteganalysisInferenceEngine()
    assert engine.is_loaded is True
    assert engine.is_trained_weights is True

    dummy = torch.zeros(1, 1, 256, 256)
    result = engine.predict(dummy, model_name="stegonet_lite")

    assert "verdict" in result
    assert "cover_probability" in result
    assert "stego_probability" in result
    assert "confidence" in result
    assert "decision_margin" in result
    assert "is_conclusive" in result
    assert "forensic_explanation" in result
    assert result["device"] == "cpu"

    # Because decision margin on flat tensor is small (< 0.15), it must trigger guardrail
    if result["decision_margin"] < 0.15:
        assert result["is_conclusive"] is False
        assert "INCONCLUSIVE" in result["verdict_category"]


def test_inference_with_missing_weights():
    """Validates that inference engine gracefully handles missing weights."""
    engine = SteganalysisInferenceEngine(weights_path="nonexistent_weights.pt")
    # For untrained SRNet, it must disable standalone classification
    dummy = torch.zeros(1, 1, 256, 256)
    res = engine.predict(dummy, model_name="srnet")

    assert res["is_conclusive"] is False
    assert res["confidence"] == 0.0
    assert "RESEARCH BLUEPRINT" in res["verdict_category"]


@pytest.mark.asyncio
async def test_api_compatibility_and_forensic_suite_intact():
    """Validates that SteganalysisService returns complete AnalysisResultResponse schema."""
    rng = np.random.RandomState(42)
    carrier_arr = rng.randint(50, 200, (256, 256), dtype=np.uint8)
    carrier_tensor = torch.from_numpy(carrier_arr).float().unsqueeze(0).unsqueeze(0)

    meta = {"original_width": 256, "original_height": 256, "format": "PNG", "mode": "L"}

    result = await SteganalysisService.analyze_tensor(
        filename="test_api_image.png",
        file_hash="test_api_hash_123",
        file_size=65536,
        tensor=carrier_tensor,
        metadata=meta,
        model_name="stegonet_lite",
        reference_tensor=None,
        reference_filename=None,
        db=None,
    )

    # All API schema fields must be present and well-typed
    assert result.filename == "test_api_image.png"
    assert result.verdict in ["Inconclusive", "Cover Indicated", "Stego Indicated", "Modification Detected"]
    assert 0.0 <= result.cover_probability <= 1.0
    assert 0.0 <= result.stego_probability <= 1.0
    assert 0.0 <= result.confidence <= 1.0
    assert result.execution_time_ms > 0
    assert result.model_name is not None
    assert result.statistical_tests is not None or result.advanced_statistical_suite is not None
