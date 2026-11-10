"""
StegoShield AI Classical Statistical Steganalysis & Forensics Suite.

Implements standard classical steganalysis metrics:
1. Subtractive Pixel Adjacency Matrix (SPAM) 2nd-order Markov transition properties.
2. 1st-Order and 2nd-Order spatial gradient variance.
3. High-Pass Laplacian Residual Energy (variance).
4. Bit-Plane 0 (LSB) Shannon Entropy and Bit Uniformity.
5. Structural Asymmetry / Chi-Square indicator.
"""

from typing import Dict, Tuple
import numpy as np
from scipy.signal import convolve2d


class StatisticalForensicsDetector:
    """Computes comprehensive statistical image forensic features."""

    @staticmethod
    def extract_metrics(img_arr: np.ndarray) -> Dict:
        """
        Extracts multi-faceted statistical metrics from an 8-bit grayscale image array.
        Returns a dictionary of deterministic forensic indicators.
        """
        arr = img_arr.astype(np.uint8)
        arr_f = arr.astype(np.float32)
        h, w = arr.shape
        total_pixels = h * w

        # 1. Bit-Plane 0 (LSB) Shannon Entropy
        b0 = (arr & 1).flatten()
        p1 = float(np.mean(b0))
        p0 = 1.0 - p1
        p0_safe = max(1e-9, p0)
        p1_safe = max(1e-9, p1)
        lsb_entropy = float(- (p0_safe * np.log2(p0_safe) + p1_safe * np.log2(p1_safe)))
        lsb_uniformity_bias = float(abs(p1 - 0.5))

        # 2. Laplacian High-Pass Spatial Residual Variance
        laplacian_kernel = np.array(
            [[0.0, -1.0, 0.0],
             [-1.0, 4.0, -1.0],
             [0.0, -1.0, 0.0]],
            dtype=np.float32,
        )
        residuals = convolve2d(arr_f, laplacian_kernel, mode="same", boundary="symm")
        residual_variance = float(np.var(residuals))
        residual_kurtosis = float(np.mean((residuals - np.mean(residuals)) ** 4) / (residual_variance ** 2 + 1e-9))

        # 3. 1st-Order Spatial Difference Variances (Horizontal & Vertical)
        diff_h = np.diff(arr_f, axis=1)
        diff_v = np.diff(arr_f, axis=0)
        grad_variance = float((np.var(diff_h) + np.var(diff_v)) / 2.0)

        # 4. SPAM 2nd-Order Markov Transition Divergence (T=3)
        T = 3
        Dh = np.clip(diff_h, -T, T).astype(np.int16) + T
        size = 2 * T + 1
        pairs_h = Dh[:, :-1].flatten() * size + Dh[:, 1:].flatten()
        hist_h = np.bincount(pairs_h, minlength=size * size).reshape(size, size).astype(np.float32)
        row_sums = hist_h.sum(axis=1, keepdims=True) + 1e-7
        M_h = hist_h / row_sums
        # Transition diagonal dominance (natural images have strong self-transitions)
        diag_weight = float(np.trace(M_h) / size)

        # 5. Chi-Square / Pairs of Values (PoV) Asymmetry
        # S-UNIWARD uses ternary ±1 modifications which preserve PoV better than raw LSB replacement,
        # but introduces subtle high-frequency edge deviations.
        hist_256 = np.bincount(arr.flatten(), minlength=256)
        pairs_diff = np.abs(hist_256[0::2] - hist_256[1::2])
        pairs_sum = hist_256[0::2] + hist_256[1::2] + 1e-5
        chi_square_val = float(np.sum((pairs_diff ** 2) / pairs_sum) / 128.0)

        return {
            "lsb_shannon_entropy": round(lsb_entropy, 4),
            "lsb_uniformity_deviation": round(lsb_uniformity_bias, 4),
            "laplacian_residual_variance": round(residual_variance, 4),
            "residual_kurtosis": round(residual_kurtosis, 4),
            "spatial_gradient_variance": round(grad_variance, 4),
            "spam_markov_diag_dominance": round(diag_weight, 4),
            "chi_square_pov_statistic": round(chi_square_val, 4),
        }
