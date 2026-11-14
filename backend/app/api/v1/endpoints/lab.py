"""
StegoShield AI — Interactive Forensics Laboratory Endpoints.
"""

import json
import uuid
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_optional
from app.core.database import get_db
from app.models.experiment import ExperimentRecord
from app.models.user import User
from app.schemas.lab import (
    InspectImageResponse,
    PixelInspectRequest,
    PixelInspectResponse,
    BitToggleRequest,
    BitToggleResponse,
    ApplyPixelChangeRequest,
    TogglePixelBitRequest,
    TogglePixelBitResponse,
    BulkManipulateRequest,
    BulkManipulateResponse,
    BitplaneRequest,
    BitplaneResponse,
    EmbedMessageRequest,
    EmbedMessageResponse,
    ExtractMessageRequest,
    ExtractMessageResponse,
    CompareRequest,
    CompareResponse,
    ExperimentCreateRequest,
    ExperimentResponse,
    ExperimentListItem,
)
from app.services.lab_service import ForensicsLabService
from app.ml.preprocessor import SRNetPreprocessor
from app.ml.inference import engine

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Image Inspection
# -----------------------------------------------------------------------------

@router.post("/inspect", response_model=InspectImageResponse, summary="Inspect image metadata & statistics")
async def inspect_uploaded_image(file: UploadFile = File(...)):
    """Uploads an image, verifies format, and losslessly extracts dimensions, hashes, and statistics."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        inspection = ForensicsLabService.inspect_image(content, file.filename or "uploaded_image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image inspection failed: {str(e)}")

    return inspection


# -----------------------------------------------------------------------------
# 2. Pixel Inspector & Bit Toggling
# -----------------------------------------------------------------------------

@router.post("/pixel-inspect", response_model=PixelInspectResponse, summary="Get 8-bit binary representation of a pixel")
async def get_pixel_details(req: PixelInspectRequest):
    """Returns RGB or Grayscale bit breakdown for a given coordinate."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        details = ForensicsLabService.get_pixel_info(arr, req.x, req.y)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to inspect pixel: {str(e)}")

    return details


@router.post("/toggle-bit", response_model=BitToggleResponse, summary="Toggle individual bit (0=LSB to 7=MSB)")
async def toggle_bit_endpoint(req: BitToggleRequest):
    """Calculates modified integer value and binary delta after flipping bit_position."""
    try:
        result = ForensicsLabService.toggle_pixel_bit(req.pixel_value, req.bit_position)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bit toggle failed: {str(e)}")

    return result


@router.post("/apply-pixel", summary="Apply discrete pixel modification to canvas image")
async def apply_single_pixel_modification(req: ApplyPixelChangeRequest):
    """Mutates a single pixel in the image and returns the updated lossless base64 PNG."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        h, w = arr.shape[:2]
        x = max(0, min(w - 1, int(req.x)))
        y = max(0, min(h - 1, int(req.y)))

        if arr.ndim == 3 and arr.shape[2] == 3:
            c = max(0, min(2, int(req.channel_index)))
            arr[y, x, c] = req.new_value
        else:
            arr[y, x] = req.new_value

        mod_png_b64 = ForensicsLabService.array_to_b64_png(arr)
        mod_sha256 = ForensicsLabService.b64_to_bytes(mod_png_b64)
        import hashlib
        sha = hashlib.sha256(mod_sha256).hexdigest()

        return {
            "success": True,
            "modified_image_b64": mod_png_b64,
            "modified_sha256": sha,
            "x": x,
            "y": y,
            "new_value": req.new_value,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to apply pixel change: {str(e)}")


@router.post("/toggle-pixel-bit", response_model=TogglePixelBitResponse, summary="Atomically toggle a single pixel bit and return updated image")
async def toggle_pixel_bit_endpoint(req: TogglePixelBitRequest):
    """Flipping a bit at (x, y) on a specific channel, updating image array and returning new PNG."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        h, w = arr.shape[:2]
        if req.x < 0 or req.x >= w or req.y < 0 or req.y >= h:
            raise HTTPException(
                status_code=400,
                detail=f"Pixel coordinate ({req.x}, {req.y}) is outside image boundaries ({w}x{h})."
            )
        x = int(req.x)
        y = int(req.y)
        bit_pos = max(0, min(7, int(req.bit_position)))

        is_rgb = (arr.ndim == 3 and arr.shape[2] == 3)

        action = (getattr(req, "action", None) or "toggle").lower().strip()

        if is_rgb:
            if req.channel_index is not None:
                c = max(0, min(2, int(req.channel_index)))
            else:
                ch_map = {"red": 0, "green": 1, "blue": 2, "r": 0, "g": 1, "b": 2}
                c = ch_map.get(req.channel.lower(), 0)
            orig_val = int(arr[y, x, c])
            if action == "set":
                new_val = orig_val | (1 << bit_pos)
            elif action == "clear":
                new_val = orig_val & ~(1 << bit_pos)
            else:
                new_val = orig_val ^ (1 << bit_pos)
            arr[y, x, c] = new_val
            ch_name = ["Red", "Green", "Blue"][c]
        else:
            orig_val = int(arr[y, x])
            if action == "set":
                new_val = orig_val | (1 << bit_pos)
            elif action == "clear":
                new_val = orig_val & ~(1 << bit_pos)
            else:
                new_val = orig_val ^ (1 << bit_pos)
            arr[y, x] = new_val
            ch_name = "Grayscale"

        mod_png_b64 = ForensicsLabService.array_to_b64_png(arr)
        mod_bytes = ForensicsLabService.b64_to_bytes(mod_png_b64)
        import hashlib
        sha = hashlib.sha256(mod_bytes).hexdigest()
        updated_details = ForensicsLabService.get_pixel_info(arr, x, y)

        return TogglePixelBitResponse(
            success=True,
            modified_image_b64=mod_png_b64,
            modified_sha256=sha,
            x=x,
            y=y,
            channel=ch_name,
            bit_position=bit_pos,
            action=action,
            original_value=orig_val,
            new_pixel_value=new_val,
            delta=new_val - orig_val,
            original_binary=f"{orig_val:08b}",
            new_binary=f"{new_val:08b}",
            pixel_details=updated_details,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to toggle pixel bit: {str(e)}")


# -----------------------------------------------------------------------------
# 3. Bulk Bit Manipulation
# -----------------------------------------------------------------------------

@router.post("/manipulate-bulk", response_model=BulkManipulateResponse, summary="Execute reproducible bulk bit experiment")
async def manipulate_bulk_bits(req: BulkManipulateRequest):
    """Performs deterministic, reproducible bit modifications across selected pixels."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        result = ForensicsLabService.bulk_manipulate_bits(
            orig_array=arr,
            mode=req.mode,
            plane=req.plane,
            percentage=req.percentage,
            seed=req.seed,
            channel=req.channel,
            action=req.action,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bulk bit manipulation failed: {str(e)}")

    return result


# -----------------------------------------------------------------------------
# 4. Bit-Plane Slicing
# -----------------------------------------------------------------------------

@router.post("/bitplane", response_model=BitplaneResponse, summary="Extract 2D bit plane (0=LSB to 7=MSB)")
async def extract_bitplane_view(req: BitplaneRequest):
    """Extracts a specific bit plane (0–7) as a binary B&W image."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        result = ForensicsLabService.generate_bitplane_view(arr, plane=req.plane, channel=req.channel)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bitplane extraction failed: {str(e)}")

    return result


# -----------------------------------------------------------------------------
# 5. Secret Message Embedding & Extraction
# -----------------------------------------------------------------------------

@router.post("/embed", response_model=EmbedMessageResponse, summary="Embed secret UTF-8 message via LSB substitution")
async def embed_secret_message(req: EmbedMessageRequest):
    """Embeds message using LSB substitution with strict capacity checks and length header."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        result = ForensicsLabService.embed_secret_message_lsb(
            orig_array=arr,
            secret_text=req.secret_text,
            password=req.password,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Secret embedding failed: {str(e)}")

    return result


@router.post("/extract", response_model=ExtractMessageResponse, summary="Extract and verify secret LSB message")
async def extract_secret_message(req: ExtractMessageRequest):
    """Extracts payload and verifies CRC32 integrity checksum."""
    try:
        arr = ForensicsLabService.b64_to_array(req.image_b64)
        result = ForensicsLabService.extract_secret_message_lsb(
            stego_array=arr,
            password=req.password,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Secret extraction failed: {str(e)}")

    return result


# -----------------------------------------------------------------------------
# 6. Forensic Comparison
# -----------------------------------------------------------------------------

@router.post("/compare", response_model=CompareResponse, summary="Deep forensic comparison between original and modified")
async def compare_image_pair(req: CompareRequest):
    """Compares original cover and modified carrier losslessly pixel-by-pixel."""
    try:
        orig = ForensicsLabService.b64_to_array(req.original_image_b64)
        mod = ForensicsLabService.b64_to_array(req.modified_image_b64)
        result = ForensicsLabService.compare_images(orig, mod)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

    return result


# -----------------------------------------------------------------------------
# 7. Steganalysis Inference for Lab
# -----------------------------------------------------------------------------

@router.post("/analyze", summary="Run real StegoNet-Lite inference on a lab image")
async def run_lab_steganalysis(image_b64: str = Form(...), model_name: str = Form("StegoNet-Lite")):
    """Executes genuine StegoNet-Lite model inference without fabricated predictions."""
    try:
        import time
        import hashlib
        raw_bytes = ForensicsLabService.b64_to_bytes(image_b64)
        tensor, meta = SRNetPreprocessor.process_bytes(raw_bytes)

        # Run actual model forward pass
        start = time.perf_counter()
        result = engine.predict(tensor)
        latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
        sha = hashlib.sha256(raw_bytes).hexdigest()

        # Compute auxiliary high-pass residual energy
        arr = ForensicsLabService.b64_to_array(image_b64)
        residual_energy_val = ForensicsLabService.calculate_residual_energy(arr)
        entropy_val = ForensicsLabService.calculate_entropy(arr)

        return {
            "verdict": result["verdict"],
            "verdict_category": result.get("verdict_category", "INCONCLUSIVE — LOW CONFIDENCE"),
            "cover_probability": result["cover_probability"],
            "stego_probability": result["stego_probability"],
            "confidence": result["confidence"],
            "score_type": result.get("score_type", "Uncalibrated Model Score"),
            "is_conclusive": result.get("is_conclusive", False),
            "execution_time_ms": latency_ms,
            "device_used": result["device"],
            "model_name": result["model_name"],
            "model_status": "Experimental Baseline (Validation Accuracy ~50% Random Walk)",
            "residual_energy": residual_energy_val,
            "entropy": entropy_val,
            "file_hash": sha,
            "forensic_explanation": result.get("forensic_explanation"),
            "scientific_disclaimer": (
                "StegoNet-Lite is an experimental baseline. Genuine model probabilities are shown. "
                "Residual energy is an auxiliary forensic measurement, not standalone proof."
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Steganalysis failed: {str(e)}")


# -----------------------------------------------------------------------------
# 8. Experiment History Persistence (User-Specific Isolation)
# -----------------------------------------------------------------------------

@router.post("/experiments", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
async def save_experiment(
    req: ExperimentCreateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Saves a laboratory experiment record associated with authenticated user or guest."""
    record = ExperimentRecord(
        user_id=current_user.id if current_user else None,
        experiment_name=req.experiment_name,
        experiment_type=req.experiment_type,
        original_filename=req.original_filename,
        original_file_hash=req.original_file_hash,
        modified_file_hash=req.modified_file_hash,
        dimensions=req.dimensions,
        color_mode=req.color_mode,
        parameters_json=json.dumps(req.parameters),
        comparison_json=json.dumps(req.comparison),
        analysis_json=json.dumps(req.analysis or {}),
        original_image_b64=req.original_image_b64,
        modified_image_b64=req.modified_image_b64,
        diff_map_b64=req.diff_map_b64,
    )

    db.add(record)
    await db.commit()
    await db.refresh(record)

    return ExperimentResponse(
        id=record.id,
        created_at=record.created_at.isoformat() if record.created_at else "",
        experiment_name=record.experiment_name,
        experiment_type=record.experiment_type,
        original_filename=record.original_filename,
        original_file_hash=record.original_file_hash,
        modified_file_hash=record.modified_file_hash,
        dimensions=record.dimensions,
        color_mode=record.color_mode,
        parameters=json.loads(record.parameters_json),
        comparison=json.loads(record.comparison_json),
        analysis=json.loads(record.analysis_json) if record.analysis_json else None,
        original_image_b64=record.original_image_b64,
        modified_image_b64=record.modified_image_b64,
        diff_map_b64=record.diff_map_b64,
    )


@router.get("/experiments", response_model=List[ExperimentListItem])
async def list_experiments(
    limit: int = 50,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Lists saved laboratory experiments isolated by authenticated user."""
    query = select(ExperimentRecord)
    if current_user:
        query = query.where(ExperimentRecord.user_id == current_user.id)
    else:
        query = query.where(ExperimentRecord.user_id.is_(None))

    stmt = query.order_by(desc(ExperimentRecord.created_at)).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()

    items = []
    for r in records:
        comp = {}
        if r.comparison_json:
            try:
                comp = json.loads(r.comparison_json)
            except Exception:
                pass
        anal = {}
        if r.analysis_json:
            try:
                anal = json.loads(r.analysis_json)
            except Exception:
                pass

        items.append(
            ExperimentListItem(
                id=r.id,
                created_at=r.created_at.isoformat() if r.created_at else "",
                experiment_name=r.experiment_name,
                experiment_type=r.experiment_type,
                original_filename=r.original_filename,
                original_file_hash=r.original_file_hash,
                modified_file_hash=r.modified_file_hash,
                dimensions=r.dimensions,
                changed_pixels=comp.get("changed_pixels", 0),
                change_rate_percent=comp.get("changed_pixel_percent", 0.0),
                verdict=anal.get("verdict"),
            )
        )
    return items


@router.get("/experiments/{exp_id}", response_model=ExperimentResponse)
async def get_experiment_detail(
    exp_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Loads a full experiment record, enforcing user ownership."""
    stmt = select(ExperimentRecord).where(ExperimentRecord.id == exp_id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Experiment record not found.")

    if record.user_id is not None:
        if not current_user or record.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Experiment record not found.")

    return ExperimentResponse(
        id=record.id,
        created_at=record.created_at.isoformat() if record.created_at else "",
        experiment_name=record.experiment_name,
        experiment_type=record.experiment_type,
        original_filename=record.original_filename,
        original_file_hash=record.original_file_hash,
        modified_file_hash=record.modified_file_hash,
        dimensions=record.dimensions,
        color_mode=record.color_mode,
        parameters=json.loads(record.parameters_json),
        comparison=json.loads(record.comparison_json),
        analysis=json.loads(record.analysis_json) if record.analysis_json else None,
        original_image_b64=record.original_image_b64,
        modified_image_b64=record.modified_image_b64,
        diff_map_b64=record.diff_map_b64,
    )


@router.delete("/experiments/{exp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experiment(
    exp_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Explicitly deletes a laboratory experiment record, enforcing user ownership."""
    stmt = select(ExperimentRecord).where(ExperimentRecord.id == exp_id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Experiment record not found.")

    if record.user_id is not None:
        if not current_user or record.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Experiment record not found.")
    else:
        if current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete anonymous guest experiments from an authenticated account.",
            )

    await db.delete(record)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/experiments/{exp_id}/download")
async def download_experiment_modified_image(
    exp_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Downloads the generated modified PNG image for a saved experiment, checking ownership."""
    stmt = select(ExperimentRecord).where(ExperimentRecord.id == exp_id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record or not record.modified_image_b64:
        raise HTTPException(status_code=404, detail="Modified image not available.")

    if record.user_id is not None:
        if not current_user or record.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Modified image not available.")

    raw_bytes = ForensicsLabService.b64_to_bytes(record.modified_image_b64)
    filename = f"lab_modified_{record.modified_file_hash[:8]}.png"

    return Response(
        content=raw_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

