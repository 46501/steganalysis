"""
Comprehensive diagnostic script comparing Octave and Python S-UNIWARD down to elementary steps.
"""

import sys
from pathlib import Path
import numpy as np
import scipy.io as sio
import scipy.signal
from PIL import Image

sys.path.insert(0, r"D:\Stego\scripts")
from generate_suniward_dataset import (
    HPDF, LPDF, FILTERS, ROTATED_KERNELS,
    compute_suniward_costs, calc_lambda, ternary_entropy
)

OCTAVE_TEST_DIR = Path(r"D:\Stego\reports\suniward_validation\octave_test")
RAW_DIR = Path(r"D:\Stego\dataset\raw\BOSSbase")

def run_diagnostics():
    print("=" * 80)
    print("TASK 2E: DEEP NUMERICAL DIAGNOSTIC - OCTAVE VS PYTHON S-UNIWARD")
    print("=" * 80)

    for idx in [1, 2]:
        print(f"\n--- DIAGNOSTIC FOR IMAGE {idx}.pgm ---")
        oct_data = sio.loadmat(str(OCTAVE_TEST_DIR / f"{idx}_octave_detail.mat"))
        
        # 1. Compare Cover
        cover_oct = oct_data["cover"]
        with Image.open(RAW_DIR / f"{idx}.pgm") as img:
            cover_py = np.array(img, dtype=np.float64)
        
        cover_diff = np.max(np.abs(cover_oct - cover_py))
        print(f"1. Cover image max diff: {cover_diff}")

        # 2. Compare Padding
        pad_oct = oct_data["coverPadded"]
        pad_py = np.pad(cover_py, 16, mode='symmetric')
        pad_diff = np.max(np.abs(pad_oct - pad_py))
        print(f"2. Padding (symmetric, 16) max diff: {pad_diff}")

        # 3. Compare Filters
        for f_idx in range(1, 4):
            F_oct = oct_data[f"F{f_idx}"]
            F_py = FILTERS[f_idx - 1]
            f_diff = np.max(np.abs(F_oct - F_py))
            print(f"3. Filter F{f_idx} max diff: {f_diff:.2e}")

        # 4. Compare Residuals R (conv2 vs fftconvolve)
        for f_idx in range(1, 4):
            R_oct = oct_data[f"R{f_idx}"]
            F_py = FILTERS[f_idx - 1]
            
            # Python fftconvolve
            R_py_fft = scipy.signal.fftconvolve(pad_py, F_py, mode='same')
            # Python convolve2d (spatial)
            R_py_spatial = scipy.signal.convolve2d(pad_py, F_py, mode='same')
            
            diff_fft = np.max(np.abs(R_oct - R_py_fft))
            diff_spatial = np.max(np.abs(R_oct - R_py_spatial))
            print(f"4. Residual R{f_idx}:")
            print(f"   Max diff (Octave conv2 vs SciPy fftconvolve): {diff_fft:.2e}")
            print(f"   Max diff (Octave conv2 vs SciPy convolve2d):  {diff_spatial:.2e}")

        # 5. Compare Suitability before shift (raw)
        sgm = 10.0 * np.finfo(np.float64).eps
        for f_idx in range(1, 4):
            raw_oct = oct_data[f"raw{f_idx}"]
            R_oct = oct_data[f"R{f_idx}"]
            F_py = FILTERS[f_idx - 1]
            K_rot = ROTATED_KERNELS[f_idx - 1]
            
            # Using Octave R
            suit_fft = scipy.signal.fftconvolve(1.0 / (np.abs(R_oct) + sgm), K_rot, mode='same')
            suit_spatial = scipy.signal.convolve2d(1.0 / (np.abs(R_oct) + sgm), K_rot, mode='same')
            
            print(f"5. Suitability Raw{f_idx}:")
            print(f"   Max diff (Octave raw vs SciPy fftconvolve): {np.max(np.abs(raw_oct - suit_fft)):.2e}")
            print(f"   Max diff (Octave raw vs SciPy convolve2d):  {np.max(np.abs(raw_oct - suit_spatial)):.2e}")

        # 6. Compare Suitability after shift
        for f_idx in range(1, 4):
            shift_oct = oct_data[f"shift{f_idx}"]
            raw_oct = oct_data[f"raw{f_idx}"]
            
            # Test different roll shifts in Python
            roll_1_1 = np.roll(raw_oct, (1, 1), axis=(0, 1))
            roll_m1_m1 = np.roll(raw_oct, (-1, -1), axis=(0, 1))
            roll_1_0 = np.roll(raw_oct, 1, axis=0)
            roll_0_1 = np.roll(raw_oct, 1, axis=1)
            
            print(f"6. Suitability Shift{f_idx}:")
            print(f"   Max diff (Octave shift vs np.roll(1, 1)):   {np.max(np.abs(shift_oct - roll_1_1)):.2e}")
            print(f"   Max diff (Octave shift vs np.roll(-1, -1)): {np.max(np.abs(shift_oct - roll_m1_m1)):.2e}")

        # 7. Compare Crop xi
        k, l = cover_py.shape
        pad = 16
        for f_idx in range(1, 4):
            xi_oct = oct_data[f"xi{f_idx}"]
            shift_oct = oct_data[f"shift{f_idx}"]
            
            # MATLAB crop formula:
            # ((size(suit, 1)-k)/2)+1:end-((size(suit, 1)-k)/2)
            # size is 544. (544-512)/2 = 16. MATLAB: 16+1 : 544-16 = 17:528 (1-indexed).
            # In 0-indexed Python: 16:528 (which is pad:pad+k).
            crop_py = shift_oct[pad:pad + k, pad:pad + l]
            print(f"7. Crop xi{f_idx}:")
            print(f"   Max diff (Octave xi vs Python slice): {np.max(np.abs(xi_oct - crop_py)):.2e}")

        # 8. Compare Complete Pipeline: Octave rho vs Python rho
        rho_oct = oct_data["rho"]
        rho_p_py, rho_m_py = compute_suniward_costs(cover_py)
        
        diff_rho = np.abs(rho_oct - rho_p_py)
        rel_diff_rho = diff_rho / (rho_oct + 1e-12)
        print(f"8. Full Pipeline Distortion Cost Comparison:")
        print(f"   Octave rho finite mean:   {np.mean(rho_oct[rho_oct < 1e8]):.4f}")
        print(f"   Python rho finite mean:   {np.mean(rho_p_py[rho_p_py < 1e8]):.4f}")
        print(f"   Max absolute diff:        {np.max(diff_rho):.4e}")
        print(f"   Mean absolute diff:       {np.mean(diff_rho):.4e}")
        print(f"   Median absolute diff:     {np.median(diff_rho):.4e}")
        print(f"   Mean relative diff:       {np.mean(rel_diff_rho)*100:.4f}%")
        print(f"   Median relative diff:     {np.median(rel_diff_rho)*100:.4f}%")
        
        # 9. Now let's test where the difference in rho comes from:
        # What if we run the Python pipeline using scipy.signal.convolve2d instead of fftconvolve?
        def compute_costs_spatial(cover, wet_cost=1e8):
            cover_padded = np.pad(cover, pad, mode='symmetric')
            xi_total = np.zeros((k, l), dtype=np.float64)
            for F, K_rot in zip(FILTERS, ROTATED_KERNELS):
                R = scipy.signal.convolve2d(cover_padded, F, mode='same')
                suitability = scipy.signal.convolve2d(1.0 / (np.abs(R) + sgm), K_rot, mode='same')
                suitability = np.roll(suitability, (1, 1), axis=(0, 1))
                xi_crop = suitability[pad:pad + k, pad:pad + l]
                xi_total += xi_crop
            rho = xi_total
            rho[rho > wet_cost] = wet_cost
            rho[np.isnan(rho)] = wet_cost
            return rho

        rho_py_spatial = compute_costs_spatial(cover_py)
        diff_spatial_oct = np.abs(rho_oct - rho_py_spatial)
        print(f"9. Octave conv2 vs SciPy convolve2d (spatial vs spatial):")
        print(f"   Max absolute diff:    {np.max(diff_spatial_oct):.4e}")
        print(f"   Mean absolute diff:   {np.mean(diff_spatial_oct):.4e}")
        print(f"   Mean relative diff:   {np.mean(diff_spatial_oct / (rho_oct + 1e-12))*100:.4f}%")
        
        # 10. Lambda & Stopping Criterion Analysis
        N = cover_py.size
        msg_len = 0.4 * N
        
        # Compare Lambda with Octave costs vs Python costs
        lam_oct_costs = calc_lambda(oct_data["rhoP1"], oct_data["rhoM1"], msg_len)
        lam_py_costs = calc_lambda(rho_p_py, rho_m_py, msg_len)
        print(f"10. Lambda Solver Analysis:")
        print(f"    Octave reported lambda:                 {float(oct_data.get('lambda', [0])[0] if 'lambda' in oct_data else 0):.6f}")
        print(f"    Python calc_lambda on Octave costs:    {lam_oct_costs:.6f}")
        print(f"    Python calc_lambda on Python costs:    {lam_py_costs:.6f}")

if __name__ == "__main__":
    run_diagnostics()

