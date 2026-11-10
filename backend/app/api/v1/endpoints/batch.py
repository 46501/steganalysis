"""Batch image steganalysis endpoint."""

import time
from typing import List
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.analysis import BatchAnalysisResponse
from app.services.image_service import ImageService
from app.services.steganalysis_service import SteganalysisService

router = APIRouter()


@router.post("", response_model=BatchAnalysisResponse)
async def analyze_batch(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
) -> BatchAnalysisResponse:
    """Processes multiple images in batch mode."""
    start_time = time.perf_counter()
    results = []
    stego_count = 0
    cover_count = 0

    for file in files:
        try:
            filename, file_hash, content, tensor, metadata = await ImageService.process_upload(file)
            res = await SteganalysisService.analyze_tensor(
                filename=filename,
                file_hash=file_hash,
                file_size=len(content),
                tensor=tensor,
                metadata=metadata,
                db=db,
            )
            results.append(res)
            if res.verdict == "Stego":
                stego_count += 1
            else:
                cover_count += 1
        except Exception:
            # Skip corrupted individual files in batch
            continue

    total_time_ms = (time.perf_counter() - start_time) * 1000.0

    return BatchAnalysisResponse(
        total_processed=len(results),
        stego_count=stego_count,
        cover_count=cover_count,
        total_execution_time_ms=round(total_time_ms, 2),
        results=results,
    )

