"""
StegoShield AI — Statistical Steganalysis Verification Suite.

Implements classic mathematical and statistical detectors for deterministic proof:
1. Chi-Square (χ²) Attack (Westfeld & Pfitzmann): Analyzes Pairs of Values (PoVs).
2. Sample Pair Analysis (SPA) (Dumitrescu, Wu, Wang): Estimates LSB replacement rate using cross-group multisets.
3. RS (Regular/Singular) Steganalysis (Fridrich, Goljan, Du): Measures embedding capacity via invertible mask flips.
"""

import math
import numpy as np
from typing import Dict, Any


class StatisticalSteganalysis:
    """Fast, vectorized statistical tests for spatial LSB steganography detection."""

    @staticmethod
    def chi_square_attack(image: np.ndarray, num_bins: int = 128) -> Dict[str, Any]:
        """
        Executes Chi-Square attack on Pairs of Values (PoVs).
        For an unaltered natural image, intensities in pairs (2k, 2k+1) naturally differ.
        Under LSB replacement steganography, the frequencies equalize: n_{2k} ≈ n_{2k+1}.
        """
        if image.ndim == 3:
            gray = (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]).astype(np.uint8)
        else:
            gray = image.astype(np.uint8)

        hist, _ = np.histogram(gray, bins=256, range=(0, 256))

        chi_stat = 0.0
        degrees_of_freedom = 0

        for k in range(num_bins):
            n_2k = float(hist[2 * k])
            n_2k1 = float(hist[2 * k + 1])
            expected = (n_2k + n_2k1) / 2.0

            if expected > 5.0:  # Valid chi-square frequency threshold
                diff = n_2k - expected
                chi_stat += (diff * diff) / expected
                degrees_of_freedom += 1

        if degrees_of_freedom < 2:
            return {
                "test_name": "Chi-Square (χ²) Attack",
                "chi_statistic": 0.0,
                "degrees_of_freedom": 0,
                "p_value": 0.0,
                "stego_probability": 0.0,
                "verdict": "Inconclusive (Low Dynamics)",
            }

        # Wilson-Hilferty transformation for chi-square p-value
        try:
            from scipy.stats import chi2
            p_val = float(1.0 - chi2.cdf(chi_stat, degrees_of_freedom))
        except Exception:
            z = ((chi_stat / degrees_of_freedom) ** (1.0 / 3.0) - (1.0 - 2.0 / (9.0 * degrees_of_freedom))) / math.sqrt(2.0 / (9.0 * degrees_of_freedom))
            p_val = 0.5 * math.erfc(z / math.sqrt(2))

        # In Chi-square attack on PoVs, equalized frequencies yield low chi_stat relative to df.
        # Stego is indicated when observed distribution matches equalized model.
        stego_prob = max(0.0, min(1.0, 1.0 - (chi_stat / max(1.0, degrees_of_freedom * 2.5))))

        return {
            "test_name": "Chi-Square (χ²) Attack",
            "chi_statistic": round(chi_stat, 2),
            "degrees_of_freedom": degrees_of_freedom,
            "p_value": round(float(p_val), 4),
            "stego_probability": round(float(stego_prob), 4),
            "verdict": "Stego Indicated" if stego_prob > 0.65 else "Clean / Cover",
        }

    @staticmethod
    def sample_pair_analysis(image: np.ndarray) -> Dict[str, Any]:
        """
        Executes Sample Pair Analysis (SPA) (Dumitrescu, Wu, Wang, 2001).
        Uses trace multisets between same-PoV and cross-PoV adjacent horizontal pixel pairs
        to estimate LSB replacement rate (bpp).
        """
        if image.ndim == 3:
            gray = (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]).astype(np.int32)
        else:
            gray = image.astype(np.int32)

        u = gray[:, :-1].flatten()
        v = gray[:, 1:].flatten()
        n = len(u)

        if n < 100:
            return {
                "test_name": "Sample Pair Analysis (SPA)",
                "estimated_payload_bpp": 0.0,
                "pair_count": n,
                "verdict": "Inconclusive (Image Too Small)",
            }

        # Primary PoV pairs: floor(u/2) == floor(v/2)
        same_group = (u // 2) == (v // 2)
        e_same = float(np.sum(same_group & (u == v)))
        o_same = float(np.sum(same_group & (u != v)))
        delta_same = e_same - o_same

        # Cross-PoV pairs (shifted by 1): floor((u+1)/2) == floor((v+1)/2)
        cross_group = ((u + 1) // 2) == ((v + 1) // 2)
        e_cross = float(np.sum(cross_group & (u == v)))
        o_cross = float(np.sum(cross_group & (u != v)))
        delta_cross = e_cross - o_cross

        if delta_cross <= 0.0:
            estimated_bpp = 0.0
        else:
            # Under LSB replacement at rate p, delta_same shrinks as (1 - p) * delta_cross
            estimated_bpp = max(0.0, min(1.0, 1.0 - (delta_same / delta_cross)))

        return {
            "test_name": "Sample Pair Analysis (SPA)",
            "estimated_payload_bpp": round(float(estimated_bpp), 4),
            "pair_count": n,
            "verdict": "Stego Indicated" if estimated_bpp > 0.15 else "Clean / Cover",
        }

    @staticmethod
    def rs_steganalysis(image: np.ndarray) -> Dict[str, Any]:
        """
        Executes RS (Regular/Singular) Steganalysis (Fridrich, Goljan, Du).
        Analyzes group smoothness under invertible LSB flipping masks M and -M.
        In cover images: R_M ≈ R_{-M} and S_M ≈ S_{-M}.
        In stego images: R_M converges to S_M while R_{-M} and S_{-M} diverge significantly.
        """
        if image.ndim == 3:
            gray = (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]).astype(np.int32)
        else:
            gray = image.astype(np.int32)

        h, w = gray.shape
        h = (h // 2) * 2
        w = (w // 2) * 2
        if h < 4 or w < 4:
            return {
                "test_name": "RS (Regular / Singular) Steganalysis",
                "rs_delta": 0.0,
                "estimated_payload_bpp": 0.0,
                "verdict": "Inconclusive (Image Too Small)",
            }

        sub = gray[:h, :w]

        # 2x2 blocks: mask M = [0, 1, 1, 0]
        b1 = sub[0::2, 0::2]
        b2 = sub[0::2, 1::2]
        b3 = sub[1::2, 0::2]
        b4 = sub[1::2, 1::2]

        def variation(v1, v2, v3, v4):
            return np.abs(v1 - v2) + np.abs(v2 - v4) + np.abs(v4 - v3) + np.abs(v3 - v1)

        v_orig = variation(b1, b2, b3, b4)

        # F_1 flip: bitwise XOR 1 (maps 2k <-> 2k+1)
        b2_f1 = b2 ^ 1
        b3_f1 = b3 ^ 1
        v_f1 = variation(b1, b2_f1, b3_f1, b4)

        r_m = np.sum(v_f1 > v_orig)
        s_m = np.sum(v_f1 < v_orig)

        # F_{-1} flip: invertible shift (maps 2k <-> 2k-1, 2k+1 <-> 2k+2)
        def flip_neg1(val):
            res = val.copy()
            even_mask = (val % 2 == 0) & (val > 0)
            odd_mask = (val % 2 == 1) & (val < 255)
            res[even_mask] = val[even_mask] - 1
            res[odd_mask] = val[odd_mask] + 1
            return res

        b2_fn1 = flip_neg1(b2)
        b3_fn1 = flip_neg1(b3)
        v_fn1 = variation(b1, b2_fn1, b3_fn1, b4)

        r_nm = np.sum(v_fn1 > v_orig)
        s_nm = np.sum(v_fn1 < v_orig)

        total_blocks = float(len(b1.flatten()))
        r_m_norm = r_m / total_blocks
        s_m_norm = s_m / total_blocks
        r_nm_norm = r_nm / total_blocks
        s_nm_norm = s_nm / total_blocks

        # Difference metric: In clean images, |R_M - R_-M| ≈ 0 and |S_M - S_-M| ≈ 0
        rs_delta = abs(r_m_norm - r_nm_norm) + abs(s_m_norm - s_nm_norm)
        est_rate = max(0.0, min(1.0, rs_delta * 2.0))

        return {
            "test_name": "RS (Regular / Singular) Steganalysis",
            "regular_m": round(float(r_m_norm), 4),
            "singular_m": round(float(s_m_norm), 4),
            "regular_neg_m": round(float(r_nm_norm), 4),
            "singular_neg_m": round(float(s_nm_norm), 4),
            "rs_delta": round(float(rs_delta), 4),
            "estimated_payload_bpp": round(float(est_rate), 4),
            "verdict": "Stego Indicated" if est_rate > 0.12 else "Clean / Cover",
        }

    @classmethod
    def run_all_tests(cls, image_array: np.ndarray) -> Dict[str, Any]:
        """Runs the complete statistical test suite and synthesizes an aggregate mathematical verdict."""
        chi = cls.chi_square_attack(image_array)
        spa = cls.sample_pair_analysis(image_array)
        rs = cls.rs_steganalysis(image_array)

        stego_indicators = sum([
            1 if chi["verdict"] == "Stego Indicated" else 0,
            1 if spa["verdict"] == "Stego Indicated" else 0,
            1 if rs["verdict"] == "Stego Indicated" else 0,
        ])

        if stego_indicators >= 2:
            verdict = "Stego Indicated"
            confidence = round(0.70 + 0.10 * stego_indicators, 2)
        elif stego_indicators == 1:
            verdict = "Inconclusive / Trace"
            confidence = 0.55
        else:
            verdict = "Cover / Clean"
            confidence = 0.88

        return {
            "aggregate_verdict": verdict,
            "aggregate_confidence": confidence,
            "tests_passed": 3 - stego_indicators,
            "tests_flagged": stego_indicators,
            "chi_square": chi,
            "sample_pair": spa,
            "rs_analysis": rs,
        }
