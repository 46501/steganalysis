import os
import cv2
import json
import torch
import numpy as np
from sklearn.metrics import accuracy_score

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.ml.cnn import StegoCNN
from backend.app.ml.features import get_feature_vector
import joblib

def apply_transformation(img, trans_type):
    if trans_type == "original":
        return img
    elif trans_type == "jpeg_95":
        _, enc = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        return cv2.imdecode(enc, cv2.IMREAD_COLOR)
    elif trans_type == "jpeg_80":
        _, enc = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return cv2.imdecode(enc, cv2.IMREAD_COLOR)
    elif trans_type == "resize":
        h, w = img.shape[:2]
        resized = cv2.resize(img, (w//2, h//2))
        return cv2.resize(resized, (w, h))
    return img

def test_robustness():
    # Load CNN
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    
    cnn = StegoCNN().to(device)
    cnn.load_state_dict(torch.load(os.path.join(models_dir, "cnn_v1.pth"), map_location=device))
    cnn.eval()
    
    # Load Random Forest
    rf = joblib.load(os.path.join(models_dir, "randomforest_v1.pkl"))
    scaler = joblib.load(os.path.join(models_dir, "scaler_v1.pkl"))
    with open(os.path.join(models_dir, "feature_schema.json"), "r") as f:
        feature_schema = json.load(f)
        
    stego_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "stego")
    import glob
    stego_images = glob.glob(os.path.join(stego_dir, "*.*"))
    stego_images = [f for f in stego_images if not f.endswith('.json')][:10] # Test on first 10 for speed
    
    transformations = ["original", "jpeg_95", "jpeg_80", "resize"]
    
    results = {}
    
    for t in transformations:
        cnn_preds = []
        rf_preds = []
        
        for path in stego_images:
            img = cv2.imread(path, cv2.IMREAD_COLOR)
            if img is None: continue
            
            trans_img = apply_transformation(img, t)
            
            # CNN Pred
            img_rgb = cv2.cvtColor(trans_img, cv2.COLOR_BGR2RGB)
            img_tensor = img_rgb.astype(np.float32) / 255.0
            img_tensor = np.transpose(img_tensor, (2, 0, 1))
            img_tensor = torch.tensor(img_tensor).unsqueeze(0).to(device)
            
            with torch.no_grad():
                prob_cnn = torch.sigmoid(cnn(img_tensor)).item()
                cnn_preds.append(1 if prob_cnn > 0.5 else 0)
                
            # RF Pred
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                cv2.imwrite(tmp.name, trans_img)
                tmp_path = tmp.name
                
            features = get_feature_vector(tmp_path, feature_schema)
            os.remove(tmp_path)
            
            features_scaled = scaler.transform(np.array(features).reshape(1, -1))
            prob_rf = rf.predict_proba(features_scaled)[0, 1]
            rf_preds.append(1 if prob_rf > 0.5 else 0)
            
        cnn_acc = np.mean(cnn_preds)
        rf_acc = np.mean(rf_preds)
        
        results[t] = {
            "CNN_Detection_Rate": f"{cnn_acc*100:.1f}%",
            "RF_Detection_Rate": f"{rf_acc*100:.1f}%"
        }
        
    print("Robustness Transformation Results (True Positive Rate on Stego Images):")
    import pprint
    pprint.pprint(results)

if __name__ == "__main__":
    test_robustness()
