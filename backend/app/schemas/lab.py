"""Pydantic Schemas for Forensics Laboratory."""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class InspectImageResponse(BaseModel):
    filename: str
    format: str
    dimensions: str
    width: int
    height: int
    channels: int
    color_mode: str
    file_size_bytes: int
    total_pixels: int
    sha256_hash: str
    lossless_png_b64: str
    entropy: float
    residual_energy: float
    mean_intensity: float
    std_dev: float
    histogram: List[int]


class PixelInspectRequest(BaseModel):
    image_b64: str
    x: int
    y: int


class PixelChannelDetail(BaseModel):
    channel: str
    value: int
    hex: str
    binary: str
    bits: List[int]


class PixelInspectResponse(BaseModel):
    x: int
    y: int
    is_rgb: bool
    channels: List[PixelChannelDetail]


class BitToggleRequest(BaseModel):
    pixel_value: int
    bit_position: int = Field(default=0, ge=0, le=7)


class BitToggleResponse(BaseModel):
    bit_position: int
    bit_label: str
    original_value: int
    modified_value: int
    delta: int
    original_binary: str
    modified_binary: str
    original_hex: str
    modified_hex: str


class ApplyPixelChangeRequest(BaseModel):
    image_b64: str
    x: int
    y: int
    channel_index: int = 0  # 0 for Gray or Red, 1 for Green, 2 for Blue
    new_value: int = Field(ge=0, le=255)


class TogglePixelBitRequest(BaseModel):
    image_b64: str = Field(..., description="Lossless PNG base64 string or data URI of current carrier")
    x: int = Field(..., description="X coordinate (horizontal, 0-indexed)")
    y: int = Field(..., description="Y coordinate (vertical, 0-indexed)")
    channel: str = Field(default="gray", description="'red', 'green', 'blue', or 'gray'")
    channel_index: Optional[int] = Field(default=None, description="0 (Red/Gray), 1 (Green), 2 (Blue)")
    bit_position: int = Field(default=0, ge=0, le=7, description="Bit index from 0 (LSB) to 7 (MSB)")


class TogglePixelBitResponse(BaseModel):
    success: bool
    modified_image_b64: str
    modified_sha256: str
    x: int
    y: int
    channel: str
    bit_position: int
    original_value: int
    new_pixel_value: int
    delta: int
    original_binary: str
    new_binary: str
    pixel_details: Dict[str, Any]


class BulkManipulateRequest(BaseModel):
    image_b64: str
    mode: str = "lsb_only"  # 'lsb_only', 'two_lsb', 'custom_plane', 'random_bits'
    plane: int = 0
    percentage: float = 10.0
    seed: int = 42
    channel: str = "all"
    action: str = "toggle"  # 'toggle', 'set_zero', 'set_one'


class BulkManipulateResponse(BaseModel):
    modified_image_b64: str
    modified_sha256: str
    diff_map_b64: str
    total_pixels: int
    selected_pixels_count: int
    modified_pixels_count: int
    modified_bits_count: int
    modification_percent: float
    parameters: Dict[str, Any]


class BitplaneRequest(BaseModel):
    image_b64: str
    plane: int = Field(default=0, ge=0, le=7)
    channel: str = "gray"


class BitplaneResponse(BaseModel):
    plane: int
    plane_label: str
    channel: str
    bitplane_b64: str
    plane_entropy: float


class EmbedMessageRequest(BaseModel):
    image_b64: str
    secret_text: str
    password: Optional[str] = None


class EmbedMessageResponse(BaseModel):
    stego_image_b64: str
    modified_sha256: str
    diff_map_b64: str
    payload_bytes: int
    capacity_bytes: int
    capacity_used_percent: float
    modified_bits_count: int
    modified_pixel_percent: float
    embedding_rate_bpp: float
    is_encrypted: bool
    algorithm: str
    header_format: str


class ExtractMessageRequest(BaseModel):
    image_b64: str
    password: Optional[str] = None


class ExtractMessageResponse(BaseModel):
    success: bool
    is_encrypted: bool
    secret_text: Optional[str] = None
    payload_bytes: int
    total_pixels_scanned: Optional[int] = None
    status: str


class CompareRequest(BaseModel):
    original_image_b64: str
    modified_image_b64: str


class CompareResponse(BaseModel):
    total_pixels: int
    changed_pixels: int
    unchanged_pixels: int
    changed_pixel_percent: float
    changed_channel_values: int
    total_bit_changes: int
    per_channel_changed: Dict[str, int]
    statistics: Dict[str, float]
    original_histogram: List[int]
    modified_histogram: List[int]
    diff_map_b64: str


class ExperimentCreateRequest(BaseModel):
    experiment_name: str
    experiment_type: str
    original_filename: str
    original_file_hash: str
    modified_file_hash: str
    dimensions: str
    color_mode: str = "L"
    parameters: Dict[str, Any]
    comparison: Dict[str, Any]
    analysis: Optional[Dict[str, Any]] = None
    original_image_b64: Optional[str] = None
    modified_image_b64: Optional[str] = None
    diff_map_b64: Optional[str] = None


class ExperimentResponse(BaseModel):
    id: int
    created_at: str
    experiment_name: str
    experiment_type: str
    original_filename: str
    original_file_hash: str
    modified_file_hash: str
    dimensions: str
    color_mode: str
    parameters: Dict[str, Any]
    comparison: Dict[str, Any]
    analysis: Optional[Dict[str, Any]] = None
    original_image_b64: Optional[str] = None
    modified_image_b64: Optional[str] = None
    diff_map_b64: Optional[str] = None


class ExperimentListItem(BaseModel):
    id: int
    created_at: str
    experiment_name: str
    experiment_type: str
    original_filename: str
    original_file_hash: str
    modified_file_hash: str
    dimensions: str
    changed_pixels: Optional[int] = 0
    change_rate_percent: Optional[float] = 0.0
    verdict: Optional[str] = None

