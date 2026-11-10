"""Pydantic schemas for steganalysis analysis endpoints."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ImageMetadata(BaseModel):
    original_width: int
    original_height: int
    format: Optional[str] = None
    mode: Optional[str] = None


class AnalysisResultResponse(BaseModel):
    id: Optional[int] = None
    filename: str
    file_hash: str
    file_size_bytes: int
    verdict: str = Field(description="'Cover' or 'Stego'")
    cover_probability: float
    stego_probability: float
    confidence: float
    execution_time_ms: float
    device: str
    is_trained_weights: bool
    model_name: str = "StegoNet-Lite"
    residual_energy: Optional[float] = None
    forensic_explanation: Optional[str] = None
    created_at: Optional[datetime] = None
    metadata: Optional[ImageMetadata] = None


class BatchAnalysisResponse(BaseModel):
    total_processed: int
    stego_count: int
    cover_count: int
    total_execution_time_ms: float
    results: List[AnalysisResultResponse]
