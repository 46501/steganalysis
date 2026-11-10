"""Pydantic schemas for health and system status."""

from typing import Any, Dict, Optional
from pydantic import BaseModel


class DatabaseStatus(BaseModel):
    type: str
    status: str


class ModelStatus(BaseModel):
    architecture: str = "SRNet (12-Layer Deep Residual Network)"
    active_model: str
    is_loaded: bool
    is_trained_weights: bool
    weights_path: str
    device: str
    cuda_available: bool
    research_model: str


class DatasetSummary(BaseModel):
    name: str
    embedding_algorithm: str
    payload_bpp: float
    total_images: int
    total_pairs: int
    train_pairs: int
    val_pairs: int
    test_pairs: int


class HealthStatusResponse(BaseModel):
    status: str
    project_name: str
    version: str
    database: DatabaseStatus
    model: ModelStatus
    dataset: DatasetSummary
