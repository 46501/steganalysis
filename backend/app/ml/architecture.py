"""
SRNet (Spatial Rich Model-based Residual Network) PyTorch Architecture.
Reference: "Deep Residual Network for Steganalysis of Digital Images"
Boroumand et al., IEEE TIFS 2018.
"""

import torch
from torch import Tensor, nn


class ConvBn(nn.Module):
    """3x3 Convolution followed by Batch Normalization."""

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.conv = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=3,
            stride=1,
            padding=1,
            bias=False,
        )
        self.batch_norm = nn.BatchNorm2d(out_channels)

    def forward(self, x: Tensor) -> Tensor:
        return self.batch_norm(self.conv(x))


class Type1(nn.Module):
    """Type 1: Conv -> BN -> ReLU (Non-residual)."""

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.convbn = ConvBn(in_channels, out_channels)
        self.relu = nn.ReLU()

    def forward(self, x: Tensor) -> Tensor:
        return self.relu(self.convbn(x))


class Type2(nn.Module):
    """Type 2: Residual block without spatial downsampling."""

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.type1 = Type1(in_channels, out_channels)
        self.convbn = ConvBn(in_channels, out_channels)

    def forward(self, x: Tensor) -> Tensor:
        return x + self.convbn(self.type1(x))


class Type3(nn.Module):
    """Type 3: Residual block with 3x3 Average Pooling (stride 2)."""

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=1,
            stride=2,
            padding=0,
            bias=False,
        )
        self.batch_norm = nn.BatchNorm2d(out_channels)
        self.type1 = Type1(in_channels, out_channels)
        self.convbn = ConvBn(out_channels, out_channels)
        self.pool = nn.AvgPool2d(kernel_size=3, stride=2, padding=1)

    def forward(self, x: Tensor) -> Tensor:
        residual = self.batch_norm(self.conv1(x))
        feature = self.pool(self.convbn(self.type1(x)))
        return residual + feature


class Type4(nn.Module):
    """Type 4: Residual block followed by Global Average Pooling (GAP)."""

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.type1 = Type1(in_channels, out_channels)
        self.convbn = ConvBn(out_channels, out_channels)
        self.gap = nn.AdaptiveAvgPool2d(output_size=1)

    def forward(self, x: Tensor) -> Tensor:
        return self.gap(self.convbn(self.type1(x)))


class Srnet(nn.Module):
    """
    12-layer Deep Residual Network for Steganalysis of Digital Images.
    Accepts single-channel grayscale images of shape (B, 1, 256, 256).
    Outputs log-probabilities of shape (B, 2):
        Index 0: Cover Image
        Index 1: Stego Image
    """

    def __init__(self) -> None:
        super().__init__()
        # Layers 1-2: Initial feature extraction
        self.type1s = nn.Sequential(
            Type1(1, 64),
            Type1(64, 16),
        )

        # Layers 3-7: Residual without pooling (preserves steganographic noise)
        self.type2s = nn.Sequential(
            Type2(16, 16),
            Type2(16, 16),
            Type2(16, 16),
            Type2(16, 16),
            Type2(16, 16),
        )

        # Layers 8-11: Downsampling residual blocks
        self.type3s = nn.Sequential(
            Type3(16, 16),
            Type3(16, 64),
            Type3(64, 128),
            Type3(128, 256),
        )

        # Layer 12: Global feature aggregation
        self.type4 = Type4(256, 512)

        # Classification Head
        self.dense = nn.Linear(512, 2)
        self.softmax = nn.LogSoftmax(dim=1)

    def forward(self, x: Tensor) -> Tensor:
        out = self.type1s(x)
        out = self.type2s(out)
        out = self.type3s(out)
        out = self.type4(out)
        out = out.view(out.size(0), -1)
        out = self.dense(out)
        return self.softmax(out)

