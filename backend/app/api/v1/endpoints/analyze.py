"""Single and paired image steganalysis endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_optional, check_rate_limit
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.ml.stegonet_lite import compute_spatial_residual_energy
from app.ml.forensic_analyzer import ForensicAnalyzer
from app.schemas.analysis import AnalysisResultResponse, PairComparisonResponse
from app.services.image_service import ImageService
from app.services.steganalysis_service import SteganalysisService
from app.services.visual_service import VisualForensicsService

logger = logging.getLogger("stego.analyze_endpoint")
router = APIRouter()


@router.post("", response_model=AnalysisResultResponse)
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    model_name: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResultResponse:
    """
    Analyzes an uploaded digital image for hidden steganographic payloads.
    Returns class prediction ('Cover' vs 'Stego'), confidence scores,
    and high-pass spatial residual forensic explanation with visual artifacts.
    """
    client_id = f"user:{current_user.id}" if current_user else f"ip:{request.client.host if request.client else 'unknown'}"
    check_rate_limit(
        key=client_id,
        category="ml_compute",
        max_requests=settings.RATE_LIMIT_ANALYZE_PER_MINUTE,
        window_seconds=60,
        custom_message="Forensic ML compute rate limit exceeded (60 requests/min). Please slow down.",
    )
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
            user_id=current_user.id if current_user else None,
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
    request: Request,
    cover_file: UploadFile = File(...),
    stego_file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> PairComparisonResponse:
    """
    Compares a matched cover-stego image pair, calculating exact pixel alterations,
    change rate, spatial residual energy delta, Hamming bit distance, and amplified ternary difference maps.
    Only declares alterations verified when directly measured across identical-dimension paired inputs.
    """
    client_id = f"user:{current_user.id}" if current_user else f"ip:{request.client.host if request.client else 'unknown'}"
    check_rate_limit(
        key=client_id,
        category="ml_compute",
        max_requests=settings.RATE_LIMIT_ANALYZE_PER_MINUTE,
        window_seconds=60,
        custom_message="Forensic ML compute rate limit exceeded (60 requests/min). Please slow down.",
    )
    c_name, c_hash, _, c_tensor, _ = await ImageService.process_upload(cover_file)
    s_name, s_hash, _, s_tensor, _ = await ImageService.process_upload(stego_file)

    c_arr = c_tensor.squeeze().cpu().numpy().astype(np.uint8)
    s_arr = s_tensor.squeeze().cpu().numpy().astype(np.uint8)

    # 1. Verify image dimensions and spatial alignment
    if c_arr.shape != s_arr.shape:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Dimension and alignment mismatch: Cover image is {c_arr.shape[1]}x{c_arr.shape[0]} "
                f"while Suspected Stego is {s_arr.shape[1]}x{s_arr.shape[0]}. "
                "Paired reference comparison requires identical dimensions and spatial alignment."
            ),
        )

    # 2. Calculate exact bitwise Hamming distance
    diff_xor = np.bitwise_xor(c_arr, s_arr)
    hamming_bits = int(np.unpackbits(diff_xor).sum())

    # 3. Shannon Entropy comparison
    def _calc_entropy(arr: np.ndarray) -> float:
        counts = np.bincount(arr.flatten(), minlength=256)
        p = counts[counts > 0] / counts.sum()
        return float(-np.sum(p * np.log2(p)))

    h_cover = _calc_entropy(c_arr)
    h_stego = _calc_entropy(s_arr)
    entropy_delta = round(h_stego - h_cover, 5)

    diff_b64, stats = VisualForensicsService.generate_amplified_diff(c_arr, s_arr)
    stats["changed_bits_hamming"] = hamming_bits
    stats["entropy_delta"] = entropy_delta
    stats["cover_entropy"] = round(h_cover, 4)
    stats["stego_entropy"] = round(h_stego, 4)

    c_heat = VisualForensicsService.generate_residual_heatmap(c_arr)
    s_heat = VisualForensicsService.generate_residual_heatmap(s_arr)
    c_lsb = VisualForensicsService.generate_bitplane(c_arr, 0)
    s_lsb = VisualForensicsService.generate_bitplane(s_arr, 0)

    e_cover = compute_spatial_residual_energy(c_tensor)
    e_stego = compute_spatial_residual_energy(s_tensor)

    # Advanced Forensic Suite for Paired Inputs
    difference_analysis = ForensicAnalyzer.analyze_image_difference(c_arr, s_arr)
    spatial_sectors = ForensicAnalyzer.analyze_spatial_sectors_4x4(s_arr, c_arr)
    texture_analysis = ForensicAnalyzer.analyze_texture_vs_smooth_regions(s_arr, c_arr)
    advanced_stats = ForensicAnalyzer.compute_advanced_statistical_suite(s_arr)
    frequency_analysis = ForensicAnalyzer.compute_fft_frequency_analysis(s_arr, c_arr)
    payload_analysis = ForensicAnalyzer.estimate_payload_rigorous(s_arr, c_arr, s_name)
    algorithm_attribution = ForensicAnalyzer.fingerprint_steganography_algorithm(
        s_arr,
        diff_analysis=difference_analysis,
        texture_analysis=texture_analysis,
        statistical_suite=advanced_stats,
    )
    mock_prediction = {
        "verdict": "Stego Indicated" if difference_analysis["changed_pixels"] > 0 else "Cover Indicated",
        "stego_probability": 0.5,
        "cover_probability": 0.5,
        "is_conclusive": True,
        "model_name": "Paired Differential Reference",
        "model_status": "Ground Truth Comparison",
    }
    evidence_summary = ForensicAnalyzer.fuse_forensic_evidence_summary(
        model_prediction=mock_prediction,
        statistical_suite=advanced_stats,
        difference_analysis=difference_analysis,
        texture_analysis=texture_analysis,
        frequency_analysis=frequency_analysis,
        algorithm_attribution=algorithm_attribution,
    )

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
        changed_bits_hamming=hamming_bits,
        entropy_delta=entropy_delta,
        evidence_status="VERIFIED FORENSIC EVIDENCE (Direct Paired Comparison)",
        difference_analysis=difference_analysis,
        spatial_sectors_4x4=spatial_sectors,
        texture_analysis=texture_analysis,
        advanced_statistical_suite=advanced_stats,
        frequency_analysis=frequency_analysis,
        payload_analysis=payload_analysis,
        algorithm_attribution=algorithm_attribution,
        evidence_summary=evidence_summary,
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
