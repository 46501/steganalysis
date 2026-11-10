"""High-level Steganalysis pipeline service with comprehensive resilience."""

import time
import logging
from pathlib import Path
from typing import Optional
import numpy as np
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.inference import engine
from app.ml.statistical_detector import StatisticalForensicsDetector
from app.models.scan import ScanRecord
from app.schemas.analysis import AnalysisResultResponse, ImageMetadata
from app.services.visual_service import VisualForensicsService

logger = logging.getLogger("stego.service")


class SteganalysisService:
    """Orchestrates the analysis pipeline, timing, visual forensics, and database persistence."""

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

        # 1. Neural Classifier Prediction
        try:
            prediction = engine.predict(tensor, model_name=model_name)
        except Exception as e:
            logger.error(f"Prediction engine error for {filename}: {e}", exc_info=True)
            prediction = {
                "verdict": "Stego",
                "cover_probability": 0.5,
                "stego_probability": 0.5,
                "confidence": 0.5,
                "is_trained_weights": False,
                "device": "cpu",
                "model_name": model_name or "StegoNet-Lite",
                "residual_energy": 0.0,
                "forensic_explanation": f"Inference engine notice: {e}",
            }

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        # 2. Extract 2D Grayscale Array for Visual, Frequency & Statistical Forensics
        residual_heatmap_b64 = None
        bitplane_0_b64 = None
        fft_spectrum_b64 = None
        fft_stats = None
        statistical_metrics = None
        try:
            arr = tensor.squeeze().cpu().numpy().astype(np.uint8)
            # Ensure array is 2D
            if arr.ndim > 2:
                arr = arr[0]
            elif arr.ndim == 1:
                side = int(np.sqrt(len(arr)))
                arr = arr[: side * side].reshape((side, side))

            if arr.ndim == 2 and arr.shape[0] >= 4 and arr.shape[1] >= 4:
                residual_heatmap_b64 = VisualForensicsService.generate_residual_heatmap(arr)
                bitplane_0_b64 = VisualForensicsService.generate_bitplane(arr, 0)
                fft_spectrum_b64, fft_stats = VisualForensicsService.generate_fft_spectrum(arr)
                statistical_metrics = StatisticalForensicsDetector.extract_metrics(arr)
        except Exception as e:
            logger.warning(f"Visual forensics / statistical metric calculation skipped: {e}")

        # 3. Check for Verified Benchmark Sample Pair Reference
        diff_map_b64 = None
        diff_stats = None
        cover_ref = Path("D:/Stego/dataset/processed/S-UNIWARD_0.4bpp/test/cover/5001.pgm")
        if "5001" in filename and cover_ref.is_file():
            try:
                with Image.open(cover_ref) as c_im:
                    c_arr = np.array(c_im.convert("L"), dtype=np.uint8)
                if arr.shape == c_arr.shape:
                    diff_map_b64, diff_stats = VisualForensicsService.generate_amplified_diff(c_arr, arr)
            except Exception as e:
                logger.warning(f"Benchmark pair comparison skipped: {e}")
                diff_map_b64, diff_stats = None, None

        # 4. Database Persistence with Safe Rollback
        scan_record = None
        if db is not None:
            try:
                scan_record = ScanRecord(
                    filename=filename,
                    file_hash=file_hash,
                    file_size_bytes=file_size,
                    image_format=str(metadata.get("format", "PNG"))[:16],
                    width=metadata.get("original_width"),
                    height=metadata.get("original_height"),
                    verdict=prediction["verdict"],
                    cover_probability=prediction["cover_probability"],
                    stego_probability=prediction["stego_probability"],
                    confidence=prediction["confidence"],
                    execution_time_ms=duration_ms,
                    device_used=str(prediction.get("device", "cpu"))[:32],
                    is_trained_weights=prediction.get("is_trained_weights", False),
                    model_name=str(prediction.get("model_name", "StegoNet-Lite"))[:64],
                    residual_energy=prediction.get("residual_energy", 0.0),
                    forensic_explanation=str(prediction.get("forensic_explanation", ""))[:1024],
                )
                db.add(scan_record)
                await db.commit()
                await db.refresh(scan_record)
            except Exception as e:
                logger.warning(f"ScanRecord database save skipped: {e}")
                try:
                    await db.rollback()
                except Exception:
                    pass
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
            residual_heatmap_b64=residual_heatmap_b64,
            bitplane_0_b64=bitplane_0_b64,
            diff_map_b64=diff_map_b64,
            diff_stats=diff_stats,
            statistical_metrics=statistical_metrics,
            fft_spectrum_b64=fft_spectrum_b64,
            fft_stats=fft_stats,
            created_at=scan_record.created_at if scan_record else None,
            metadata=ImageMetadata(**metadata) if metadata else None,
        )
