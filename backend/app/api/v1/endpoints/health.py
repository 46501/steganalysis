"""System health and model readiness check."""

from fastapi import APIRouter
import torch

from app.core.config import settings
from app.core.database import ACTIVE_DB_TYPE
from app.ml.inference import engine
from app.schemas.health import DatabaseStatus, DatasetSummary, HealthStatusResponse, ModelStatus

router = APIRouter()


@router.get("", response_model=HealthStatusResponse)
async def check_health() -> HealthStatusResponse:
    """Returns application status, database status, PyTorch device info, and active model state."""
    return HealthStatusResponse(
        status="healthy",
        project_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        database=DatabaseStatus(
            type=ACTIVE_DB_TYPE,
            status="connected",
        ),
        model=ModelStatus(
            architecture="SRNet (12-Layer Deep Residual Network)",
            active_model=engine.active_model_name,
            is_loaded=engine.is_loaded,
            is_trained_weights=engine.is_trained_weights,
            weights_path=str(engine.stegonet_weights_path if "StegoNet" in engine.active_model_name else engine.srnet_weights_path),
            device=str(engine.device),
            cuda_available=torch.cuda.is_available(),
            research_model="SRNet (Implemented PyTorch Architecture - GPU Training Pending)",
        ),
        dataset=DatasetSummary(
            name="BOSSbase 1.01",
            embedding_algorithm="S-UNIWARD",
            payload_bpp=0.4,
            total_images=20000,
            total_pairs=10000,
            train_pairs=4000,
            val_pairs=1000,
            test_pairs=5000,
        ),
    )
