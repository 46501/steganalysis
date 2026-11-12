"""Pydantic Schemas for User Profile and Account Management."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserProfileResponse(BaseModel):
    """Complete account profile including live forensic activity telemetry."""

    id: int
    full_name: str
    email: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    total_scans: int = 0
    total_experiments: int = 0
    saved_reports_count: int = 0
    recent_activity: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdateRequest(BaseModel):
    """Request schema for updating editable profile fields."""

    full_name: Optional[str] = Field(None, min_length=2, max_length=100)


class UserAccountDeleteRequest(BaseModel):
    """Account self-deletion confirmation request requiring current password."""

    password: str = Field(..., min_length=1, description="Current password for identity confirmation")
