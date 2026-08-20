import numpy as np
import cv2
from scipy.stats import chisquare

def chi_square_attack(img_array: np.ndarray):
    """
    Performs Chi-Square statistical attack for LSB steganography detection.
    Compares Pairs of Values (PoVs) frequencies.
    """
    if len(img_array.shape) == 3:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        channels = {'R': img_array[:,:,0], 'G': img_array[:,:,1], 'B': img_array[:,:,2]}
    else:
        channels = {'L': img_array}
        
    results = {}
    
    for ch_name, ch_data in channels.items():
        # Flatten the channel
        flat_data = ch_data.flatten()
        
        # Calculate histogram (0-255)
        hist, _ = np.histogram(flat_data, bins=256, range=(0, 256))
        
        # We look at pairs (2i, 2i+1)
        # Expected if stego is perfectly embedded: (h[2i] + h[2i+1])/2
        observed = []
        expected = []
        
        for i in range(128):
            h2i = hist[2*i]
            h2i1 = hist[2*i+1]
            pair_sum = h2i + h2i1
            
            if pair_sum > 0:
                observed.append(h2i)
                expected.append(pair_sum / 2.0)
                
        if len(observed) == 0:
            results[ch_name] = {"p_value": 1.0, "statistic": 0.0, "suspicion": "Normal"}
            continue
            
        # Calculate chi-square
        stat, p_val = chisquare(f_obs=observed, f_exp=expected)
        
        # Interpret
        if p_val < 0.01:
            suspicion = "Suspicious"
        elif p_val < 0.05:
            suspicion = "Moderate"
        else:
            suspicion = "Normal"
            
        results[ch_name] = {
            "p_value": float(p_val),
            "statistic": float(stat),
            "suspicion": suspicion
        }
        
    return results

def analyze_chi_square(file_path: str) -> dict:
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return {"error": "Failed to load image for Chi-Square analysis"}
        
    try:
        if len(img.shape) == 3 and img.shape[2] == 4:
            img = img[:,:,:3]
            
        stats = chi_square_attack(img)
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"error": str(e)}
