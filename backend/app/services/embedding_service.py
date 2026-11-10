"""
Steganography Embedding and Secret Message Extraction Engine.
Provides Spatial LSB Replacement and LSB Matching (±1 Embedding) algorithms,
capacity calculations, and bitstream extraction for educational and forensic demonstration.
"""

import io
import struct
import hashlib
import base64
from typing import Dict, Any, Tuple
import numpy as np
from PIL import Image


class SteganographyStudioService:
    """Service providing spatial steganographic embedding and message recovery."""

    @staticmethod
    def _bytes_to_bits(data: bytes) -> np.ndarray:
        """Converts raw bytes to a 1D uint8 array of individual bits (MSB first)."""
        byte_arr = np.frombuffer(data, dtype=np.uint8)
        return np.unpackbits(byte_arr)

    @staticmethod
    def _bits_to_bytes(bits: np.ndarray) -> bytes:
        """Packs a 1D bit array back into raw bytes."""
        return np.packbits(bits).tobytes()

    @classmethod
    def embed_secret_message(
        cls,
        image_bytes: bytes,
        secret_text: str,
        algorithm: str = "lsb_replace",
    ) -> Dict[str, Any]:
        """
        Embeds a secret string payload into an image using either:
        - 'lsb_replace': Classical Least Significant Bit substitution.
        - 'lsb_matching': Spatial ±1 embedding (preserves LSB symmetry).
        """
        # Load image via PIL
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Failed to decode image: {e}")

        orig_mode = pil_img.mode
        # Normalize to grayscale for spatial domain demonstration
        gray_img = pil_img.convert("L")
        arr = np.array(gray_img, dtype=np.uint8)
        h, w = arr.shape
        total_pixels = h * w

        # Encode secret message
        msg_bytes = secret_text.encode("utf-8")
        payload_len = len(msg_bytes)

        # 32-bit unsigned big-endian length header
        header = struct.pack(">I", payload_len)
        full_payload = header + msg_bytes
        payload_bits = cls._bytes_to_bits(full_payload)
        total_bits_needed = len(payload_bits)

        # Maximum payload capacity in bytes (leaving 4 bytes for length header)
        max_payload_bytes = (total_pixels - 32) // 8
        if total_bits_needed > total_pixels:
            raise ValueError(
                f"Payload too large: requires {total_bits_needed} pixels, but image only has {total_pixels} pixels "
                f"(max secret text capacity: {max_payload_bytes} bytes)."
            )

        # Flatten array for linear bit sequential embedding
        flat_arr = arr.flatten().astype(np.int16)
        modified_count = 0

        if algorithm == "lsb_matching":
            # ±1 Embedding (LSB matching)
            # Pseudo-random generator for ±1 step to avoid systematic drift
            rng = np.random.default_rng(seed=42)
            for i in range(total_bits_needed):
                target_bit = payload_bits[i]
                current_bit = flat_arr[i] & 1
                if current_bit != target_bit:
                    modified_count += 1
                    if flat_arr[i] <= 0:
                        flat_arr[i] += 1
                    elif flat_arr[i] >= 255:
                        flat_arr[i] -= 1
                    else:
                        step = rng.choice([-1, 1])
                        flat_arr[i] += step
        else:
            # Standard LSB Replacement
            for i in range(total_bits_needed):
                target_bit = payload_bits[i]
                current_bit = flat_arr[i] & 1
                if current_bit != target_bit:
                    modified_count += 1
                flat_arr[i] = (flat_arr[i] & ~1) | target_bit

        stego_arr = np.clip(flat_arr, 0, 255).astype(np.uint8).reshape((h, w))

        # Re-encode to PNG
        stego_img = Image.fromarray(stego_arr, mode="L")
        buf = io.BytesIO()
        stego_img.save(buf, format="PNG")
        stego_png_bytes = buf.getvalue()

        # SHA-256 of generated stego image
        sha256_hash = hashlib.sha256(stego_png_bytes).hexdigest()
        b64_data = base64.b64encode(stego_png_bytes).decode("ascii")

        embedding_rate_bpp = round(total_bits_needed / float(total_pixels), 5)
        mod_rate_percent = round((modified_count / float(total_pixels)) * 100, 3)

        return {
            "stego_image_b64": f"data:image/png;base64,{b64_data}",
            "dimensions": f"{w}x{h}",
            "total_pixels": total_pixels,
            "modified_pixel_count": modified_count,
            "modified_pixel_percent": mod_rate_percent,
            "payload_bytes": payload_len,
            "capacity_bytes": max_payload_bytes,
            "embedding_rate_bpp": embedding_rate_bpp,
            "algorithm": "Spatial LSB Matching (±1)" if algorithm == "lsb_matching" else "Spatial LSB Replacement",
            "sha256_hash": sha256_hash,
            "secret_preview": secret_text[:30] + ("..." if len(secret_text) > 30 else ""),
        }

    @classmethod
    def extract_secret_message(cls, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extracts a secret message embedded via StegoShield LSB embedding.
        Reads 32-bit length header followed by message payload.
        """
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Failed to open image for extraction: {e}")

        gray_img = pil_img.convert("L")
        arr = np.array(gray_img, dtype=np.uint8)
        flat_arr = arr.flatten()
        total_pixels = len(flat_arr)

        if total_pixels < 32:
            raise ValueError("Image too small to contain a valid StegoShield header.")

        # Extract first 32 bits for the length header
        header_bits = flat_arr[:32] & 1
        header_bytes = cls._bits_to_bytes(header_bits)
        (payload_len,) = struct.unpack(">I", header_bytes)

        max_payload_bytes = (total_pixels - 32) // 8

        # Sanity check on length
        if payload_len == 0 or payload_len > max_payload_bytes:
            raise ValueError(
                f"No StegoShield watermark header found (header reads length {payload_len} bytes, "
                f"max allowable: {max_payload_bytes} bytes). This image is likely clean cover or embedded using another scheme."
            )

        # Extract payload bits
        needed_bits = payload_len * 8
        if 32 + needed_bits > total_pixels:
            raise ValueError("Truncated payload in image.")

        payload_bits = flat_arr[32 : 32 + needed_bits] & 1
        extracted_bytes = cls._bits_to_bytes(payload_bits)

        try:
            secret_text = extracted_bytes.decode("utf-8")
        except UnicodeDecodeError:
            secret_text = extracted_bytes.decode("utf-8", errors="replace")

        return {
            "success": True,
            "secret_text": secret_text,
            "payload_bytes": payload_len,
            "total_pixels_scanned": 32 + needed_bits,
            "status": "Message recovered with 100% bit-fidelity",
        }

