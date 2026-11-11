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
            self.active_model_name = "SRNet (Research Architecture - Training Pending)"
            if self.srnet_weights_path.is_file():
                state_dict = torch.load(self.srnet_weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.is_trained_weights = True
            else:
                self.is_trained_weights = False
        else:
            self.model = StegoNetLite()
            self.active_model_name = "StegoNet-Lite (Experimental Baseline)"
            if self.stegonet_weights_path.is_file():
                state_dict = torch.load(self.stegonet_weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.is_trained_weights = True
            else:
                self.is_trained_weights = False

        self.model.to(self.device)
        self.model.eval()
        self.is_loaded = True

    def _get_model_status(self) -> str:
        """Returns standard scientific status label for active architecture."""
        if "stegonet" in self.active_model_name.lower():
            return "Experimental Baseline"
        return "Research Architecture — Full GPU Training Pending"

    def _generate_scientific_explanation(
        self,
        verdict: str,
        cover_prob: float,
        stego_prob: float,
        confidence: float,
        residual_energy: float,
        model_name: str,
        reason: Optional[str] = None,
    ) -> str:
        """Constructs a scientifically honest, non-misleading forensic rationale."""
        if verdict == "Inconclusive":
            base = (
                f"The experimental model assigns similar probabilities to both classes "
                f"(Stego: {stego_prob:.1%}, Cover: {cover_prob:.1%}). "
                "This result does not provide sufficient evidence to determine whether the image contains hidden information. "
                "The current experimental baseline cannot reliably distinguish this image from a normal cover image. "
                "Additional investigation, paired-reference comparison, or a validated steganalysis model is required."
            )
            if reason:
                base += f" ({reason})"
            return base
        elif verdict == "Stego Indicated":
            return (
                f"The experimental model indicates possible steganographic content (Stego: {stego_prob:.1%}, Cover: {cover_prob:.1%}). "
                "This is a model prediction, not conclusive forensic proof. "
                f"Auxiliary spatial high-pass residual energy is measured at {residual_energy:.2f}. "
                "Note: Residual energy reflects local texture gradients; across arbitrary single images, "
                "natural scene variance dominates stego perturbations (requiring paired reference comparison for attribution)."
            )
        elif verdict == "Cover Indicated":
            return (
                f"The experimental model indicates a possible cover image (Cover: {cover_prob:.1%}, Stego: {stego_prob:.1%}). "
                "This does not guarantee the absence of hidden information. "
                f"Auxiliary spatial high-pass residual energy is measured at {residual_energy:.2f}. "
                "Note: Residual energy reflects local texture gradients; across arbitrary single images, "
                "natural scene variance dominates stego perturbations (requiring paired reference comparison for attribution)."
            )
        else:
            return (
                f"Model evaluation: {verdict}. Confidence: {confidence:.1%}. "
                f"Auxiliary residual energy: {residual_energy:.2f}."
            )

    @classmethod
    def evaluate_decision_criterion(
        cls,
        cover_prob: float,
        stego_prob: float,
        margin_threshold: float = 0.15,
    ) -> Tuple[str, str, bool]:
        """
        Applies validated decision criteria to determine scientific verdict.
        
        Returns:
            (verdict, verdict_category, is_conclusive)
            
        On the BOSSbase evaluation benchmark, StegoNet-Lite produces uncalibrated outputs
        clustered in the uninformative narrow band ~48% Cover / ~52% Stego with ROC-AUC ~0.50.
        Any output where margin = |stego_prob - cover_prob| < margin_threshold is strictly Inconclusive.
        """
        margin = abs(stego_prob - cover_prob)
        if margin < margin_threshold:
            return ("Inconclusive", "INCONCLUSIVE — LOW CONFIDENCE", False)
        elif stego_prob > cover_prob:
            return ("Stego Indicated", "STEGO INDICATED", True)
        else:
            return ("Cover Indicated", "COVER INDICATED", True)

    @torch.no_grad()
    def predict(self, tensor: torch.Tensor, model_name: Optional[str] = None) -> Dict:
        """
        Runs inference on an input tensor of shape (1, 1, H, W).
        Returns classification interpretation, uncalibrated model scores,
        decision margin, and scientific explanation.
        """
        # Switch model if requested
        target_model = "srnet" if model_name and "srnet" in model_name.lower() else "stegonet_lite"
        current_type = "srnet" if "srnet" in self.active_model_name.lower() else "stegonet_lite"

        if not self.is_loaded or self.model is None or target_model != current_type:
            self.load_model(target_model)

        tensor = tensor.to(self.device)
        # Compute residual energy on full uncropped resolution
        residual_energy = compute_spatial_residual_energy(tensor)

        # Prepare normalized input tensor for neural network
        model_input = tensor.clone()
        if model_input.max() > 1.0:
            model_input = model_input / 255.0

        # Center-crop to 256x256 if larger, matching training geometry
        _, _, h, w = model_input.shape
        if h > 256 or w > 256:
            left = (w - 256) // 2
            top = (h - 256) // 2
            model_input = model_input[:, :, top : top + 256, left : left + 256]

        try:
            log_probs = self.model(model_input)
            probs = torch.exp(log_probs).squeeze(0)
        except Exception as e:
            return {
                "verdict": "Inconclusive",
                "verdict_category": "INCONCLUSIVE — INFERENCE ERROR",
                "interpretation_label": "INCONCLUSIVE — INFERENCE ERROR",
                "cover_probability": 0.5,
                "stego_probability": 0.5,
                "confidence": 0.0,
                "decision_margin": 0.0,
                "is_conclusive": False,
                "score_type": "Uncalibrated Model Score",
                "is_trained_weights": self.is_trained_weights,
                "device": str(self.device),
                "model_name": self.active_model_name,
                "model_status": self._get_model_status(),
                "residual_energy": residual_energy,
                "forensic_explanation": f"Inference execution failure: {e}. Result is inconclusive.",
            }

        # Check for non-finite outputs
        if torch.isnan(probs).any() or torch.isinf(probs).any():
            return {
                "verdict": "Inconclusive",
                "verdict_category": "INCONCLUSIVE — MODEL ERROR",
                "interpretation_label": "INCONCLUSIVE — MODEL ERROR",
                "cover_probability": 0.0,
                "stego_probability": 0.0,
                "confidence": 0.0,
                "decision_margin": 0.0,
                "is_conclusive": False,
                "score_type": "Uncalibrated Model Score",
                "is_trained_weights": self.is_trained_weights,
                "device": str(self.device),
                "model_name": self.active_model_name,
                "model_status": self._get_model_status(),
                "residual_energy": residual_energy,
                "forensic_explanation": "Model output contains invalid non-finite numbers (NaN/Inf). Result is inconclusive.",
            }

        cover_prob = float(probs[0].item())
        stego_prob = float(probs[1].item())
        confidence = max(cover_prob, stego_prob)
        decision_margin = round(abs(stego_prob - cover_prob), 4)

        verdict, verdict_category, is_conclusive = self.evaluate_decision_criterion(
            cover_prob=cover_prob,
            stego_prob=stego_prob,
            margin_threshold=0.15,
        )

        model_status = self._get_model_status()
        explanation = self._generate_scientific_explanation(
            verdict=verdict,
            cover_prob=cover_prob,
            stego_prob=stego_prob,
            confidence=confidence,
            residual_energy=residual_energy,
            model_name=self.active_model_name,
        )

        return {
            "verdict": verdict,
            "verdict_category": verdict_category,
            "interpretation_label": verdict_category,
            "cover_probability": round(cover_prob, 4),
            "stego_probability": round(stego_prob, 4),
            "confidence": round(confidence, 4),
            "decision_margin": decision_margin,
            "is_conclusive": is_conclusive,
            "score_type": "Uncalibrated Model Score",
            "is_trained_weights": self.is_trained_weights,
            "device": str(self.device),
            "model_name": self.active_model_name,
            "model_status": model_status,
            "residual_energy": residual_energy,
            "forensic_explanation": explanation,
        }


# Global singleton instance for reuse across API requests
engine = SteganalysisInferenceEngine()

# Backward-compatibility alias
SRNetInferenceEngine = SteganalysisInferenceEngine
