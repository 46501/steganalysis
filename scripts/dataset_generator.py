import os
import glob
import cv2
import numpy as np
import random
import string
import json

def get_random_string(length):
    letters = string.ascii_letters + string.digits + " !@#$%^&*()_+-=[]{}|;:',.<>/?"
    return ''.join(random.choice(letters) for i in range(length))

def generate_dataset(clean_dir, stego_dir, rates=[0.05, 0.1, 0.25, 0.5, 0.75, 1.0]):
    """
    Generates stego images from clean images at various embedding rates.
    Ensures no data leakage by keeping all variants of an image clearly traceable.
    """
    os.makedirs(stego_dir, exist_ok=True)
    
    clean_images = glob.glob(os.path.join(clean_dir, "*.*"))
    metadata = {}
    
    for img_path in clean_images:
        filename = os.path.basename(img_path)
        base_name, ext = os.path.splitext(filename)
        
        if ext.lower() not in ['.png', '.bmp']:
            print(f"Skipping {filename} - please use PNG or BMP for lossless LSB generation.")
            continue
            
        img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            continue
            
        flat_len = len(img.flatten())
        # Maximum payload in bytes (subtract 32 bits for header)
        max_bytes = (flat_len - 32) // 8
        
        for rate in rates:
            payload_size = int(max_bytes * rate)
            if payload_size <= 0:
                continue
                
            payload_str = get_random_string(payload_size)
            payload_bytes = payload_str.encode('utf-8')
            
            # Use the backend embed function
            from backend.app.api.stego import embed_lsb
            try:
                stego_img = embed_lsb(img.copy(), payload_bytes)
                out_name = f"{base_name}_stego_{int(rate*100)}{ext}"
                out_path = os.path.join(stego_dir, out_name)
                
                cv2.imwrite(out_path, stego_img)
                
                metadata[out_name] = {
                    "source_image": filename,
                    "embedding_rate": rate,
                    "payload_size_bytes": len(payload_bytes),
                    "method": "Sequential LSB"
                }
                print(f"Generated {out_name}")
            except Exception as e:
                print(f"Error generating {out_name}: {e}")
                
    with open(os.path.join(stego_dir, "dataset_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print("Dataset generation complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate LSB stego dataset.")
    parser.add_argument("--clean", type=str, required=True, help="Directory containing clean PNG/BMP images")
    parser.add_argument("--stego", type=str, required=True, help="Output directory for stego images")
    args = parser.parse_args()
    
    generate_dataset(args.clean, args.stego)
