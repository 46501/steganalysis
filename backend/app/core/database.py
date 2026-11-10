"""
Database configuration and session management with automatic resilience fallback.
Tries PostgreSQL first; if unreachable, automatically falls back to local SQLite on Drive D:.
"""

import logging
import socket
from pathlib import Path
from typing import AsyncGenerator
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models.base import Base

logger = logging.getLogger("stego.database")

# Ensure storage directory exists on Drive D:
STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_DB_PATH = STORAGE_DIR / "stego.db"
SQLITE_URL = f"sqlite+aiosqlite:///{SQLITE_DB_PATH.as_posix()}"


def _is_host_reachable(url_str: str, timeout: float = 0.5) -> bool:
    """Quick socket check to verify database server port is open before attempting pool connections."""
    try:
        parsed = urlparse(url_str)
        host = parsed.hostname or "localhost"
        port = parsed.port or (5432 if "postgres" in (parsed.scheme or "") else 3306)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def _select_engine():
    """Selects PostgreSQL if available; otherwise falls back gracefully to SQLite."""
    is_pg = "postgres" in settings.DATABASE_URL.lower()
    if is_pg and _is_host_reachable(settings.DATABASE_URL):
        logger.info(f"Connecting to PostgreSQL database at {settings.DATABASE_URL}")
        eng = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            future=True,
            pool_pre_ping=True,
        )
        db_type = "PostgreSQL"
    else:
        logger.info(f"PostgreSQL not reachable or not configured. Using local SQLite database at {SQLITE_DB_PATH}")
        eng = create_async_engine(
            SQLITE_URL,
            echo=False,
            future=True,
        )
        db_type = "SQLite (Local Storage)"

    return eng, db_type


engine, ACTIVE_DB_TYPE = _select_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Ensures database schema tables exist on application startup."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"Database schema initialized successfully ({ACTIVE_DB_TYPE}).")
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}", exc_info=True)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
