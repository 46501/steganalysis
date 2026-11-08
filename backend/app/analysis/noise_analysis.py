import numpy as np
import cv2

def analyze_noise(file_path: str) -> dict:
    """
    Extracts image residual by applying a smoothing filter and subtracting.
    Returns statistical metrics of the noise residual.
    """
    img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return {"error": "Failed to load image for Noise analysis"}
        
    try:
        # Apply median filter to estimate 'clean' image
        filtered = cv2.medianBlur(img, 3)
        
        # Calculate residual
        residual = cv2.absdiff(img, filtered)
        
        # Calculate statistics
        mean_noise = np.mean(residual)
        var_noise = np.var(residual)
        
        # We can also compute high frequency energy
        # A stego image often has higher variance in the residual
        
        return {
            "status": "success",
            "stats": {
                "mean_residual": float(mean_noise),
                "variance_residual": float(var_noise)
            }
        }
    except Exception as e:
        return {"error": str(e)}
