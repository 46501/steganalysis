# StegoShield AI: Deep Residual Steganalysis Platform

[![PyTorch](https://img.shields.io/badge/PyTorch-2.1+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-19%20Passing-brightgreen)](#-automated-testing)

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

The project contains an automated test suite verifying model forward passes, residual energy computations, database migrations, and end-to-end API pipelines.

To execute the test suite:
```powershell
$env:PYTHONPATH="D:\Stego\backend"
pytest D:\Stego\backend\tests -v
```
**Outcome:** `19 passed in ~30s (100% pass rate)`.

---

## 📖 Live Demonstration & Viva Defense Guide

For a step-by-step walkthrough script and answers to theoretical viva questions (SRNet layer design, S-UNIWARD wavelet subband distortion, ternary embedding simulation, and hardware considerations), refer to:

👉 **[docs/project_demonstration_guide.md](docs/project_demonstration_guide.md)**

---

## 🔒 Security & Scientific Integrity

- All large model weight files (`*.pt`, `*.pth`), binary datasets (`dataset/`), and environment secrets (`.env`) are strictly excluded via `.gitignore`.
- Predictions and model metrics maintain strict scientific honesty; no fabricated predictions or unverified claims are utilized.
