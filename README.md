# StegoDetect AI 

**Advanced Image Steganalysis & Digital Forensics Platform**

StegoDetect AI is a comprehensive, local-first portfolio project designed to identify hidden steganographic data within images. It features a complete pipeline combining classical digital forensics, statistical heuristics, and modern machine learning approaches.

---

## Features

- **Extensive Forensic Evidence Fusion**: Analyzes multiple attack vectors and outputs a single weighted risk score (0-100) and confidence interval.
- **LSB (Least Significant Bit) Analysis**: Explores bit plane distributions to find perfectly equalized hidden payload signatures.
- **Chi-Square Attack**: Performs Pairs of Values (PoVs) statistical testing on the LSBs to detect spatial disruptions.
- **RS Steganalysis**: Classifies Regular and Singular pixel blocks to accurately estimate the embedded payload size.
- **Machine Learning Integration**: 
  - *Classical ML*: Evaluates 31 hand-crafted image features using a Random Forest classifier.
  - *Deep Learning*: Employs a custom Convolutional Neural Network (CNN) with a frozen Spatial Rich Model (SRM) High-Pass filter designed to isolate steganographic noise residuals.
- **Robustness Lab**: Built-in environment for applying transformations (JPEG compression, Gaussian Blur) to evaluate the brittleness of spatial steganography.
- **Analysis History**: SQLite database backed system to retrieve and manage past forensic investigations.
- **Forensic Reporting**: Export analysis results locally as structured JSON data or a fully-rendered PDF forensic report.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Computer Vision & Math**: OpenCV, NumPy, SciPy, Pillow
- **Machine Learning**: Scikit-Learn (RandomForest), PyTorch (CNN)
- **Database**: SQLite3

### Frontend
- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **PDF Export**: html2pdf.js

## Security & Privacy Note

- **Local Execution**: This project requires no cloud dependencies. All analysis, ML inference, and forensic reporting happen directly on your local machine.
- **Data Privacy**: Uploaded files are evaluated temporarily in memory/temp storage and are purged immediately after analysis to ensure strict data sanitization.
- **No CI/CD**: Intentionally avoids remote deployment or automated GitHub Actions pipelines to adhere to local forensic auditing constraints.

## Running Locally

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Disclaimer
This software is intended for educational, research, and portfolio purposes. Current model performance is based on constrained synthetic datasets and should not be used in critical legal or enterprise security contexts without substantial further real-world adversarial validation.
