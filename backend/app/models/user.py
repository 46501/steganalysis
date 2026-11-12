"""User and Session Database Models."""

from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """User account entity for StegoShield AI."""

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    scans: Mapped[List["ScanRecord"]] = relationship(
        "ScanRecord", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    experiments: Mapped[List["ExperimentRecord"]] = relationship(
        "ExperimentRecord", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )


class UserSession(Base):
    """Active refresh token session for a user with rotation tracking."""

    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")

    @property
    def is_valid(self) -> bool:
        """Returns True if the session has not expired and has not been revoked."""
        now = datetime.now(timezone.utc)
        return self.revoked_at is None and (self.expires_at.tzinfo and self.expires_at > now or self.expires_at.replace(tzinfo=timezone.utc) > now)


class PasswordResetToken(Base):
    """Cryptographic one-time token for account password recovery."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="reset_tokens")

    @property
    def is_valid(self) -> bool:
        """Returns True if token has not expired and has not been used."""
        now = datetime.now(timezone.utc)
        return self.used_at is None and (self.expires_at.tzinfo and self.expires_at > now or self.expires_at.replace(tzinfo=timezone.utc) > now)
