import numpy as np
import cv2
from scipy.stats import entropy

def extract_lsb_planes(img_array: np.ndarray):
    """
    Extracts LSB planes (0, 1, 2) from an image array.
    Supports BGR (OpenCV default) or Grayscale.
    """
    if len(img_array.shape) == 3:
        # BGR to RGB
        img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    
    # Pre-allocate dictionary for planes
    planes = {
        'R': {}, 'G': {}, 'B': {}
    }
    
    if len(img_array.shape) == 2:
        channels = {'L': img_array}
        planes = {'L': {}}
    else:
        channels = {
            'R': img_array[:,:,0],
            'G': img_array[:,:,1],
            'B': img_array[:,:,2]
        }
        
    for ch_name, ch_data in channels.items():
        for bit in range(3): # 0, 1, 2
            # Extract the nth bit
            bit_plane = (ch_data >> bit) & 1
            # Scale to 0-255 for visualization
            vis_plane = (bit_plane * 255).astype(np.uint8)
            # Calculate stats
            balance = np.mean(bit_plane)
            _, counts = np.unique(bit_plane, return_counts=True)
            ent = entropy(counts, base=2) if len(counts) > 1 else 0.0
            
            # For JSON, we don't send the full image array, just the stats
            # We will generate base64 images later if needed for visualization, 
            # or serve them via separate endpoints.
            
            planes[ch_name][str(bit)] = {
                'balance': float(balance),
                'entropy': float(ent)
            }
            
    return planes

def analyze_lsb(file_path: str) -> dict:
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return {"error": "Failed to load image for LSB analysis"}
        
    try:
        # Remove alpha channel if present for basic LSB stats
        if len(img.shape) == 3 and img.shape[2] == 4:
            img = img[:,:,:3]
            
        stats = extract_lsb_planes(img)
        
        # Determine overall suspicion based on LSB balance (close to 0.5 is expected for random data, but natural images vary)
        # Actually, natural images often have structure in LSB. Fully encrypted/compressed payload looks like 0.5.
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"error": str(e)}
