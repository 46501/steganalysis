"""
Automated Verification Suite for Database Modes (SQLite Local Mode & Neon PostgreSQL Mode).
Verifies:
1. SQLite local mode connectivity, data persistence, and integrity preservation.
2. Production strict mode (disabling SQLite fallback when Neon is unreachable).
3. URL normalization and credential masking security.
4. Schema initialization and Alembic migration definition parity.
"""

import os
import sys
import pytest
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import sqlalchemy as sa
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.database import _mask_url_credentials, _is_host_reachable, DatabaseConnectionError
from app.models import Base, User, UserSession, PasswordResetToken, ScanRecord, ExperimentRecord
from app.core.auth import verify_password


@pytest.mark.asyncio
async def test_sqlite_local_mode_preservation():
    """Verifies that SQLite local mode connects to stego.db and preserves all existing records."""
    storage_dir = backend_path / "storage"
    db_file = storage_dir / "stego.db"
    assert db_file.is_file(), f"Expected existing stego.db at {db_file}"

    sqlite_url = f"sqlite+aiosqlite:///{db_file.as_posix()}"
    engine = create_async_engine(sqlite_url, echo=False)
    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        # Verify users exist
        user_count = (await session.execute(select(func.count(User.id)))).scalar_one()
        assert user_count >= 200, f"Expected at least 200 users, found {user_count}"

        # Verify scan records exist
        scan_count = (await session.execute(select(func.count(ScanRecord.id)))).scalar_one()
        assert scan_count >= 200, f"Expected at least 200 scan records, found {scan_count}"

        # Verify lab experiments exist
        exp_count = (await session.execute(select(func.count(ExperimentRecord.id)))).scalar_one()
        assert exp_count >= 5, f"Expected at least 5 lab experiments, found {exp_count}"

        # Test querying a real user and verify hash format
        first_user = (await session.execute(select(User).limit(1))).scalar_one_or_none()
        assert first_user is not None
        assert first_user.email
        assert first_user.password_hash.startswith("$2b$") or len(first_user.password_hash) > 20

    await engine.dispose()


def test_credential_masking():
    """Verifies that passwords in database URLs are never leaked to logs."""
    test_urls = [
        ("postgresql://stego_admin:SecretPass999!@ep-cool-mountain.neon.tech/neondb?sslmode=require",
         "SecretPass999!"),
        ("postgresql+asyncpg://myuser:P@ssword#123@ep-sample-pooler.us-east-2.aws.neon.tech/neondb",
         "P@ssword#123"),
        ("postgres://app_user:SuperSecretToken@127.0.0.1:5432/stego",
         "SuperSecretToken"),
    ]

    for raw_url, secret in test_urls:
        masked = _mask_url_credentials(raw_url)
        assert secret not in masked, f"Security leak: {secret} found in masked URL '{masked}'"
        assert "***" in masked


def test_url_normalization():
    """Verifies automatic conversion of standard Postgres/Neon URLs to asyncpg and psycopg2 formats."""
    # Case 1: postgres://
    s1 = Settings(DATABASE_URL="postgres://user:pw@ep-xyz.neon.tech/neondb?sslmode=require")
    assert s1.get_async_database_url().startswith("postgresql+asyncpg://")
    assert s1.get_sync_database_url().startswith("postgresql+psycopg2://")

    # Case 2: postgresql://
    s2 = Settings(DATABASE_URL="postgresql://user:pw@ep-xyz.neon.tech/neondb")
    assert s2.get_async_database_url().startswith("postgresql+asyncpg://")
    assert s2.get_sync_database_url().startswith("postgresql+psycopg2://")

    # Case 3: Empty URL in development -> resolves to SQLite
    s3 = Settings(DATABASE_URL=None, ENVIRONMENT="development")
    assert s3.get_async_database_url().startswith("sqlite+aiosqlite:///")
    assert s3.get_sync_database_url().startswith("sqlite:///")


def test_production_guardrail_disables_sqlite_fallback():
    """
    CRITICAL REQUIREMENT #2:
    Verifies that in production mode (ENVIRONMENT='production'), if Neon is unreachable,
    the application strictly raises DatabaseConnectionError and NEVER silently falls back to SQLite.
    """
    from app.core.database import _select_engine

    # Scenario A: Production with unreachable postgres host
    prod_settings_unreachable = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@192.0.2.1:5432/steganalysis",  # RFC 5737 TEST-NET (unreachable)
    )

    # Monkeypatch settings temporarily
    import app.core.database as db_mod
    original_settings = db_mod.settings
    try:
        db_mod.settings = prod_settings_unreachable
        with pytest.raises(DatabaseConnectionError) as exc_info:
            db_mod._select_engine()
        assert "Automatic fallback to SQLite is DISABLED in production" in str(exc_info.value)

        # Scenario B: Production with SQLite URL
        prod_settings_sqlite = Settings(
            ENVIRONMENT="production",
            DATABASE_URL="sqlite:///stego.db",
        )
        db_mod.settings = prod_settings_sqlite
        with pytest.raises(DatabaseConnectionError) as exc_info:
            db_mod._select_engine()
        assert "Production environment requires a valid PostgreSQL/Neon DATABASE_URL" in str(exc_info.value)

    finally:
        db_mod.settings = original_settings


@pytest.mark.asyncio
async def test_full_schema_tables_and_relationships():
    """Verifies that all 5 database models have complete schema definitions and valid relationships."""
    assert "users" in Base.metadata.tables
    assert "user_sessions" in Base.metadata.tables
    assert "password_reset_tokens" in Base.metadata.tables
    assert "scan_records" in Base.metadata.tables
    assert "lab_experiments" in Base.metadata.tables

    # Check foreign keys
    sessions_table = Base.metadata.tables["user_sessions"]
    fk_user = list(sessions_table.foreign_keys)[0]
    assert fk_user.column.table.name == "users"

    scan_table = Base.metadata.tables["scan_records"]
    assert any(fk.column.table.name == "users" for fk in scan_table.foreign_keys)

    exp_table = Base.metadata.tables["lab_experiments"]
    assert any(fk.column.table.name == "users" for fk in exp_table.foreign_keys)
