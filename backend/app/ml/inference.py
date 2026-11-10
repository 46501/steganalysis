"""
SRNet PyTorch Inference Engine.
Handles model loading, device placement, warm-up, and forward evaluation.
"""

from pathlib import Path
from typing import Dict, Optional, Tuple
import torch
import torch.nn.functional as F

from app.core.config import settings
from app.ml.architecture import Srnet


class SRNetInferenceEngine:
    """Manages the lifecycle and execution of the PyTorch SRNet model."""

    def __init__(self, weights_path: Optional[str] = None, device: Optional[str] = None) -> None:
        self.device = torch.device(device or settings.DEVICE if torch.cuda.is_available() and device == "cuda" else "cpu")
        self.weights_path = Path(weights_path or settings.SRNET_WEIGHTS_PATH)
        self.model: Optional[Srnet] = None
        self.is_loaded: bool = False
        self.is_trained_weights: bool = False

    def load_model(self) -> None:
        """Initializes model architecture and loads weights if available."""
        self.model = Srnet()

        if self.weights_path.is_file():
            state_dict = torch.load(self.weights_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.is_trained_weights = True
        else:
            # Model initialized with random weights until trained checkpoint is supplied
            self.is_trained_weights = False

        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    @torch.no_grad()
    def predict(self, tensor: torch.Tensor) -> Dict[str, float]:
        """
        Runs inference on an input tensor (1, 1, 256, 256).
        Returns classification verdict, probabilities, and confidence score.
        """
        if not self.is_loaded or self.model is None:
            self.load_model()

        tensor = tensor.to(self.device)
        log_probs = self.model(tensor)
        probs = torch.exp(log_probs).squeeze(0)

        cover_prob = float(probs[0].item())
        stego_prob = float(probs[1].item())

        verdict = "Stego" if stego_prob >= cover_prob else "Cover"
        confidence = max(cover_prob, stego_prob)

        return {
            "verdict": verdict,
            "cover_probability": cover_prob,
            "stego_probability": stego_prob,
            "confidence": confidence,
            "is_trained_weights": self.is_trained_weights,
            "device": str(self.device),
        }


# Global singleton instance for reuse across API requests
engine = SRNetInferenceEngine()

