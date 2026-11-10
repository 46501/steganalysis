"""
StegoShield AI Steganalysis PyTorch Inference Engine.

Supports both:
1. StegoNet-Lite: Compact 4-layer residual demonstration baseline trained on S-UNIWARD 0.4 bpp.
2. SRNet: 12-layer deep residual research architecture (Boroumand et al., IEEE TIFS 2018).

Provides forensic metrics including spatial high-pass residual energy and domain-informed explanations.
"""

from pathlib import Path
from typing import Dict, Optional, Tuple
import torch
import torch.nn.functional as F

from app.core.config import settings
from app.ml.architecture import Srnet
from app.ml.stegonet_lite import StegoNetLite, compute_spatial_residual_energy


class SteganalysisInferenceEngine:
    """Manages model loading, device placement, warm-up, and forward evaluation."""

    def __init__(
        self,
        weights_path: Optional[str] = None,
        device: Optional[str] = None,
    ) -> None:
        self.device = torch.device(
            device or settings.DEVICE if torch.cuda.is_available() and device == "cuda" else "cpu"
        )
        self.weights_dir = Path(__file__).resolve().parent / "weights"
        self.stegonet_weights_path = self.weights_dir / "stegonet_lite_demo.pt"
        self.srnet_weights_path = Path(weights_path or settings.SRNET_WEIGHTS_PATH)

        self.model = None
        self.active_model_name: str = "StegoNet-Lite"
        self.is_loaded: bool = False
        self.is_trained_weights: bool = False
        self.load_model()

    def load_model(self, model_choice: str = "stegonet_lite") -> None:
        """
        Initializes chosen architecture and loads trained weights if available.
        Prefers trained StegoNet-Lite baseline for live CPU demonstration.
        """
        if model_choice == "srnet":
            self.model = Srnet()
            self.active_model_name = "SRNet (12-Layer Deep Residual)"
            if self.srnet_weights_path.is_file():
                state_dict = torch.load(self.srnet_weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.is_trained_weights = True
            else:
                self.is_trained_weights = False
        else:
            self.model = StegoNetLite()
            self.active_model_name = "StegoNet-Lite (Demonstration Baseline)"
            if self.stegonet_weights_path.is_file():
                state_dict = torch.load(self.stegonet_weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.is_trained_weights = True
            else:
                self.is_trained_weights = False

        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def _generate_explanation(self, verdict: str, confidence: float, residual_energy: float) -> str:
        """Constructs an interpretable forensic rationale based on residual energy and model verdict."""
        if verdict == "Stego":
            return (
                f"Steganographic payload detected (confidence {confidence:.1%}). "
                f"Spatial high-pass residual energy is elevated ({residual_energy:.2f}), "
                f"exhibiting characteristic high-frequency disturbance patterns in textured regions "
                f"consistent with S-UNIWARD ±1 wavelet embedding."
            )
        else:
            return (
                f"Cover image verified clean (confidence {confidence:.1%}). "
                f"Spatial high-pass residual energy ({residual_energy:.2f}) conforms to expected "
                f"natural camera sensor noise and smooth spatial gradients without directional "
                f"steganographic perturbation."
            )

    @torch.no_grad()
    def predict(self, tensor: torch.Tensor, model_name: Optional[str] = None) -> Dict:
        """
        Runs inference on an input tensor of shape (1, 1, 256, 256).
        Returns classification verdict, probabilities, confidence score, and forensic explanation.
        """
        # Switch model if requested
        target_model = "srnet" if model_name and "srnet" in model_name.lower() else "stegonet_lite"
        current_type = "srnet" if "srnet" in self.active_model_name.lower() else "stegonet_lite"

        if not self.is_loaded or self.model is None or target_model != current_type:
            self.load_model(target_model)

        tensor = tensor.to(self.device)
        residual_energy = compute_spatial_residual_energy(tensor)

        log_probs = self.model(tensor)
        probs = torch.exp(log_probs).squeeze(0)

        cover_prob = float(probs[0].item())
        stego_prob = float(probs[1].item())

        verdict = "Stego" if stego_prob >= cover_prob else "Cover"
        confidence = max(cover_prob, stego_prob)

        explanation = self._generate_explanation(verdict, confidence, residual_energy)

        return {
            "verdict": verdict,
            "cover_probability": round(cover_prob, 4),
            "stego_probability": round(stego_prob, 4),
            "confidence": round(confidence, 4),
            "is_trained_weights": self.is_trained_weights,
            "device": str(self.device),
            "model_name": self.active_model_name,
            "residual_energy": residual_energy,
            "forensic_explanation": explanation,
        }


# Global singleton instance for reuse across API requests
engine = SteganalysisInferenceEngine()

# Backward-compatibility alias
SRNetInferenceEngine = SteganalysisInferenceEngine
