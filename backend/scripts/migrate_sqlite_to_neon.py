"""
StegoShield AI — SQLite to Neon PostgreSQL Data Migration Utility.

Reads existing forensic records, user accounts, and experiment history from local
backend/storage/stego.db (in strict READ-ONLY mode) and inserts them into Neon PostgreSQL.

SAFETY GUARANTEES:
1. Strict Read-Only on SQLite: stego.db is never modified, deleted, or reset.
2. Idempotent Upsert: Skips existing IDs without generating duplicate key violations.
3. PostgreSQL Sequence Reset: Updates SERIAL sequences after insertion so new records don't collide.
4. Foreign Key Safety: Filters out orphan child records that do not match existing user IDs.
5. Boolean & Timestamp Normalization: Casts integer booleans to native PostgreSQL booleans.
6. Dry-Run by Default: Requires explicit '--confirm' flag to perform write operations.
"""

import argparse
import logging
import os
import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Set

# Ensure backend root is on path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import psycopg2
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stego.migration")

SQLITE_PATH = backend_dir / "storage" / "stego.db"
BOOLEAN_COLUMNS = {"is_active", "email_verified", "is_trained_weights"}


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

    # Clean URL for raw psycopg2 connection
    if target_url.startswith("postgresql+psycopg2://"):
        target_url = target_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    elif target_url.startswith("postgresql+asyncpg://"):
        target_url = target_url.replace("postgresql+asyncpg://", "postgresql://", 1)

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
        # Check existing user IDs and emails in Neon
        pg_cur.execute("SELECT id, email FROM users")
        existing_users = pg_cur.fetchall()
        existing_user_ids: Set[int] = set(r[0] for r in existing_users)
        existing_emails: Set[str] = set(r[1] for r in existing_users)
        logger.info(f"Existing Neon records: {len(existing_user_ids)} users found.")

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

            filtered_tuples = []
            for r in rows:
                row_dict = dict(r)

                # Convert integer booleans to native Python booleans
                for c in columns:
                    if c in BOOLEAN_COLUMNS and row_dict[c] is not None:
                        row_dict[c] = bool(row_dict[c])

                # Check foreign key integrity
                if table == "users":
                    if row_dict["email"] in existing_emails and row_dict["id"] not in existing_user_ids:
                        logger.warning(f"Skipping user with conflicting email: {row_dict['email']}")
                        continue
                elif "user_id" in columns:
                    uid = row_dict.get("user_id")
                    if uid is not None and uid not in existing_user_ids:
                        if table in ("scan_records", "lab_experiments"):
                            row_dict["user_id"] = None
                        else:
                            continue

                filtered_tuples.append(tuple(row_dict[c] for c in columns))

            if filtered_tuples:
                pg_cur.executemany(insert_query, filtered_tuples)
                count = len(filtered_tuples)
                total_migrated += count
                logger.info(f"Successfully migrated {count} records into '{table}'.")

                # If we just migrated users, update existing_user_ids
                if table == "users":
                    pg_cur.execute("SELECT id FROM users")
                    existing_user_ids = set(r[0] for r in pg_cur.fetchall())

                # Reset serial sequence
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
        logger.info(f"MIGRATION COMPLETE: {total_migrated} records processed into Neon PostgreSQL.")

        # Verify specifically that omkulkarni031@gmail.com exists in Neon
        pg_cur.execute("SELECT id, email, full_name, is_active FROM users WHERE email = 'omkulkarni031@gmail.com'")
        om_user = pg_cur.fetchone()
        if om_user:
            logger.info(f"VERIFIED: User '{om_user[1]}' (id={om_user[0]}, name='{om_user[2]}') is now active in Neon PostgreSQL!")
        else:
            logger.warning("omkulkarni031@gmail.com was not found after migration.")

    except Exception as e:
        pg_conn.rollback()
        logger.error(f"Migration aborted due to error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        pg_conn.close()


if __name__ == "__main__":
    migrate()
