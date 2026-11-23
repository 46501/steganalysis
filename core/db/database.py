"""core/db/database.py — SQLite database engine with WAL mode and connection pooling."""
from __future__ import annotations

import os
import sqlite3
import threading
from contextlib import contextmanager, suppress
from pathlib import Path
from collections.abc import Generator

# Thread-local storage for connections
_local = threading.local()

DEFAULT_DB_FILENAME = "stegovault.db"


def get_db_path() -> Path:
    """Resolve the SQLite database file path from environment or default project root."""
    env_path = os.getenv("STEGOVAULT_DB_PATH") or os.getenv("DATABASE_PATH")
    if env_path:
        p = Path(env_path).resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    # Default to project root if writable; fall back to user home directory
    project_root = Path(__file__).resolve().parent.parent.parent
    candidate = project_root / DEFAULT_DB_FILENAME
    try:
        if candidate.exists():
            if os.access(candidate, os.W_OK):
                return candidate
        elif os.access(project_root, os.W_OK):
            return candidate
    except Exception:
        pass

    fallback = Path.home() / ".stegovault" / DEFAULT_DB_FILENAME
    fallback.parent.mkdir(parents=True, exist_ok=True)
    return fallback


def get_db(db_target: sqlite3.Connection | Path | str | None = None) -> sqlite3.Connection:
    """Get or create a thread-local SQLite connection with optimal pragmas."""
    if isinstance(db_target, sqlite3.Connection):
        return db_target

    if db_target == ":memory:":
        target_path_str = ":memory:"
    elif db_target:
        target_path_str = str(Path(db_target).resolve())
    else:
        target_path_str = str(get_db_path())

    key = target_path_str

    conns = getattr(_local, "conns", None)
    if conns is None:
        conns = _local.conns = {}

    conn = conns.get(key)
    if conn is None:
        if target_path_str != ":memory:":
            Path(target_path_str).parent.mkdir(parents=True, exist_ok=True)

        conn = sqlite3.connect(
            target_path_str,
            timeout=10.0,
            check_same_thread=False,
            isolation_level=None,  # Autocommit mode; transactions managed via BEGIN/COMMIT
        )
        conn.row_factory = sqlite3.Row

        # Performance, durability, and integrity pragmas
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        if target_path_str != ":memory:":
            cursor.execute("PRAGMA journal_mode = WAL;")
            cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute("PRAGMA busy_timeout = 5000;")
        cursor.close()

        conns[key] = conn

    return conn


def close_db(e=None):
    """Close the current thread's database connections."""
    conns = getattr(_local, "conns", None)
    if conns:
        for conn in conns.values():
            with suppress(Exception):
                conn.close()
        conns.clear()


@contextmanager
def transaction(conn: sqlite3.Connection | None = None) -> Generator[sqlite3.Cursor, None, None]:
    """Context manager for explicit atomic database transactions."""
    c = conn or get_db()
    cursor = c.cursor()
    cursor.execute("BEGIN IMMEDIATE;")
    try:
        yield cursor
        cursor.execute("COMMIT;")
    except Exception:
        with suppress(Exception):
            cursor.execute("ROLLBACK;")
        raise
    finally:
        cursor.close()


def init_db(db_path: Path | str | None = None) -> None:
    """Execute schema definitions to initialize or update database tables."""
    conn = get_db(db_path)
    schema_file = Path(__file__).parent / "schema.sql"
    if not schema_file.is_file():
        raise FileNotFoundError(f"Database schema file not found at {schema_file}")

    schema_sql = schema_file.read_text(encoding="utf-8")
    cursor = conn.cursor()
    cursor.executescript(schema_sql)
    cursor.close()
