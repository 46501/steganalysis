"""
Database configuration and session management with strict production guarantees.
Supports Neon PostgreSQL with serverless cold-start resilience, connection pooling,
SSL enforcement, credential masking in logs, and explicit local SQLite development mode.
Automatic SQLite fallback is strictly DISABLED in production.
"""

import logging
import socket
from pathlib import Path
from typing import AsyncGenerator
from urllib.parse import urlparse

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models.base import Base

logger = logging.getLogger("stego.database")

# Ensure storage directory exists for local development SQLite database
STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_DB_PATH = STORAGE_DIR / "stego.db"
SQLITE_URL = f"sqlite+aiosqlite:///{SQLITE_DB_PATH.as_posix()}"


class DatabaseConnectionError(RuntimeError):
    """Raised when the primary configured database cannot be reached or fails to connect."""
    pass


def _mask_url_credentials(url_str: str) -> str:
    """Masks sensitive password credentials from database URLs for safe audit logging."""
    try:
        url = make_url(url_str)
        return url.render_as_string(hide_password=True)
    except Exception:
        import re
        return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", str(url_str))


def _is_host_reachable(url_str: str, timeout: float = 5.0) -> bool:
    """
    Verifies database host reachability.
    Uses 5.0s timeout to accommodate Neon serverless cold-start wake-up latency.
    """
    try:
        parsed = urlparse(url_str)
        host = parsed.hostname or "localhost"
        port = parsed.port or (5432 if "postgres" in (parsed.scheme or "") else 3306)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def _select_engine():
    """
    Selects database engine based on explicit environment configuration.
    
    Mandatory Rules:
    1. In production (ENVIRONMENT='production'), PostgreSQL/Neon is strictly required.
       If Neon is unreachable or unconfigured, an explicit DatabaseConnectionError is raised.
       Automatic silent fallback to SQLite is DISABLED in production.
    2. In local development (ENVIRONMENT='development' / USE_SQLITE=True), local SQLite
       is used explicitly, preserving backend/storage/stego.db.
    """
    is_prod = settings.ENVIRONMENT.lower() == "production"
    async_url = settings.get_async_database_url()
    is_postgres = "postgres" in async_url.lower()

    # Rule 1: Production validation
    if is_prod and not is_postgres:
        err_msg = (
            "FATAL: Production environment requires a valid PostgreSQL/Neon DATABASE_URL. "
            "SQLite is disabled in production. Aborting startup."
        )
        logger.critical(err_msg)
        raise DatabaseConnectionError(err_msg)

    # Rule 2: Explicit Local SQLite development mode
    if not is_postgres or (settings.USE_SQLITE and not is_prod):
        logger.info(f"Using local SQLite database at {SQLITE_DB_PATH} (Explicit Development Mode)")
        eng = create_async_engine(
            SQLITE_URL,
            echo=False,
            future=True,
        )
        return eng, "SQLite (Local Storage)"

    # Rule 3: PostgreSQL / Neon Connection
    masked_url = _mask_url_credentials(async_url)
    logger.info(f"Connecting to PostgreSQL database at {masked_url}")

    # Check host reachability with cold-start tolerance
    reachable = _is_host_reachable(async_url, timeout=5.0)
    if not reachable:
        if is_prod:
            err_msg = (
                f"FATAL: Connection to PostgreSQL/Neon database at '{masked_url}' failed (server unreachable). "
                "Automatic fallback to SQLite is DISABLED in production. Aborting startup."
            )
            logger.critical(err_msg)
            raise DatabaseConnectionError(err_msg)
        else:
            logger.warning(
                f"PostgreSQL '{masked_url}' unreachable. Development mode active: "
                f"falling back to local SQLite at {SQLITE_DB_PATH}."
            )
            eng = create_async_engine(SQLITE_URL, echo=False, future=True)
            return eng, "SQLite (Local Fallback)"

    # Configure asyncpg connection arguments for Neon
    connect_args = {}
    if "postgres" in async_url.lower():
        # Neon requirement: SSL mode
        if "ssl" not in async_url.lower():
            connect_args["ssl"] = "require"
        # Neon pooler requirement: disable prepared statement cache when using PgBouncer pooler
        if "pooler" in async_url.lower():
            connect_args["statement_cache_size"] = 0

    eng = create_async_engine(
        async_url,
        echo=False,
        future=True,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args=connect_args,
    )
    db_type = "Neon PostgreSQL" if "neon" in async_url.lower() else "PostgreSQL"
    logger.info(f"Successfully initialized {db_type} engine ({masked_url}).")
    return eng, db_type


engine, ACTIVE_DB_TYPE = _select_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def _sync_schema_migrations(connection) -> None:
    """Safely adds nullable user_id column to existing tables if missing."""
    import sqlalchemy as sa
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()

    # Check scan_records
    if "scan_records" in tables:
        columns = [c["name"] for c in inspector.get_columns("scan_records")]
        if "user_id" not in columns:
            logger.info("Migrating scan_records: adding nullable user_id column...")
            connection.execute(sa.text("ALTER TABLE scan_records ADD COLUMN user_id INTEGER;"))

    # Check lab_experiments
    if "lab_experiments" in tables:
        columns = [c["name"] for c in inspector.get_columns("lab_experiments")]
        if "user_id" not in columns:
            logger.info("Migrating lab_experiments: adding nullable user_id column...")
            connection.execute(sa.text("ALTER TABLE lab_experiments ADD COLUMN user_id INTEGER;"))


async def init_db() -> None:
    """Ensures database schema tables exist on application startup (non-destructive)."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_sync_schema_migrations)
        logger.info(f"Database schema initialized successfully ({ACTIVE_DB_TYPE}).")
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}", exc_info=True)
        if settings.ENVIRONMENT.lower() == "production":
            raise DatabaseConnectionError(f"Failed to initialize database schema: {e}") from e


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
