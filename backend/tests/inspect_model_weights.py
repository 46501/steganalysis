import sys
from pathlib import Path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import torch
from app.ml.stegonet_lite import StegoNetLite

model = StegoNetLite()
weights_path = Path("backend/app/ml/weights/stegonet_lite_demo.pt")
state_dict = torch.load(weights_path, map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

print("=== StegoNetLite Architecture & Parameter Inspection ===")
for name, p in model.named_parameters():
    print(f"{name:30s}: shape={list(p.shape)}, mean={p.mean().item():+.6f}, std={p.std().item():.6f}, min={p.min().item():+.6f}, max={p.max().item():+.6f}")

print("\n--- Final FC Layer ---")
print("fc.weight:\n", model.fc.weight)
print("fc.bias:\n", model.fc.bias)

# Let's see the difference in weights between class 0 (Cover) and class 1 (Stego):
w_diff = model.fc.weight[1] - model.fc.weight[0]
b_diff = model.fc.bias[1] - model.fc.bias[0]
print("fc.bias difference (Stego - Cover):", b_diff.item())
print(f"fc.weight difference (Stego - Cover): mean={w_diff.mean().item():+.6f}, std={w_diff.std().item():.6f}")
print("Positive weights favoring Stego:", (w_diff > 0).sum().item(), "out of", len(w_diff))
print("Negative weights favoring Cover:", (w_diff < 0).sum().item(), "out of", len(w_diff))
