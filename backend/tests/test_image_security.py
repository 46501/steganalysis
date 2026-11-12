"""Security verification tests for image upload, magic bytes, and decompression bomb defense."""

import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from fastapi import UploadFile

from app.main import app
from app.core.security import validate_image_upload, detect_magic_extension
from app.ml.preprocessor import SRNetPreprocessor

client = TestClient(app)


def test_magic_byte_detection_valid_png():
    img = Image.new("L", (64, 64), 128)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    ext = detect_magic_extension(raw)
    assert ext == "png"


def test_magic_byte_detection_disguised_file():
    fake_content = b"MZ\x90\x00\x03\x00\x00\x00This is a Windows PE executable not an image"
    ext = detect_magic_extension(fake_content)
    assert ext is None


def test_validate_image_upload_rejects_spoofed_extension():
    fake_content = b"MZ\x90\x00\x03\x00\x00\x00This is a Windows PE executable"
    mock_file = UploadFile(filename="trojan.png", file=io.BytesIO(fake_content))

    with pytest.raises(Exception) as excinfo:
        validate_image_upload(mock_file, fake_content)
    assert "Unsupported or corrupt file format" in str(excinfo.value.detail)


def test_validate_image_upload_sanitizes_path_traversal():
    img = Image.new("L", (32, 32), 100)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    mock_file = UploadFile(filename="../../../../etc/shadow.png", file=io.BytesIO(raw))
    clean_name, ext = validate_image_upload(mock_file, raw)

    assert clean_name == "shadow.png"
    assert ext == "png"
    assert "/" not in clean_name
    assert ".." not in clean_name


def test_preprocessor_rejects_oversized_dimension():
    # Attempting to process an image larger than MAX_ALLOWED_DIMENSION (4096)
    img = Image.new("L", (4500, 100), 128)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    with pytest.raises(Exception) as excinfo:
        SRNetPreprocessor.process_bytes(raw)
    assert "exceed maximum allowed limit" in str(excinfo.value.detail)
