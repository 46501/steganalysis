"""core/errors.py — typed error hierarchy for StegoVault.

Replaces ad-hoc ValueError/IOError strings with structured codes that map
to docs/ERRORS.md and stable --json messages.
"""
from __future__ import annotations


class StegoVaultError(ValueError):
    """Base error with a stable machine-readable code."""

    code = "stegovault-error"


# Backwards compatibility alias
StegoForgeError = StegoVaultError


class DepthError(StegoVaultError):
    code = "bad-depth"


class EmptyPayloadError(StegoVaultError):
    code = "empty-payload"


class PlaintextRefusedError(StegoVaultError):
    code = "plaintext-refused"


class CapacityError(StegoVaultError):
    code = "capacity-exceeded"


class CorruptedCarrierError(StegoVaultError):
    code = "corrupted-carrier"


class DecryptionError(StegoVaultError):
    code = "decryption-failed"


class DetectorMismatchError(StegoVaultError):
    code = "detector-mismatch"


class NetworkValidationError(StegoVaultError):
    code = "bad-network-args"


class WeakPassphraseError(StegoVaultError):
    code = "weak-passphrase"
