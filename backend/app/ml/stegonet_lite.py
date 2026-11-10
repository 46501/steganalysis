"""
StegoNet-Lite: A Lightweight Residual CNN Baseline for Steganalysis Demonstration.

Designed for CPU inference and rapid training demonstration on S-UNIWARD 0.4 bpp.
Features:
- High-pass spatial residual extraction layer (mimicking KV / spatial residual filters)
- 3 Residual blocks with batch normalization and skip connections
- Adaptive global average pooling (GAP)
- Linear classification head for binary steganalysis [Cover: 0, Stego: 1]
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ResidualBlock(nn.Module):
    """Residual building block with projection shortcut when dimensions change."""

    def __init__(self, in_channels: int, out_channels: int, stride: int = 1) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=3,
            stride=stride,
            padding=1,
            bias=False,
        )
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(
            out_channels,
            out_channels,
            kernel_size=3,
            stride=1,
            padding=1,
            bias=False,
        )
        self.bn2 = nn.BatchNorm2d(out_channels)

        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.shortcut = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = self.relu(out + residual)
        return out


class StegoNetLite(nn.Module):
    """
    Compact 4-stage residual convolutional neural network for digital image steganalysis.
    Parameters: ~300K, enabling real-time CPU evaluation (<25ms per image).
    """

    def __init__(self) -> None:
        super().__init__()
        # Initial high-pass residual filter stage
        # 1-channel grayscale input -> 16 residual feature maps
        self.prefilter = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
        )

        # Stage 1: Residual extraction (downsampling 256 -> 128)
        self.layer1 = ResidualBlock(16, 32, stride=2)

        # Stage 2: Feature learning (downsampling 128 -> 64)
        self.layer2 = ResidualBlock(32, 64, stride=2)

        # Stage 3: High-level abstraction (downsampling 64 -> 32)
        self.layer3 = ResidualBlock(64, 128, stride=2)

        # Global average pooling & Linear classifier
        self.gap = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(128, 2)
        self.log_softmax = nn.LogSoftmax(dim=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: Input tensor of shape (B, 1, H, W)
        Returns:
            Log-probabilities of shape (B, 2) where col 0 = Cover, col 1 = Stego
        """
        feat = self.prefilter(x)
        feat = self.layer1(feat)
        feat = self.layer2(feat)
        feat = self.layer3(feat)
        feat = self.gap(feat)
        feat = torch.flatten(feat, 1)
        logits = self.fc(feat)
        return self.log_softmax(logits)


def compute_spatial_residual_energy(tensor: torch.Tensor) -> float:
    """
    Computes spatial high-pass residual energy (variance) of an image tensor (1, 1, H, W).
    Uses a standard discrete 3x3 Laplacian high-pass filter:
        [[ 0, -1,  0],
         [-1,  4, -1],
         [ 0, -1,  0]]
    In stego images (S-UNIWARD 0.4 bpp), embedding alterations measurably elevate
    local residual variance in textured regions.
    """
    laplacian_kernel = torch.tensor(
        [[[0.0, -1.0, 0.0],
          [-1.0, 4.0, -1.0],
          [0.0, -1.0, 0.0]]],
        dtype=torch.float32,
        device=tensor.device,
    ).unsqueeze(0)  # Shape: (1, 1, 3, 3)

    with torch.no_grad():
        # Convolve with high-pass filter
        residuals = F.conv2d(tensor, laplacian_kernel, padding=1)
        # Compute mean squared residual energy
        energy = float(torch.mean(residuals ** 2).item())

    return round(energy, 4)

