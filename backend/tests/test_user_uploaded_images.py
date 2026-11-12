import os
import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import torch
from app.ml.inference import engine
from app.ml.preprocessor import SRNetPreprocessor

uploaded_dir = Path("C:/Users/Admin/.gemini/antigravity/brain/4249ef5d-dba5-4bb8-a854-83f70aa23ed1/.user_uploaded")
print("=== Testing User-Uploaded Images ===")
if uploaded_dir.exists():
    for f in sorted(os.listdir(uploaded_dir)):
        p = uploaded_dir / f
        try:
            with open(p, "rb") as fp:
                tensor, meta = SRNetPreprocessor.process_bytes(fp.read())
            res = engine.predict(tensor)
            print(f"{f}: Cover={res['cover_probability']:.4f}, Stego={res['stego_probability']:.4f}, Margin={res['decision_margin']:.4f}, Verdict={res['verdict']}")
        except Exception as e:
            print(f"{f}: Error: {e}")
else:
    print("User uploaded dir not found")
