"""Laboratory Experiment Database Model."""

from sqlalchemy import Float, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class ExperimentRecord(Base, TimestampMixin):
    """Stores full state, parameters, images, and forensic findings for a lab experiment."""

    __tablename__ = "lab_experiments"

    experiment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    experiment_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # bit_manipulation, lsb_embedding, etc.
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    modified_file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dimensions: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. "512x512"
    color_mode: Mapped[str] = mapped_column(String(16), default="L")

    # Detailed JSON configurations and results
    parameters_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    comparison_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    analysis_json: Mapped[str] = mapped_column(Text, nullable=True, default="{}")

    # Image artifacts (stored as base64 PNG data URLs or lightweight serialized strings)
    original_image_b64: Mapped[str] = mapped_column(Text, nullable=True)
    modified_image_b64: Mapped[str] = mapped_column(Text, nullable=True)
    diff_map_b64: Mapped[str] = mapped_column(Text, nullable=True)

