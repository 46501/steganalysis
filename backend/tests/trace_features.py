import sys
from pathlib import Path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import torch
from app.ml.stegonet_lite import StegoNetLite
from app.ml.preprocessor import SRNetPreprocessor

model = StegoNetLite()
weights_path = Path("backend/app/ml/weights/stegonet_lite_demo.pt")
state_dict = torch.load(weights_path, map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

# Test on 5001.pgm
cover_path = Path("dataset/processed/S-UNIWARD_0.4bpp/test/cover/5001.pgm")
with open(cover_path, "rb") as fp:
    tensor, _ = SRNetPreprocessor.process_bytes(fp.read())

tensor = tensor / 255.0
_, _, h, w = tensor.shape
if h > 256 or w > 256:
    left = (w - 256) // 2
    top = (h - 256) // 2
    tensor = tensor[:, :, top : top + 256, left : left + 256]

with torch.no_grad():
    feat0 = model.prefilter(tensor)
    feat1 = model.layer1(feat0)
    feat2 = model.layer2(feat1)
    feat3 = model.layer3(feat2)
    feat_gap = model.gap(feat3)
    feat_flat = torch.flatten(feat_gap, 1)
    logits = model.fc(feat_flat)
    log_probs = model.log_softmax(logits)
    probs = torch.exp(log_probs)

print(f"feat_flat shape: {feat_flat.shape}, mean: {feat_flat.mean().item():.4f}, std: {feat_flat.std().item():.4f}")
print("logits:", logits)
print("probs (0=Cover, 1=Stego):", probs)
print(f"fc(feat) contribution without bias: {feat_flat @ model.fc.weight.T}")
print(f"fc bias: {model.fc.bias}")

