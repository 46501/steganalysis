# Steganalysis Platform (PyTorch SRNet + FastAPI + React)

A modern, full-stack deep learning steganalysis system for detecting steganographic payloads concealed within digital images using **SRNet** (Spatial Rich Model-based Residual Network).

---

## 🚀 Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend API**: FastAPI (Python 3.11 / 3.12), Pydantic v2, Uvicorn
- **Deep Learning**: PyTorch (SRNet 12-layer deep residual architecture)
- **Database & ORM**: PostgreSQL, SQLAlchemy 2.0 (AsyncIO), Alembic

---

## 📁 Project Structure

```text
steganalysis/
├── backend/                  # FastAPI & PyTorch SRNet backend service
│   ├── alembic/              # PostgreSQL schema migrations
│   ├── app/                  # Application source
│   │   ├── api/v1/           # API routes (analyze, batch, history, health)
│   │   ├── core/             # Configuration & security
│   │   ├── ml/               # SRNet architecture, inference & preprocessor
│   │   │   └── weights/      # Checkpoint storage (.gitkeep)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Image & steganalysis orchestration services
│   ├── storage/              # Temporary file staging area
│   ├── tests/                # Unit and inference tests
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
├── frontend/                 # React + Vite + Tailwind CSS client
│   ├── src/
│   │   ├── components/       # UI components (analysis, history, layout)
│   │   ├── pages/            # Views (Dashboard, Detector, History, ModelInfo)
│   │   ├── services/         # Axios API client
│   │   └── styles/           # Tailwind CSS directives
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite config with backend proxy
├── docs/                     # Architectural & SRNet research documentation
├── scripts/                  # Operations & weight download utility scripts
├── docker-compose.yml        # Multi-service container orchestration
└── .gitignore                # Exclusion rules for secrets, weights & caches
```

---

## 🧠 SRNet Architecture Overview

SRNet (Spatial Rich Model-based Deep Residual Network) is specifically tailored to preserve subtle high-frequency steganographic noise signals without destroying them through premature pooling.
- **Type 1 Layers**: Unpooled convolutional blocks with Batch Normalization and ReLU.
- **Type 2 Layers**: Residual blocks without spatial downsampling to retain spatial noise statistics.
- **Type 3 Layers**: Residual blocks with $3 \times 3$ average pooling (stride 2) for hierarchical feature reduction.
- **Type 4 Layer**: Global Average Pooling (GAP) block outputting a 512-dimensional feature embedding.
- **Classification Head**: Fully connected layer outputting 2 logits (Cover `0` vs Stego `1`).

---

## 🔒 Security & Privacy

- All model weight files (`*.pth`, `*.pt`), local environment credentials (`.env`), and temporary upload caches are strictly excluded via `.gitignore`.
- Image uploads are validated against MIME type restrictions and sanitized before processing.

