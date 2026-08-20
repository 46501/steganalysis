from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import shutil
import os
from tempfile import NamedTemporaryFile
import cv2
import numpy as np

router = APIRouter()

def embed_lsb(image: np.ndarray, payload: bytes) -> np.ndarray:
    """
    Embeds a payload into the LSBs of the image.
    Uses sequential embedding.
    """
    flat = image.flatten()
    
    # 32-bit header for payload length
    payload_len = len(payload)
    if payload_len * 8 + 32 > len(flat):
        raise ValueError("Payload too large for this image capacity.")
        
    # Convert length to 32 bits
    len_bits = [(payload_len >> i) & 1 for i in range(31, -1, -1)]
    
    # Convert payload to bits
    payload_bits = []
    for byte in payload:
        payload_bits.extend([(byte >> i) & 1 for i in range(7, -1, -1)])
        
    all_bits = len_bits + payload_bits
    
    # Embed
    for i, bit in enumerate(all_bits):
        # Clear LSB and set to new bit
        flat[i] = (flat[i] & 254) | bit
        
    return flat.reshape(image.shape)
    
def extract_lsb(image: np.ndarray) -> bytes:
    """
    Extracts payload from the LSBs.
    """
    flat = image.flatten()
    
    if len(flat) < 32:
        return b""
        
    # Extract length
    payload_len = 0
    for i in range(32):
        bit = flat[i] & 1
        payload_len = (payload_len << 1) | bit
        
    if payload_len == 0 or payload_len * 8 + 32 > len(flat):
        return b"" # Invalid or no payload
        
    payload_bytes = bytearray()
    for i in range(payload_len):
        byte_val = 0
        for j in range(8):
            bit = flat[32 + i * 8 + j] & 1
            byte_val = (byte_val << 1) | bit
        payload_bytes.append(byte_val)
        
    return bytes(payload_bytes)

@router.post("/embed")
async def stego_embed(
    file: UploadFile = File(...),
    message: str = Form(...)
):
    try:
        with NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        img = cv2.imread(temp_path, cv2.IMREAD_UNCHANGED)
        os.remove(temp_path)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to load image.")
            
        payload = message.encode('utf-8')
        stego_img = embed_lsb(img, payload)
        
        out_path = temp_path + "_stego.png"
        cv2.imwrite(out_path, stego_img)
        
        return FileResponse(out_path, media_type="image/png", filename="stego_output.png")
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/extract")
async def stego_extract(
    file: UploadFile = File(...)
):
    try:
        with NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        img = cv2.imread(temp_path, cv2.IMREAD_UNCHANGED)
        os.remove(temp_path)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to load image.")
            
        extracted_bytes = extract_lsb(img)
        
        try:
            message = extracted_bytes.decode('utf-8')
        except UnicodeDecodeError:
            message = "Extracted data is not valid UTF-8 text. It might be encrypted or not a text payload."
            
        return {
            "status": "success",
            "message": message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
