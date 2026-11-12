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

# Let's trace forward pass of StegoNetLite
# Look at definition of forward:
import inspect
print(inspect.getsource(model.forward))
