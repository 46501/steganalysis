"""Scan Record Database Model."""

from sqlalchemy import Float, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ScanRecord(Base, TimestampMixin):
    """Stores metadata and steganalysis results for an analyzed image."""

    __tablename__ = "scan_records"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    image_format: Mapped[str] = mapped_column(String(16), nullable=True)
    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)

    verdict: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    cover_probability: Mapped[float] = mapped_column(Float, nullable=False)
    stego_probability: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    execution_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    device_used: Mapped[str] = mapped_column(String(32), default="cpu")
    is_trained_weights: Mapped[bool] = mapped_column(Boolean, default=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=True, default="StegoNet-Lite")
    residual_energy: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    forensic_explanation: Mapped[str] = mapped_column(String(1024), nullable=True)

