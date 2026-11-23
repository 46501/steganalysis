"""web/mail.py — Transactional email delivery (verification, password recovery)."""
from __future__ import annotations

import os
import smtplib
import sys
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

# In-memory store for development/testing when SMTP is not configured
_DEV_MAILBOX: list[dict[str, Any]] = []


def is_smtp_configured() -> bool:
    """Return True if an outbound SMTP host is configured."""
    host = os.getenv("STEGOVAULT_SMTP_HOST") or os.getenv("SMTP_HOST")
    return bool(host and host.strip())


def get_mail_config() -> dict[str, Any]:
    """Resolve SMTP settings from environment variables."""
    host = os.getenv("STEGOVAULT_SMTP_HOST") or os.getenv("SMTP_HOST", "")
    port_str = os.getenv("STEGOVAULT_SMTP_PORT") or os.getenv("SMTP_PORT", "587")
    try:
        port = int(port_str)
    except ValueError:
        port = 587
    user = os.getenv("STEGOVAULT_SMTP_USER") or os.getenv("SMTP_USER", "")
    password = os.getenv("STEGOVAULT_SMTP_PASS") or os.getenv("SMTP_PASS", "")
    use_tls = (os.getenv("STEGOVAULT_SMTP_TLS") or os.getenv("SMTP_TLS", "1")).lower() in ("1", "true", "yes")
    from_email = os.getenv("STEGOVAULT_SMTP_FROM") or os.getenv("SMTP_FROM", "no-reply@stegovault.local")

    return {
        "host": host.strip(),
        "port": port,
        "user": user.strip(),
        "password": password,
        "use_tls": use_tls,
        "from_email": from_email.strip(),
    }


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> tuple[bool, str]:
    """Send an email using configured SMTP, or record it in development mailbox.

    Returns:
        (success: bool, status_message: str)
    """
    cfg = get_mail_config()
    clean_to = to_email.strip().lower()

    # If SMTP is NOT configured, do not pretend it succeeded
    if not cfg["host"]:
        record = {
            "to": clean_to,
            "subject": subject,
            "html": html_body,
            "text": text_body,
        }
        _DEV_MAILBOX.append(record)
        if len(_DEV_MAILBOX) > 100:
            _DEV_MAILBOX.pop(0)

        # Log to server console so developer can test without an active email provider
        print(f"[StegoVault Email] (SMTP not configured) To: {clean_to} | Subject: {subject}", file=sys.stderr)
        return False, "SMTP is not configured on this server. Email was not delivered."

    # Send via real SMTP server
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = Header(subject, "utf-8")
        msg["From"] = cfg["from_email"]
        msg["To"] = clean_to

        part1 = MIMEText(text_body, "plain", "utf-8")
        part2 = MIMEText(html_body, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15.0)
        if cfg["use_tls"]:
            server.starttls()
        if cfg["user"] and cfg["password"]:
            server.login(cfg["user"], cfg["password"])

        server.sendmail(cfg["from_email"], [clean_to], msg.as_string())
        server.quit()
        return True, "Email sent successfully."
    except Exception as exc:
        err_msg = f"Failed to send email: {exc}"
        print(f"[StegoVault Email Error] {err_msg}", file=sys.stderr)
        return False, err_msg


def get_last_dev_email(to_email: str | None = None) -> dict[str, Any] | None:
    """Retrieve the most recent email delivered to the dev mailbox (for automated testing)."""
    if not _DEV_MAILBOX:
        return None
    if to_email:
        clean = to_email.strip().lower()
        for m in reversed(_DEV_MAILBOX):
            if m["to"] == clean:
                return m
        return None
    return _DEV_MAILBOX[-1]


def clear_dev_mailbox():
    """Clear development email storage."""
    _DEV_MAILBOX.clear()
