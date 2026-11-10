"""Single image steganalysis endpoint."""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analysis import AnalysisResultResponse
from app.services.image_service import ImageService
from app.services.steganalysis_service import SteganalysisService

router = APIRouter()


@router.post("", response_model=AnalysisResultResponse)
async def analyze_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResultResponse:
    """
    Analyzes an uploaded digital image for hidden steganographic payloads.
    Returns class prediction ('Cover' vs 'Stego') and confidence scores.
    """
    filename, file_hash, content, tensor, metadata = await ImageService.process_upload(file)
    result = await SteganalysisService.analyze_tensor(
        filename=filename,
        file_hash=file_hash,
        file_size=len(content),
        tensor=tensor,
        metadata=metadata,
        db=db,
    )
    return result

