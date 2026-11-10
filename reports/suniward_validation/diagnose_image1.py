"""
TASK 2F.1: Deep investigation of Image 1 numerical differences between Octave and Python.
"""

import sys
from pathlib import Path
import numpy as np
import scipy.io as sio
from PIL import Image

sys.path.insert(0, r"D:\Stego\scripts")
from generate_suniward_dataset import (
    HPDF, LPDF, FILTERS, ROTATED_KERNELS,
    conv2_matlab, compute_suniward_costs, calc_lambda, ternary_entropy
)

OCTAVE_TEST_DIR = Path(r"D:\Stego\reports\suniward_validation\octave_test")
RAW_DIR = Path(r"D:\Stego\dataset\raw\BOSSbase")

def analyze_image_1():
    print("=" * 85)
    print("TASK 2F.1 DEEP INVESTIGATION: BOSSBASE 1.pgm NUMERICAL DIFFERENCES")
    print("=" * 85)

    cover_path = RAW_DIR / "1.pgm"
    with Image.open(cover_path) as img:
        cover = np.array(img, dtype=np.int32)
    
    k, l = cover.shape
    N = cover.size
    pad = 16
    sgm = 10.0 * np.finfo(np.float64).eps
    cover_padded = np.pad(cover, pad, mode='symmetric')

    # Load Octave detail
    oct_data = sio.loadmat(str(OCTAVE_TEST_DIR / "1_octave_detail.mat"))
    rho_oct = oct_data["rho"]
    rhoP1_oct = oct_data["rhoP1"]
    rhoM1_oct = oct_data["rhoM1"]
    xi_oct = [oct_data["xi1"], oct_data["xi2"], oct_data["xi3"]]
    R_oct = [oct_data["R1"], oct_data["R2"], oct_data["R3"]]

    # Run Python steps with conv2_matlab
    R_py = []
    inv_R_py = []
    inv_R_oct = []
    xi_py = []

    for f_idx, (F, K_rot) in enumerate(zip(FILTERS, ROTATED_KERNELS)):
        R = conv2_matlab(cover_padded, F)
        R_py.append(R)
        
        inv_py = 1.0 / (np.abs(R) + sgm)
        inv_R_py.append(inv_py)
        
        inv_oct = 1.0 / (np.abs(R_oct[f_idx]) + sgm)
        inv_R_oct.append(inv_oct)
        
        suit = conv2_matlab(inv_py, K_rot)
        suit = np.roll(suit, (1, 1), axis=(0, 1))
        xi = suit[pad:pad + k, pad:pad + l]
        xi_py.append(xi)

    rho_py = xi_py[0] + xi_py[1] + xi_py[2]
    rho_py[rho_py > 1e8] = 1e8
    rho_py[np.isnan(rho_py)] = 1e8

    rhoP1_py = rho_py.copy()
    rhoM1_py = rho_py.copy()
    rhoP1_py[cover >= 255] = 1e8
    rhoM1_py[cover <= 0] = 1e8

    # 1. Investigate Residual R
    print("\n--- 1. RESIDUAL CONVOLUTION R (Octave vs Python conv2_matlab) ---")
    for f_idx in range(3):
        r_diff = np.abs(R_oct[f_idx] - R_py[f_idx])
        print(f"Filter {f_idx+1}: max abs diff = {np.max(r_diff):.4e}, mean abs diff = {np.mean(r_diff):.4e}")

    # 2. Investigate 1 / (|R| + sgm)
    print("\n--- 2. INVERSE RESIDUAL 1 / (|R| + sgm) ---")
    for f_idx in range(3):
        inv_diff = np.abs(inv_R_oct[f_idx] - inv_R_py[f_idx])
        print(f"Filter {f_idx+1}: max abs diff = {np.max(inv_diff):.4e}, mean abs diff = {np.mean(inv_diff):.4e}")
        # Look at pixels where R is near zero
        mask_near_zero = np.abs(R_oct[f_idx]) < 1e-12
        print(f"  Pixels with |R_oct| < 1e-12: {np.sum(mask_near_zero)}")
        if np.sum(mask_near_zero) > 0:
            print(f"  Max inv_diff on near-zero: {np.max(inv_diff[mask_near_zero]):.4e}")
            print(f"  Sample R_oct on near-zero: {R_oct[f_idx][mask_near_zero][:5]}")
            print(f"  Sample R_py on near-zero:  {R_py[f_idx][mask_near_zero][:5]}")

    # 3. Investigate Suitability xi
    print("\n--- 3. SUITABILITY MAPS xi ---")
    for f_idx in range(3):
        xi_diff = np.abs(xi_oct[f_idx] - xi_py[f_idx])
        print(f"Filter {f_idx+1}: max abs diff = {np.max(xi_diff):.4e}, mean abs diff = {np.mean(xi_diff):.4e}")

    # 4. Investigate Cost rho localization (Saturated vs Non-Saturated)
    print("\n--- 4. LOCALIZATION OF COST DIFFERENCES ---")
    is_sat = (cover == 255)
    sat_count = int(np.sum(is_sat))
    non_sat_count = int(np.sum(~is_sat))
    print(f"Total pixels: {N}")
    print(f"Saturated 255 pixels: {sat_count} ({sat_count/N*100:.2f}%)")
    print(f"Non-saturated pixels: {non_sat_count} ({non_sat_count/N*100:.2f}%)")

    # In rho, where are differences?
    diff_rho = np.abs(rho_oct - rho_py)
    diff_rhoP1 = np.abs(rhoP1_oct - rhoP1_py)
    diff_rhoM1 = np.abs(rhoM1_oct - rhoM1_py)

    print(f"\nrhoP1 comparison:")
    print(f"  On saturated pixels (cover == 255):")
    print(f"    Octave rhoP1: all == 1e8? {np.all(rhoP1_oct[is_sat] == 1e8)}")
    print(f"    Python rhoP1: all == 1e8? {np.all(rhoP1_py[is_sat] == 1e8)}")
    print(f"    Max diff on saturated: {np.max(diff_rhoP1[is_sat]):.4e}")
    
    print(f"  On non-saturated pixels (cover < 255):")
    print(f"    Octave rhoP1 finite mean: {np.mean(rhoP1_oct[~is_sat]):.6f}")
    print(f"    Python rhoP1 finite mean: {np.mean(rhoP1_py[~is_sat]):.6f}")
    print(f"    Relative diff on non-sat: {abs(np.mean(rhoP1_oct[~is_sat]) - np.mean(rhoP1_py[~is_sat])) / np.mean(rhoP1_oct[~is_sat]) * 100:.6f}%")
    print(f"    Max diff on non-sat:      {np.max(diff_rhoP1[~is_sat]):.4e}")
    print(f"    Median diff on non-sat:   {np.median(diff_rhoP1[~is_sat]):.4e}")

    # Distance to saturated region
    import scipy.ndimage
    dist_to_sat = scipy.ndimage.distance_transform_edt(~is_sat)
    # Check cost difference vs distance to saturated region
    for d in [1, 2, 5, 10, 20, 50]:
        mask_d = (~is_sat) & (dist_to_sat >= d)
        if np.sum(mask_d) > 0:
            oct_m = np.mean(rhoP1_oct[mask_d])
            py_m = np.mean(rhoP1_py[mask_d])
            rel = abs(oct_m - py_m) / oct_m * 100.0
            print(f"    At distance >= {d} px from saturation ({np.sum(mask_d)} px): Octave={oct_m:.4f}, Python={py_m:.4f}, Rel Diff={rel:.6f}%")

    # 5. Lambda and Bisection Analysis
    print("\n--- 5. LAMBDA AND BISECTION SENSITIVITY ---")
    msg_len = 0.4 * N
    lam_oct = 0.16605854034423828
    lam_py = calc_lambda(rhoP1_py, rhoM1_py, msg_len)
    
    # What if we run calc_lambda on rho_oct using Python calc_lambda?
    lam_on_oct_costs = calc_lambda(rhoP1_oct, rhoM1_oct, msg_len)
    print(f"Octave official lambda:           {lam_oct:.8f}")
    print(f"Python calc_lambda on Octave rho: {lam_on_oct_costs:.8f} (Diff vs Octave: {abs(lam_oct - lam_on_oct_costs):.8e})")
    print(f"Python calc_lambda on Python rho: {lam_py:.8f} (Diff vs Octave: {abs(lam_oct - lam_py):.8e})")

    # Entropy sensitivity: how much does 0.000477 in lambda change entropy?
    def entropy_at(l_val, rP, rM):
        denom = 1.0 + np.exp(-l_val * rP) + np.exp(-l_val * rM)
        pP = np.exp(-l_val * rP) / denom
        pM = np.exp(-l_val * rM) / denom
        return ternary_entropy(pP, pM) / N

    ent_oct_l_oct = entropy_at(lam_oct, rhoP1_oct, rhoM1_oct)
    ent_py_l_py = entropy_at(lam_py, rhoP1_py, rhoM1_py)
    ent_py_l_oct = entropy_at(lam_oct, rhoP1_py, rhoM1_py)
    print(f"Entropy at Octave lambda on Octave costs: {ent_oct_l_oct:.6f} bpp")
    print(f"Entropy at Python lambda on Python costs: {ent_py_l_py:.6f} bpp")
    print(f"Entropy at Octave lambda on Python costs: {ent_py_l_oct:.6f} bpp")

    # 6. Probability Arrays P(+1), P(-1), P(0)
    print("\n--- 6. PROBABILITY MAPS COMPARISON ---")
    denom_oct = 1.0 + np.exp(-lam_oct * rhoP1_oct) + np.exp(-lam_oct * rhoM1_oct)
    pP_oct = np.exp(-lam_oct * rhoP1_oct) / denom_oct
    pM_oct = np.exp(-lam_oct * rhoM1_oct) / denom_oct
    p0_oct = 1.0 - pP_oct - pM_oct

    denom_py = 1.0 + np.exp(-lam_py * rhoP1_py) + np.exp(-lam_py * rhoM1_py)
    pP_py = np.exp(-lam_py * rhoP1_py) / denom_py
    pM_py = np.exp(-lam_py * rhoM1_py) / denom_py
    p0_py = 1.0 - pP_py - pM_py

    diff_pP = np.abs(pP_oct - pP_py)
    diff_pM = np.abs(pM_oct - pM_py)
    diff_p0 = np.abs(p0_oct - p0_py)

    print(f"P(+1): max diff = {np.max(diff_pP):.6f}, mean diff = {np.mean(diff_pP):.6f}")
    print(f"P(-1): max diff = {np.max(diff_pM):.6f}, mean diff = {np.mean(diff_pM):.6f}")
    print(f"P(0):  max diff = {np.max(diff_p0):.6f}, mean diff = {np.mean(diff_p0):.6f}")

    # Where does max diff occur?
    max_loc = np.unravel_index(np.argmax(diff_pP), diff_pP.shape)
    print(f"Max P(+1) diff location: row={max_loc[0]}, col={max_loc[1]}")
    print(f"  cover at location: {cover[max_loc]}")
    print(f"  dist to sat at location: {dist_to_sat[max_loc]}")
    print(f"  Octave rhoP1 at location: {rhoP1_oct[max_loc]:.4f}")
    print(f"  Python rhoP1 at location: {rhoP1_py[max_loc]:.4f}")
    print(f"  Octave P(+1) at location: {pP_oct[max_loc]:.6f}")
    print(f"  Python P(+1) at location: {pP_py[max_loc]:.6f}")

    # 7. Impact on Embedding Decisions
    print("\n--- 7. IMPACT ON EMBEDDING DECISIONS ---")
    # Simulate embedding with identical pseudo-random numbers
    rng = np.random.default_rng(100001)
    rand_vals = rng.random(cover.shape, dtype=np.float64)

    # Decisions with Octave P
    mod_p_oct = rand_vals < pP_oct
    mod_m_oct = (rand_vals >= pP_oct) & (rand_vals < (pP_oct + pM_oct))
    stego_oct_sim = cover.copy()
    stego_oct_sim[mod_p_oct] += 1
    stego_oct_sim[mod_m_oct] -= 1

    # Decisions with Python P
    mod_p_py = rand_vals < pP_py
    mod_m_py = (rand_vals >= pP_py) & (rand_vals < (pP_py + pM_py))
    stego_py_sim = cover.copy()
    stego_py_sim[mod_p_py] += 1
    stego_py_sim[mod_m_py] -= 1

    decision_diff = (stego_oct_sim != stego_py_sim)
    diff_count = int(np.sum(decision_diff))
    print(f"Total embedding decision differences (same random numbers): {diff_count} / {N} ({diff_count/N*100:.3f}%)")
    print(f"Octave simulated total changes: {int(np.sum(stego_oct_sim != cover))} ({np.mean(stego_oct_sim != cover)*100:.3f}%)")
    print(f"Python simulated total changes: {int(np.sum(stego_py_sim != cover))} ({np.mean(stego_py_sim != cover)*100:.3f}%)")
    print(f"Decisions agreement rate: {(N - diff_count)/N * 100:.3f}%")
    print(f"Maximum difference in stego pixel value: {int(np.max(np.abs(stego_oct_sim - stego_py_sim)))}")

if __name__ == "__main__":
    analyze_image_1()

