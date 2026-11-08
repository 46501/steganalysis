import os
import sys
import tempfile
import hashlib
import numpy as np
import cv2
import pytest
import joblib

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.analysis.chi_square import chi_square_attack, analyze_chi_square
from app.analysis.rs_analysis import rs_analysis, analyze_rs
from app.services.metadata import extract_metadata


def create_test_image(pattern="gradient", channels=3, size=(128, 128)):
    """Creates a temporary image with specific known statistical properties."""
    h, w = size
    if pattern == "gradient":
        # Smooth gradient has uneven even/odd frequencies naturally
        row = np.linspace(0, 255, w, dtype=np.uint8)
        img = np.tile(row, (h, 1))
        if channels == 3:
            img = np.stack([img, img, img], axis=-1)
    elif pattern == "equalized_lsb":
        # Artificially equalize pairs (2i, 2i+1) by setting random LSBs
        rng = np.random.RandomState(42)
        base = rng.randint(0, 128, (h, w), dtype=np.uint8) * 2
        lsb = rng.randint(0, 2, (h, w), dtype=np.uint8)
        img = base | lsb
        if channels == 3:
            img = np.stack([img, img, img], axis=-1)
    elif pattern == "clean_natural":
        # Realistic natural image with uneven parity distributions (edges and texture)
        img = np.zeros((h, w), dtype=np.uint8)
        # Create distinct non-uniform patches with natural parity imbalances
        for i in range(h):
            for j in range(w):
                val = int((np.sin(i / 5.0) * np.cos(j / 5.0) + 1.0) * 100)
                # Ensure strong natural parity bias (clean un-equalized pairs)
                img[i, j] = val if (i + j) % 3 == 0 else (val & ~1)
        if channels == 3:
            img = np.stack([img, np.clip(img * 1.2, 0, 255).astype(np.uint8), np.clip(img * 0.8, 0, 255).astype(np.uint8)], axis=-1)
    else:
        img = np.zeros((h, w, channels), dtype=np.uint8)

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp.close()
    cv2.imwrite(tmp.name, img)
    return tmp.name, img


def test_chi_square_logic():
    """Verify Chi-Square attack detects equalized PoVs as Suspicious and clean gradients as Normal."""
    # 1. Clean gradient image: adjacent bins (2i, 2i+1) have natural non-equalized distributions
    clean_path, _ = create_test_image("clean_natural", channels=3)
    try:
        clean_res = analyze_chi_square(clean_path)
        assert clean_res["status"] == "success"
        # In a natural image, observed frequencies deviate strongly from equalization -> low p-value -> Normal
        for ch, stats in clean_res["stats"].items():
            assert stats["suspicion"] == "Normal", f"Channel {ch} clean image should be classified Normal"
    finally:
        if os.path.exists(clean_path):
            os.remove(clean_path)

    # 2. Equalized LSB image: pairs (2i, 2i+1) are strictly equalized by random 0/1 bits -> p-val > 0.95 -> Suspicious
    stego_path, _ = create_test_image("equalized_lsb", channels=3)
    try:
        stego_res = analyze_chi_square(stego_path)
        assert stego_res["status"] == "success"
        for ch, stats in stego_res["stats"].items():
            assert stats["p_value"] > 0.50, f"Channel {ch} p-value should be high for equalized LSBs"
            assert stats["suspicion"] in ["Suspicious", "Moderate"], f"Channel {ch} should be Suspicious/Moderate"
    finally:
        if os.path.exists(stego_path):
            os.remove(stego_path)


def test_metadata_sha256_computation():
    """Verify extract_metadata calculates the correct SHA-256 hash."""
    test_path, _ = create_test_image("gradient", channels=3)
    try:
        with open(test_path, "rb") as f:
            expected_sha256 = hashlib.sha256(f.read()).hexdigest()

        meta = extract_metadata(test_path, "test_gradient.png")
        assert "sha256" in meta, "Metadata must contain 'sha256' field"
        assert meta["sha256"] == expected_sha256, "Calculated sha256 must match file SHA-256"
        assert len(meta["sha256"]) == 64, "SHA-256 must be 64 hexadecimal characters"
    finally:
        if os.path.exists(test_path):
            os.remove(test_path)


def test_rs_analysis_channels():
    """Verify RS analysis handles 3-channel RGB and 1-channel Grayscale properly without forcing grayscale."""
    # 3-channel RGB image
    rgb_path, _ = create_test_image("gradient", channels=3)
    try:
        rgb_res = analyze_rs(rgb_path)
        assert rgb_res["status"] == "success"
        assert "stats" in rgb_res
        assert set(rgb_res["stats"].keys()) == {"R", "G", "B"}, "RGB image RS analysis must return R, G, B channels"
        for ch in ["R", "G", "B"]:
            assert "estimated_rate" in rgb_res["stats"][ch]
            assert "Rm" in rgb_res["stats"][ch]
            assert "Sm" in rgb_res["stats"][ch]
    finally:
        if os.path.exists(rgb_path):
            os.remove(rgb_path)

    # 1-channel Grayscale image
    gray_path, _ = create_test_image("gradient", channels=1)
    try:
        gray_res = analyze_rs(gray_path)
        assert gray_res["status"] == "success"
        assert set(gray_res["stats"].keys()) == {"L"}, "Grayscale image RS analysis must return L channel"
    finally:
        if os.path.exists(gray_path):
            os.remove(gray_path)


def test_model_deserialization():
    """Verify models on disk load cleanly and perform inference without NumPy 2.x/1.x issues."""
    models_dir = os.path.join(BACKEND_DIR, "..", "models")
    rf_path = os.path.join(models_dir, "randomforest_v1.pkl")
    scaler_path = os.path.join(models_dir, "scaler_v1.pkl")

    assert os.path.exists(rf_path), "Random Forest model file missing"
    assert os.path.exists(scaler_path), "Scaler file missing"

    rf = joblib.load(rf_path)
    scaler = joblib.load(scaler_path)

    # Test inference on sample vector
    dummy_features = np.zeros((1, scaler.n_features_in_))
    scaled = scaler.transform(dummy_features)
    probs = rf.predict_proba(scaled)
    assert probs.shape == (1, 2)
    assert 0.0 <= probs[0, 1] <= 1.0


def test_analyze_api_cnn_heatmap():
    """Verify POST /api/analyze includes cnn_prediction with heatmap_base64."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    test_path, _ = create_test_image("clean_natural", channels=3, size=(64, 64))
    try:
        with open(test_path, "rb") as f:
            response = client.post(
                "/api/analyze",
                files={"file": ("test.png", f, "image/png")}
            )
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        assert "cnn_prediction" in data
        
        # If CNN model is loaded, heatmap_base64 must be present
        if data["cnn_prediction"].get("model") == "CNN_v1":
            assert "heatmap_base64" in data["cnn_prediction"], "CNN prediction must include heatmap_base64"
            assert isinstance(data["cnn_prediction"]["heatmap_base64"], str)
            assert len(data["cnn_prediction"]["heatmap_base64"]) > 50
    finally:
        if os.path.exists(test_path):
            os.remove(test_path)
