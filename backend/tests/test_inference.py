"""
Comprehensive tests for PyTorch SRNet architecture and inference.
Verifies model initialization, layer dimensions, forward pass, and output shapes.
"""

import pytest
import torch
from torch import nn

from app.ml.architecture import ConvBn, Srnet, Type1, Type2, Type3, Type4
from app.ml.inference import SRNetInferenceEngine


def test_srnet_initialization():
    """Verifies SRNet structure, submodules, and layer configurations."""
    model = Srnet()
    assert isinstance(model, nn.Module)

    # Verify layer hierarchy
    assert hasattr(model, "type1s")
    assert hasattr(model, "type2s")
    assert hasattr(model, "type3s")
    assert hasattr(model, "type4")
    assert hasattr(model, "dense")
    assert hasattr(model, "softmax")

    # Verify counts of residual blocks
    assert len(model.type1s) == 2, "Type1 sequential block must contain 2 layers"
    assert len(model.type2s) == 5, "Type2 sequential block must contain 5 layers"
    assert len(model.type3s) == 4, "Type3 sequential block must contain 4 layers"

    # Verify classification head
    assert isinstance(model.type4, Type4)
    assert isinstance(model.dense, nn.Linear)
    assert model.dense.in_features == 512
    assert model.dense.out_features == 2
    assert isinstance(model.softmax, nn.LogSoftmax)
    assert model.softmax.dim == 1


def test_building_blocks():
    """Verifies input and output shapes of individual SRNet building blocks."""
    batch_size = 2

    # ConvBn
    conv_bn = ConvBn(1, 64)
    x = torch.randn(batch_size, 1, 256, 256)
    out_cb = conv_bn(x)
    assert out_cb.shape == (batch_size, 64, 256, 256)

    # Type 1
    t1 = Type1(1, 64)
    out_t1 = t1(x)
    assert out_t1.shape == (batch_size, 64, 256, 256)

    # Type 2 (preserves spatial dimensions)
    t2 = Type2(64, 64)
    out_t2 = t2(out_t1)
    assert out_t2.shape == (batch_size, 64, 256, 256)

    # Type 3 (downsampling: stride 2 cuts spatial dimensions in half)
    t3 = Type3(64, 128)
    out_t3 = t3(out_t2)
    assert out_t3.shape == (batch_size, 128, 128, 128)

    # Type 4 (Global Average Pooling produces 1x1 spatial dimensions)
    t4 = Type4(128, 512)
    out_t4 = t4(out_t3)
    assert out_t4.shape == (batch_size, 512, 1, 1)


def test_srnet_forward_pass_single_image():
    """Verifies forward pass for single image: (1, 1, 256, 256) -> (1, 2)."""
    model = Srnet()
    model.eval()

    dummy_input = torch.randn(1, 1, 256, 256)
    with torch.no_grad():
        output = model(dummy_input)

    assert output.shape == (1, 2)
    # Output is LogSoftmax, exp should sum to ~1.0
    probabilities = torch.exp(output)
    assert torch.isclose(probabilities.sum(dim=1), torch.tensor([1.0]), atol=1e-5)


def test_srnet_forward_pass_batch():
    """Verifies forward pass for a batch of images: (4, 1, 256, 256) -> (4, 2)."""
    model = Srnet()
    model.eval()

    batch_input = torch.randn(4, 1, 256, 256)
    with torch.no_grad():
        output = model(batch_input)

    assert output.shape == (4, 2)
    probabilities = torch.exp(output)
    expected_sums = torch.ones(4)
    assert torch.allclose(probabilities.sum(dim=1), expected_sums, atol=1e-5)


def test_inference_engine_prediction():
    """Verifies that the inference engine returns well-formed verdict dictionary."""
    engine = SRNetInferenceEngine(device="cpu")
    dummy_tensor = torch.randn(1, 1, 256, 256)
    result = engine.predict(dummy_tensor)

    assert "verdict" in result
    assert result["verdict"] in ["Cover", "Stego"]
    assert "cover_probability" in result
    assert "stego_probability" in result
    assert "confidence" in result
    assert "device" in result
    assert "is_trained_weights" in result

    # Probabilities must be within valid range and sum to ~1.0
    assert 0.0 <= result["cover_probability"] <= 1.0
    assert 0.0 <= result["stego_probability"] <= 1.0
    assert abs((result["cover_probability"] + result["stego_probability"]) - 1.0) < 1e-4
    assert result["confidence"] == max(result["cover_probability"], result["stego_probability"])
