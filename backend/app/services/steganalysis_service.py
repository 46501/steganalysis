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
from app.ml.statistical_steganalysis import StatisticalSteganalysis
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
        reference_tensor: Optional[torch.Tensor] = None,
        reference_filename: Optional[str] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[int] = None,
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
        statistical_tests = None
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
                statistical_tests = StatisticalSteganalysis.run_all_tests(arr)
        except Exception as e:
            logger.warning(f"Visual forensics / statistical metric calculation skipped: {e}")

        # 3. Authentic User-Provided Paired Reference Verification (Phase 4)
        # Note: Never retrieve a cover using filename heuristics alone. Only verify when user provides authentic original.
        diff_map_b64 = None
        diff_stats = None
        difference_analysis = None
        c_arr = None

        if reference_tensor is not None:
            try:
                raw_ref = reference_tensor.squeeze().cpu().numpy().astype(np.uint8)
                if raw_ref.ndim > 2:
                    raw_ref = raw_ref[0]
                elif raw_ref.ndim == 1:
                    side = int(np.sqrt(len(raw_ref)))
                    raw_ref = raw_ref[: side * side].reshape((side, side))

                if raw_ref.shape != arr.shape:
                    logger.warning(
                        f"Reference cover dimensions {raw_ref.shape[::-1]} do not match target image {arr.shape[::-1]}. "
                        "Paired reference comparison skipped due to spatial dimension mismatch."
                    )
                else:
                    c_arr = raw_ref
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
                        "max_abs_diff": difference_analysis.get("max_abs_diff", 0),
                        "psnr": difference_analysis.get("psnr", None),
                        "psnr_label": difference_analysis.get("psnr_label", "N/A"),
                        "reference_filename": reference_filename or "Authentic Cover Reference",
                        "has_paired_reference": True,
                    }
            except Exception as e:
                logger.warning(f"Paired reference differential analysis failed: {e}")

        # 4. Advanced Visual & Statistical Forensic Suite (Phase 3)
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

        # 5. Scientific Verdict & Evidence Synthesis (Phases 3, 4, 5)
        # Rule: Do not invent fake neural probabilities from arbitrary statistics.
        # Rule: Report uncertainty honestly when single-image evidence is insufficient.
        # Rule: Use calibrated certainty only when authentic paired reference proves ground truth.

        final_verdict = prediction.get("verdict", "Inconclusive")
        final_verdict_category = prediction.get("verdict_category", "INCONCLUSIVE — LOW CONFIDENCE")
        final_interpretation_label = prediction.get("interpretation_label", final_verdict_category)
        final_is_conclusive = prediction.get("is_conclusive", False)
        final_confidence = prediction.get("confidence", 0.5)
        final_cover_prob = prediction.get("cover_probability", 0.5)
        final_stego_prob = prediction.get("stego_probability", 0.5)
        final_score_type = prediction.get("score_type", "Uncalibrated Model Score")
        forensic_explanation = prediction.get("forensic_explanation", "")

        if c_arr is not None and difference_analysis:
            changed_px = difference_analysis.get("changed_pixels", 0)
            max_diff = difference_analysis.get("max_abs_diff", 0)
            psnr_str = difference_analysis.get("psnr_label", "N/A")
            pattern_cls = difference_analysis.get("pattern_classification", "macro_alteration_or_recompression")
            sym_ratio = difference_analysis.get("symmetry_ratio", 1.0)

            if pattern_cls == "identical_carrier" or changed_px == 0:
                # Reference proved bit-for-bit identical
                final_verdict = "Cover Indicated"
                final_verdict_category = "IDENTICAL TO REFERENCE (ZERO MODIFICATIONS DETECTED)"
                final_interpretation_label = "IDENTICAL TO REFERENCE (ZERO MODIFICATIONS DETECTED)"
                final_is_conclusive = True
                final_confidence = 1.0
                final_cover_prob = 1.0
                final_stego_prob = 0.0
                final_score_type = "Lossless Paired Differential Evidence"
                forensic_explanation = (
                    f"Authentic Paired Reference Comparison ({reference_filename or 'Cover Reference'}): "
                    "Target carrier is bit-for-bit identical to reference baseline (0 altered pixels, "
                    "Hamming distance = 0, PSNR = ∞). Empirical proof of zero differential modification."
                )
            elif pattern_cls == "global_directional_shift":
                # Unidirectional modification (e.g. brightness shift) inconsistent with steganography
                final_verdict = "Modification Detected (Non-Stego Edit)"
                final_verdict_category = "DIFFERENTIAL EVIDENCE — GLOBAL LUMINANCE SHIFT (INCONSISTENT WITH STEGANOGRAPHY)"
                final_interpretation_label = "GLOBAL LUMINANCE SHIFT (NON-STEGO EDIT)"
                final_is_conclusive = True
                final_confidence = 0.95
                final_cover_prob = 0.90
                final_stego_prob = 0.10
                final_score_type = "Empirical Differential Modification Evidence"
                forensic_explanation = (
                    f"Authentic Paired Reference Comparison ({reference_filename or 'Cover Reference'}): "
                    f"Detected {changed_px:,} altered pixels ({difference_analysis['changed_pixel_percent']}%), "
                    f"but modifications are strictly unidirectional ({difference_analysis.get('plus_one_changes', 0):,} +1 "
                    f"vs {difference_analysis.get('minus_one_changes', 0):,} -1, symmetry ratio {sym_ratio:.2f}). "
                    "This demonstrates a global brightness, exposure, or contrast edit. It is empirically inconsistent with "
                    "balanced steganographic embedding."
                )
            elif pattern_cls == "ternary_steganography_profile":
                # Symmetric ternary +/-1 steganographic embedding pattern directly measured
                final_verdict = "Modification Detected"
                final_verdict_category = "DIFFERENTIAL EVIDENCE — TERNARY PERTURBATIONS DETECTED (CONSISTENT WITH STEGANOGRAPHY)"
                final_interpretation_label = "TERNARY PERTURBATIONS DETECTED (CONSISTENT WITH STEGANOGRAPHY)"
                final_is_conclusive = True
                final_confidence = 0.95
                final_cover_prob = 0.05
                final_stego_prob = 0.95
                final_score_type = "Empirical Differential Modification Evidence"
                forensic_explanation = (
                    f"Authentic Paired Reference Comparison ({reference_filename or 'Cover Reference'}): "
                    f"Directly measured {changed_px:,} altered pixels ({difference_analysis['changed_pixel_percent']}%, "
                    f"{difference_analysis['total_modified_bits']:,} bits altered, PSNR = {psnr_str}). "
                    f"Perturbations are strictly ternary ±1 with symmetric balance ratio {sym_ratio:.2f}. "
                    f"This perturbation profile is consistent with spatial ternary steganography (e.g. S-UNIWARD). "
                    f"Attributed candidate: {algorithm_attribution.get('candidate_technique', 'Spatial Steganography (S-UNIWARD)')}."
                )
            else:
                # Large alterations indicate non-stego modification (editing, recompression, or wrong reference)
                final_verdict = "Inconclusive / Alteration Detected"
                final_verdict_category = "DIFFERENTIAL EVIDENCE — MACRO ALTERATIONS / RECOMPRESSION / MISMATCH"
                final_interpretation_label = "MACRO ALTERATIONS / RECOMPRESSION"
                final_is_conclusive = False
                final_confidence = 0.50
                final_cover_prob = 0.50
                final_stego_prob = 0.50
                final_score_type = "Empirical Differential Modification Evidence"
                forensic_explanation = (
                    f"Authentic Paired Reference Comparison ({reference_filename or 'Reference'}): "
                    f"Detected {changed_px:,} altered pixels, but maximum intensity difference is {max_diff} (> 1). "
                    "Large differences indicate lossy compression (such as JPEG recompression), spatial filtering, or an incorrect reference cover "
                    "rather than subtle steganographic embedding."
                )
        else:
            # Single Image Blind Analysis (Phase 3 & Phase 5)
            # Retain honest uncertainty reporting when decision margin is low.
            if "Single image analysis: No authentic reference cover supplied" not in forensic_explanation:
                forensic_explanation += (
                    " Single image blind analysis: No authentic reference cover supplied. Exact pixel alterations cannot be directly measured. "
                    "Independent statistical attacks (Chi-Square, SPA, RS) and high-pass residual energy are reported below as auxiliary diagnostics."
                )

        # 6. Database Persistence with Safe Rollback
        scan_record = None
        if db is not None:
            try:
                scan_record = ScanRecord(
                    user_id=user_id,
                    filename=filename,
                    file_hash=file_hash,
                    file_size_bytes=file_size,
                    image_format=str(metadata.get("format", "PNG"))[:16],
                    width=metadata.get("original_width"),
                    height=metadata.get("original_height"),
                    verdict=final_verdict,
                    cover_probability=final_cover_prob,
                    stego_probability=final_stego_prob,
                    confidence=final_confidence,
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
            verdict=final_verdict,
            verdict_category=final_verdict_category,
            interpretation_label=final_interpretation_label,
            cover_probability=final_cover_prob,
            stego_probability=final_stego_prob,
            confidence=final_confidence,
            decision_margin=prediction.get("decision_margin") if c_arr is None else abs(final_stego_prob - final_cover_prob),
            is_conclusive=final_is_conclusive,
            score_type=final_score_type,
            execution_time_ms=round(duration_ms, 2),
            device=prediction.get("device", "cpu"),
            is_trained_weights=prediction.get("is_trained_weights", False),
            model_name=prediction.get("model_name", "StegoNet-Lite"),
            model_status=prediction.get("model_status", "Experimental Baseline"),
            residual_energy=prediction.get("residual_energy", 0.0),
            forensic_explanation=forensic_explanation,
            residual_heatmap_b64=residual_heatmap_b64,
            bitplane_0_b64=bitplane_0_b64,
            diff_map_b64=diff_map_b64,
            diff_stats=diff_stats,
            statistical_metrics=statistical_metrics,
            statistical_tests=statistical_tests,
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
            metadata=ImageMetadata(
                original_width=metadata.get("original_width", 512),
                original_height=metadata.get("original_height", 512),
                format=metadata.get("format", "PNG"),
                mode=metadata.get("mode", "L"),
            ),
        )
