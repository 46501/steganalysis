import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import all models to ensure complete metadata discovery
try:
    from app.models import Base, User, UserSession, PasswordResetToken, ScanRecord, ExperimentRecord  # noqa: F401
    target_metadata = Base.metadata
except ImportError as e:
    target_metadata = None

# Dynamically resolve synchronous database URL from settings or environment if not explicitly provided
current_url = config.get_main_option("sqlalchemy.url")
if not current_url or "localhost:5432/steganalysis" in current_url:
    try:
        from app.core.config import settings
        sync_url = settings.get_sync_database_url()
        if sync_url:
            config.set_main_option("sqlalchemy.url", sync_url)
    except Exception:
        env_db_url = os.getenv("SYNC_DATABASE_URL") or os.getenv("DATABASE_URL")
        if env_db_url:
            if env_db_url.startswith("postgresql+asyncpg://"):
                env_db_url = env_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            elif env_db_url.startswith("postgres://"):
                env_db_url = env_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif env_db_url.startswith("postgresql://") and not env_db_url.startswith("postgresql+"):
                env_db_url = env_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif env_db_url.startswith("sqlite+aiosqlite:///"):
                env_db_url = env_db_url.replace("sqlite+aiosqlite:///", "sqlite:///", 1)
            config.set_main_option("sqlalchemy.url", env_db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
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
