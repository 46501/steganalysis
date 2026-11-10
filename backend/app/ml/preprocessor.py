"""
SRNet Image Preprocessing Pipeline.
Converts raw image bytes to normalized PyTorch tensors suitable for SRNet evaluation.
"""

import io
from typing import Tuple
import numpy as np
from PIL import Image
import torch


class SRNetPreprocessor:
    """Prepares digital images for SRNet steganalysis."""

    TARGET_SIZE: Tuple[int, int] = (256, 256)

    @classmethod
    def process_bytes(cls, image_bytes: bytes) -> Tuple[torch.Tensor, dict]:
        """
        Loads image bytes, converts to grayscale, resizes/crops to 256x256,
        and outputs a PyTorch tensor with shape (1, 1, 256, 256).
        """
        image = Image.open(io.BytesIO(image_bytes))
        metadata = {
            "original_width": image.width,
            "original_height": image.height,
            "format": image.format,
            "mode": image.mode,
        }

        # Convert to single-channel 8-bit grayscale
        gray_image = image.convert("L")

        # Resize to SRNet input dimensions (256 x 256)
        if gray_image.size != cls.TARGET_SIZE:
            gray_image = gray_image.resize(cls.TARGET_SIZE, Image.Resampling.LANCZOS)

        # Convert to numpy array and normalize float tensor
        arr = np.array(gray_image, dtype=np.float32)
        tensor = torch.from_numpy(arr).unsqueeze(0).unsqueeze(0)  # Shape: (1, 1, 256, 256)

        return tensor, metadata

