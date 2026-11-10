"""
StegoShield AI Visual Forensics Service.

Generates high-resolution forensic visualization artifacts:
1. Spatial high-pass Laplacian residual heatmaps.
2. Bit-plane slicing (Bit Planes 0 through 7).
3. Amplified ternary perturbation maps (+1 Green, -1 Red, 0 Dark Navy).
"""

import io
import base64
from typing import Dict, Optional, Tuple
import numpy as np
from PIL import Image
from scipy.signal import convolve2d


class VisualForensicsService:
    """Provides visual forensic transformations for steganalysis inspection."""

    @staticmethod
    def _array_to_b64_png(img_array: np.ndarray) -> str:
        """Encodes a uint8 2D or 3D numpy array to a base64 PNG data URL."""
        pil_img = Image.fromarray(img_array)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    @classmethod
    def generate_bitplane(cls, arr: np.ndarray, plane: int = 0) -> str:
        """
        Extracts a specific bit plane (0=LSB to 7=MSB) from a grayscale image array.
        Returns a base64 PNG data URL.
        """
        plane = max(0, min(7, int(plane)))
        bit_val = ((arr.astype(np.uint8) >> plane) & 1) * 255
        return cls._array_to_b64_png(bit_val.astype(np.uint8))

    @classmethod
    def generate_residual_heatmap(cls, arr: np.ndarray) -> str:
        """
        Computes 2D Laplacian high-pass spatial residuals and maps them to a
        vibrant Turbo/Cyber forensic colormap showing textured noise distribution.
        """
        laplacian = np.array(
            [[0.0, -1.0, 0.0],
             [-1.0, 4.0, -1.0],
             [0.0, -1.0, 0.0]],
            dtype=np.float32,
        )
        res = np.abs(convolve2d(arr.astype(np.float32), laplacian, mode="same", boundary="symm"))
        # Robust 99th percentile normalization to avoid outlier saturation
        p99 = float(np.percentile(res, 99.0)) + 1e-5
        norm = np.clip((res / p99) * 255.0, 0.0, 255.0).astype(np.uint8)

        # Generate a high-contrast Cyberpunk / Forensic heatmap:
        # High residuals -> Bright Gold/Amber/Red
        # Low residuals -> Deep Navy/Midnight Blue
        h, w = norm.shape
        heatmap = np.zeros((h, w, 3), dtype=np.uint8)
        norm_f = norm.astype(np.float32) / 255.0

        # R channel: peaks at high energy
        heatmap[:, :, 0] = np.clip(norm_f * 320.0 - 50.0, 10.0, 255.0).astype(np.uint8)
        # G channel: mid-range energy
        heatmap[:, :, 1] = np.clip(norm_f * 220.0, 15.0, 220.0).astype(np.uint8)
        # B channel: high for low energy (deep blue), drops for high energy
        heatmap[:, :, 2] = np.clip(160.0 - norm_f * 140.0, 20.0, 180.0).astype(np.uint8)

        return cls._array_to_b64_png(heatmap)

    @classmethod
    def generate_amplified_diff(
        cls,
        cover_arr: np.ndarray,
        stego_arr: np.ndarray,
    ) -> Tuple[str, Dict]:
        """
        Generates an amplified perturbation map showing exact ±1 stego changes:
        - +1 modifications rendered in Emerald Green (#34D399)
        - -1 modifications rendered in Crimson Red (#F87171)
        - Unmodified (0) rendered in Dark Slate Navy (#0B0F19)
        """
        diff = stego_arr.astype(np.int16) - cover_arr.astype(np.int16)
        h, w = diff.shape
        total_pixels = h * w

        plus_1 = int(np.sum(diff == 1))
        minus_1 = int(np.sum(diff == -1))
        unmodified = int(np.sum(diff == 0))
        modified_total = plus_1 + minus_1
        change_rate = (modified_total / total_pixels) * 100.0 if total_pixels > 0 else 0.0

        rgb_map = np.zeros((h, w, 3), dtype=np.uint8)
        rgb_map[:] = [11, 15, 25]  # Dark background
        rgb_map[diff == 1] = [52, 211, 153]   # Emerald Green
        rgb_map[diff == -1] = [248, 113, 113] # Crimson Red

        b64_png = cls._array_to_b64_png(rgb_map)
        stats = {
            "total_pixels": total_pixels,
            "modified_pixels": modified_total,
            "change_rate_percent": round(change_rate, 3),
            "plus_one_count": plus_1,
            "minus_one_count": minus_1,
            "unmodified_count": unmodified,
            "net_perturbation_bias": plus_1 - minus_1,
        }
        return b64_png, stats

    @classmethod
    def generate_fft_spectrum(cls, arr: np.ndarray) -> Tuple[str, Dict]:
        """
        Computes 2D Fast Fourier Transform (2D FFT) Power Spectrum.
        Center-shifts DC component and displays logarithmic magnitude with
        high-frequency spectral energy distribution metrics.
        """
        arr_f = arr.astype(np.float32)
        h, w = arr_f.shape

        # 2D FFT and zero-frequency center shift
        f = np.fft.fft2(arr_f)
        fshift = np.fft.fftshift(f)
        mag = np.abs(fshift)
        log_mag = np.log1p(mag)

        # Normalize to [0, 255]
        min_v = float(np.min(log_mag))
        max_v = float(np.max(log_mag))
        norm = ((log_mag - min_v) / (max_v - min_v + 1e-9) * 255.0).astype(np.uint8)

        # Forensic Spectral Colormap:
        # DC Center Peak -> Bright Gold / Amber
        # Mid Frequencies -> Electric Cyan
        # High Frequency Outliers -> Deep Indigo / Purple
        norm_f = norm.astype(np.float32) / 255.0
        rgb = np.zeros((h, w, 3), dtype=np.uint8)
        rgb[:, :, 0] = np.clip(norm_f * 260.0 - 20.0, 15.0, 255.0).astype(np.uint8)
        rgb[:, :, 1] = np.clip(np.sin(norm_f * np.pi) * 220.0, 10.0, 230.0).astype(np.uint8)
        rgb[:, :, 2] = np.clip((1.0 - norm_f) * 190.0 + 30.0, 25.0, 220.0).astype(np.uint8)

        # Radial High-Frequency Energy Ratio Calculation
        cy, cx = h // 2, w // 2
        Y, X = np.ogrid[:h, :w]
        dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        cutoff = 0.5 * min(cx, cy)
        power = mag ** 2
        total_power = float(np.sum(power)) + 1e-9
        hf_power = float(np.sum(power[dist >= cutoff]))
        hf_ratio = round((hf_power / total_power) * 100.0, 3)

        # Spectral entropy
        p = power.flatten() / total_power
        p_safe = p[p > 1e-12]
        spectral_entropy = round(float(-np.sum(p_safe * np.log2(p_safe))), 4)

        b64_png = cls._array_to_b64_png(rgb)
        stats = {
            "hf_spectral_energy_percent": hf_ratio,
            "spectral_entropy": spectral_entropy,
            "dc_peak_magnitude": round(float(mag[cy, cx]), 1),
            "cutoff_radius_px": int(cutoff),
        }
        return b64_png, stats

