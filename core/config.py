"""core/config.py — central runtime configuration for StegoVault.

Every tunable limit lives here and can be overridden from the environment.
``get_config()`` re-reads the environment on each call, so tests and long
running processes (the web UI) always see current values.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

_FALSE = ("", "0", "false", "no", "off")


def _get_env_val(name: str) -> str | None:
    val = os.getenv(name)
    if val is not None:
        return val
    if name.startswith("STEGOVAULT_"):
        return os.getenv("STEGOFORGE_" + name[len("STEGOVAULT_"):])
    if name.startswith("STEGOFORGE_"):
        return os.getenv("STEGOVAULT_" + name[len("STEGOFORGE_"):])
    return None


def env_flag(name: str, default: bool = False) -> bool:
    """Parse a boolean environment variable (``0/false/no/off`` and unset are False)."""
    raw = _get_env_val(name)
    if raw is None:
        return default
    return raw.strip().lower() not in _FALSE


def _env_int(name: str, default: int) -> int:
    try:
        val = _get_env_val(name)
        return int(val if val is not None else str(default))
    except ValueError:
        return default


@dataclass(frozen=True)
class StegoConfig:
    """Runtime limits and switches."""

    max_upload_bytes: int = field(default_factory=lambda: _env_int("STEGOVAULT_MAX_BYTES", 200 * 1024 * 1024))
    max_image_pixels: int = field(default_factory=lambda: _env_int("STEGOVAULT_MAX_PIXELS", 120_000_000))
    max_keyed_samples: int = field(default_factory=lambda: _env_int("STEGOVAULT_MAX_KEYED_SAMPLES", 128_000_000))
    deadrop_max_bytes: int = field(default_factory=lambda: _env_int("STEGOVAULT_DEADDROP_MAX_BYTES", 64 * 1024 * 1024))
    decomp_max_bytes: int = field(default_factory=lambda: _env_int("STEGOVAULT_DECOMP_MAX_BYTES", 64 * 1024 * 1024))
    zip_max_entries: int = field(default_factory=lambda: _env_int("STEGOVAULT_ZIP_MAX_ENTRIES", 4096))
    zip_max_total_bytes: int = field(default_factory=lambda: _env_int("STEGOVAULT_ZIP_MAX_BYTES", 256 * 1024 * 1024))
    fetch_timeout: int = field(default_factory=lambda: _env_int("STEGOVAULT_FETCH_TIMEOUT", 20))
    web_token: str = field(default_factory=lambda: _get_env_val("STEGOVAULT_WEB_TOKEN") or "")
    allow_plaintext_env: bool = field(default_factory=lambda: env_flag("STEGOVAULT_ALLOW_PLAINTEXT"))
    offline: bool = field(default_factory=lambda: env_flag("STEGOVAULT_OFFLINE"))


def get_config() -> StegoConfig:
    """Return the current configuration (environment re-read on every call)."""
    return StegoConfig()
