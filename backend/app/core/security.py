import os
import hashlib
from typing import Tuple
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings

# Recognized cryptographic magic byte signatures for supported forensic formats
MAGIC_BYTE_SIGNATURES = {
    "png": (b"\x89PNG\r\n\x1a\n", b"\x89PNG"),
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "bmp": (b"BM",),
    "pgm": (b"P5", b"P2"),
}


def compute_file_hash(data: bytes) -> str:
    """Computes SHA-256 hash of raw byte contents."""
    return hashlib.sha256(data).hexdigest()


def detect_magic_extension(content: bytes) -> str | None:
    """Inspects header bytes to strictly determine actual image format."""
    if len(content) < 8:
        return None

    if content.startswith(b"\x89PNG"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith(b"BM"):
        return "bmp"
    if content.startswith(b"P5") or content.startswith(b"P2"):
        return "pgm"
    if content.startswith(b"RIFF") and b"WEBP" in content[:16]:
        return "webp"
    return None


def validate_image_upload(file: UploadFile, content: bytes) -> Tuple[str, str]:
    """
    Validates uploaded image file size, path traversal, declared extension,
    and enforces strict cryptographic magic byte signature matching.
    Returns (clean_filename, extension).
    """
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes). Please upload a valid image file."
        )

    # Sanitize filename against path traversal attacks (e.g. ../../etc/passwd)
    raw_name = file.filename or "unnamed_image.png"
    filename = os.path.basename(raw_name).strip()
    if not filename:
        filename = "unnamed_image.png"

    # Enforce file size limit
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    # Detect actual format from binary header
    detected_format = detect_magic_extension(content)
    if not detected_format:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported or corrupt file format. File does not contain valid image header signatures."
        )

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Reject extension spoofing (e.g. executable disguised as .png)
    if ext:
        normalized_ext = "jpg" if ext == "jpeg" else ext
        normalized_detected = "jpg" if detected_format == "jpeg" else detected_format
        if normalized_ext != normalized_detected and normalized_ext in settings.ALLOWED_EXTENSIONS:
            # File claimed an allowed extension but magic bytes reveal a different format
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIME confusion / signature mismatch: File claims to be '.{ext}' but binary header indicates '.{detected_format}'."
            )
    else:
        ext = detected_format
        filename = f"{filename}.{ext}"

    if detected_format not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{detected_format}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    return filename, detected_format

