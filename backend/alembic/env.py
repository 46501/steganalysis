import os
import sys
import urllib.parse
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# ---------------------------------------------------------------------------
# Setup Paths & Environment Loading
# ---------------------------------------------------------------------------
# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Explicitly load backend/.env if available regardless of invocation CWD
env_file_path = backend_dir / ".env"
if env_file_path.is_file():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_file_path, override=True)
    except ImportError:
        pass

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Model Metadata Discovery
# ---------------------------------------------------------------------------
try:
    from app.models import Base, User, UserSession, PasswordResetToken, ScanRecord, ExperimentRecord  # noqa: F401
    target_metadata = Base.metadata
except ImportError as e:
    target_metadata = None

# ---------------------------------------------------------------------------
# Helper: Mask Credentials in Database URL
# ---------------------------------------------------------------------------
def mask_database_url(url: str) -> str:
    """Masks database passwords to prevent credential leakage in logs and banners."""
    if not url:
        return "<none>"
    try:
        parsed = urllib.parse.urlparse(url)
        if not parsed.hostname:
            return url
        netloc = ""
        if parsed.username:
            netloc += parsed.username
            if parsed.password:
                netloc += ":***"
            netloc += "@"
        netloc += parsed.hostname
        if parsed.port:
            netloc += f":{parsed.port}"
        return urllib.parse.urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    except Exception:
        return "<masked_url>"


# ---------------------------------------------------------------------------
# Dynamic Sync Database URL Resolution & Strict Fallback Guard
# ---------------------------------------------------------------------------
sync_url = None
use_sqlite = False

try:
    from app.core.config import settings
    use_sqlite = getattr(settings, "USE_SQLITE", False)
    sync_url = settings.get_sync_database_url()
except Exception as err:
    # Manual fallback to environment variables
    env_use_sqlite = os.getenv("USE_SQLITE", "false").strip().lower() in ("true", "1", "yes", "on")
    use_sqlite = env_use_sqlite
    env_db_url = os.getenv("SYNC_DATABASE_URL") or os.getenv("DATABASE_URL")
    if env_db_url and not use_sqlite:
        raw_url = env_db_url.strip()
        if raw_url.startswith("postgresql+asyncpg://"):
            sync_url = raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        elif raw_url.startswith("postgres://"):
            sync_url = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
            sync_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        else:
            sync_url = raw_url
    elif use_sqlite:
        sqlite_path = backend_dir / "storage" / "stego.db"
        sync_url = f"sqlite:///{sqlite_path.as_posix()}"

if not sync_url:
    current_cfg_url = config.get_main_option("sqlalchemy.url")
    if current_cfg_url and "localhost:5432/steganalysis" not in current_cfg_url:
        sync_url = current_cfg_url

# STRICT PRODUCTION & NEON GUARD:
# If USE_SQLITE is False, SQLite is strictly forbidden.
if not use_sqlite and sync_url and "sqlite" in sync_url.lower():
    raise RuntimeError(
        "\n==============================================================================\n"
        "FATAL DATABASE CONFIGURATION ERROR:\n"
        "Alembic attempted to connect to SQLite, but USE_SQLITE is set to False.\n"
        "Neon PostgreSQL is configured as the active database.\n"
        "Automatic fallback to SQLite is strictly forbidden to protect data integrity.\n"
        "=============================================================================="
    )

if sync_url:
    config.set_main_option("sqlalchemy.url", sync_url)


def print_pre_migration_banner(mode: str) -> None:
    """Prints a clear, verified database target banner without exposing credentials."""
    active_url = config.get_main_option("sqlalchemy.url") or ""
    masked_url = mask_database_url(active_url)
    try:
        parsed = urllib.parse.urlparse(active_url)
        dialect = parsed.scheme.split("+")[0] if parsed.scheme else "unknown"
        driver = parsed.scheme.split("+")[1] if "+" in parsed.scheme else "default"
        host = parsed.hostname or "local/file"
        db_name = parsed.path.lstrip("/") if parsed.path else "unknown"
    except Exception:
        dialect = "unknown"
        driver = "unknown"
        host = "unknown"
        db_name = "unknown"

    sys.stderr.write(
        "\n"
        "==============================================================================\n"
        "StegoShield AI — Alembic Database Migration Check\n"
        "==============================================================================\n"
        f"  * Mode            : {mode.upper()}\n"
        f"  * Target Dialect  : {dialect}\n"
        f"  * Driver          : {driver}\n"
        f"  * Target Host     : {host}\n"
        f"  * Target Database : {db_name}\n"
        f"  * Masked URL      : {masked_url}\n"
        f"  * USE_SQLITE      : {use_sqlite}\n"
        "==============================================================================\n\n"
    )
    sys.stderr.flush()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    print_pre_migration_banner("offline")
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    print_pre_migration_banner("online")
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

