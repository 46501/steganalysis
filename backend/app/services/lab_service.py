"""
StegoShield AI — Interactive Steganography & Forensics Laboratory Service.

Provides scientific image processing, lossless bit-level manipulation,
custom LSB steganographic embedding/extraction with integrity verification,
deep forensic comparison, and statistical analysis.
"""

import io
import struct
import zlib
import hashlib
import base64
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
from PIL import Image
from scipy.signal import convolve2d


class ForensicsLabService:
    """Core scientific engine for the Forensics Laboratory."""

    HEADER_MAGIC = b"STGL"  # StegoLab 4-byte protocol marker
    HEADER_SIZE_BYTES = 14  # Magic (4) + Flags (2) + Length (4) + CRC32 (4)

    # -------------------------------------------------------------------------
    # Helper & Conversion Utilities
    # -------------------------------------------------------------------------

    @staticmethod
    def array_to_b64_png(img_array: np.ndarray) -> str:
        """Encodes a uint8 2D (grayscale) or 3D (RGB) numpy array to a lossless base64 PNG data URL."""
        if img_array.ndim == 2:
            pil_img = Image.fromarray(img_array, mode="L")
        elif img_array.ndim == 3 and img_array.shape[2] == 3:
            pil_img = Image.fromarray(img_array, mode="RGB")
        elif img_array.ndim == 3 and img_array.shape[2] == 4:
            pil_img = Image.fromarray(img_array, mode="RGBA")
        else:
            raise ValueError(f"Unsupported image array shape for PNG conversion: {img_array.shape}")

        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        encoded = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"

    @classmethod
    def b64_to_array(cls, b64_str: str) -> np.ndarray:
        """Decodes a base64 PNG data URL or raw base64 string to a uint8 numpy array."""
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        pil_img = Image.open(io.BytesIO(img_bytes))
        return np.array(pil_img, dtype=np.uint8)

    @classmethod
    def b64_to_bytes(cls, b64_str: str) -> bytes:
        """Decodes base64 string or data URL to raw bytes."""
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        return base64.b64decode(b64_str)

    @staticmethod
    def calculate_entropy(arr: np.ndarray) -> float:
        """
        Calculates Shannon Entropy in bits per pixel:
        H = - sum(p(i) * log2(p(i))) for i in 0..255
        """
        # Flatten and compute normalized histogram
        flat = arr.flatten()
        if len(flat) == 0:
            return 0.0
        counts = np.bincount(flat, minlength=256)
        probs = counts / float(len(flat))
        # Filter non-zero probabilities to avoid log(0)
        non_zero = probs[probs > 0]
        entropy = -float(np.sum(non_zero * np.log2(non_zero)))
        return round(entropy, 4)

    @staticmethod
    def calculate_residual_energy(arr: np.ndarray) -> float:
        """
        Calculates the auxiliary spatial residual energy using a 3x3 high-pass
        Laplacian kernel: [0, -1, 0; -1, 4, -1; 0, -1, 0].
        sigma_r^2 = (1 / HW) * sum(residuals^2)
        """
        if arr.ndim == 3:
            gray = np.mean(arr[:, :, :3], axis=2).astype(np.float32)
        else:
            gray = arr.astype(np.float32)

        laplacian = np.array(
            [[0.0, -1.0, 0.0],
             [-1.0, 4.0, -1.0],
             [0.0, -1.0, 0.0]],
            dtype=np.float32,
        )
        res = convolve2d(gray, laplacian, mode="same", boundary="symm")
        energy = float(np.mean(res ** 2))
        return round(energy, 3)

    # -------------------------------------------------------------------------
    # 1. Image Inspection & Lossless Loading
    # -------------------------------------------------------------------------

    @classmethod
    def inspect_image(cls, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Losslessly inspects an uploaded image and extracts exact dimensions,
        metadata, SHA-256 hash, Shannon entropy, residual energy, and histogram.
        """
        raw_hash = hashlib.sha256(file_bytes).hexdigest()
        file_size_bytes = len(file_bytes)

        try:
            pil_img = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Invalid image file format: {e}")

        orig_format = pil_img.format or "PNG"
        orig_mode = pil_img.mode

        # Convert to standard RGB or Grayscale lossless uint8 array
        if orig_mode in ("RGBA", "RGB"):
            arr = np.array(pil_img.convert("RGB"), dtype=np.uint8)
            color_mode = "RGB"
            channels = 3
        else:
            arr = np.array(pil_img.convert("L"), dtype=np.uint8)
            color_mode = "L"
            channels = 1

        h, w = arr.shape[:2]
        total_pixels = h * w

        # Lossless PNG data URL for frontend canvas operations (eliminates JPEG recompression)
        lossless_png_b64 = cls.array_to_b64_png(arr)

        # Statistical properties
        entropy_val = cls.calculate_entropy(arr)
        residual_energy_val = cls.calculate_residual_energy(arr)
        mean_intensity = round(float(np.mean(arr)), 2)
        std_dev = round(float(np.std(arr)), 2)

        # 256-bin histogram
        if channels == 1:
            hist_counts = np.bincount(arr.flatten(), minlength=256).tolist()
        else:
            # Grayscale equivalent for unified intensity histogram
            gray_arr = np.mean(arr, axis=2).astype(np.uint8)
            hist_counts = np.bincount(gray_arr.flatten(), minlength=256).tolist()

        return {
            "filename": filename,
            "format": orig_format,
            "dimensions": f"{w}x{h}",
            "width": w,
            "height": h,
            "channels": channels,
            "color_mode": color_mode,
            "file_size_bytes": file_size_bytes,
            "total_pixels": total_pixels,
            "sha256_hash": raw_hash,
            "lossless_png_b64": lossless_png_b64,
            "entropy": entropy_val,
            "residual_energy": residual_energy_val,
            "mean_intensity": mean_intensity,
            "std_dev": std_dev,
            "histogram": hist_counts,
        }

    # -------------------------------------------------------------------------
    # 2. Pixel Inspector & Single-Pixel Bit Toggle
    # -------------------------------------------------------------------------

    @classmethod
    def get_pixel_info(cls, arr: np.ndarray, x: int, y: int) -> Dict[str, Any]:
        """
        Retrieves detailed channel values and binary representations (MSB to LSB)
        for a discrete pixel coordinate (x, y).
        """
        h, w = arr.shape[:2]
        x_clamped = max(0, min(w - 1, int(x)))
        y_clamped = max(0, min(h - 1, int(y)))

        is_rgb = arr.ndim == 3 and arr.shape[2] == 3

        if is_rgb:
            r, g, b = int(arr[y_clamped, x_clamped, 0]), int(arr[y_clamped, x_clamped, 1]), int(arr[y_clamped, x_clamped, 2])
            channels = [
                {
                    "channel": "Red",
                    "value": r,
                    "hex": f"0x{r:02X}",
                    "binary": f"{r:08b}",
                    "bits": [int(b) for b in f"{r:08b}"][::-1],  # index 0 is LSB, 7 is MSB
                },
                {
                    "channel": "Green",
                    "value": g,
                    "hex": f"0x{g:02X}",
                    "binary": f"{g:08b}",
                    "bits": [int(b) for b in f"{g:08b}"][::-1],
                },
                {
                    "channel": "Blue",
                    "value": b,
                    "hex": f"0x{b:02X}",
                    "binary": f"{b:08b}",
                    "bits": [int(b) for b in f"{b:08b}"][::-1],
                },
            ]
        else:
            val = int(arr[y_clamped, x_clamped])
            channels = [
                {
                    "channel": "Intensity (Grayscale)",
                    "value": val,
                    "hex": f"0x{val:02X}",
                    "binary": f"{val:08b}",
                    "bits": [int(b) for b in f"{val:08b}"][::-1],
                }
            ]

        return {
            "x": x_clamped,
            "y": y_clamped,
            "is_rgb": is_rgb,
            "channels": channels,
        }

    @staticmethod
    def toggle_pixel_bit(value: int, bit_pos: int) -> Dict[str, Any]:
        """
        Toggles an individual bit at position bit_pos (0=LSB, 7=MSB).
        Example: 154 (10011010) with bit 0 toggled -> 155 (10011011), delta +1.
        """
        bit_pos = max(0, min(7, int(bit_pos)))
        orig_val = int(value) & 0xFF
        mask = 1 << bit_pos
        mod_val = orig_val ^ mask
        delta = mod_val - orig_val

        orig_binary = f"{orig_val:08b}"
        mod_binary = f"{mod_val:08b}"

        return {
            "bit_position": bit_pos,
            "bit_label": "LSB (Bit 0)" if bit_pos == 0 else ("MSB (Bit 7)" if bit_pos == 7 else f"Bit {bit_pos}"),
            "original_value": orig_val,
            "modified_value": mod_val,
            "delta": delta,
            "original_binary": orig_binary,
            "modified_binary": mod_binary,
            "original_hex": f"0x{orig_val:02X}",
            "modified_hex": f"0x{mod_val:02X}",
        }

    # -------------------------------------------------------------------------
    # 3. Bulk Bit Manipulation & Experiments
    # -------------------------------------------------------------------------

    @classmethod
    def bulk_manipulate_bits(
        cls,
        orig_array: np.ndarray,
        mode: str = "lsb_only",
        plane: int = 0,
        percentage: float = 10.0,
        seed: int = 42,
        channel: str = "all",
        action: str = "toggle",
    ) -> Dict[str, Any]:
        """
        Executes a reproducible, deterministic bulk bit modification experiment.
        Parameters:
        - mode: 'lsb_only' (bit 0), 'two_lsb' (bits 0 & 1), 'custom_plane' (plane 0-7), 'random_bits'
        - plane: int 0 to 7
        - percentage: float 0.1 to 100.0
        - seed: int pseudo-random generator seed for 100% reproducibility
        - channel: 'all', 'r', 'g', 'b', 'gray'
        - action: 'toggle', 'set_zero', 'set_one'
        """
        mod_array = orig_array.copy()
        h, w = mod_array.shape[:2]
        total_pixels = h * w
        is_rgb = mod_array.ndim == 3 and mod_array.shape[2] == 3

        # Clamp percentage
        pct = max(0.01, min(100.0, float(percentage)))
        target_count = int(round(total_pixels * (pct / 100.0)))
        target_count = max(1, min(total_pixels, target_count))

        # Select reproducible pixel indices
        rng = np.random.default_rng(seed=seed)
        if target_count < total_pixels:
            chosen_indices = rng.choice(total_pixels, size=target_count, replace=False)
        else:
            chosen_indices = np.arange(total_pixels)

        # Convert 1D indices to 2D (y, x)
        ys = chosen_indices // w
        xs = chosen_indices % w

        # Channel masking
        channel_indices = []
        if not is_rgb:
            channel_indices = [None]
        else:
            if channel == "r":
                channel_indices = [0]
            elif channel == "g":
                channel_indices = [1]
            elif channel == "b":
                channel_indices = [2]
            else:
                channel_indices = [0, 1, 2]

        # Determine target bit planes
        bit_planes: List[int] = []
        if mode == "lsb_only":
            bit_planes = [0]
        elif mode == "two_lsb":
            bit_planes = [0, 1]
        elif mode == "custom_plane":
            bit_planes = [max(0, min(7, int(plane)))]
        elif mode == "random_bits":
            bit_planes = [rng.integers(0, 8)]
        else:
            bit_planes = [0]

        total_bits_modified = 0

        # Apply bit modifications
        for c_idx in channel_indices:
            for bp in bit_planes:
                mask = 1 << bp
                if c_idx is None:
                    curr_vals = mod_array[ys, xs].astype(np.int32)
                    if action == "set_zero":
                        new_vals = curr_vals & ~mask
                    elif action == "set_one":
                        new_vals = curr_vals | mask
                    else:  # toggle
                        new_vals = curr_vals ^ mask
                    total_bits_modified += int(np.sum(curr_vals != new_vals))
                    mod_array[ys, xs] = new_vals.astype(np.uint8)
                else:
                    curr_vals = mod_array[ys, xs, c_idx].astype(np.int32)
                    if action == "set_zero":
                        new_vals = curr_vals & ~mask
                    elif action == "set_one":
                        new_vals = curr_vals | mask
                    else:  # toggle
                        new_vals = curr_vals ^ mask
                    total_bits_modified += int(np.sum(curr_vals != new_vals))
                    mod_array[ys, xs, c_idx] = new_vals.astype(np.uint8)

        # Compute exact modified pixels count
        if is_rgb:
            diff_mask = np.any(mod_array != orig_array, axis=-1)
        else:
            diff_mask = mod_array != orig_array

        actual_changed_pixels = int(np.sum(diff_mask))
        actual_change_rate = round((actual_changed_pixels / float(total_pixels)) * 100.0, 3)

        # Re-encode to lossless PNG and get hash
        mod_png_b64 = cls.array_to_b64_png(mod_array)
        raw_mod_bytes = cls.b64_to_bytes(mod_png_b64)
        mod_sha256 = hashlib.sha256(raw_mod_bytes).hexdigest()

        # Generate amplified difference map
        diff_map_b64 = cls.generate_amplified_diff_map(orig_array, mod_array)

        return {
            "modified_image_b64": mod_png_b64,
            "modified_sha256": mod_sha256,
            "diff_map_b64": diff_map_b64,
            "total_pixels": total_pixels,
            "selected_pixels_count": target_count,
            "modified_pixels_count": actual_changed_pixels,
            "modified_bits_count": total_bits_modified,
            "modification_percent": actual_change_rate,
            "parameters": {
                "mode": mode,
                "plane": plane,
                "percentage": percentage,
                "seed": seed,
                "channel": channel,
                "action": action,
            },
        }

    # -------------------------------------------------------------------------
    # 4. Bit-Plane Slicing & Visualization
    # -------------------------------------------------------------------------

    @classmethod
    def generate_bitplane_view(cls, arr: np.ndarray, plane: int = 0, channel: str = "gray") -> Dict[str, Any]:
        """
        Extracts a specific bit plane (0=LSB to 7=MSB) as a pure black and white
        visualization. Supports RGB channel slicing or Grayscale.
        """
        plane = max(0, min(7, int(plane)))

        if arr.ndim == 3 and arr.shape[2] == 3:
            if channel == "r":
                target = arr[:, :, 0]
            elif channel == "g":
                target = arr[:, :, 1]
            elif channel == "b":
                target = arr[:, :, 2]
            else:
                target = np.mean(arr, axis=2).astype(np.uint8)
        else:
            target = arr if arr.ndim == 2 else arr[:, :, 0]

        # Extract bit plane: (val >> plane) & 1 * 255
        bit_val = ((target.astype(np.uint8) >> plane) & 1) * 255
        b64_png = cls.array_to_b64_png(bit_val.astype(np.uint8))

        # Bit plane entropy
        entropy_val = cls.calculate_entropy(bit_val)

        return {
            "plane": plane,
            "plane_label": f"Bit Plane {plane} ({'LSB' if plane == 0 else ('MSB' if plane == 7 else f'2^{plane}')})",
            "channel": channel,
            "bitplane_b64": b64_png,
            "plane_entropy": entropy_val,
        }

    # -------------------------------------------------------------------------
    # 5. Secret Message Embedding (Documented LSB Protocol)
    # -------------------------------------------------------------------------

    @classmethod
    def _keystream_cipher(cls, data: bytes, password: str) -> bytes:
        """
        Deterministic, key-derived stream cipher for payload encryption.
        Uses SHA-256 in counter mode to produce an unforgeable XOR keystream.
        """
        key = hashlib.sha256(password.encode("utf-8")).digest()
        out = bytearray(len(data))
        block_idx = 0
        keystream = b""

        for i, byte in enumerate(data):
            if i % 32 == 0:
                keystream = hashlib.sha256(key + struct.pack(">I", block_idx)).digest()
                block_idx += 1
            out[i] = byte ^ keystream[i % 32]
        return bytes(out)

    @classmethod
    def embed_secret_message_lsb(
        cls,
        orig_array: np.ndarray,
        secret_text: str,
        password: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Embeds a secret UTF-8 string payload into an image carrier using classical
        LSB substitution.
        Protocol:
        [MAGIC: 'STGL' (4B)][FLAGS (2B)][PAYLOAD_LEN (4B)][CRC32 (4B)][PAYLOAD BYTES...]
        Total header = 14 bytes (112 bits).
        """
        if not secret_text:
            raise ValueError("Secret message text cannot be empty.")

        mod_array = orig_array.copy()
        h, w = mod_array.shape[:2]
        is_rgb = mod_array.ndim == 3 and mod_array.shape[2] == 3
        total_elements = h * w * (3 if is_rgb else 1)

        raw_payload = secret_text.encode("utf-8")
        payload_len = len(raw_payload)
        is_encrypted = bool(password and password.strip())

        # Optional encryption
        if is_encrypted:
            encrypted_payload = cls._keystream_cipher(raw_payload, password.strip())
        else:
            encrypted_payload = raw_payload

        # Header assembly
        crc = zlib.crc32(raw_payload) & 0xFFFFFFFF
        flags = 0x01 if is_encrypted else 0x00
        header = struct.pack(">4sHII", cls.HEADER_MAGIC, flags, payload_len, crc)

        full_stream = header + encrypted_payload
        needed_bits = len(full_stream) * 8

        # Rigorous capacity validation upfront (Never silently truncate!)
        max_capacity_bytes = (total_elements - (cls.HEADER_SIZE_BYTES * 8)) // 8
        if needed_bits > total_elements:
            raise ValueError(
                f"Payload exceeds available carrier capacity! Required: {payload_len} bytes "
                f"(+ {cls.HEADER_SIZE_BYTES} bytes header = {needed_bits} bits), "
                f"but carrier only has {total_elements} available bit positions "
                f"(maximum payload: {max_capacity_bytes} bytes). Embedding aborted without truncation."
            )

        # Flatten array
        flat = mod_array.flatten()
        payload_bits = np.unpackbits(np.frombuffer(full_stream, dtype=np.uint8))

        # Sequential LSB substitution: pixel = (pixel & 0xFE) | bit
        orig_lsbs = flat[:needed_bits] & 1
        changed_mask = orig_lsbs != payload_bits
        modified_count = int(np.sum(changed_mask))

        flat[:needed_bits] = (flat[:needed_bits] & 0xFE) | payload_bits
        mod_array = flat.reshape(orig_array.shape)

        # Lossless re-encode
        mod_png_b64 = cls.array_to_b64_png(mod_array)
        mod_sha256 = hashlib.sha256(cls.b64_to_bytes(mod_png_b64)).hexdigest()

        embedding_rate_bpp = round(needed_bits / float(h * w), 5)
        mod_pixel_rate = round((modified_count / float(h * w)) * 100.0, 3)

        diff_map_b64 = cls.generate_amplified_diff_map(orig_array, mod_array)

        return {
            "stego_image_b64": mod_png_b64,
            "modified_sha256": mod_sha256,
            "diff_map_b64": diff_map_b64,
            "payload_bytes": payload_len,
            "capacity_bytes": max_capacity_bytes,
            "capacity_used_percent": round((payload_len / float(max_capacity_bytes)) * 100.0, 2),
            "modified_bits_count": modified_count,
            "modified_pixel_percent": mod_pixel_rate,
            "embedding_rate_bpp": embedding_rate_bpp,
            "is_encrypted": is_encrypted,
            "algorithm": "Classical LSB Substitution (1 bpp payload stream)",
            "header_format": "STGL [Magic 4B | Flags 2B | Length 4B | CRC32 4B]",
        }

    @classmethod
    def extract_secret_message_lsb(cls, stego_array: np.ndarray, password: Optional[str] = None) -> Dict[str, Any]:
        """
        Extracts and verifies a secret message embedded via StegoShield LSB protocol.
        """
        flat = stego_array.flatten()
        header_bits_count = cls.HEADER_SIZE_BYTES * 8

        if len(flat) < header_bits_count:
            raise ValueError("Image carrier is too small to contain a valid StegoLab header.")

        # Extract 112 bits for header
        header_bits = flat[:header_bits_count] & 1
        header_bytes = np.packbits(header_bits).tobytes()

        try:
            magic, flags, payload_len, expected_crc = struct.unpack(">4sHII", header_bytes)
        except Exception as e:
            raise ValueError(f"Failed to unpack header: {e}")

        if magic != cls.HEADER_MAGIC:
            raise ValueError(
                "No StegoLab watermark header found (header marker does not match 'STGL'). "
                "This image is either clean cover or encoded using a different steganography algorithm."
            )

        is_encrypted = bool(flags & 0x01)
        needed_payload_bits = payload_len * 8

        if header_bits_count + needed_payload_bits > len(flat):
            raise ValueError(
                f"Corrupt or truncated payload: header indicates {payload_len} bytes, "
                f"which exceeds the available image capacity ({len(flat)} bits)."
            )

        # Extract payload bits
        payload_bits = flat[header_bits_count : header_bits_count + needed_payload_bits] & 1
        extracted_payload = np.packbits(payload_bits).tobytes()

        # Decrypt if password-protected
        if is_encrypted:
            if not password:
                return {
                    "success": False,
                    "is_encrypted": True,
                    "payload_bytes": payload_len,
                    "status": "Password required: message is protected with encryption.",
                    "secret_text": None,
                }
            decrypted = cls._keystream_cipher(extracted_payload, password.strip())
        else:
            decrypted = extracted_payload

        # Validate CRC32 checksum
        actual_crc = zlib.crc32(decrypted) & 0xFFFFFFFF
        if actual_crc != expected_crc:
            return {
                "success": False,
                "is_encrypted": is_encrypted,
                "payload_bytes": payload_len,
                "status": "Integrity check failed: invalid password or corrupted steganographic bits.",
                "secret_text": None,
            }

        try:
            secret_text = decrypted.decode("utf-8")
        except UnicodeDecodeError:
            secret_text = decrypted.decode("utf-8", errors="replace")

        return {
            "success": True,
            "is_encrypted": is_encrypted,
            "secret_text": secret_text,
            "payload_bytes": payload_len,
            "total_pixels_scanned": (header_bits_count + needed_payload_bits),
            "status": "Verified 100% bit-fidelity (CRC32 checksum match).",
        }

    # -------------------------------------------------------------------------
    # 6. Forensic Comparison Engine
    # -------------------------------------------------------------------------

    @classmethod
    def generate_amplified_diff_map(cls, orig: np.ndarray, mod: np.ndarray) -> str:
        """
        Generates an amplified perturbation map:
        - +1 modifications rendered in high-contrast white
        - -1 modifications rendered in mid-gray
        - Unmodified pixels rendered in deep black
        """
        h, w = orig.shape[:2]
        if orig.ndim == 3 and mod.ndim == 3:
            diff = mod.astype(np.int16) - orig.astype(np.int16)
            diff_1d = np.mean(diff, axis=-1)
        else:
            diff_1d = mod.astype(np.int16) - orig.astype(np.int16)

        rgb_map = np.zeros((h, w, 3), dtype=np.uint8)
        # Deep dark background for unchanged pixels
        rgb_map[:] = [15, 15, 15]

        # Amplified contrast
        rgb_map[diff_1d > 0] = [255, 255, 255]   # White (+1 or positive alteration)
        rgb_map[diff_1d < 0] = [120, 120, 120]   # Gray (-1 or negative alteration)

        return cls.array_to_b64_png(rgb_map)

    @classmethod
    def compare_images(cls, orig: np.ndarray, mod: np.ndarray) -> Dict[str, Any]:
        """
        Deep scientific forensic comparison between original cover and modified carrier.
        Computes exact pixel deltas, channel deviations, Shannon entropy shift,
        residual energy shift, and amplified difference visualizations.
        """
        if orig.shape != mod.shape:
            raise ValueError(f"Image dimension mismatch: original is {orig.shape}, modified is {mod.shape}")

        h, w = orig.shape[:2]
        total_pixels = h * w
        is_rgb = orig.ndim == 3 and orig.shape[2] == 3

        # Exact changed pixels count
        if is_rgb:
            pixel_diff = np.any(orig != mod, axis=-1)
            channel_diff = np.abs(mod.astype(np.int32) - orig.astype(np.int32))
            changed_channels_count = int(np.sum(channel_diff > 0))
            per_channel_changed = {
                "red": int(np.sum(orig[:, :, 0] != mod[:, :, 0])),
                "green": int(np.sum(orig[:, :, 1] != mod[:, :, 1])),
                "blue": int(np.sum(orig[:, :, 2] != mod[:, :, 2])),
            }
        else:
            pixel_diff = orig != mod
            changed_channels_count = int(np.sum(pixel_diff))
            per_channel_changed = {"gray": changed_channels_count}

        changed_pixels_count = int(np.sum(pixel_diff))
        unchanged_pixels_count = total_pixels - changed_pixels_count
        change_rate_percent = round((changed_pixels_count / float(total_pixels)) * 100.0, 3)

        # Count total bit changes (Hamming distance across arrays)
        xor_diff = np.bitwise_xor(orig, mod)
        total_bit_changes = int(np.sum(np.unpackbits(xor_diff)))

        # Statistical properties
        orig_mean = round(float(np.mean(orig)), 3)
        mod_mean = round(float(np.mean(mod)), 3)
        delta_mean = round(mod_mean - orig_mean, 4)

        orig_std = round(float(np.std(orig)), 3)
        mod_std = round(float(np.std(mod)), 3)
        delta_std = round(mod_std - orig_std, 4)

        orig_entropy = cls.calculate_entropy(orig)
        mod_entropy = cls.calculate_entropy(mod)
        delta_entropy = round(mod_entropy - orig_entropy, 4)

        orig_res_energy = cls.calculate_residual_energy(orig)
        mod_res_energy = cls.calculate_residual_energy(mod)
        delta_res_energy = round(mod_res_energy - orig_res_energy, 4)

        # Histograms
        if not is_rgb:
            orig_hist = np.bincount(orig.flatten(), minlength=256).tolist()
            mod_hist = np.bincount(mod.flatten(), minlength=256).tolist()
        else:
            orig_hist = np.bincount(np.mean(orig, axis=2).astype(np.uint8).flatten(), minlength=256).tolist()
            mod_hist = np.bincount(np.mean(mod, axis=2).astype(np.uint8).flatten(), minlength=256).tolist()

        diff_map_b64 = cls.generate_amplified_diff_map(orig, mod)

        return {
            "total_pixels": total_pixels,
            "changed_pixels": changed_pixels_count,
            "unchanged_pixels": unchanged_pixels_count,
            "changed_pixel_percent": change_rate_percent,
            "changed_channel_values": changed_channels_count,
            "total_bit_changes": total_bit_changes,
            "per_channel_changed": per_channel_changed,
            "statistics": {
                "original_mean": orig_mean,
                "modified_mean": mod_mean,
                "delta_mean": delta_mean,
                "original_std": orig_std,
                "modified_std": mod_std,
                "delta_std": delta_std,
                "original_entropy": orig_entropy,
                "modified_entropy": mod_entropy,
                "delta_entropy": delta_entropy,
                "original_residual_energy": orig_res_energy,
                "modified_residual_energy": mod_res_energy,
                "delta_residual_energy": delta_res_energy,
            },
            "original_histogram": orig_hist,
            "modified_histogram": mod_hist,
            "diff_map_b64": diff_map_b64,
        }

