# StegoShield AI: Deep Residual Steganalysis Platform

[![PyTorch](https://img.shields.io/badge/PyTorch-2.1+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-34%20Passing-brightgreen)](#-automated-testing)

An enterprise-grade, full-stack deep learning steganalysis system designed to detect content-adaptive digital image steganography (**S-UNIWARD @ 0.4 bpp**) across the standard **BOSSbase 1.01** benchmark.

---

## 🌟 Key Highlights

- **Dual Neural Network Architecture Strategy**:
  - **SRNet (Boroumand et al., IEEE TIFS 2018)**: Primary 12-layer deep residual research architecture featuring unpooled residual layers (Type 1–2), stride-2 pooled skip connections (Type 3), and global average pooling (Type 4).
  - **StegoNet-Lite**: High-efficiency 4-stage residual demonstration model featuring front-end high-pass residual extraction, trained on certified S-UNIWARD 0.4 bpp pairs for real-time CPU evaluation (<25 ms).
- **Physical & Scientific Explainability**:
  - Computes spatial high-pass Laplacian residual variance ($\sigma_r^2$).
  - Delivers interpretable forensic rationales connecting residual energy disturbance to directional wavelet embedding footprints.
  - Generates SHA-256 cryptographic fingerprints for forensic chain-of-custody.
- **Certified Dataset (BOSSbase 1.01 + S-UNIWARD 0.4 bpp)**:
  - 10,000 matched cover-stego pairs (20,000 PGM images).
  - Partitions: 4,000 Train / 1,000 Validation / 5,000 Test (0% partition leakage).
  - Maximum absolute pixel difference certified strictly $\le 1.0$.
- **Database Resilience**:
  - Automatically connects to PostgreSQL if available.
  - Seamlessly falls back to local SQLite (`aiosqlite`) persistence with automatic schema migration when running in standalone demo environments.
- **Modern Cyber-Defense Web Application**:
  - Interactive dark-mode dashboard with real-time telemetry.
  - Drag-and-drop workspace with 1-click test image presets from the test partition.
  - Comprehensive scan archive with pagination, search, detail inspection modals, and CSV export.

---

## 🏗️ Architecture & Component Topology

```text
                               +----------------------------------------+
                               |     React + Vite Cyber UI (Port 5173)  |
                               |  - Real-time Dashboard & Telemetry     |
                               |  - Drag-and-Drop Image Detector        |
                               |  - Audit Log Archive & CSV Export      |
                               +-------------------+--------------------+
                                                   | HTTP / REST (Axios)
                                                   v
                               +----------------------------------------+
                               |        FastAPI Backend (Port 8000)     |
                               |  - /api/v1/analyze (Single Inspection) |
                               |  - /api/v1/batch (Batch Processing)    |
                               |  - /api/v1/history (Audit Records)     |
                               |  - /api/v1/health (System Status)      |
                               +-------------------+--------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
                        v                                                     v
+-----------------------------------------------+   +-----------------------------------------------+
|             PyTorch ML Engine                 |   |           Database Storage Layer              |
|  - StegoNet-Lite (4-Stage Demo Baseline)      |   |  - PostgreSQL (Primary)                       |
|  - SRNet (12-Layer Deep Residual Network)     |   |  - SQLite Fallback (backend/storage/stego.db) |
|  - High-Pass Laplacian Residual Filter (σr²)  |   |  - ScanRecord Audit Trails                    |
+-----------------------------------------------+   +-----------------------------------------------+
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Windows, Linux, or macOS

### 2. Backend Setup & Startup
```powershell
# Navigate to backend directory
cd D:\Stego\backend

# Set Python path
$env:PYTHONPATH="D:\Stego\backend"

# Launch FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend automatically initializes database tables and loads the trained StegoNet-Lite model weights.*

API Documentation is interactively available at: **`http://127.0.0.1:8000/docs`**

### 3. Frontend Setup & Startup
```powershell
# Navigate to frontend directory
cd D:\Stego\frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 🧪 Automated Testing

The project contains an automated test suite verifying model forward passes, residual energy computations, database migrations, model training & calibration, paired-reference differential discrimination, and end-to-end API pipelines.

To execute the test suite:
```powershell
$env:PYTHONPATH="D:\Stego\backend"
pytest backend/tests/test_model_training_and_calibration.py backend/tests/test_scientific_detector_confidence.py backend/tests/test_forensics_lab.py backend/tests/test_inference.py -v
```
**Outcome:** `34 passed in ~24s (100% pass rate)`.

---

## 🔬 Phase 2: Trained StegoNet-Lite Baseline & Independent Evaluation

### 1. Training Pipeline
- **Dataset**: BOSSbase 1.01 S-UNIWARD 0.4 bpp (10,000 pairs, 0% leakage).
- **Training Command**:
  ```powershell
  python backend/training/train_stegonet_lite.py --num_train_pairs 300 --num_val_pairs 100 --epochs 5 --batch_size 8 --lr 0.001 --patience 3
  ```
- **Hardware Profile**: 4 physical CPU cores / 8 logical threads, 16 GB RAM, PyTorch 2.12.0+cpu.
- **Training Duration**: 312.63 seconds (~5.2 minutes).
- **Optimization**: AdamW + Cosine Annealing learning rate scheduling, pair-preserving mini-batching, and early stopping on validation loss.
- **Checkpoint Location**: `backend/app/ml/weights/stegonet_lite_best.pt` (310,210 parameters).

### 2. Independent Evaluation on Held-Out Test Set (IDs 5001–5100, 200 Images)
- **Evaluation Command**:
  ```powershell
  python backend/app/ml/evaluate_model.py
  ```
- **Empirical Test Metrics**:
  - **Accuracy**: $0.5000$ ($50.0\%$) [95% CI: $0.4300, 0.5650$]
  - **ROC-AUC**: $0.5017$ [95% CI: $0.4255, 0.5826$]
  - **Precision / Recall (Stego)**: Precision = $0.5000$, Recall = $0.1000$, F1 = $0.1667$
  - **False Positive Rate (FPR)**: $0.1000$ | **False Negative Rate (FNR)**: $0.9000$
  - **Brier Score**: $0.2501$ (matches uninformative prior of $0.2500$)
  - **Expected Calibration Error (ECE)**: $0.0067$ (probabilities clustered near $0.5067$)
  - **Confusion Matrix**: $\text{TN}=90, \text{FP}=10, \text{FN}=90, \text{TP}=10$

### 3. Baseline Comparisons (Evaluated on Exactly the Same 200 Test Images)
- **Random Guess / Majority Baseline**: Accuracy = $0.5000$, ROC-AUC = $0.5000$, Brier = $0.2500$.
- **High-Pass Residual Baseline ($\sigma_r^2$)**: ROC-AUC = $0.5029$.

### 4. Known Scientific Limitations & Application Guardrail
In single-image spatial steganography, standard strided residual downsampling averages out subtle $\pm 1$ perturbations ($\sum \Delta \approx 0$). Without full GPU cluster training on all 10,000 BOSSbase pairs and unpooled SRM layers (as in SRNet), single-image neural detection remains inconclusive. The detector strictly enforces the **`INCONCLUSIVE — LOW CONFIDENCE`** guardrail, with authentic paired-reference analysis serving as the bit-accurate method for differential proof.

---

## 📖 Live Demonstration & Viva Defense Guide

For a step-by-step walkthrough script and answers to theoretical viva questions (SRNet layer design, S-UNIWARD wavelet subband distortion, ternary embedding simulation, and hardware considerations), refer to:

👉 **[docs/project_demonstration_guide.md](docs/project_demonstration_guide.md)**

---

## 🔒 Security & Scientific Integrity

- All large model weight files (`*.pt`, `*.pth`), binary datasets (`dataset/`), and environment secrets (`.env`) are strictly excluded via `.gitignore`.
- Predictions and model metrics maintain strict scientific honesty; no fabricated predictions or unverified claims are utilized.
