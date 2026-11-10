"""Single image steganalysis endpoint."""

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analysis import AnalysisResultResponse
from app.services.image_service import ImageService
from app.services.steganalysis_service import SteganalysisService

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
    and high-pass spatial residual forensic explanation.
    """
    filename, file_hash, content, tensor, metadata = await ImageService.process_upload(file)
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
