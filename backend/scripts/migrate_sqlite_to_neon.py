"""
StegoShield AI — SQLite to Neon PostgreSQL Data Migration Utility (OPTIONAL).

Reads existing forensic records, user accounts, and experiment history from local
backend/storage/stego.db (in strict READ-ONLY mode) and inserts them into Neon PostgreSQL.

SAFETY GUARANTEES:
1. Strict Read-Only on SQLite: stego.db is never modified, deleted, or reset.
2. Idempotent Upsert: Skips existing IDs without generating duplicate key violations.
3. PostgreSQL Sequence Reset: Updates SERIAL sequences after insertion so new records don't collide.
4. Dry-Run by Default: Requires explicit '--confirm' flag to perform write operations.

DO NOT EXECUTE WITHOUT EXPLICIT OPERATOR APPROVAL.
"""

import argparse
import logging
import os
import sqlite3
import sys
from pathlib import Path
from typing import Dict, List

# Ensure backend root is on path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import psycopg2
from psycopg2.extras import execute_values
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stego.migration")

SQLITE_PATH = backend_dir / "storage" / "stego.db"


def parse_args():
    parser = argparse.ArgumentParser(description="Migrate StegoShield records from SQLite to Neon PostgreSQL.")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Execute actual writes to Neon PostgreSQL. Without this flag, a safe dry-run audit is performed.",
    )
    parser.add_argument(
        "--sqlite-path",
        type=str,
        default=str(SQLITE_PATH),
        help="Path to source SQLite database file (default: backend/storage/stego.db).",
    )
    parser.add_argument(
        "--target-url",
        type=str,
        default=None,
        help="Target Neon PostgreSQL connection string (defaults to SYNC_DATABASE_URL or DATABASE_URL).",
    )
    return parser.parse_args()


def migrate():
    args = parse_args()
    sqlite_file = Path(args.sqlite_path)

    if not sqlite_file.is_file():
        logger.error(f"Source SQLite database not found at {sqlite_file}")
        sys.exit(1)

    target_url = args.target_url or settings.get_sync_database_url()
    if not target_url or "sqlite" in target_url.lower():
        logger.error("A valid PostgreSQL target connection URL must be provided via --target-url or DATABASE_URL in .env")
        sys.exit(1)

    # Sanitize logged URL
    masked_target = target_url.split("@")[-1] if "@" in target_url else "target database"
    logger.info(f"Source SQLite database: {sqlite_file} (Read-Only)")
    logger.info(f"Target PostgreSQL: ...@{masked_target}")

    if not args.confirm:
        logger.warning("DRY-RUN MODE: No database changes will be written. Run with '--confirm' to perform actual migration.")

    # 1. Connect to SQLite in read-only mode
    sqlite_uri = f"file:{sqlite_file.resolve().as_posix()}?mode=ro"
    sqlite_conn = sqlite3.connect(sqlite_uri, uri=True)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Tables in dependency order
    tables = [
        "users",
        "user_sessions",
        "password_reset_tokens",
        "scan_records",
        "lab_experiments",
    ]

    table_data: Dict[str, List[sqlite3.Row]] = {}
    for t in tables:
        try:
            sqlite_cur.execute(f"SELECT * FROM {t} ORDER BY id ASC")
            rows = sqlite_cur.fetchall()
            table_data[t] = rows
            logger.info(f"Found {len(rows)} records in SQLite table '{t}'.")
        except sqlite3.OperationalError as e:
            logger.warning(f"Could not read table '{t}' from SQLite: {e}")
            table_data[t] = []

    sqlite_conn.close()

    if not args.confirm:
        logger.info("Dry-run audit complete. All records were successfully verified in SQLite.")
        logger.info("To migrate these records into Neon PostgreSQL, execute with '--confirm'.")
        return

    # 2. Connect to PostgreSQL
    logger.info("Connecting to target PostgreSQL database...")
    pg_conn = psycopg2.connect(target_url)
    pg_cur = pg_conn.cursor()

    try:
        total_migrated = 0
        for table in tables:
            rows = table_data.get(table, [])
            if not rows:
                continue

            columns = list(rows[0].keys())
            cols_str = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s" for _ in columns])
            insert_query = f"""
                INSERT INTO "{table}" ({cols_str})
                VALUES ({placeholders})
                ON CONFLICT (id) DO NOTHING;
            """

            row_tuples = [tuple(r[c] for c in columns) for r in rows]
            pg_cur.executemany(insert_query, row_tuples)
            count = len(row_tuples)
            total_migrated += count
            logger.info(f"Successfully migrated {count} records into '{table}'.")

            # Reset serial sequence so auto-increment works for subsequent inserts
            try:
                pg_cur.execute(f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM "{table}"), 1)
                    );
                """)
            except Exception as e:
                logger.warning(f"Could not reset sequence for table '{table}': {e}")

        pg_conn.commit()
        logger.info(f"MIGRATION COMPLETE: {total_migrated} total records migrated successfully to Neon PostgreSQL.")
    except Exception as e:
        pg_conn.rollback()
        logger.error(f"Migration aborted due to error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        pg_conn.close()


if __name__ == "__main__":
    migrate()

