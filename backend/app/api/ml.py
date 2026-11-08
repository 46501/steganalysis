from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import json
import numpy as np
import joblib
from tempfile import NamedTemporaryFile

from ..ml.features import get_feature_vector

router = APIRouter()

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models")

# Load globals if they exist
try:
    rf_model = joblib.load(os.path.join(MODEL_DIR, "randomforest_v1.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler_v1.pkl"))
    with open(os.path.join(MODEL_DIR, "feature_schema.json"), "r") as f:
        feature_schema = json.load(f)
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "r") as f:
        metadata = json.load(f)
        top_features_meta = metadata.get("RandomForest", {}).get("top_features", [])
except Exception as e:
    rf_model = None
    scaler = None
    feature_schema = []
    top_features_meta = []
    print(f"Warning: Models not fully loaded. {e}")

@router.post("/predict")
async def ml_predict(file: UploadFile = File(...)):
    """
    Predicts steganography using the classical Random Forest model.
    """
    if rf_model is None or scaler is None or not feature_schema:
        raise HTTPException(status_code=503, detail="ML models are not trained or loaded yet.")
        
    try:
        with NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        # Extract exact same features used in training
        features = get_feature_vector(temp_path, feature_schema)
        features_array = np.array(features).reshape(1, -1)
        
        # Scale
        features_scaled = scaler.transform(features_array)
        
        # Predict
        prob = rf_model.predict_proba(features_scaled)[0, 1]
        pred_class = int(rf_model.predict(features_scaled)[0])
        
        # Explanation
        # Match current features with their names
        feat_dict = dict(zip(feature_schema, features))
        
        # Format top features explaining the model (using global importances)
        # In a more advanced SHAP setup we would calculate local SHAP values here.
        # For performance, we return the global top features and their current values.
        explanation = []
        for tf in top_features_meta:
            fname = tf["feature"]
            explanation.append({
                "feature": fname,
                "importance": tf["importance"],
                "value": feat_dict.get(fname, 0.0)
            })
            
        os.remove(temp_path)
        
        if prob > 0.6:
            prediction_text = "STEGANOGRAPHICALLY_SUSPICIOUS"
        elif prob > 0.4:
            prediction_text = "INCONCLUSIVE"
        else:
            prediction_text = "LIKELY_CLEAN"
            
        return {
            "status": "success",
            "prediction": prediction_text,
            "probability": float(prob),
            "model": "RandomForest",
            "model_version": "v1",
            "top_features": explanation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evaluation")
async def get_evaluation():
    try:
        with open(os.path.join(MODEL_DIR, "model_metadata.json"), "r") as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=404, detail="No evaluation metadata found.")
