"""
SRNet & Steganalysis Image Preprocessing Pipeline.
Converts raw image bytes to normalized PyTorch tensors suitable for steganalysis evaluation.
Preserves subtle discrete high-frequency steganographic noise by avoiding destructive interpolative resampling.
"""

import io
from typing import Optional, Tuple
import numpy as np
from PIL import Image
import torch


class SRNetPreprocessor:
    """Prepares digital images for deep residual steganalysis without destructive resampling."""

    @classmethod
    def process_bytes(
        cls,
        image_bytes: bytes,
        crop_size: Optional[int] = None,
    ) -> Tuple[torch.Tensor, dict]:
        """
        Loads image bytes, extracts metadata, converts to grayscale,
        and outputs a PyTorch float32 tensor of shape (1, 1, H, W).
        Avoids low-pass interpolation (e.g. Lanczos/Bicubic) which destroys discrete ±1 stego noise.
        """
        image = Image.open(io.BytesIO(image_bytes))
        metadata = {
            "original_width": image.width,
            "original_height": image.height,
            "format": image.format or "RAW/PGM",
            "mode": image.mode,
        }

        # Convert to single-channel 8-bit grayscale
        gray_image = image.convert("L")

        # Center-crop if a specific crop dimension is explicitly requested
        if crop_size is not None and (gray_image.width > crop_size or gray_image.height > crop_size):
            left = (gray_image.width - crop_size) // 2
            top = (gray_image.height - crop_size) // 2
            gray_image = gray_image.crop((left, top, left + crop_size, top + crop_size))

        # Convert directly to numpy array preserving exact integer pixel values
        arr = np.array(gray_image, dtype=np.float32)
        tensor = torch.from_numpy(arr).unsqueeze(0).unsqueeze(0)  # Shape: (1, 1, H, W)

        return tensor, metadata
