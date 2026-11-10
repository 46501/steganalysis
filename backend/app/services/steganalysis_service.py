"""High-level Steganalysis pipeline service."""

import time
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.inference import engine
from app.models.scan import ScanRecord
from app.schemas.analysis import AnalysisResultResponse, ImageMetadata


class SteganalysisService:
    """Orchestrates the analysis pipeline, timing, and database persistence."""

    @classmethod
    async def analyze_tensor(
        cls,
        filename: str,
        file_hash: str,
        file_size: int,
        tensor,
        metadata: dict,
        model_name: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> AnalysisResultResponse:
        start_time = time.perf_counter()
        prediction = engine.predict(tensor, model_name=model_name)
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        scan_record = None
        if db is not None:
            scan_record = ScanRecord(
                filename=filename,
                file_hash=file_hash,
                file_size_bytes=file_size,
                image_format=metadata.get("format"),
                width=metadata.get("original_width"),
                height=metadata.get("original_height"),
                verdict=prediction["verdict"],
                cover_probability=prediction["cover_probability"],
                stego_probability=prediction["stego_probability"],
                confidence=prediction["confidence"],
                execution_time_ms=duration_ms,
                device_used=prediction["device"],
                is_trained_weights=prediction["is_trained_weights"],
                model_name=prediction["model_name"],
                residual_energy=prediction["residual_energy"],
                forensic_explanation=prediction["forensic_explanation"],
            )
            try:
                db.add(scan_record)
                await db.commit()
                await db.refresh(scan_record)
            except Exception:
                await db.rollback()
                scan_record = None

        return AnalysisResultResponse(
            id=scan_record.id if scan_record else None,
            filename=filename,
            file_hash=file_hash,
            file_size_bytes=file_size,
            verdict=prediction["verdict"],
            cover_probability=prediction["cover_probability"],
            stego_probability=prediction["stego_probability"],
            confidence=prediction["confidence"],
            execution_time_ms=round(duration_ms, 2),
            device=prediction["device"],
            is_trained_weights=prediction["is_trained_weights"],
            model_name=prediction["model_name"],
            residual_energy=prediction["residual_energy"],
            forensic_explanation=prediction["forensic_explanation"],
            created_at=scan_record.created_at if scan_record else None,
            metadata=ImageMetadata(**metadata) if metadata else None,
        )
