"""Image parsing and validation service."""

from typing import Tuple
from fastapi import UploadFile
from app.core.security import compute_file_hash, validate_image_upload
from app.ml.preprocessor import SRNetPreprocessor


class ImageService:
    """Handles raw image validation, hashing, and tensor transformation."""

    @classmethod
    async def process_upload(cls, file: UploadFile) -> Tuple[str, str, bytes, any, dict]:
        content = await file.read()
        filename, ext = validate_image_upload(file, content)
        file_hash = compute_file_hash(content)
        tensor, metadata = SRNetPreprocessor.process_bytes(content)
        return filename, file_hash, content, tensor, metadata

