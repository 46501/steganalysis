"""Unit tests for PyTorch SRNet architecture and inference engine."""

import pytest
import torch

from app.ml.architecture import Srnet, Type1, Type2, Type3, Type4
from app.ml.inference import SRNetInferenceEngine


def test_srnet_layer_shapes():
    """Verifies output dimensions of SRNet building blocks."""
    # Type 1
    t1 = Type1(1, 64)
    x = torch.randn(2, 1, 256, 256)
    out1 = t1(x)
    assert out1.shape == (2, 64, 256, 256)

    # Type 2
    t2 = Type2(64, 64)
    out2 = t2(out1)
    assert out2.shape == (2, 64, 256, 256)

    # Type 3 (downsampling by factor of 2)
    t3 = Type3(64, 128)
    out3 = t3(out2)
    assert out3.shape == (2, 128, 128, 128)

    # Type 4 (Global Average Pooling)
    t4 = Type4(128, 256)
    out4 = t4(out3)
    assert out4.shape == (2, 256, 1, 1)


def test_srnet_full_forward_pass():
    """Verifies that full SRNet model outputs 2 log-probabilities per image."""
    model = Srnet()
    model.eval()
    dummy_input = torch.randn(2, 1, 256, 256)
    with torch.no_grad():
        output = model(dummy_input)
    assert output.shape == (2, 2)


def test_inference_engine_prediction():
    """Verifies the inference engine returns well-formed verdict dictionary."""
    engine = SRNetInferenceEngine(device="cpu")
    dummy_tensor = torch.randn(1, 1, 256, 256)
    res = engine.predict(dummy_tensor)

    assert "verdict" in res
    assert res["verdict"] in ["Cover", "Stego"]
    assert 0.0 <= res["confidence"] <= 1.0
    assert 0.0 <= res["cover_probability"] <= 1.0
    assert 0.0 <= res["stego_probability"] <= 1.0

