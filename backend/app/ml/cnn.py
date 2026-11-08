import torch
import torch.nn as nn
import torch.nn.functional as F

class HighPassFilter(nn.Module):
    """
    Fixed high-pass spatial filter to amplify steganographic noise.
    Uses a standard 3x3 Laplacian-like SRM filter.
    """
    def __init__(self):
        super(HighPassFilter, self).__init__()
        # 3x3 SRM high-pass filter
        kernel = torch.tensor([
            [-1.0,  2.0, -1.0],
            [ 2.0, -4.0,  2.0],
            [-1.0,  2.0, -1.0]
        ]) / 4.0
        
        # We apply this to each RGB channel independently
        self.weight = nn.Parameter(kernel.view(1, 1, 3, 3).repeat(3, 1, 1, 1), requires_grad=False)
        
    def forward(self, x):
        # x is (B, 3, H, W)
        # Groups=3 ensures depthwise convolution (each channel filtered independently)
        return F.conv2d(x, self.weight, padding=1, groups=3)

class StegoCNN(nn.Module):
    """
    Lightweight CNN for Steganalysis.
    """
    def __init__(self):
        super(StegoCNN, self).__init__()
        
        self.preprocessing = HighPassFilter()
        
        # Block 1
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        
        # Block 2
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool1 = nn.AvgPool2d(2, 2)
        
        # Block 3
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.pool2 = nn.AvgPool2d(2, 2)
        
        # Global Average Pooling
        self.gap = nn.AdaptiveAvgPool2d((1, 1))
        
        # Classifier
        self.fc1 = nn.Linear(128, 64)
        self.fc2 = nn.Linear(64, 1)
        
    def forward(self, x):
        # x shape: (B, C, H, W)
        x = self.preprocessing(x)
        
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.pool1(F.relu(self.bn2(self.conv2(x))))
        x = self.pool2(F.relu(self.bn3(self.conv3(x))))
        
        x = self.gap(x)
        x = x.view(x.size(0), -1)
        
        x = F.relu(self.fc1(x))
        x = self.fc2(x) # Return raw logits for BCEWithLogitsLoss
        
        return x

    def get_saliency_map(self, x):
        """
        Calculates a simple gradient-based saliency map to explain the prediction.
        """
        x.requires_grad_()
        self.eval() # Ensure we're in eval mode
        
        logits = self.forward(x)
        prob = torch.sigmoid(logits)
        
        # We backpropagate from the logit to the input image
        logits.backward()
        
        # Take the maximum absolute gradient across color channels
        saliency, _ = torch.max(x.grad.data.abs(), dim=1)
        
        return prob.item(), saliency.squeeze().cpu().numpy()
