import cv2
import numpy as np

def analyze_histogram(file_path: str) -> dict:
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return {"error": "Failed to load image for histogram"}
        
    try:
        # If RGBA, drop alpha for histogram
        if len(img.shape) == 3 and img.shape[2] == 4:
            img = img[:,:,:3]
            
        histograms = {}
        
        if len(img.shape) == 2:
            hist = cv2.calcHist([img], [0], None, [256], [0, 256]).flatten()
            histograms['L'] = hist.tolist()
        else:
            # BGR
            color = ('B', 'G', 'R')
            for i, col in enumerate(color):
                hist = cv2.calcHist([img], [i], None, [256], [0, 256]).flatten()
                histograms[col] = hist.tolist()
                
        # To detect LSB steganography via histogram, we often look at Pairs of Values (PoV)
        # However, for the frontend, we will return a reduced or full 256-bin histogram for charting
        
        return {
            "status": "success",
            "data": histograms
        }
    except Exception as e:
        return {"error": str(e)}
