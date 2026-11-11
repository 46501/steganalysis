"""High-level Steganalysis pipeline service with comprehensive resilience."""

import time
import re
import logging
from pathlib import Path
from typing import Optional
import numpy as np
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.inference import engine
from app.ml.statistical_detector import StatisticalForensicsDetector
from app.ml.forensic_analyzer import ForensicAnalyzer
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
                "verdict": "Inconclusive",
                "verdict_category": "INCONCLUSIVE — INFERENCE ERROR",
                "interpretation_label": "INCONCLUSIVE — INFERENCE ERROR",
                "cover_probability": 0.5,
                "stego_probability": 0.5,
                "confidence": 0.0,
                "decision_margin": 0.0,
                "is_conclusive": False,
                "score_type": "Uncalibrated Model Score",
                "is_trained_weights": False,
                "device": "cpu",
                "model_name": model_name or "StegoNet-Lite",
                "model_status": "Experimental Baseline",
                "residual_energy": 0.0,
                "forensic_explanation": (
                    f"Inference execution failure: {e}. Analysis result is inconclusive. "
                    "Additional investigation or paired-reference comparison is required."
                ),
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
        difference_analysis = None
        c_arr = None

        # Dynamically match 4-5 digit ID in filename across BOSSbase benchmark sets
        match = re.search(r"(\d{4,5})", filename)
        if match:
            num = match.group(1)
            candidate_paths = [
                Path(f"D:/Stego/dataset/processed/S-UNIWARD_0.4bpp/test/cover/{num}.pgm"),
                Path(f"D:/Stego/dataset/processed/S-UNIWARD_0.4bpp/train/cover/{num}.pgm"),
                Path(f"D:/Stego/dataset/raw/BOSSbase_1.01/{num}.pgm"),
            ]
            for c_path in candidate_paths:
                if c_path.is_file():
                    try:
                        with Image.open(c_path) as c_im:
                            cand_arr = np.array(c_im.convert("L"), dtype=np.uint8)
                        if arr.shape == cand_arr.shape:
                            c_arr = cand_arr
                            difference_analysis = ForensicAnalyzer.analyze_image_difference(c_arr, arr)
                            diff_map_b64, ternary_counts = ForensicAnalyzer.generate_ternary_diff_map(c_arr, arr)
                            diff_stats = {
                                "total_pixels": difference_analysis["total_pixels"],
                                "modified_pixels": difference_analysis["changed_pixels"],
                                "change_rate_percent": difference_analysis["changed_pixel_percent"],
                                "plus_one_count": difference_analysis["plus_one_changes"],
                                "minus_one_count": difference_analysis["minus_one_changes"],
                                "unmodified_count": difference_analysis["unchanged_pixels"],
                                "net_perturbation_bias": difference_analysis["plus_one_changes"] - difference_analysis["minus_one_changes"],
                            }
                            break
                    except Exception as e:
                        logger.warning(f"Benchmark pair comparison skipped for {c_path}: {e}")

        # 4. Advanced Visual & Statistical Forensic Suite
        spatial_sectors_4x4 = None
        texture_analysis = None
        advanced_statistical_suite = None
        frequency_analysis = None
        payload_analysis = None
        algorithm_attribution = None
        evidence_summary = None

        try:
            spatial_sectors_4x4 = ForensicAnalyzer.analyze_spatial_sectors_4x4(arr, c_arr)
            texture_analysis = ForensicAnalyzer.analyze_texture_vs_smooth_regions(arr, c_arr)
            advanced_statistical_suite = ForensicAnalyzer.compute_advanced_statistical_suite(arr)
            frequency_analysis = ForensicAnalyzer.compute_fft_frequency_analysis(arr, c_arr)
            payload_analysis = ForensicAnalyzer.estimate_payload_rigorous(arr, c_arr, filename)
            algorithm_attribution = ForensicAnalyzer.fingerprint_steganography_algorithm(
                arr,
                diff_analysis=difference_analysis,
                texture_analysis=texture_analysis,
                statistical_suite=advanced_statistical_suite,
            )
            evidence_summary = ForensicAnalyzer.fuse_forensic_evidence_summary(
                model_prediction=prediction,
                statistical_suite=advanced_statistical_suite,
                difference_analysis=difference_analysis,
                texture_analysis=texture_analysis,
                frequency_analysis=frequency_analysis,
                algorithm_attribution=algorithm_attribution,
            )
        except Exception as e:
            logger.warning(f"Advanced forensic suite analysis skipped: {e}")

        # Scientific Explanation Enrichment
        forensic_explanation = prediction.get("forensic_explanation", "")
        if c_arr is not None and difference_analysis and difference_analysis["changed_pixels"] > 0:
            if "Paired Reference Comparison" not in forensic_explanation:
                forensic_explanation += (
                    f" Paired Reference Comparison: Verified {difference_analysis['changed_pixels']:,} pixel alterations "
                    f"({difference_analysis['changed_pixel_percent']}%, {difference_analysis['total_modified_bits']:,} bits changed). "
                    f"Ternary ±1 ratio: {difference_analysis['ternary_balance_ratio']:.2f}. "
                    f"Candidate: {algorithm_attribution['candidate_technique']}."
                )
        elif c_arr is not None and difference_analysis and difference_analysis["changed_pixels"] == 0:
            if "Paired Reference Comparison" not in forensic_explanation:
                forensic_explanation += (
                    " Paired Reference Comparison: Verified pristine cover carrier (0 pixels altered, Hamming distance = 0)."
                )
        else:
            if "Single image analysis: No reference cover image supplied" not in forensic_explanation and "cannot reliably distinguish" not in forensic_explanation:
                forensic_explanation += (
                    " Single image analysis: No reference cover image supplied. Exact pixel modifications cannot be verified without a matched reference."
                )

        # 5. Database Persistence with Safe Rollback
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
                    forensic_explanation=str(forensic_explanation)[:1024],
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
            verdict_category=prediction.get("verdict_category", "INCONCLUSIVE — LOW CONFIDENCE"),
            interpretation_label=prediction.get("interpretation_label", prediction.get("verdict_category")),
            cover_probability=prediction["cover_probability"],
            stego_probability=prediction["stego_probability"],
            confidence=prediction["confidence"],
            decision_margin=prediction.get("decision_margin"),
            is_conclusive=prediction.get("is_conclusive", False),
            score_type=prediction.get("score_type", "Uncalibrated Model Score"),
            execution_time_ms=round(duration_ms, 2),
            device=prediction["device"],
            is_trained_weights=prediction["is_trained_weights"],
            model_name=prediction["model_name"],
            model_status=prediction.get("model_status", "Experimental Baseline"),
            residual_energy=prediction["residual_energy"],
            forensic_explanation=forensic_explanation,
            residual_heatmap_b64=residual_heatmap_b64,
            bitplane_0_b64=bitplane_0_b64,
            diff_map_b64=diff_map_b64,
            diff_stats=diff_stats,
            statistical_metrics=statistical_metrics,
            fft_spectrum_b64=fft_spectrum_b64,
            fft_stats=fft_stats,
            difference_analysis=difference_analysis,
            spatial_sectors_4x4=spatial_sectors_4x4,
            texture_analysis=texture_analysis,
            advanced_statistical_suite=advanced_statistical_suite,
            frequency_analysis=frequency_analysis,
            payload_analysis=payload_analysis,
            algorithm_attribution=algorithm_attribution,
            evidence_summary=evidence_summary,
            created_at=scan_record.created_at if scan_record else None,
            metadata=ImageMetadata(**metadata) if metadata else None,
        )
