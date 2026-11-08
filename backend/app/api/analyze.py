from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import shutil
import os
import numpy as np
from tempfile import NamedTemporaryFile
from ..services.metadata import extract_metadata
from ..analysis.lsb import analyze_lsb
from ..analysis.histogram import analyze_histogram
from ..analysis.pixel_analysis import analyze_pixels
from ..analysis.chi_square import analyze_chi_square
from ..analysis.rs_analysis import analyze_rs
from ..analysis.noise_analysis import analyze_noise
from ..analysis.structural import analyze_eof
from ..ml.features import get_feature_vector
from ..ml.cnn import StegoCNN
import joblib
import json
import torch
import cv2

router = APIRouter()

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models")
try:
    rf_model = joblib.load(os.path.join(MODEL_DIR, "randomforest_v1.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler_v1.pkl"))
    with open(os.path.join(MODEL_DIR, "feature_schema.json"), "r") as f:
        feature_schema = json.load(f)
except:
    rf_model = None
    scaler = None
    feature_schema = []

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
cnn_model = None
try:
    CNN_MODEL_PATH = os.path.join(MODEL_DIR, "cnn_v1.pth")
    if os.path.exists(CNN_MODEL_PATH):
        cnn_model = StegoCNN()
        cnn_model.load_state_dict(torch.load(CNN_MODEL_PATH, map_location=device))
        cnn_model.to(device)
        cnn_model.eval()
except Exception as e:
    cnn_model = None

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

def validate_file_extension(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    if not validate_file_extension(file.filename):
        raise HTTPException(status_code=400, detail=f"Unsupported file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    temp_file_path = None
    try:
        # Save uploaded file to a temporary location safely
        with NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        # 1. Image metadata extraction
        metadata = extract_metadata(temp_file_path, file.filename)
        
        # 2. LSB analysis
        lsb_results = analyze_lsb(temp_file_path)
        
        # 3. Histogram analysis
        hist_results = analyze_histogram(temp_file_path)
        
        # 4. Pixel correlation analysis
        pixel_results = analyze_pixels(temp_file_path)
        
        # 5. Chi-square analysis
        chi_square_results = analyze_chi_square(temp_file_path)
        
        # 6. RS analysis
        rs_results = analyze_rs(temp_file_path)
        
        # 7. Noise residual analysis
        noise_results = analyze_noise(temp_file_path)
        
        # 8. Structural (EOF) analysis
        structural_results = analyze_eof(temp_file_path)
        
        # 9. Classical ML prediction
        ml_prediction = {}
        if rf_model is not None and scaler is not None and feature_schema:
            try:
                features = get_feature_vector(temp_file_path, feature_schema)
                features_scaled = scaler.transform(np.array(features).reshape(1, -1))
                prob = rf_model.predict_proba(features_scaled)[0, 1]
                ml_prediction = {"model": "RandomForest", "probability": float(prob)}
            except Exception as e:
                ml_prediction = {"error": str(e)}
                
        # 9. CNN prediction
        cnn_prediction = {}
        if cnn_model is not None:
            try:
                img_bgr = cv2.imread(temp_file_path, cv2.IMREAD_COLOR)
                if img_bgr is not None:
                    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                    img_tensor = img_rgb.astype(np.float32) / 255.0
                    img_tensor = np.transpose(img_tensor, (2, 0, 1))
                    img_tensor = torch.tensor(img_tensor).unsqueeze(0).to(device)
                    
                    prob, saliency = cnn_model.get_saliency_map(img_tensor)
                    cnn_prediction = {"model": "CNN_v1", "probability": float(prob)}
            except Exception as e:
                cnn_prediction = {"error": str(e)}
        
        # --- EVIDENCE FUSION ENGINE ---
        risk_score = 0
        supporting_evidence = []
        normal_evidence = []
        
        valid_signals = 0
        
        # 1. LSB Analysis Evaluation (Weight: max 15)
        if lsb_results.get("status") == "success":
            valid_signals += 1
            lsb_suspicious = False
            for ch in lsb_results["stats"].values():
                for bit, stat in ch.items():
                    if bit == '0':
                        if 0.495 < stat['balance'] < 0.505:
                            lsb_suspicious = True
                            break
            if lsb_suspicious:
                risk_score += 15
                supporting_evidence.append("LSB plane 0 balance is perfectly equalized, strongly indicating embedded data.")
            else:
                normal_evidence.append("LSB planes show natural bias.")
                
        # 2. Chi-Square Evaluation (Weight: max 30)
        if chi_square_results.get("status") == "success":
            valid_signals += 1
            chi_suspicious = False
            for ch, res in chi_square_results["stats"].items():
                if res.get("suspicion") == "Suspicious":
                    risk_score += 30
                    supporting_evidence.append(f"Chi-square p-value is extremely low on channel {ch}, confirming statistical disruption.")
                    chi_suspicious = True
                elif res.get("suspicion") == "Moderate":
                    risk_score += 10
                    supporting_evidence.append(f"Chi-square p-value is moderately low on channel {ch}.")
                    chi_suspicious = True
            
            if not chi_suspicious:
                normal_evidence.append("Chi-Square statistics fall within expected natural ranges.")
                
        # 3. RS Analysis Evaluation (Weight: max 30)
        if rs_results.get("status") == "success":
            valid_signals += 1
            rs_suspicious = False
            for ch, res in rs_results["stats"].items():
                rate = res.get("estimated_rate", 0)
                if rate > 0.05:
                    risk_score += min(30, int(rate * 100))
                    supporting_evidence.append(f"RS Steganalysis detected possible embedding ({rate:.1%} estimated capacity).")
                    rs_suspicious = True
                    
            if not rs_suspicious:
                normal_evidence.append("RS Steganalysis detected no significant embedding signature.")

        # 4. Classical ML Evaluation (Weight: max 20)
        rf_prob = ml_prediction.get("probability", 0)
        if ml_prediction.get("model") == "RandomForest":
            valid_signals += 1
            if rf_prob > 0.6:
                risk_score += 20
                supporting_evidence.append(f"Random Forest classified image as suspicious ({rf_prob:.1%} probability).")
            else:
                normal_evidence.append("Random Forest classified image as naturally structured.")

        # 5. CNN Evaluation (Weight: max 25)
        cnn_prob = cnn_prediction.get("probability", 0)
        if cnn_prediction.get("model") == "CNN_v1":
            valid_signals += 1
            if cnn_prob > 0.6:
                risk_score += 25
                supporting_evidence.append(f"CNN detected structural steganographic patterns ({cnn_prob:.1%} probability).")
            else:
                normal_evidence.append("CNN structural evaluation falls within normal ranges.")

        # 6. Structural Evaluation (Hard Indicator: Weight +40)
        if structural_results.get("status") == "success":
            valid_signals += 1
            if structural_results.get("appended_data"):
                # Massive penalty for appended data since it's a hard indicator
                risk_score += 40
                size_kb = structural_results.get('appended_size_bytes', 0) / 1024
                supporting_evidence.append(f"STRUCTURAL ANOMALY: Found {size_kb:.1f} KB of hidden data appended past the End-Of-File marker.")
            else:
                normal_evidence.append("File structure is intact. No appended payload detected.")

        # Final Adjustments
        if valid_signals == 0:
            overall_result = "INCONCLUSIVE"
            risk_score = 0
        else:
            risk_score = min(100, max(0, risk_score))
            if risk_score <= 20:
                overall_result = "VERY LOW SUSPICION"
            elif risk_score <= 40:
                overall_result = "LOW SUSPICION"
            elif risk_score <= 60:
                overall_result = "MODERATE SUSPICION"
            elif risk_score <= 80:
                overall_result = "HIGH SUSPICION"
            else:
                overall_result = "VERY HIGH SUSPICION"
            
        # Confidence logic based on agreement of signals
        confidence = 0
        if valid_signals > 3:
            confidence = 85 if (risk_score > 60 or risk_score <= 20) else 60
        else:
            confidence = 40

        import uuid
        analysis_id = str(uuid.uuid4())
        from datetime import datetime

        return {
            "status": "success",
            "analysis_id": analysis_id,
            "timestamp": datetime.utcnow().isoformat(),
            "filename": file.filename,
            "metadata": metadata,
            "lsb_analysis": lsb_results,
            "histogram_analysis": hist_results,
            "pixel_correlation": pixel_results,
            "chi_square": chi_square_results,
            "rs_analysis": rs_results,
            "noise_analysis": noise_results,
            "structural_analysis": structural_results,
            "ml_prediction": ml_prediction,
            "cnn_prediction": cnn_prediction,
            "evidence": {
                "supporting": supporting_evidence,
                "normal": normal_evidence
            },
            "risk_score": risk_score,
            "overall_result": overall_result,
            "confidence": confidence
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")
    finally:
        # Cleanup temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
