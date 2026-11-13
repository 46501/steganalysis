"""
StegoShield AI — End-to-End Production Verification with Neon PostgreSQL
Validates:
1. FastAPI startup with ENVIRONMENT=production and Neon PostgreSQL
2. Database connectivity & health status
3. User registration & login
4. User session storage & retrieval in Neon (including token rotation)
5. Scan execution & scan history persistence in Neon
6. Lab experiment persistence in Neon
7. Backend restart and persistence verification across process restarts
8. Confirmation that local SQLite database is untouched (delta = 0)
"""

import io
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import httpx
from PIL import Image
import psycopg2
import sqlite3
from app.core.config import settings

BASE_URL = "http://127.0.0.1:8000"
SQLITE_PATH = backend_dir / "storage" / "stego.db"


def get_sqlite_counts():
    """Inspects record counts in the local development SQLite database."""
    if not SQLITE_PATH.exists():
        return {}
    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()
    counts = {}
    for table in ["users", "scan_records", "lab_experiments", "user_sessions"]:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
        except Exception:
            counts[table] = 0
    conn.close()
    return counts


def get_neon_counts():
    """Inspects record counts directly in the Neon PostgreSQL database."""
    sync_url = settings.get_sync_database_url()
    psycopg2_url = sync_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    conn = psycopg2.connect(psycopg2_url)
    cur = conn.cursor()
    counts = {}
    for table in ["users", "scan_records", "lab_experiments", "user_sessions"]:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
        except Exception:
            counts[table] = 0
    cur.close()
    conn.close()
    return counts


def create_test_image_bytes():
    """Generates a small in-memory 128x128 PNG image for scanning."""
    img = Image.new("RGB", (128, 128), color=(140, 150, 160))
    # Add a slight gradient pattern
    pixels = img.load()
    for y in range(128):
        for x in range(128):
            pixels[x, y] = ((x * 2) % 256, (y * 2) % 256, ((x + y)) % 256)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def start_backend(log_name="e2e_backend.log"):
    """Starts the FastAPI backend using uvicorn as a subprocess without pipe buffer deadlocks."""
    print(f"[*] Launching FastAPI backend with Uvicorn (ENVIRONMENT=production, logging to {log_name})...")
    env = os.environ.copy()
    env["ENVIRONMENT"] = "production"
    env["PYTHONUNBUFFERED"] = "1"
    log_path = backend_dir / "storage" / log_name
    log_file = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(backend_dir),
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        text=True,
    )
    proc._log_file = log_file
    return proc


def wait_for_server(proc, timeout=40.0):
    """Waits for server health check to respond with 200 OK."""
    start = time.time()
    while time.time() - start < timeout:
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            raise RuntimeError(f"Backend process terminated unexpectedly:\n{stderr or stdout}")
        try:
            r = httpx.get(f"{BASE_URL}/api/v1/health", timeout=3.0)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        time.sleep(1.0)
    raise TimeoutError(f"Backend failed to respond on {BASE_URL} within {timeout}s")


def stop_backend(proc):
    """Gracefully terminates backend process and closes log handle."""
    print("[*] Stopping FastAPI backend...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
    if hasattr(proc, "_log_file"):
        try:
            proc._log_file.close()
        except Exception:
            pass
    time.sleep(2.0)


def run_e2e_tests():
    print("=" * 80)
    print("StegoShield AI — Neon PostgreSQL End-to-End Verification")
    print("=" * 80)

    # Step 0: Record initial counts
    sqlite_init = get_sqlite_counts()
    neon_init = get_neon_counts()
    print(f"[*] Initial SQLite records : {sqlite_init}")
    print(f"[*] Initial Neon records   : {neon_init}")

    # Step 1: Start backend
    proc = start_backend()
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    try:
        # Step 2: Health check & connectivity
        health_data = wait_for_server(proc)
        print("\n--- [Step 2: Database Connectivity Check] ---")
        print(f"[OK] Health status: {health_data.get('status')}")
        db_info = health_data.get("database", {})
        print(f"[OK] DB Type      : {db_info.get('type')}")
        print(f"[OK] DB Status    : {db_info.get('status')}")
        assert db_info.get("type") == "Neon PostgreSQL", f"Expected Neon PostgreSQL, got {db_info.get('type')}"
        assert db_info.get("status") == "connected"

        # Step 3: User Registration
        print("\n--- [Step 3: User Registration & Login] ---")
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"neon_tester_{unique_id}@stegoshield.io"
        test_password = "NeonSecurePassword2026!"
        test_name = f"Neon Tester {unique_id}"

        reg_payload = {
            "full_name": test_name,
            "email": test_email,
            "password": test_password,
            "confirm_password": test_password,
        }
        reg_resp = client.post(
            "/api/v1/auth/register",
            json=reg_payload,
            headers={"X-StegoShield-Client": "1"},
        )
        print(f"Registration status: {reg_resp.status_code}")
        assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
        reg_data = reg_resp.json()
        access_token = reg_data["access_token"]
        user_info = reg_data["user"]
        user_id = user_info["id"]
        print(f"[OK] User registered successfully (User ID: {user_id}, Email: {test_email})")

        # Step 3b: User Login
        login_payload = {
            "email": test_email,
            "password": test_password,
            "remember_me": True,
        }
        login_resp = client.post(
            "/api/v1/auth/login",
            json=login_payload,
            headers={"X-StegoShield-Client": "1"},
        )
        print(f"Login status: {login_resp.status_code}")
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        access_token = login_data["access_token"]
        refresh_cookie = login_resp.cookies.get("stego_refresh_token")
        print(f"[OK] Login successful. Access token received. Refresh cookie present: {bool(refresh_cookie)}")

        # Step 4: Verify User Sessions in Neon
        print("\n--- [Step 4: User Session Verification in Neon] ---")
        sync_url = settings.get_sync_database_url()
        psycopg2_url = sync_url.replace("postgresql+psycopg2://", "postgresql://", 1)
        db_conn = psycopg2.connect(psycopg2_url)
        db_cur = db_conn.cursor()

        db_cur.execute(
            "SELECT id, user_id, refresh_token_hash, created_at, expires_at, revoked_at FROM user_sessions WHERE user_id = %s;",
            (user_id,),
        )
        sessions = db_cur.fetchall()
        print(f"[OK] Sessions retrieved directly from Neon PostgreSQL: {len(sessions)} session(s) found for user {user_id}")
        assert len(sessions) >= 1, "Expected at least 1 session record in Neon"
        for s in sessions:
            print(f"     Session ID: {s[0]}, User ID: {s[1]}, Expires: {s[4]}, Revoked: {s[5]}")

        # Test session refresh via API
        refresh_resp = client.post(
            "/api/v1/auth/refresh",
            cookies=login_resp.cookies,
            headers={"X-StegoShield-Client": "1"},
        )
        print(f"Session token refresh status: {refresh_resp.status_code}")
        assert refresh_resp.status_code == 200, f"Refresh failed: {refresh_resp.text}"
        refreshed_data = refresh_resp.json()
        new_access_token = refreshed_data["access_token"]
        print("[OK] Session successfully validated and refreshed from Neon!")
        auth_headers = {
            "Authorization": f"Bearer {new_access_token}",
            "X-StegoShield-Client": "1",
        }

        # Step 5: Test Scan Execution and Scan History Persistence
        print("\n--- [Step 5: Image Scan & Scan History Persistence in Neon] ---")
        test_img_bytes = create_test_image_bytes()
        scan_resp = client.post(
            "/api/v1/analyze",
            files={"file": ("e2e_neon_test_image.png", test_img_bytes, "image/png")},
            headers=auth_headers,
        )
        print(f"Scan analysis status: {scan_resp.status_code}")
        assert scan_resp.status_code == 200, f"Scan failed: {scan_resp.text}"
        scan_data = scan_resp.json()
        print(f"[OK] Scan Analysis Verdict: {scan_data.get('verdict')} (Confidence: {scan_data.get('confidence'):.2%})")

        # Query Neon scan_records directly
        db_cur.execute(
            "SELECT id, user_id, filename, file_hash, verdict, confidence, created_at FROM scan_records WHERE user_id = %s;",
            (user_id,),
        )
        scans = db_cur.fetchall()
        print(f"[OK] Scan records in Neon PostgreSQL: {len(scans)} record(s) found for user {user_id}")
        assert len(scans) >= 1, "Expected scan record to be persisted in Neon"
        scan_row = scans[0]
        print(f"     Scan ID: {scan_row[0]}, File: {scan_row[2]}, Verdict: {scan_row[4]}, Confidence: {scan_row[5]:.2%}")

        # Retrieve via API /api/v1/history
        history_resp = client.get("/api/v1/history", headers=auth_headers)
        print(f"Scan history API status: {history_resp.status_code}")
        assert history_resp.status_code == 200, f"History fetch failed: {history_resp.text}"
        history_data = history_resp.json()
        total_scans = history_data.get("total_count", len(history_data.get("items", [])))
        print(f"[OK] History items returned by API: {total_scans} total scan(s)")
        assert total_scans >= 1, "Expected at least 1 scan history item"

        # Step 6: Test Lab Experiment Persistence
        print("\n--- [Step 6: Lab Experiment Persistence in Neon] ---")
        exp_payload = {
            "experiment_name": f"Neon E2E Experiment {unique_id}",
            "experiment_type": "bit_manipulation",
            "original_filename": "e2e_sample.png",
            "original_file_hash": "e2e_orig_hash_12345",
            "modified_file_hash": "e2e_mod_hash_67890",
            "dimensions": "128x128",
            "color_mode": "RGB",
            "parameters": {"bit_plane": 0, "channel": "R", "test_run": unique_id},
            "comparison": {"psnr": 51.2, "ssim": 0.9998, "mse": 0.48},
            "analysis": {"verdict": "Cover Indicated", "confidence": 0.95},
        }
        exp_resp = client.post("/api/v1/lab/experiments", json=exp_payload, headers=auth_headers)
        print(f"Lab experiment save status: {exp_resp.status_code}")
        assert exp_resp.status_code == 201, f"Lab experiment save failed: {exp_resp.text}"
        exp_data = exp_resp.json()
        exp_id = exp_data["id"]
        print(f"[OK] Lab experiment created with ID: {exp_id}")

        # Query Neon lab_experiments directly
        db_cur.execute(
            "SELECT id, user_id, experiment_name, experiment_type, created_at FROM lab_experiments WHERE id = %s;",
            (exp_id,),
        )
        exp_rows = db_cur.fetchall()
        print(f"[OK] Lab experiments in Neon PostgreSQL: {len(exp_rows)} record(s) found with ID {exp_id}")
        assert len(exp_rows) == 1, "Expected experiment record in Neon"
        print(f"     Experiment: {exp_rows[0][2]} (Type: {exp_rows[0][3]}, Created: {exp_rows[0][4]})")

        # Retrieve via API /api/v1/lab/experiments
        lab_list_resp = client.get("/api/v1/lab/experiments", headers=auth_headers)
        print(f"Lab experiments list API status: {lab_list_resp.status_code}")
        assert lab_list_resp.status_code == 200
        experiments_list = lab_list_resp.json()
        print(f"[OK] API returned {len(experiments_list)} experiment(s)")
        assert any(e["id"] == exp_id for e in experiments_list)

        db_cur.close()
        db_conn.close()

    finally:
        stop_backend(proc)

    # Step 7: Restart the Backend & Verify Persistence
    print("\n--- [Step 7: Backend Restart & Data Persistence Across Restarts] ---")
    proc2 = start_backend(log_name="e2e_backend_restart.log")
    client2 = httpx.Client(base_url=BASE_URL, timeout=30.0)

    try:
        health2 = wait_for_server(proc2)
        print(f"[OK] Backend successfully restarted. Health status: {health2.get('status')}")

        # Verify user profile still loads
        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "X-StegoShield-Client": "1",
        }
        profile_resp = client2.get("/api/v1/users/profile", headers=auth_headers)
        print(f"Profile retrieval after restart status: {profile_resp.status_code}")
        assert profile_resp.status_code == 200, f"Profile fetch failed: {profile_resp.text}"
        profile_data = profile_resp.json()
        print(f"[OK] Profile verified across restart: {profile_data.get('email')} (ID: {profile_data.get('id')})")
        print(f"     Total scans reported by profile: {profile_data.get('total_scans')}")
        print(f"     Total experiments reported by profile: {profile_data.get('total_experiments')}")

        # Verify scan history still exists
        hist2_resp = client2.get("/api/v1/history", headers=auth_headers)
        print(f"Scan history after restart status: {hist2_resp.status_code}")
        assert hist2_resp.status_code == 200
        hist2_data = hist2_resp.json()
        total_scans_restart = hist2_data.get("total_count", len(hist2_data.get("items", [])))
        print(f"[OK] Scan history verified across restart: {total_scans_restart} record(s) persisted in Neon")
        assert total_scans_restart >= 1, "Expected at least 1 scan record persisted across restart"

        # Verify lab experiments still exist
        lab2_resp = client2.get("/api/v1/lab/experiments", headers=auth_headers)
        print(f"Lab experiments after restart status: {lab2_resp.status_code}")
        assert lab2_resp.status_code == 200
        lab2_data = lab2_resp.json()
        print(f"[OK] Lab experiments verified across restart: {len(lab2_data)} experiment(s) persisted in Neon")
        assert any(e["id"] == exp_id for e in lab2_data)

    finally:
        stop_backend(proc2)

    # Step 8: Confirm No Fallback to SQLite
    print("\n--- [Step 8: SQLite Zero-Leakage & Fallback Audit] ---")
    sqlite_final = get_sqlite_counts()
    neon_final = get_neon_counts()

    print(f"[*] SQLite Counts (Initial vs Final):")
    for tbl in sqlite_init:
        init_cnt = sqlite_init.get(tbl, 0)
        final_cnt = sqlite_final.get(tbl, 0)
        delta = final_cnt - init_cnt
        print(f"    - {tbl:20s}: Initial = {init_cnt}, Final = {final_cnt}, Delta = {delta}")
        assert delta == 0, f"LEAKAGE DETECTED: SQLite table '{tbl}' count changed by {delta}!"

    print(f"\n[*] Neon Counts (Initial vs Final):")
    for tbl in neon_init:
        init_cnt = neon_init.get(tbl, 0)
        final_cnt = neon_final.get(tbl, 0)
        delta = final_cnt - init_cnt
        print(f"    - {tbl:20s}: Initial = {init_cnt}, Final = {final_cnt}, Delta = +{delta}")

    print("\n" + "=" * 80)
    print("ALL END-TO-END VERIFICATION CHECKS PASSED (100% SUCCESS)")
    print("=" * 80)


if __name__ == "__main__":
    run_e2e_tests()

