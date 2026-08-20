import os
from PIL import Image
from PIL.ExifTags import TAGS

def extract_metadata(file_path: str, original_filename: str) -> dict:
    """
    Extract basic and EXIF metadata from an image safely.
    """
    metadata = {
        "filename": original_filename,
        "file_size_bytes": os.path.getsize(file_path),
        "format": "Unknown",
        "mode": "Unknown",
        "width": 0,
        "height": 0,
        "aspect_ratio": 0.0,
        "color_channels": 0,
        "exif_data": {},
        "risk_indicators": []
    }
    
    try:
        with Image.open(file_path) as img:
            metadata["format"] = img.format
            metadata["mode"] = img.mode
            metadata["width"] = img.width
            metadata["height"] = img.height
            
            if img.height > 0:
                metadata["aspect_ratio"] = round(img.width / img.height, 4)
                
            # Determine color channels
            if img.mode == "RGB":
                metadata["color_channels"] = 3
            elif img.mode == "RGBA":
                metadata["color_channels"] = 4
            elif img.mode == "L":
                metadata["color_channels"] = 1
            else:
                metadata["color_channels"] = len(img.getbands())
                
            # Extract EXIF safely
            exif_raw = img.getexif()
            if exif_raw:
                for tag_id, data in exif_raw.items():
                    tag_name = TAGS.get(tag_id, tag_id)
                    # Convert bytes to string for JSON serialization
                    if isinstance(data, bytes):
                        try:
                            data = data.decode("utf-8", errors="ignore")
                        except Exception:
                            data = str(data)
                    metadata["exif_data"][str(tag_name)] = str(data)
                    
            # Basic risk indicator logic
            if metadata["format"] == "PNG" and metadata["mode"] == "RGBA":
                metadata["risk_indicators"].append("Alpha channel present (can hide data in transparency)")
            
    except Exception as e:
        metadata["error"] = str(e)
        
    return metadata
