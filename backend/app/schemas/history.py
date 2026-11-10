"""Pydantic schemas for scan history and reporting."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ScanHistoryItem(BaseModel):
    id: int
    filename: str
    file_hash: str
    file_size_bytes: int
    image_format: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    verdict: str
    cover_probability: float
    stego_probability: float
    confidence: float
    execution_time_ms: float
    device_used: str
    is_trained_weights: Optional[bool] = False
    model_name: Optional[str] = None
    residual_energy: Optional[float] = None
    forensic_explanation: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedHistoryResponse(BaseModel):
    total_count: int
    limit: int
    offset: int
    items: List[ScanHistoryItem]


class EvidenceArchiveRequest(BaseModel):
    id: Optional[int] = None
    case_number: Optional[str] = None
    filename: str
    file_hash: str
    file_size_bytes: Optional[int] = 0
    image_format: Optional[str] = "PNG"
    verdict: str
    confidence: float
    cover_probability: float
    stego_probability: float
    residual_energy: Optional[float] = None
    execution_time_ms: Optional[float] = 0.0
    device: Optional[str] = "cpu"
    model_name: Optional[str] = "StegoNet-Lite"
    forensic_explanation: Optional[str] = None
    residual_heatmap_b64: Optional[str] = None
    bitplane_0_b64: Optional[str] = None
    fft_spectrum_b64: Optional[str] = None
    diff_map_b64: Optional[str] = None
