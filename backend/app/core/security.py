import hashlib
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings


def compute_file_hash(data: bytes) -> str:
    """Computes SHA-256 hash of raw byte contents."""
    return hashlib.sha256(data).hexdigest()


def validate_image_upload(file: UploadFile, content: bytes) -> Tuple[str, str]:
    """
    Validates uploaded image file size and extension.
    Returns (clean_filename, extension).
    """
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes). Please upload a valid image file."
        )

    filename = file.filename or "unnamed_image.png"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Auto-detect extension from magic bytes if missing or unusual
    if not ext or ext not in settings.ALLOWED_EXTENSIONS:
        if content.startswith(b"\x89PNG"):
            ext = "png"
            filename = f"{filename}.png"
        elif content.startswith(b"P5") or content.startswith(b"P2"):
            ext = "pgm"
            filename = f"{filename}.pgm"
        elif content.startswith(b"\xff\xd8\xff"):
            ext = "jpg"
            filename = f"{filename}.jpg"
        elif content.startswith(b"BM"):
            ext = "bmp"
            filename = f"{filename}.bmp"
        elif content.startswith(b"RIFF") and b"WEBP" in content[:16]:
            ext = "webp"
            filename = f"{filename}.webp"

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    return filename, ext

