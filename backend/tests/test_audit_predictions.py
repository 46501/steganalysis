import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import torch
import numpy as np
from PIL import Image

from app.ml.inference import engine
from app.ml.preprocessor import SRNetPreprocessor

print("=== StegoShield AI Detector Audit Script ===")
print(f"Model loaded: {engine.is_trained_weights}")
print(f"Model active name: {engine.active_model_name}")
print(f"Device: {engine.device}")

# 1. Test BOSSbase Cover and Stego samples
test_cover_dir = Path("dataset/processed/S-UNIWARD_0.4bpp/test/cover")
test_stego_dir = Path("dataset/processed/S-UNIWARD_0.4bpp/test/stego")

print("\n--- 1. Testing BOSSbase Test Set (Sample) ---")
if test_cover_dir.exists():
    cover_files = sorted(os.listdir(test_cover_dir))[:10]
    for f in cover_files:
        p = test_cover_dir / f
        with open(p, "rb") as fp:
            tensor, meta = SRNetPreprocessor.process_bytes(fp.read())
        res = engine.predict(tensor)
        print(f"COVER {f}: Cover={res['cover_probability']:.4f}, Stego={res['stego_probability']:.4f}, Margin={res['decision_margin']:.4f}, Verdict={res['verdict']}")

if test_stego_dir.exists():
    stego_files = sorted(os.listdir(test_stego_dir))[:10]
    for f in stego_files:
        p = test_stego_dir / f
        with open(p, "rb") as fp:
            tensor, meta = SRNetPreprocessor.process_bytes(fp.read())
        res = engine.predict(tensor)
        print(f"STEGO {f}: Cover={res['cover_probability']:.4f}, Stego={res['stego_probability']:.4f}, Margin={res['decision_margin']:.4f}, Verdict={res['verdict']}")

# 2. Test Natural / Clean images outside BOSSbase
print("\n--- 2. Testing Natural / Clean Images (Photos, Gradients, Noise, UI) ---")
synthetic_tests = {}

# Flat uniform image
synthetic_tests["flat_gray_128"] = np.full((256, 256), 128, dtype=np.uint8)
# Gradient image
grad_x = np.linspace(0, 255, 256, dtype=np.uint8)
synthetic_tests["gradient"] = np.tile(grad_x, (256, 1))
# Uniform random noise
np.random.seed(42)
synthetic_tests["uniform_noise"] = np.random.randint(0, 256, (256, 256), dtype=np.uint8)
# Gaussian texture (natural-like)
gaussian_texture = np.clip(np.random.normal(128, 25, (256, 256)), 0, 255).astype(np.uint8)
synthetic_tests["gaussian_texture"] = gaussian_texture

# Check if any user uploaded image or logo exists
logo_path = Path("frontend/src/assets/logo.png")
if logo_path.exists():
    with open(logo_path, "rb") as fp:
        tensor, meta = SRNetPreprocessor.process_bytes(fp.read())
    res = engine.predict(tensor)
    print(f"NATURAL logo.png: Cover={res['cover_probability']:.4f}, Stego={res['stego_probability']:.4f}, Margin={res['decision_margin']:.4f}, Verdict={res['verdict']}")

for name, arr in synthetic_tests.items():
    img = Image.fromarray(arr, mode="L")
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    tensor, meta = SRNetPreprocessor.process_bytes(buf.getvalue())
    res = engine.predict(tensor)
    print(f"SYNTHETIC {name}: Cover={res['cover_probability']:.4f}, Stego={res['stego_probability']:.4f}, Margin={res['decision_margin']:.4f}, Verdict={res['verdict']}")

