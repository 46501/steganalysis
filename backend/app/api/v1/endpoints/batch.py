"""Batch image steganalysis endpoint."""

import time
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_optional, check_rate_limit
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.analysis import BatchAnalysisResponse
from app.services.image_service import ImageService
from app.services.steganalysis_service import SteganalysisService

router = APIRouter()


@router.post("", response_model=BatchAnalysisResponse)
async def analyze_batch(
    request: Request,
    files: List[UploadFile] = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> BatchAnalysisResponse:
    """Processes multiple images in batch mode."""
    client_id = f"user:{current_user.id}" if current_user else f"ip:{request.client.host if request.client else 'unknown'}"
    check_rate_limit(
        key=client_id,
        category="ml_compute",
        max_requests=settings.RATE_LIMIT_ANALYZE_PER_MINUTE,
        window_seconds=60,
        custom_message="Forensic ML compute rate limit exceeded (60 requests/min). Please slow down.",
    )
    start_time = time.perf_counter()
    results = []
    stego_count = 0
    cover_count = 0
    inconclusive_count = 0

    user_id = current_user.id if current_user else None

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
                user_id=user_id,
            )
            results.append(res)
            if res.verdict in ("Stego", "Stego Indicated"):
                stego_count += 1
            elif res.verdict in ("Cover", "Cover Indicated"):
                cover_count += 1
            else:
                inconclusive_count += 1
        except Exception:
            # Skip corrupted individual files in batch
            continue

    total_time_ms = (time.perf_counter() - start_time) * 1000.0

    return BatchAnalysisResponse(
        total_processed=len(results),
        stego_count=stego_count,
        cover_count=cover_count,
        inconclusive_count=inconclusive_count,
        total_execution_time_ms=round(total_time_ms, 2),
        results=results,
    )


@router.post("/benchmark", response_model=BatchAnalysisResponse)
async def analyze_benchmark_batch(
    count_per_class: int = 5,
    db: AsyncSession = Depends(get_db),
) -> BatchAnalysisResponse:
    """Runs batch triage across validated test split benchmark samples (5001..5005 cover and stego)."""
    from pathlib import Path
    import hashlib
    from PIL import Image
    import numpy as np
    import torch

    start_time = time.perf_counter()
    results = []
    stego_count = 0
    cover_count = 0
    inconclusive_count = 0

    c_dir = Path("D:/Stego/dataset/processed/S-UNIWARD_0.4bpp/test/cover")
    s_dir = Path("D:/Stego/dataset/processed/S-UNIWARD_0.4bpp/test/stego")

    # Interleave cover and stego from IDs 5001 onwards
    eval_targets = []
    for i in range(5001, 5001 + min(max(count_per_class, 1), 25)):
        c_path = c_dir / f"{i}.pgm"
        s_path = s_dir / f"{i}.pgm"
        if c_path.is_file():
            eval_targets.append((f"benchmark_cover_{i}.pgm", c_path, "Cover"))
        if s_path.is_file():
            eval_targets.append((f"benchmark_stego_{i}_0.4bpp.pgm", s_path, "Stego"))

    for filename, path, ground_truth in eval_targets:
        try:
            with open(path, "rb") as f:
                content = f.read()
            file_hash = hashlib.sha256(content).hexdigest()
            with Image.open(path) as img:
                arr = np.array(img.convert("L"), dtype=np.float32)
                metadata = {
                    "format": "PGM",
                    "mode": "L",
                    "original_width": arr.shape[1],
                    "original_height": arr.shape[0],
                    "ground_truth": ground_truth,
                }
            tensor = torch.from_numpy(arr).float().unsqueeze(0).unsqueeze(0)
            res = await SteganalysisService.analyze_tensor(
                filename=filename,
                file_hash=file_hash,
                file_size=len(content),
                tensor=tensor,
                metadata=metadata,
                db=db,
            )
            results.append(res)
            if res.verdict in ("Stego", "Stego Indicated"):
                stego_count += 1
            elif res.verdict in ("Cover", "Cover Indicated"):
                cover_count += 1
            else:
                inconclusive_count += 1
        except Exception:
            continue

    total_time_ms = (time.perf_counter() - start_time) * 1000.0

    return BatchAnalysisResponse(
        total_processed=len(results),
        stego_count=stego_count,
        cover_count=cover_count,
        inconclusive_count=inconclusive_count,
        total_execution_time_ms=round(total_time_ms, 2),
        results=results,
    )

