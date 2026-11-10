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
