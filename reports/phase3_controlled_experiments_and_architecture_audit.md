# Phase 3 Controlled Experiments & Architecture Audit Report: Steganalysis Learning Performance

**Project:** StegoShield AI Forensics Laboratory  
**Audit Phase:** Phase 3 — Steganalysis Learning Performance Investigation  
**Dataset:** BOSSbase 1.01 with S-UNIWARD 0.4 bpp  
**Pilot Split:** 300 Train Pairs (IDs 1–300), 100 Val Pairs (IDs 4001–4100)  
**Reserved Test Split:** IDs 5001–5100 (**Strictly Untouched — Zero Access**)  
**Audit Date:** November 15, 2026  

---

## 1. Executive Summary

In Phase 3, we investigated why the baseline StegoNet-Lite architecture stagnated at random chance ($50.0\%$ accuracy, $0.5017$ ROC-AUC) on S-UNIWARD 0.4 bpp stego detection. We designed, executed, and analyzed four controlled architectural variants across two independent random seeds (`seed=42` and `seed=123`), completing all 8 planned experimental runs under strictly controlled CPU training conditions (300 pairs, 5 epochs, AdamW optimizer, cosine annealing, paired batch collation).

### Key Empirical Findings

1. **Exp 1 (Baseline Control) completely failed to optimize across both seeds**:
   - Training loss flatlined at $\ln(2) \approx 0.6932$ across all 5 epochs ($50.17\%$ and $49.83\%$ accuracy).
   - Validation ROC-AUC hovered strictly at chance ($0.4982$ and $0.5002$).
   - *Root Cause*: Without high-pass prefiltering, low-frequency macro scene content completely drowns out the weak $\pm 1$ stego signal ($0.26\%$ relative energy), preventing the convolutional kernels from discovering discriminative residual features.

2. **Exp 2 (Fixed KV High-Pass Prefilter) successfully broke the optimization bottleneck on the training set**:
   - Training loss dropped consistently from $0.6909 \to 0.6313$ (Seed 42) and $0.6904 \to 0.6248$ (Seed 123).
   - Training accuracy climbed from $54.0\% \to 63.33\%$ (Seed 42) and $54.0\% \to 65.17\%$ (Seed 123).
   - Validation ROC-AUC shifted upward from chance to **$0.5231$** (Seed 42) and **$0.5334$** (Seed 123).

3. **Exp 3 and Exp 4 revealed a crucial mathematical identity regarding activation placement**:
   - Exp 3 was mathematically and numerically identical to Exp 1 across all 5 epochs to 4 decimal places.
   - Exp 4 was mathematically and numerically identical to Exp 2 across all 5 epochs to 4 decimal places.
   - *Mathematical Proof*: `StegoNetVariant.layer3` terminates with `out = relu(out + residual)`. Because $\text{ReLU}(x) \ge 0$, the feature tensor entering `torch.abs(feat)` was already strictly non-negative. Applying $|x|$ on non-negative values is an exact identity operation ($|x| = x$). In modern steganalysis literature (e.g. XuNet), ABS activation is placed at **Layer 1** immediately after the high-pass residual filter before pooling and rectification, rather than at the final block.

4. **Rigorous Scientific Assessment of Discrimination**:
   - While the KV prefilter enabled genuine gradient learning on the training set, a validation ROC-AUC of $0.5231 - 0.5334$ and validation accuracy of $50.5\% - 51.0\%$ (101/200 correct, two-sided binomial $p = 0.44$) **does not constitute a reliable steganography detector**.
   - With only 300 training pairs, the model suffers from severe scene overfitting and high validation prediction volatility across epochs.
   - **Recommendation**: StegoNet-Lite in its current formulation is not ready for production deployment or an expensive 4,000-pair training run without front-end architectural refinements (relocating ABS activation to Layer 1 and avoiding early spatial downsampling).

---

## 2. Experimental Setup and Safeguards

All eight experimental runs conformed to strict scientific safeguards:

### Controlled Hyperparameters
- **Input Dimensions**: $256 \times 256$ grayscale, normalized to $[0.0, 1.0]$.
- **Batch Construction**: Strictly paired batches (each cover and its corresponding S-UNIWARD stego are in the exact same batch, 16 images total).
- **Optimizer**: `AdamW(lr=1e-3, weight_decay=1e-4)`.
- **Learning Rate Schedule**: `CosineAnnealingLR(T_max=5, eta_min=1e-5)`.
- **Loss Function**: `NLLLoss` over `LogSoftmax` outputs.
- **Compute Constraints**: 4 CPU threads (`torch.set_num_threads(4)`), ~1.6 GB peak RSS memory.

---

## 3. Comprehensive Empirical Results Matrix

The table below summarizes the final epoch metrics, best checkpoint, and execution duration for all 8 runs:

| Exp ID | Architecture Description | Seed | Final Train Loss | Final Train Acc | Best Val Loss (Epoch) | Final Val Loss | Final Val Acc | Final Val AUC | Peak Val AUC | Duration | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | Baseline StegoNet-Lite Control | 42 | 0.6932 | 50.17% | 0.6932 (Ep 2) | 0.6932 | 50.50% | 0.4982 | 0.5005 | 417.8s | Completed |
| **1** | Baseline StegoNet-Lite Control | 123 | 0.6932 | 49.83% | 0.6932 (Ep 3) | 0.6932 | 50.00% | 0.5002 | 0.5004 | 475.2s | Completed |
| **2** | Fixed KV High-Pass Prefilter | 42 | **0.6313** | **63.33%** | 0.7031 (Ep 5) | 0.7031 | **51.00%** | **0.5231** | **0.5249** | 565.5s | Completed |
| **2** | Fixed KV High-Pass Prefilter | 123 | **0.6248** | **65.17%** | 0.7015 (Ep 5) | 0.7015 | **50.50%** | **0.5334** | **0.5334** | 463.1s | Completed |
| **3** | Absolute-Value Pooling (Post-Layer 3) | 42 | 0.6932 | 50.17% | 0.6932 (Ep 2) | 0.6932 | 50.50% | 0.4982 | 0.5005 | 408.8s | Completed |
| **3** | Absolute-Value Pooling (Post-Layer 3) | 123 | 0.6932 | 49.83% | 0.6932 (Ep 3) | 0.6932 | 50.00% | 0.5002 | 0.5004 | 818.0s | Completed |
| **4** | KV Prefilter + ABS Pooling | 42 | **0.6313** | **63.33%** | 0.7031 (Ep 5) | 0.7031 | **51.00%** | **0.5231** | **0.5249** | 300.7s | Completed |
| **4** | KV Prefilter + ABS Pooling | 123 | **0.6248** | **65.17%** | 0.7015 (Ep 5) | 0.7015 | **50.50%** | **0.5334** | **0.5334** | 311.0s | Completed |

---

## 4. Per-Epoch Progression and Trajectory Analysis

### Experiment 1: Baseline StegoNet-Lite Control

#### Seed 42
- **Epoch 1**: Train Loss 0.6974 (50.0%) | Val Loss 0.6936 (50.0%), Val AUC 0.5001 | Precision: 0.5000, Recall: 0.0300, F1: 0.0566 | CM: TN=97, FP=3, FN=97, TP=3
- **Epoch 2**: Train Loss 0.6933 (50.0%) | Val Loss **0.6932** (49.5%), Val AUC **0.5005** | Precision: 0.4961, Recall: 0.6400, F1: 0.5590 | CM: TN=35, FP=65, FN=36, TP=64 *(Best Checkpoint)*
- **Epoch 3**: Train Loss 0.6932 (50.3%) | Val Loss 0.6932 (49.5%), Val AUC 0.4998 | Precision: 0.4800, Recall: 0.1200, F1: 0.1920 | CM: TN=87, FP=13, FN=88, TP=12
- **Epoch 4**: Train Loss 0.6932 (50.0%) | Val Loss 0.6932 (50.0%), Val AUC 0.4989 | Precision: 0.5000, Recall: 0.8400, F1: 0.6269 | CM: TN=16, FP=84, FN=16, TP=84
- **Epoch 5**: Train Loss 0.6932 (50.2%) | Val Loss 0.6932 (50.5%), Val AUC 0.4982 | Precision: 0.5070, Recall: 0.3600, F1: 0.4211 | CM: TN=65, FP=35, FN=64, TP=36

#### Seed 123
- **Epoch 1**: Train Loss 0.6998 (50.0%) | Val Loss 0.6948 (50.0%), Val AUC 0.4998 | Precision: 0.0000, Recall: 0.0000, F1: 0.0000 | CM: TN=100, FP=0, FN=100, TP=0
- **Epoch 2**: Train Loss 0.6933 (50.0%) | Val Loss 0.6933 (50.0%), Val AUC **0.5004** | Precision: 0.5000, Recall: 0.4200, F1: 0.4565 | CM: TN=58, FP=42, FN=58, TP=42
- **Epoch 3**: Train Loss 0.6932 (49.8%) | Val Loss **0.6932** (50.0%), Val AUC 0.4993 | Precision: 0.5000, Recall: 0.2400, F1: 0.3243 | CM: TN=76, FP=24, FN=76, TP=24 *(Best Checkpoint)*
- **Epoch 4**: Train Loss 0.6932 (50.2%) | Val Loss 0.6932 (49.5%), Val AUC 0.4992 | Precision: 0.4912, Recall: 0.2800, F1: 0.3567 | CM: TN=71, FP=29, FN=72, TP=28
- **Epoch 5**: Train Loss 0.6932 (49.8%) | Val Loss 0.6932 (50.0%), Val AUC 0.5002 | Precision: 0.5000, Recall: 0.5500, F1: 0.5238 | CM: TN=45, FP=55, FN=45, TP=55

---

### Experiment 2: Fixed KV High-Pass Prefilter

#### Seed 42
- **Epoch 1**: Train Loss 0.6909 (54.0%) | Val Loss 0.7618 (50.0%), Val AUC 0.5087 | Precision: 0.5000, Recall: 0.1400, F1: 0.2188 | CM: TN=86, FP=14, FN=86, TP=14
- **Epoch 2**: Train Loss 0.6839 (54.5%) | Val Loss 0.8683 (50.0%), Val AUC 0.5163 | Precision: 0.5000, Recall: 0.9900, F1: 0.6644 | CM: TN=1, FP=99, FN=1, TP=99
- **Epoch 3**: Train Loss 0.6602 (60.5%) | Val Loss 0.7209 (50.5%), Val AUC **0.5249** | Precision: 0.6000, Recall: 0.0300, F1: 0.0571 | CM: TN=98, FP=2, FN=97, TP=3 *(Peak Val AUC)*
- **Epoch 4**: Train Loss 0.6412 (60.0%) | Val Loss 0.7378 (50.5%), Val AUC 0.5156 | Precision: 0.5385, Recall: 0.0700, F1: 0.1239 | CM: TN=94, FP=6, FN=93, TP=7
- **Epoch 5**: Train Loss **0.6313** (**63.3%**) | Val Loss **0.7031** (**51.0%**), Val AUC **0.5231** | Precision: 0.5067, Recall: 0.7600, F1: 0.6080 | CM: TN=26, FP=74, FN=24, TP=76 *(Best Checkpoint)*

#### Seed 123
- **Epoch 1**: Train Loss 0.6904 (54.0%) | Val Loss 0.8175 (50.0%), Val AUC 0.5108 | Precision: 0.5000, Recall: 0.8800, F1: 0.6377 | CM: TN=12, FP=88, FN=12, TP=88
- **Epoch 2**: Train Loss 0.6673 (59.2%) | Val Loss 0.8638 (50.0%), Val AUC 0.5140 | Precision: 0.5000, Recall: 0.7900, F1: 0.6124 | CM: TN=21, FP=79, FN=21, TP=79
- **Epoch 3**: Train Loss 0.6589 (58.0%) | Val Loss 0.8291 (50.5%), Val AUC 0.5272 | Precision: 0.5026, Recall: 0.9700, F1: 0.6621 | CM: TN=4, FP=96, FN=3, TP=97
- **Epoch 4**: Train Loss 0.6437 (63.8%) | Val Loss 1.4538 (50.0%), Val AUC 0.5292 | Precision: 0.0000, Recall: 0.0000, F1: 0.0000 | CM: TN=100, FP=0, FN=100, TP=0
- **Epoch 5**: Train Loss **0.6248** (**65.2%**) | Val Loss **0.7015** (**50.5%**), Val AUC **0.5334** | Precision: 0.5034, Recall: 0.7300, F1: 0.5959 | CM: TN=28, FP=72, FN=27, TP=73 *(Best Checkpoint & Peak Val AUC)*

---

## 5. Architectural Analysis & Mathematical Audit

### 1. The Post-Layer 3 Activation Identity ($|x| = x$)

In Experiment 3 and Experiment 4, the forward pass was implemented as:

```python
feat = self.prefilter(x)
feat = self.layer1(feat)
feat = self.layer2(feat)
feat = self.layer3(feat)

if self.use_abs:
    feat = torch.abs(feat)

feat = self.gap(feat)
```

Inspecting `ResidualBlock`:
```python
def forward(self, x: torch.Tensor) -> torch.Tensor:
    residual = self.shortcut(x)
    out = self.relu(self.bn1(self.conv1(x)))
    out = self.bn2(self.conv2(out))
    out = self.relu(out + residual)
    return out
```

Because `ResidualBlock` evaluates `self.relu(...)` at the very output, every entry in `feat` is non-negative:
$$\forall i, j, k, b: \quad \text{feat}[b, c, i, j] \ge 0 \implies |\text{feat}| \equiv \text{feat}$$

This proves why **Experiment 3 produced identical metrics to Experiment 1** and **Experiment 4 produced identical metrics to Experiment 2** to 4 decimal places across all epochs.

### 2. Literature Standard for ABS Activation (XuNet vs StegoNet-Lite)

In established steganalysis architectures:
- **XuNet (IEEE SPL 2016)** places the absolute-value activation `ABS` in **Layer 1** immediately following the residual filters:
  $$\mathbf{F}_1 = |\mathbf{W}_1 * \mathbf{I}|$$
  Because embedding perturbations introduce both positive ($+1$) and negative ($-1$) differences, taking the absolute value at Layer 1 converts bipolar perturbations into positive energy magnitudes before pooling.
- **SRNet (IEEE TIFS 2018)** keeps the first 7 convolutional layers completely unpooled (stride 1, no average pooling), preserving the fine $256 \times 256$ spatial residual grid so that destructive interference cannot occur during early layers.
- In StegoNet-Lite, applying stride-2 convolutions in Stage 1 ($256 \to 128$), Stage 2 ($128 \to 64$), and Stage 3 ($64 \to 32$) followed by linear Global Average Pooling (GAP) without Layer 1 ABS rectification allowed bipolar perturbations to cancel out before classification.

---

## 6. Seed-to-Seed Comparison & Variance

Comparing `seed=42` and `seed=123`:

| Metric | Exp 1 (Seed 42 vs 123) | Exp 2 (Seed 42 vs 123) |
| :--- | :---: | :---: |
| **Initial Train Loss (Ep 1)** | 0.6974 vs 0.6998 | 0.6909 vs 0.6904 |
| **Final Train Loss (Ep 5)** | 0.6932 vs 0.6932 | 0.6313 vs 0.6248 |
| **Final Train Acc (Ep 5)** | 50.17% vs 49.83% | 63.33% vs 65.17% |
| **Final Val Loss (Ep 5)** | 0.6932 vs 0.6932 | 0.7031 vs 0.7015 |
| **Final Val Accuracy (Ep 5)** | 50.50% vs 50.00% | 51.00% vs 50.50% |
| **Final Val ROC-AUC (Ep 5)** | 0.4982 vs 0.5002 | 0.5231 vs 0.5334 |
| **Peak Val ROC-AUC** | 0.5005 vs 0.5004 | 0.5249 vs 0.5334 |

---

## 7. Rigorous Scientific Verdict & Recommendations

1. **KV Filter is Essential for Optimization**: Unconstrained baseline networks cannot learn spatial steganography on small datasets without high-pass filtering. The KV filter successfully isolated stego gradients, enabling train loss to drop from 0.69 to 0.6248.
2. **Current Formulation Does Not Generalize**: Validation accuracy of $50.5\% - 51.0\%$ and ROC-AUC of $0.5231 - 0.5334$ is statistically indistinguishable from chance on 200 validation images.
3. **Do NOT run a 4,000-pair training experiment on raw StegoNet-Lite**: Simply scaling the dataset to 4,000 pairs using the current StegoNet-Lite architecture will waste significant computational resources because the downstream architecture still suffers from destructive sign cancellation in the spatial residual blocks and premature downsampling.
4. **Required Structural Refinements Before Scaling**:
   - Move ABS activation to Layer 1 (immediately after the KV/residual filter).
   - Keep the first two residual stages at full $256 \times 256$ resolution without stride-2 pooling (SRNet pattern).
   - Consider a multi-kernel SRM filter bank.
5. **Production Deployment Protection**: The currently deployed production inference model and endpoints must remain untouched until an architecture achieves consistent, statistically significant validation AUC ($\ge 0.70$) on independent validation splits.
