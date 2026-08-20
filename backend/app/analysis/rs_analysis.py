import numpy as np
import cv2

def rs_analysis(img_array: np.ndarray):
    """
    Performs Regular-Singular (RS) Steganalysis.
    We will use a basic 1D mask [0, 1, 0, 1] for groups of 4 pixels.
    """
    if len(img_array.shape) == 3:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        channels = {'R': img_array[:,:,0], 'G': img_array[:,:,1], 'B': img_array[:,:,2]}
    else:
        channels = {'L': img_array}
        
    mask = np.array([0, 1, 0, 1])
    n_pixels = len(mask)
    
    results = {}
    
    for ch_name, ch_data in channels.items():
        flat = ch_data.flatten()
        # Truncate to multiple of n_pixels
        n_groups = len(flat) // n_pixels
        if n_groups == 0:
            results[ch_name] = {"estimated_rate": 0.0, "status": "Inconclusive"}
            continue
            
        flat = flat[:n_groups * n_pixels]
        groups = flat.reshape((n_groups, n_pixels))
        
        # F1 function (flip LSB)
        def F1(x):
            return x ^ 1
            
        # F-1 function
        def F_1(x):
            return np.where(x % 2 == 0, x + 1, x - 1)
            
        # Discrimination function (sum of absolute differences of adjacent pixels)
        def disc(g):
            return np.sum(np.abs(g[:, :-1].astype(int) - g[:, 1:].astype(int)), axis=1)
            
        # Base discrimination
        f_g = disc(groups)
        
        # Apply mask for M
        # M: apply F1 where mask == 1, else F0 (identity)
        mask_M = mask == 1
        groups_M = groups.copy()
        groups_M[:, mask_M] = F1(groups_M[:, mask_M])
        f_gM = disc(groups_M)
        
        # Apply mask for -M
        # -M: apply F-1 where mask == 1, else F0
        groups_nM = groups.copy()
        groups_nM[:, mask_M] = F_1(groups_nM[:, mask_M])
        f_gnM = disc(groups_nM)
        
        Rm = np.sum(f_gM > f_g) / n_groups
        Sm = np.sum(f_gM < f_g) / n_groups
        Rnm = np.sum(f_gnM > f_g) / n_groups
        Snm = np.sum(f_gnM < f_g) / n_groups
        
        # The RS equation is typically approximated or we solve a quadratic equation
        # A simple approximation for small p is: p \approx (Rm - Sm) / (Rnm - Snm + Rm - Sm)
        # We will use a simplified robust heuristic if the standard quadratic is unstable
        
        d0 = Rm - Sm
        d1 = Rnm - Snm
        
        if d1 + d0 == 0:
            rate = 0.0
        else:
            rate = abs(d0 / (d1 + d0))
            
        # Sanity bounds
        rate = min(1.0, max(0.0, rate))
        
        results[ch_name] = {
            "Rm": float(Rm),
            "Sm": float(Sm),
            "R-m": float(Rnm),
            "S-m": float(Snm),
            "estimated_rate": float(rate),
            "status": "Success"
        }
        
    return results

def analyze_rs(file_path: str) -> dict:
    img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE) # Convert to grayscale for simpler overall RS
    if img is None:
        return {"error": "Failed to load image for RS analysis"}
        
    try:
        stats = rs_analysis(img)
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"error": str(e)}
