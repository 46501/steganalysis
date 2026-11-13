import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
import psycopg2

def verify_neon():
    sync_url = settings.get_sync_database_url()
    psycopg2_url = sync_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    print("Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(psycopg2_url)
    cur = conn.cursor()

    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"\n[OK] Public tables found in Neon ({len(tables)} total): {tables}")

    cur.execute("SELECT version_num FROM alembic_version;")
    current_rev = cur.fetchone()[0]
    print(f"[OK] Current Alembic Version: {current_rev}")

    expected_tables = ["users", "user_sessions", "password_reset_tokens", "scan_records", "lab_experiments"]
    missing = [t for t in expected_tables if t not in tables]
    if missing:
        print(f"[ERROR] Missing expected tables: {missing}")
    else:
        print(f"[OK] All 5 expected application tables are present!")

    print("\nTable Details:")
    for table in tables:
        cur.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = '{table}'
            ORDER BY ordinal_position;
        """)
        cols = cur.fetchall()
        cur.execute(f"SELECT COUNT(*) FROM {table};")
        count = cur.fetchone()[0]
        print(f"  * {table} ({len(cols)} columns, {count} rows):")
        for c in cols:
            print(f"      - {c[0]}: {c[1]} (nullable: {c[2]})")

    cur.close()
    conn.close()

if __name__ == "__main__":
    verify_neon()
