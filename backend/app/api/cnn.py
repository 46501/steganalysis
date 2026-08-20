from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import torch
import cv2
import numpy as np
import base64
from tempfile import NamedTemporaryFile

from ..ml.cnn import StegoCNN

router = APIRouter()

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "cnn_v1.pth")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None

try:
    if os.path.exists(MODEL_PATH):
        model = StegoCNN()
        # Since we might have trained on CUDA, map to current device
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.to(device)
        model.eval()
except Exception as e:
    print(f"Warning: CNN model failed to load. {e}")
    model = None

@router.post("/predict")
async def cnn_predict(file: UploadFile = File(...)):
    """
    Predicts steganography using the CNN model.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="CNN model is not trained or loaded yet.")
        
    try:
        with NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        img = cv2.imread(temp_path, cv2.IMREAD_COLOR)
        if img is None:
            os.remove(temp_path)
            raise HTTPException(status_code=400, detail="Failed to load image for CNN.")
            
        # Preprocessing matching the training setup
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_tensor = img_rgb.astype(np.float32) / 255.0
        img_tensor = np.transpose(img_tensor, (2, 0, 1))
        
        # Add batch dimension
        img_tensor = torch.tensor(img_tensor).unsqueeze(0).to(device)
        
        # Get Probability and Saliency Map
        prob, saliency = model.get_saliency_map(img_tensor)
        
        # Normalize Saliency Map to 0-255 for rendering
        if np.max(saliency) > 0:
            saliency_norm = (saliency / np.max(saliency)) * 255.0
        else:
            saliency_norm = saliency
            
        saliency_img = saliency_norm.astype(np.uint8)
        
        # Colormap for better visualization (JET/Inferno)
        heatmap = cv2.applyColorMap(saliency_img, cv2.COLORMAP_INFERNO)
        
        # Encode Heatmap to Base64
        _, buffer = cv2.imencode('.png', heatmap)
        heatmap_b64 = base64.b64encode(buffer).decode('utf-8')
        
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
            "stego_probability": round(float(prob), 4),
            "model_version": "cnn_v1",
            "heatmap_base64": heatmap_b64
        }
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
