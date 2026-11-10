"""
Steganography Studio Endpoints: Embedding & Extracting Secret Messages.
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from app.services.embedding_service import SteganographyStudioService

router = APIRouter()


@router.post("/embed", status_code=status.HTTP_200_OK)
async def embed_secret_message(
    file: UploadFile = File(...),
    secret_text: str = Form(...),
    algorithm: str = Form("lsb_replace"),
):
    """
    Embeds an arbitrary secret text into a cover image using LSB replacement or ±1 matching.
    Returns the stego image encoded in base64, embedding metrics, and capacity statistics.
    """
    if not secret_text or len(secret_text.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Secret text cannot be empty.",
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded cover image file is empty.",
        )

    try:
        result = SteganographyStudioService.embed_secret_message(
            image_bytes=image_bytes,
            secret_text=secret_text,
            algorithm=algorithm,
        )
        result["filename"] = file.filename
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding error: {str(e)}",
        )


@router.post("/extract", status_code=status.HTTP_200_OK)
async def extract_secret_message(
    file: UploadFile = File(...),
):
    """
    Extracts a concealed secret message from a stego image.
    Decodes the 32-bit header and recovers the original UTF-8 plaintext.
    """
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded stego file is empty.",
        )

    try:
        result = SteganographyStudioService.extract_secret_message(image_bytes)
        result["filename"] = file.filename
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction error: {str(e)}",
        )

