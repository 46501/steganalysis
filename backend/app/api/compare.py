from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import shutil
import os
from tempfile import NamedTemporaryFile
import cv2
import numpy as np

router = APIRouter()

@router.post("/compare")
async def compare_images(
    original: UploadFile = File(...),
    suspected: UploadFile = File(...)
):
    """
    Compares original and suspected images to find differences.
    """
    try:
        # Save to temp
        with NamedTemporaryFile(delete=False, suffix=".png") as temp_orig:
            shutil.copyfileobj(original.file, temp_orig)
            orig_path = temp_orig.name
            
        with NamedTemporaryFile(delete=False, suffix=".png") as temp_susp:
            shutil.copyfileobj(suspected.file, temp_susp)
            susp_path = temp_susp.name
            
        img_orig = cv2.imread(orig_path, cv2.IMREAD_COLOR)
        img_susp = cv2.imread(susp_path, cv2.IMREAD_COLOR)
        
        # Cleanup temp
        os.remove(orig_path)
        os.remove(susp_path)
        
        if img_orig is None or img_susp is None:
            raise HTTPException(status_code=400, detail="Failed to load one or both images.")
            
        if img_orig.shape != img_susp.shape:
            return {
                "status": "error",
                "message": "Images must have the exact same dimensions and channels for exact comparison."
            }
            
        # Absolute difference
        diff = cv2.absdiff(img_orig, img_susp)
        
        # Changed pixels mask (any channel changed)
        changed_mask = np.any(diff > 0, axis=2)
        changed_count = int(np.sum(changed_mask))
        total_pixels = img_orig.shape[0] * img_orig.shape[1]
        percentage = (changed_count / total_pixels) * 100
        
        # MSE
        mse = np.mean((img_orig.astype("float") - img_susp.astype("float")) ** 2)
        
        # We don't return the full difference map image here due to size,
        # but in a real app we might return a base64 encoded heatmap or a URL.
        
        return {
            "status": "success",
            "changed_pixels": changed_count,
            "total_pixels": total_pixels,
            "percentage_changed": round(percentage, 4),
            "mse": float(mse)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
