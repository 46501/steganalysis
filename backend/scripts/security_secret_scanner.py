"""
Security Secret Scanner for StegoShield AI
Audits all git-tracked and workspace files for exposed secrets, API keys, passwords, and tokens.
Never prints raw secrets.
"""

import re
import subprocess
from pathlib import Path

def scan_repository():
    root = Path(__file__).resolve().parent.parent.parent
    
    # 1. Get tracked files
    tracked_files = subprocess.check_output(["git", "ls-files"], cwd=str(root), text=True).splitlines()

    patterns = {
        "Neon Password": re.compile(r"npg_[a-zA-Z0-9]{8,}"),
        "Live PostgreSQL URI with Credential": re.compile(r"postgres(?:ql)?(?:\+[a-z0-9]+)?://([^:\s]+):([^@\s]+)@([^/\s]+)/([^\s\?]+)"),
        "Private Key": re.compile(r"-----BEGIN (?:RSA )?PRIVATE KEY-----"),
        "Certificate": re.compile(r"-----BEGIN CERTIFICATE-----"),
        "High-Entropy Secret": re.compile(r'(?i)(?:api_key|secret_key|jwt_secret|auth_token)\s*=\s*["\']([a-zA-Z0-9_\-]{24,})["\']'),
    }

    # Known acceptable template placeholders
    placeholders = [
        "user:password@ep-sample-pooler",
        "postgres:postgres_secure_password@localhost",
        "change-this-to-a-secure-random",
        "stegoshield-super-secure-jwt-key",
        "change_this_to_a_random_hex_string",
    ]

    findings = []
    
    for rel_path in tracked_files:
        fpath = root / rel_path
        if not fpath.is_file():
            continue
        # Skip binary files
        if fpath.suffix.lower() in (".png", ".jpg", ".jpeg", ".pt", ".pth", ".npy", ".mat", ".pgm", ".pdf"):
            continue
        try:
            content = fpath.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for rule_name, regex in patterns.items():
            for match in regex.finditer(content):
                matched_str = match.group(0)
                # Check if it's a known placeholder
                if any(p in matched_str for p in placeholders):
                    continue
                # Mask secret value
                masked = matched_str[:8] + "..." + matched_str[-4:] if len(matched_str) > 12 else "***"
                findings.append({
                    "file": rel_path,
                    "rule": rule_name,
                    "match_masked": masked,
                })

    print("=" * 70)
    print("StegoShield AI — Secret Exposure Security Scan")
    print("=" * 70)
    print(f"[*] Total Tracked Files Scanned : {len(tracked_files)}")
    print(f"[*] Exposed Secrets Found        : {len(findings)}")

    if findings:
        for f in findings:
            print(f"  [!] Violation in {f['file']} ({f['rule']}): {f['match_masked']}")
    else:
        print("  [OK] No live secrets, database passwords, or private keys found in tracked files.")

    return findings

if __name__ == "__main__":
    scan_repository()

