"""Pydantic schemas for health and system status."""

from pydantic import BaseModel


class ModelStatus(BaseModel):
    architecture: str
    is_loaded: bool
    is_trained_weights: bool
    weights_path: str
    device: str
    cuda_available: bool


class HealthStatusResponse(BaseModel):
    status: str
    project_name: str
    version: str
    model: ModelStatus

