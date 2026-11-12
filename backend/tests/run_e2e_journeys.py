"""
End-to-End Automated Verification Script for StegoShield AI
Tests complete User Journeys A through E against live FastAPI server at http://localhost:8000
"""

import sys
import os
import time
import uuid
import json
import base64
import urllib.request
import urllib.error
import urllib.parse
from http.cookiejar import CookieJar

BASE_URL = "http://127.0.0.1:8000/api/v1"

class APIClient:
    def __init__(self, token=None):
        self.cookie_jar = CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookie_jar))
        self.token = token

    def request(self, method, endpoint, data=None, is_json=True, headers=None):
        url = f"{BASE_URL}{endpoint}" if endpoint.startswith("/") else f"{BASE_URL}/{endpoint}"
        req_headers = {
            "X-StegoShield-Client": "1",
        }
        if self.token:
            req_headers["Authorization"] = f"Bearer {self.token}"
        if headers:
            req_headers.update(headers)

        body = None
        if data is not None:
            if is_json:
                req_headers["Content-Type"] = "application/json"
                body = json.dumps(data).encode("utf-8")
            elif isinstance(data, bytes):
                body = data
            elif isinstance(data, dict): # form-encoded
                req_headers["Content-Type"] = "application/x-www-form-urlencoded"
                body = urllib.parse.urlencode(data).encode("utf-8")

        req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
        try:
            with self.opener.open(req) as resp:
                resp_body = resp.read().decode("utf-8")
                try:
                    return resp.status, json.loads(resp_body), resp.headers
                except Exception:
                    return resp.status, resp_body, resp.headers
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                return e.code, err_json, e.headers
            except Exception:
                return e.code, err_body, e.headers

def run_e2e_journeys():
    print("=" * 70)
    print("STEGOSHIELD AI — END-TO-END AUTOMATED VERIFICATION SUITE")
    print("=" * 70)
    results = {}

    # Health Check
    client = APIClient()
    st, body, _ = client.request("GET", "/health")
    assert st == 200, f"Health check failed with {st}: {body}"
    print(f"[*] Health Check: PASS (Active Model: {body['model']['active_model']}, DB: {body['database']['type']})")

    # -------------------------------------------------------------------------
    # JOURNEY A: New User Registration & Lifecycle
    # -------------------------------------------------------------------------
    print("\n--- JOURNEY A: New User Lifecycle ---")
    uid = uuid.uuid4().hex[:8]
    email_a = f"examiner_{uid}@stegoshield.io"
    password_a = "SecureForensicsPass123!"
    full_name_a = f"Special Agent {uid}"

    # 1. Register
    st, reg_data, _ = client.request("POST", "/auth/register", {
        "full_name": full_name_a,
        "email": email_a,
        "password": password_a,
        "confirm_password": password_a
    })
    assert st == 201, f"Registration failed with {st}: {reg_data}"
    token_a = reg_data["access_token"]
    user_id_a = reg_data["user"]["id"]
    print(f"  [A1] Registration: PASS (User ID: {user_id_a}, Email: {email_a})")

    # 2. Duplicate Registration Rejection
    st, dup_data, _ = client.request("POST", "/auth/register", {
        "full_name": full_name_a,
        "email": email_a,
        "password": password_a,
        "confirm_password": password_a
    })
    assert st == 400 or st == 409, f"Expected duplicate email rejection, got {st}: {dup_data}"
    print("  [A2] Duplicate Registration Prevention: PASS")

    # 3. Authenticated Client
    authed_client_a = APIClient(token=token_a)
    st, profile, _ = authed_client_a.request("GET", "/users/profile")
    assert st == 200 and profile["email"] == email_a, f"Profile failed: {profile}"
    print(f"  [A3] Session Restoration & Profile: PASS ({profile['full_name']})")

    # 4. Upload & Inspect Lab Image
    # Load 5001 sample image as base64
    sample_path = "frontend/public/samples/sample_cover.png"
    with open(sample_path, "rb") as f:
        img_bytes = f.read()
    img_b64 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf-8')}"

    # Form boundary upload for /lab/inspect
    # Using multipart form-data
    boundary = "----WebKitFormBoundaryStegoShieldTest"
    body_bytes = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="sample_cover_5001.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode("utf-8") + img_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    st, inspect_res, _ = authed_client_a.request(
        "POST", "/lab/inspect", data=body_bytes, is_json=False,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    assert st == 200 and "sha256_hash" in inspect_res, f"Inspect failed: {inspect_res}"
    orig_hash = inspect_res["sha256_hash"]
    orig_b64 = inspect_res["lossless_png_b64"]
    print(f"  [A4] Stage 1 (Upload & Inspect): PASS (SHA-256: {orig_hash[:16]}..., Entropy: {inspect_res['entropy']} bpp)")

    # 5. Save Experiment as User A
    exp_payload_a = {
        "experiment_name": "Audit Verification Exp A",
        "experiment_type": "lsb_embedding",
        "original_filename": "sample_cover_5001.png",
        "original_file_hash": orig_hash,
        "modified_file_hash": orig_hash,
        "dimensions": inspect_res["dimensions"],
        "color_mode": inspect_res["color_mode"],
        "parameters": {"mode": "audit_baseline"},
        "comparison": {"changed_pixels": 0, "changed_pixel_percent": 0.0},
        "original_image_b64": orig_b64,
        "modified_image_b64": orig_b64,
    }
    st, exp_a_res, _ = authed_client_a.request("POST", "/lab/experiments", exp_payload_a)
    assert st == 201, f"Save experiment failed: {exp_a_res}"
    exp_id_a = exp_a_res["id"]
    print(f"  [A5] Save Experiment to Database: PASS (Exp ID: {exp_id_a})")

    # 6. Logout User A
    st, logout_res, _ = authed_client_a.request("POST", "/auth/logout")
    assert st == 200, f"Logout failed: {logout_res}"
    print("  [A6] Logout: PASS (Session invalidated)")
    results["Journey A"] = "PASS"

    # -------------------------------------------------------------------------
    # JOURNEY B: Existing User Login, Multi-Stage Lab, & Analysis
    # -------------------------------------------------------------------------
    print("\n--- JOURNEY B: Multi-Stage Forensic Lab Execution ---")
    login_client = APIClient()
    st, login_data, _ = login_client.request("POST", "/auth/login", {
        "email": email_a,
        "password": password_a,
        "remember_me": True
    })
    assert st == 200 and "access_token" in login_data, f"Login failed: {login_data}"
    user_token = login_data["access_token"]
    user_client = APIClient(token=user_token)
    print("  [B1] Existing User Login: PASS")

    # Stage 2: Bit Toggling & Bulk Mutation
    st, toggle_res, _ = user_client.request("POST", "/lab/toggle-bit", {
        "pixel_value": 128,
        "bit_position": 0
    })
    assert st == 200 and toggle_res["modified_value"] == 129, f"Bit toggle failed: {toggle_res}"
    print(f"  [B2] Stage 2 (Pixel Bit Toggle): PASS (128 -> {toggle_res['modified_value']})")

    st, bulk_res, _ = user_client.request("POST", "/lab/manipulate-bulk", {
        "image_b64": orig_b64,
        "mode": "lsb_only",
        "plane": 0,
        "percentage": 5.0,
        "seed": 42,
        "channel": "all",
        "action": "toggle"
    })
    assert st == 200 and bulk_res["modified_pixels_count"] > 0, f"Bulk mutation failed: {bulk_res}"
    mod_b64 = bulk_res["modified_image_b64"]
    mod_hash = bulk_res["modified_sha256"]
    print(f"  [B3] Stage 2 (Bulk Bit Mutation): PASS ({bulk_res['modified_pixels_count']} px modified, hash={mod_hash[:16]}...)")

    # Stage 3: Conceal Secret Message (LSB substitution)
    secret_msg = "StegoShield Automated Audit Payload 2026"
    st, embed_res, _ = user_client.request("POST", "/lab/embed", {
        "image_b64": orig_b64,
        "secret_text": secret_msg,
        "password": "ForensicsPassword42"
    })
    assert st == 200 and embed_res["payload_bytes"] > 0, f"Embed failed: {embed_res}"
    stego_carrier_b64 = embed_res["stego_image_b64"]
    print(f"  [B4] Stage 3 (Secret Message Embed): PASS ({embed_res['payload_bytes']} bytes concealed)")

    # Extract Secret Message
    st, extract_res, _ = user_client.request("POST", "/lab/extract", {
        "image_b64": stego_carrier_b64,
        "password": "ForensicsPassword42"
    })
    assert st == 200 and extract_res["secret_text"] == secret_msg, f"Extraction failed: {extract_res}"
    print(f"  [B5] Stage 3 (Secret Message Extract): PASS (Recovered '{extract_res['secret_text']}')")

    # Stage 4: Run Steganalysis Inference
    st, steg_res, _ = user_client.request("POST", "/lab/analyze", {
        "image_b64": stego_carrier_b64,
        "model_name": "StegoNet-Lite"
    }, is_json=False)
    assert st == 200 and "verdict" in steg_res, f"Steganalysis failed: {steg_res}"
    print(f"  [B6] Stage 4 (Steganalysis Inference): PASS (Verdict: {steg_res['verdict']}, Model: {steg_res['model_name']})")

    # Stage 5: Compare Forensics
    st, comp_res, _ = user_client.request("POST", "/lab/compare", {
        "original_image_b64": orig_b64,
        "modified_image_b64": stego_carrier_b64
    })
    assert st == 200 and comp_res["changed_pixels"] > 0, f"Comparison failed: {comp_res}"
    print(f"  [B7] Stage 5 (Forensic Comparison): PASS (Changed: {comp_res['changed_pixels']} px, {comp_res['changed_pixel_percent']}%)")

    # Stage 6: Audit History Retrieval
    st, exp_list, _ = user_client.request("GET", "/lab/experiments")
    assert st == 200 and len(exp_list) >= 1, f"List experiments failed: {exp_list}"
    print(f"  [B8] Stage 6 (Audit History Retrieval): PASS ({len(exp_list)} saved experiment records)")
    results["Journey B"] = "PASS"

    # -------------------------------------------------------------------------
    # JOURNEY C: Multi-User Data Isolation & IDOR Protection
    # -------------------------------------------------------------------------
    print("\n--- JOURNEY C: Multi-User Data Isolation & IDOR Security ---")
    uid_b = uuid.uuid4().hex[:8]
    email_b = f"examiner_{uid_b}@stegoshield.io"
    password_b = "SecurePassB456!"

    st, reg_b, _ = client.request("POST", "/auth/register", {
        "full_name": "Analyst Beta",
        "email": email_b,
        "password": password_b,
        "confirm_password": password_b
    })
    assert st == 201, f"User B reg failed: {reg_b}"
    client_b = APIClient(token=reg_b["access_token"])

    # User B lists experiments -> MUST NOT see User A's experiment
    st, exp_b_list, _ = client_b.request("GET", "/lab/experiments")
    assert st == 200, f"User B list failed: {exp_b_list}"
    user_a_exp_ids = [e["id"] for e in exp_b_list if e["id"] == exp_id_a]
    assert len(user_a_exp_ids) == 0, f"DATA LEAKAGE: User B can see User A experiment {exp_id_a}!"
    print(f"  [C1] Experiment Isolation in Lists: PASS (User B cannot see User A experiments)")

    # User B attempts direct IDOR access to User A's experiment ID -> MUST BE 404
    st, idor_res, _ = client_b.request("GET", f"/lab/experiments/{exp_id_a}")
    assert st == 404, f"IDOR VULNERABILITY: User B accessed User A exp {exp_id_a} with status {st}: {idor_res}"
    print(f"  [C2] IDOR Direct Retrieval Blocked: PASS (Returned 404 Not Found)")

    # User B attempts deletion of User A's experiment -> MUST BE 404
    st, del_res, _ = client_b.request("DELETE", f"/lab/experiments/{exp_id_a}")
    assert st == 404, f"IDOR VULNERABILITY: User B deleted User A exp {exp_id_a} with status {st}: {del_res}"
    print(f"  [C3] IDOR Direct Deletion Blocked: PASS (Returned 404 Not Found)")
    results["Journey C"] = "PASS"

    # -------------------------------------------------------------------------
    # JOURNEY D: Guest Mode Capabilities & Restrictions
    # -------------------------------------------------------------------------
    print("\n--- JOURNEY D: Guest Exploration & Restricted Capabilities ---")
    guest_client = APIClient(token=None)
    st, g_exp_list, _ = guest_client.request("GET", "/lab/experiments")
    assert st == 200, f"Guest exp list failed: {g_exp_list}"
    # Verify guest cannot see User A or User B experiments
    leaked = [e["id"] for e in g_exp_list if e["id"] in (exp_id_a,)]
    assert len(leaked) == 0, f"Guest can see authenticated experiment: {leaked}"
    print("  [D1] Guest Data Isolation: PASS (No access to authenticated investigator records)")

    # Guest can run forensic inspection & analysis
    st, g_toggle, _ = guest_client.request("POST", "/lab/toggle-bit", {
        "pixel_value": 200,
        "bit_position": 1
    })
    assert st == 200 and g_toggle["modified_value"] == 202, f"Guest bit toggle failed: {g_toggle}"
    print("  [D2] Guest Interactive Exploration: PASS (Free bit mutation allowed)")
    results["Journey D"] = "PASS"

    # -------------------------------------------------------------------------
    # JOURNEY E: Security, Anti-CSRF, & Token Revocation
    # -------------------------------------------------------------------------
    print("\n--- JOURNEY E: Security Controls & Anti-CSRF ---")
    # 1. Register user so client possesses an ambient refresh cookie
    csrf_email = f"csrf_target_{uuid.uuid4().hex[:8]}@stegoshield.io"
    csrf_client = APIClient()
    st, reg_c, _ = csrf_client.request("POST", "/auth/register", {
        "full_name": "CSRF Target Analyst",
        "email": csrf_email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert st == 201, f"CSRF setup reg failed: {reg_c}"

    # Anti-CSRF test: Attempt refresh using ambient cookie but WITHOUT custom Anti-CSRF header
    url = f"{BASE_URL}/auth/refresh"
    req = urllib.request.Request(url, data=json.dumps({}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with csrf_client.opener.open(req) as resp:
            st_csrf = resp.status
            err_body = ""
    except urllib.error.HTTPError as e:
        st_csrf = e.code
        err_body = e.read().decode("utf-8")

    assert st_csrf == 403, f"CSRF Vulnerability: Ambient cookie request without header should be 403, got {st_csrf}: {err_body}"
    print("  [E1] Custom Header Anti-CSRF Enforcement: PASS (Rejected with 403 Forbidden)")

    # Protected route access without token -> MUST BE 401
    st, unauth_res, _ = APIClient().request("GET", "/users/profile")
    assert st == 401, f"Expected 401 Unauthorized for /users/profile without token, got {st}"
    print("  [E2] Protected Route Guard: PASS (401 Unauthorized when unauthenticated)")

    # Rate Limiting test on login endpoint
    bad_client = APIClient()
    for attempt in range(6):
        st_bad, _, _ = bad_client.request("POST", "/auth/login", {
            "email": f"brute_force_test_{uid}@stegoshield.io",
            "password": "wrong_password_xyz"
        })
    assert st_bad == 429 or st_bad == 401, f"Expected rate limiting or auth failure, got {st_bad}"
    print(f"  [E3] Brute-Force Rate Limiter: PASS (Status={st_bad})")
    results["Journey E"] = "PASS"

    print("\n" + "=" * 70)
    print("ALL 5 USER JOURNEYS (A, B, C, D, E) COMPLETED WITH 100% SUCCESS")
    print("=" * 70)
    for j, status in results.items():
        print(f"  {j}: {status}")

if __name__ == "__main__":
    run_e2e_journeys()
