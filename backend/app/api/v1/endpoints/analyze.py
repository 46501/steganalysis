"""Single and paired image steganalysis endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.ml.stegonet_lite import compute_spatial_residual_energy
from app.schemas.analysis import AnalysisResultResponse, PairComparisonResponse
from app.services.image_service import ImageService
from app.services.steganalysis_service import SteganalysisService
from app.services.visual_service import VisualForensicsService

logger = logging.getLogger("stego.analyze_endpoint")
router = APIRouter()


@router.post("", response_model=AnalysisResultResponse)
async def analyze_image(
    file: UploadFile = File(...),
    model_name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResultResponse:
    """
    Analyzes an uploaded digital image for hidden steganographic payloads.
    Returns class prediction ('Cover' vs 'Stego'), confidence scores,
    and high-pass spatial residual forensic explanation with visual artifacts.
    """
    try:
        filename, file_hash, content, tensor, metadata = await ImageService.process_upload(file)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload validation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded image is corrupt or unreadable: {str(e)}",
        )

    try:
        result = await SteganalysisService.analyze_tensor(
            filename=filename,
            file_hash=file_hash,
            file_size=len(content),
            tensor=tensor,
            metadata=metadata,
            model_name=model_name,
            db=db,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Steganalysis execution failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forensic engine analysis failed: {str(e)}",
        )


@router.post("/compare", response_model=PairComparisonResponse)
async def compare_pair(
    cover_file: UploadFile = File(...),
    stego_file: UploadFile = File(...),
) -> PairComparisonResponse:
    """
    Compares a matched cover-stego image pair, calculating exact pixel alterations,
    change rate, spatial residual energy delta, and amplified ternary difference maps.
    """
    c_name, c_hash, _, c_tensor, _ = await ImageService.process_upload(cover_file)
    s_name, s_hash, _, s_tensor, _ = await ImageService.process_upload(stego_file)

    c_arr = c_tensor.squeeze().cpu().numpy().astype(np.uint8)
    s_arr = s_tensor.squeeze().cpu().numpy().astype(np.uint8)

    diff_b64, stats = VisualForensicsService.generate_amplified_diff(c_arr, s_arr)
    c_heat = VisualForensicsService.generate_residual_heatmap(c_arr)
    s_heat = VisualForensicsService.generate_residual_heatmap(s_arr)
    c_lsb = VisualForensicsService.generate_bitplane(c_arr, 0)
    s_lsb = VisualForensicsService.generate_bitplane(s_arr, 0)

    e_cover = compute_spatial_residual_energy(c_tensor)
    e_stego = compute_spatial_residual_energy(s_tensor)

    return PairComparisonResponse(
        cover_filename=c_name,
        stego_filename=s_name,
        cover_hash=c_hash,
        stego_hash=s_hash,
        cover_residual_energy=e_cover,
        stego_residual_energy=e_stego,
        residual_energy_delta=round(e_stego - e_cover, 4),
        diff_stats=stats,
        diff_map_b64=diff_b64,
        cover_heatmap_b64=c_heat,
        stego_heatmap_b64=s_heat,
        cover_bitplane_0_b64=c_lsb,
        stego_bitplane_0_b64=s_lsb,
    )


@router.post("/bitplane")
async def extract_bitplane(
    file: UploadFile = File(...),
    plane: int = Query(0, ge=0, le=7),
):
    """Extracts a specific bit plane (0=LSB to 7=MSB) from an uploaded image."""
    _, _, _, tensor, _ = await ImageService.process_upload(file)
    arr = tensor.squeeze().cpu().numpy().astype(np.uint8)
    b64_png = VisualForensicsService.generate_bitplane(arr, plane=plane)
    return {"bitplane": plane, "image_b64": b64_png}
