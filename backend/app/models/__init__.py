"""SQLAlchemy Models Package."""
from app.models.base import Base
from app.models.scan import ScanRecord

__all__ = ["Base", "ScanRecord"]

