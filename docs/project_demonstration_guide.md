# StegoShield AI — Project Demonstration & Viva Defense Guide

Welcome to the **StegoShield AI** demonstration manual. This document provides step-by-step instructions for running a flawless, impressive, and scientifically rigorous project presentation for academic evaluators, university review panels, and viva defense examiners.

---

## 1. Quickstart: Launching the Application

### Prerequisites
- Python 3.10+ (PyTorch installed)
- Node.js 18+ & npm
- Terminal Shell: PowerShell or Bash

### Terminal 1: Launch Backend API
```powershell
cd D:\Stego\backend
$env:PYTHONPATH="D:\Stego\backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Expected log output:*
```text
[*] Starting SRNet Steganalysis API v1.0.0
[*] Initializing database (SQLite (Local Storage))...
[*] Database schema initialized successfully (SQLite (Local Storage)).
[*] Initializing PyTorch Steganalysis Engine on device: cpu...
[*] Steganalysis Engine initialized: StegoNet-Lite (Demonstration Baseline)
INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Terminal 2: Launch React Frontend
```powershell
cd D:\Stego\frontend
npm run dev
```
*Expected log output:*
```text
  VITE v5.4.21  ready in ~300 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser to: **`http://localhost:5173`**

---

## 2. Live Demonstration Script (Step-by-Step)

### Step 1: System Dashboard Overview
1. Direct the evaluator's attention to the **System Dashboard**.
2. Point out the live telemetry metrics:
   - **Total Scans**: Live count from the persistent database.
   - **Stego vs Cover Interceptions**: Real-time ratio of detected steganographic payloads.
   - **Inference Speed**: Under 25 ms per image on standard CPU.
   - **Infrastructure Panels**:
     - *Active Engine*: `StegoNet-Lite (Demonstration Baseline)` running on PyTorch CPU.
     - *Dataset Verification*: `BOSSbase 1.01 (10,000 pairs / 20,000 PGM images)` certified with 0% partition leakage.
     - *Research Architecture*: `SRNet (12-Layer Deep Residual Network, Boroumand et al. IEEE TIFS 2018)`.
3. Emphasize that the system requires zero manual database setup: it automatically detects whether PostgreSQL is available and seamlessly provides local SQLite persistence with audit logging.

### Step 2: Live Detection Demonstration
1. Click the **Steganalysis Detector** tab in the top navigation bar.
2. Demonstrate the **Instant Evaluator Samples** (top quick-pick bar):
   - **Test 1 — Clean Cover Verification:**
     - Click `Load Sample Cover (#5001)`.
     - The image preview immediately renders the 512x512 grayscale PGM image.
     - Click **Execute Steganalysis Inspection**.
     - Observe the live analysis: high-pass Laplacian filter extraction -> CNN forward pass.
     - The result displays a bright emerald banner: **COVER (CLEAN IMAGE)** with high confidence.
     - Explain the **Scientific Forensic Explanation**: "Spatial high-pass residual energy conforms to natural unperturbed camera sensor noise and smooth spatial gradients."
   - **Test 2 — S-UNIWARD Steganographic Payload Detection:**
     - Click `Load Sample Stego (#5001 S-UNIWARD)`.
     - Click **Execute Steganalysis Inspection**.
     - The result immediately displays a glowing rose red banner: **STEGANOGRAPHY (PAYLOAD DETECTED)**.
     - Point out the elevated **Residual Energy ($\sigma_r^2$)** and the S-UNIWARD ±1 wavelet embedding explanation.
     - Point out the cryptographic **SHA-256 Hash** ensuring forensic chain-of-custody.
3. Show that users can also drag and drop any PNG, JPG, or PGM file from their computer into the dropzone.

### Step 3: Audit Trail & Scan Archive
1. Click the **Scan Archive** tab.
2. Demonstrate how every scan performed is recorded:
   - Date & timestamp
   - Filename and SHA-256 fingerprint
   - Verdict (COVER vs STEGO)
   - Probability split (Cover % vs Stego %)
   - High-pass residual energy ($\sigma_r^2$)
   - Model name and execution latency
3. Click the **Inspect (Eye icon)** button on any row to open the detailed forensic modal.
4. Click **Export CSV** to demonstrate downloading the complete compliance report for forensic archiving.

### Step 4: Academic Rigor & Theoretical Foundation
1. Click the **Architecture & Research** tab.
2. Walk the evaluator through the four theoretical tabs:
   - **SRNet IEEE TIFS Architecture**: Explain the 4 layer types (Type 1-2 unpooled residuals, Type 3 downsampling, Type 4 global aggregation).
   - **StegoNet-Lite**: Explain why a compact residual model was trained for the CPU demonstration.
   - **BOSSbase & S-UNIWARD Dataset**: Review the 4,000 train / 1,000 val / 5,000 test splits and pairing validation.
   - **Theoretical Foundations**: Explain directional Daubechies 8-tap wavelets (LH, HL, HH subbands) and ternary entropy simulation.

---

## 3. Anticipated Viva Defense Questions & Winning Answers

### Q1: Why did you use SRNet instead of standard computer vision CNNs like ResNet-50 or VGG-16?
> **Answer:** Standard computer vision networks are designed to recognize high-level semantic objects (faces, cars) and discard high-frequency noise through aggressive early pooling. In steganography, the image content is unwanted noise, and the hidden payload ($\pm 1$ pixel changes) is a microscopic high-frequency signal. SRNet prevents pooling in its first 7 layers (Type 1 & Type 2 blocks), preserving the spatial noise residuals necessary to detect embedding footprints.

### Q2: What is the S-UNIWARD algorithm and why is it difficult to detect?
> **Answer:** S-UNIWARD (Spatial Universal Wavelet Relative Distortion) is a content-adaptive steganography algorithm. Instead of modifying pixels uniformly, it measures relative distortion across directional 2D Daubechies wavelet subbands ($LH, HL, HH$). It concentrates embedding changes into complex, highly-textured regions where human eyes and simple statistical detectors cannot distinguish embedding noise from natural texture.

### Q3: Why is StegoNet-Lite used for the live demonstration instead of full SRNet training?
> **Answer:** Scientific honesty and hardware constraints: Full SRNet training on 4,000 pairs for 50 epochs requires approximately 360 CPU hours (~15 days continuous compute) or a high-end CUDA GPU cluster. On our host evaluation hardware (Intel UHD 620 / CPU), we engineered StegoNet-Lite—a compact 4-stage residual network with high-pass residual prefiltering—trained on a representative subset of S-UNIWARD pairs. The full SRNet PyTorch architecture, paired mini-batch dataloader, and training pipeline are completely implemented and verified in the codebase.

### Q4: How do you guarantee there is no data leakage in your dataset?
> **Answer:** Our dataset integrity audit strictly partitions 10,000 BOSSbase cover images: Train (IDs 1–4,000), Validation (IDs 4,001–5,000), and Test (IDs 5,001–10,000). Image IDs never cross partition boundaries. Every cover image is matched with its exact corresponding stego counterpart, and verified that maximum absolute pixel difference is strictly $\le 1$.

### Q5: What does the "Residual Energy ($\sigma_r^2$)" metric represent?
> **Answer:** It represents the variance of the image after applying a 3x3 discrete Laplacian high-pass filter:
> $$\sigma_r^2 = \frac{1}{HW} \sum_{i,j} \left(4 I_{i,j} - I_{i+1,j} - I_{i-1,j} - I_{i,j+1} - I_{i,j-1}\right)^2$$
> Because S-UNIWARD embeds hidden bits by adding or subtracting 1 in high-frequency textured regions, the residual energy is measurably perturbed, providing a physical, interpretable forensic indicator.

---

## 4. Automated Test Suite Verification

To prove system reliability and code quality to the examiner:
```powershell
$env:PYTHONPATH="D:\Stego\backend"
pytest D:\Stego\backend\tests -v
```
**Expected outcome:** 19 tests passing (100% pass rate).
