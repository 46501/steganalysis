"""System health and model readiness check."""

from fastapi import APIRouter
import torch

from app.core.config import settings
from app.ml.inference import engine
from app.schemas.health import HealthStatusResponse, ModelStatus

router = APIRouter()


@router.get("", response_model=HealthStatusResponse)
async def check_health() -> HealthStatusResponse:
    """Returns application status, PyTorch device info, and SRNet state."""
    return HealthStatusResponse(
        status="healthy",
        project_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        model=ModelStatus(
            architecture="SRNet (12-Layer Deep Residual Network)",
            is_loaded=engine.is_loaded,
            is_trained_weights=engine.is_trained_weights,
            weights_path=str(engine.weights_path),
            device=str(engine.device),
            cuda_available=torch.cuda.is_available(),
        ),
    )

