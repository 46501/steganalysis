import os
import sys
import urllib.parse
from pathlib import Path

def diagnose():
    print("=" * 60)
    print("StegoShield AI — Neon Connection & Auth Diagnostic")
    print("=" * 60)

    # 1. Check OS Process Environment
    os_db_url = os.environ.get("DATABASE_URL")
    os_sync_url = os.environ.get("SYNC_DATABASE_URL")
    print(f"[*] OS Environment 'DATABASE_URL' is set     : {os_db_url is not None}")
    print(f"[*] OS Environment 'SYNC_DATABASE_URL' is set: {os_sync_url is not None}")

    # 2. Check backend/.env
    env_path = Path(__file__).resolve().parent.parent / ".env"
    print(f"[*] Reading .env from: {env_path}")
    raw_db_url = None
    raw_sync_url = None
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if s.startswith("DATABASE_URL="):
                    raw_db_url = s.split("DATABASE_URL=", 1)[1].strip().strip("\"'")
                elif s.startswith("SYNC_DATABASE_URL="):
                    raw_sync_url = s.split("SYNC_DATABASE_URL=", 1)[1].strip().strip("\"'")

    print(f"[*] .env contains DATABASE_URL     : {raw_db_url is not None}")
    print(f"[*] .env contains SYNC_DATABASE_URL: {raw_sync_url is not None}")

    if not raw_db_url:
        print("[!] No DATABASE_URL found in .env!")
        return

    # Check structure
    parsed = urllib.parse.urlparse(raw_db_url)
    print(f"[*] URL Scheme    : {parsed.scheme}")
    print(f"[*] URL Username  : {parsed.username}")
    print(f"[*] URL Hostname  : {parsed.hostname}")
    print(f"[*] URL Port      : {parsed.port}")
    print(f"[*] URL Database  : {parsed.path}")
    print(f"[*] URL Query     : {parsed.query}")

    pw = parsed.password or ""
    print(f"[*] Password Length        : {len(pw)}")
    print(f"[*] Password Starts with   : {pw[:3]}... (length={len(pw)})")
    print(f"[*] Password Ends with     : ...{pw[-3:] if len(pw) >= 3 else ''}")
    
    # Check for percent encoding
    has_percent = "%" in pw
    print(f"[*] Contains '%' character : {has_percent}")
    if has_percent:
        unquoted = urllib.parse.unquote(pw)
        print(f"[*] Length if unquoted     : {len(unquoted)}")

    # Check for raw special characters that break URLs if unencoded
    # Note: '@', ':', '/', '?', '#' in a raw password will break urlparse before pw is extracted!
    # Let's inspect netloc splitting:
    # URL format: postgresql://username:password@hostname:port/dbname
    if "@" in raw_db_url:
        auth_part, host_part = raw_db_url.split("://", 1)[1].split("@", 1)[0], raw_db_url.split("@", 1)[1]
        print(f"[*] Multiple '@' in URL   : {raw_db_url.count('@') > 1}")
        if ":" in auth_part:
            u, raw_pw_extracted = auth_part.split(":", 1)
            print(f"[*] Multiple ':' in auth   : {auth_part.count(':') > 1}")

    # 3. Test actual connections
    print("\n--- Testing Authentication ---")
    import psycopg2
    from psycopg2 import OperationalError

    # Test 1: Direct connection using parsed parameters
    print("[1] Testing psycopg2 with parsed parameters directly...")
    try:
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            dbname=parsed.path.lstrip("/"),
            user=parsed.username,
            password=pw,
            sslmode="require",
            connect_timeout=5,
        )
        print("  -> [SUCCESS] Authentication succeeded with raw parsed password!")
        conn.close()
    except OperationalError as e:
        print(f"  -> [FAILED] OperationalError: {e}")

    # Test 2: If percent-encoded, test with unquoted password
    if has_percent:
        print("[2] Testing psycopg2 with unquoted (URL-decoded) password...")
        try:
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                dbname=parsed.path.lstrip("/"),
                user=parsed.username,
                password=urllib.parse.unquote(pw),
                sslmode="require",
                connect_timeout=5,
            )
            print("  -> [SUCCESS] Authentication succeeded with unquoted password!")
            conn.close()
        except OperationalError as e:
            print(f"  -> [FAILED] OperationalError: {e}")

    # Test 3: Test with URL-quoted password if it wasn't quoted
    if not has_percent:
        quoted_pw = urllib.parse.quote(pw, safe="")
        if quoted_pw != pw:
            print(f"[3] Testing with quoted password (special chars were encoded)...")
            try:
                conn = psycopg2.connect(
                    host=parsed.hostname,
                    port=parsed.port or 5432,
                    dbname=parsed.path.lstrip("/"),
                    user=parsed.username,
                    password=pw, # psycopg2 takes raw password, URL takes quoted
                    sslmode="require",
                    connect_timeout=5,
                )
                print("  -> [SUCCESS] Direct connect succeeded!")
                conn.close()
            except OperationalError as e:
                print(f"  -> [FAILED] OperationalError: {e}")

if __name__ == "__main__":
    diagnose()

