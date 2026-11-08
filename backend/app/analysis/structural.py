import os

def analyze_eof(filepath: str) -> dict:
    """
    Analyzes an image file for appended data after the End-of-File (EOF) marker.
    Appended data is a common, naive steganography technique.
    """
    try:
        file_size = os.path.getsize(filepath)
        
        with open(filepath, 'rb') as f:
            data = f.read()

        ext = os.path.splitext(filepath)[1].lower()
        
        appended_size = 0
        eof_index = -1
        
        if ext in ['.jpg', '.jpeg']:
            # JPEG EOF is \xFF\xD9
            # Searching from the end to find the LAST occurrence
            eof_marker = b'\xff\xd9'
            eof_index = data.rfind(eof_marker)
            if eof_index != -1:
                eof_index += len(eof_marker)
                
        elif ext == '.png':
            # PNG EOF is IEND chunk (IEND + 4 byte CRC = 8 bytes total: IEND\xae\x42\x60\x82)
            eof_marker = b'IEND\xae\x42\x60\x82'
            eof_index = data.rfind(eof_marker)
            if eof_index != -1:
                eof_index += len(eof_marker)
                
        elif ext == '.bmp':
            # BMP stores its size in the header (bytes 2-5, little-endian)
            if len(data) > 6:
                import struct
                header_size = struct.unpack('<I', data[2:6])[0]
                eof_index = header_size

        if eof_index != -1 and file_size > eof_index:
            appended_size = file_size - eof_index
            
            # Allow up to 4 bytes of padding/slop (sometimes harmless)
            if appended_size > 4:
                return {
                    "status": "success",
                    "appended_data": True,
                    "appended_size_bytes": appended_size,
                    "suspicion": "High",
                    "message": f"Found {appended_size} bytes of anomalous data appended after the image EOF marker."
                }
                
        return {
            "status": "success",
            "appended_data": False,
            "appended_size_bytes": 0,
            "suspicion": "None",
            "message": "No significant appended data found."
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
