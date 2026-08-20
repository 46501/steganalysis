import cv2
import numpy as np

# Import the existing analysis modules
from app.analysis.lsb import extract_lsb_planes
from app.analysis.chi_square import chi_square_attack
from app.analysis.pixel_analysis import analyze_pixels
from app.analysis.rs_analysis import rs_analysis
from app.analysis.noise_analysis import analyze_noise

def extract_features(file_path: str) -> dict:
    """
    Extracts a 1D feature dictionary from an image.
    Used for both training and inference to guarantee no mismatch.
    """
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Failed to load image: {file_path}")
        
    if len(img.shape) == 3 and img.shape[2] == 4:
        img = img[:,:,:3] # drop alpha
        
    features = {}
    
    try:
        # 1. LSB Features
        lsb_stats = extract_lsb_planes(img)
        # Flatten LSB stats
        for ch, bits in lsb_stats.items():
            for bit, metrics in bits.items():
                features[f"lsb_{ch}_bit{bit}_balance"] = metrics['balance']
                features[f"lsb_{ch}_bit{bit}_entropy"] = metrics['entropy']
                
    except Exception:
        pass
        
    try:
        # 2. Chi-Square Features
        chi_stats = chi_square_attack(img)
        for ch, stats in chi_stats.items():
            features[f"chi_square_{ch}_pval"] = stats['p_value']
            features[f"chi_square_{ch}_stat"] = stats['statistic']
    except Exception:
        pass
        
    try:
        # 3. RS Analysis Features
        rs_stats = rs_analysis(img)
        for ch, stats in rs_stats.items():
            features[f"rs_{ch}_estimated_rate"] = stats.get('estimated_rate', 0.0)
            features[f"rs_{ch}_Rm"] = stats.get('Rm', 0.0)
            features[f"rs_{ch}_Sm"] = stats.get('Sm', 0.0)
    except Exception:
        pass
        
    try:
        # 4. Noise/Residual Features
        # analyze_noise expects grayscale path, so we just run logic here or modify analyze_noise
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        filtered = cv2.medianBlur(gray, 3)
        residual = cv2.absdiff(gray, filtered)
        features["residual_mean"] = float(np.mean(residual))
        features["residual_variance"] = float(np.var(residual))
    except Exception:
        pass
        
    try:
        # 5. Image global stats
        features["img_mean"] = float(np.mean(img))
        features["img_variance"] = float(np.var(img))
    except Exception:
        pass
        
    # Guarantee consistent fallback for failed features when mapping to array later
    return features

def get_feature_vector(file_path: str, expected_feature_names: list) -> list:
    """
    Extracts features and maps them to an exact ordered list based on expected names.
    Useful during inference to match the trained scaler/model.
    """
    raw_features = extract_features(file_path)
    vector = []
    for fn in expected_feature_names:
        vector.append(raw_features.get(fn, 0.0))
    return vector
