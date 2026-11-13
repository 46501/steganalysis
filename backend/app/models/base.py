"""SQLAlchemy Declarative Base and Common Mixins."""

from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow_naive() -> datetime:
    """Returns naive UTC timestamp compatible with TIMESTAMP WITHOUT TIME ZONE across PostgreSQL and SQLite."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    """Base declarative class for all database tables."""
    pass


class TimestampMixin:
    """Common timestamp mixin for entity auditing."""
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow_naive,
        nullable=False,
        index=True,
    )

