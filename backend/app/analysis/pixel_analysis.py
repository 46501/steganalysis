import numpy as np
import cv2

def analyze_pixels(file_path: str) -> dict:
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return {"error": "Failed to load image for pixel analysis"}
        
    try:
        if len(img.shape) == 3 and img.shape[2] == 4:
            img = img[:,:,:3]
            
        results = {}
        
        # Calculate adjacent pixel correlation (horizontal)
        # Flattened for simplicity or calculated per channel
        if len(img.shape) == 2:
            channels = {'L': img}
        else:
            channels = {'B': img[:,:,0], 'G': img[:,:,1], 'R': img[:,:,2]}
            
        for ch_name, ch_data in channels.items():
            # Slice image to get adjacent pixels
            x = ch_data[:, :-1].flatten().astype(np.float32)
            y = ch_data[:, 1:].flatten().astype(np.float32)
            
            # Correlation coefficient
            if len(x) > 0:
                corr = np.corrcoef(x, y)[0, 1]
            else:
                corr = 0.0
                
            results[ch_name] = {
                "horizontal_correlation": float(corr)
            }
            
        return {
            "status": "success",
            "data": results
        }
    except Exception as e:
        return {"error": str(e)}
