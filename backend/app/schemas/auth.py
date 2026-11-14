"""Pydantic Schemas for Authentication and Password Recovery."""

import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserRegisterRequest(BaseModel):
    """Registration request with password validation policy."""

    full_name: str = Field(..., min_length=2, max_length=100, description="User full display name")
    email: EmailStr = Field(..., description="Valid user email address")
    password: str = Field(..., min_length=8, max_length=128, description="Account password")
    confirm_password: Optional[str] = Field(None, min_length=8, max_length=128, description="Password confirmation")
    password_confirm: Optional[str] = Field(None, min_length=8, max_length=128, description="Password confirmation alias")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def verify_passwords(self):
        conf = self.confirm_password or self.password_confirm
        if not conf:
            raise ValueError("confirm_password is required")
        if conf != self.password:
            raise ValueError("Passwords do not match")
        self.confirm_password = conf
        return self


class UserLoginRequest(BaseModel):
    """User credentials login request."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")
    remember_me: bool = Field(default=False, description="Extend session duration to 30 days")


class UserResponse(BaseModel):
    """Safe public representation of user entity."""

    id: int
    full_name: str
    email: str
    is_active: bool
    email_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Bearer access token payload returned upon successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    refresh_token: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """Refresh token payload fallback when HttpOnly cookies are unavailable."""

    refresh_token: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    """Password recovery initiation request."""

    email: EmailStr = Field(..., description="Registered user email address")


class ResetPasswordRequest(BaseModel):
    """Password reset completion request."""

    token: str = Field(..., min_length=10, description="Cryptographic reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New account password")
    confirm_password: Optional[str] = Field(None, min_length=8, max_length=128, description="Confirm new password")
    new_password_confirm: Optional[str] = Field(None, min_length=8, max_length=128, description="Confirm new password alias")

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def verify_passwords(self):
        conf = self.confirm_password or self.new_password_confirm
        if not conf:
            raise ValueError("confirm_password is required")
        if conf != self.new_password:
            raise ValueError("Passwords do not match")
        self.confirm_password = conf
        return self


class ChangePasswordRequest(BaseModel):
    """Authenticated user password modification."""

    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: Optional[str] = Field(None, min_length=8, max_length=128, description="Confirm new password")
    new_password_confirm: Optional[str] = Field(None, min_length=8, max_length=128, description="Confirm new password alias")

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def verify_passwords(self):
        conf = self.confirm_password or self.new_password_confirm
        if not conf:
            raise ValueError("confirm_password is required")
        if conf != self.new_password:
            raise ValueError("Passwords do not match")
        self.confirm_password = conf
        return self


class MessageResponse(BaseModel):
    """Generic status/acknowledgement response."""

    message: str
    detail: Optional[str] = None


class MFASetupResponse(BaseModel):
    """MFA enrollment setup details."""

    secret: str
    otpauth_uri: str
    issuer: str
    algorithm: str
    digits: int
    period: int


class MFAStatusResponse(BaseModel):
    """MFA activation status for current user."""

    mfa_enabled: bool
    enrolled_at: Optional[str] = None


class MFACodeRequest(BaseModel):
    """6-digit TOTP code verification payload."""

    code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP verification code")


class MFADisableRequest(BaseModel):
    """Password verification to disable MFA."""

    password: str = Field(..., min_length=1, description="Current account password to confirm disablement")

