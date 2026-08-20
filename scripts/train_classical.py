import os
import glob
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

import sys
# Add parent dir to path so we can import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.ml.features import extract_features

def load_data(clean_dir, stego_dir):
    print("Extracting features from dataset...")
    X_list = []
    y_list = []
    groups = []
    
    clean_images = glob.glob(os.path.join(clean_dir, "*.*"))
    stego_images = glob.glob(os.path.join(stego_dir, "*.*"))
    
    # Exclude metadata file
    stego_images = [f for f in stego_images if not f.endswith('.json')]
    
    all_feature_names = set()
    data_dicts = []
    
    for path in clean_images:
        try:
            feats = extract_features(path)
            all_feature_names.update(feats.keys())
            data_dicts.append({"path": path, "label": 0, "group": os.path.basename(path), "feats": feats})
        except Exception as e:
            print(f"Error extracting clean {path}: {e}")
            
    # Load stego metadata to get the original source image for grouping
    metadata_path = os.path.join(stego_dir, "dataset_metadata.json")
    stego_metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            stego_metadata = json.load(f)
            
    for path in stego_images:
        try:
            filename = os.path.basename(path)
            source_img = stego_metadata.get(filename, {}).get("source_image", filename)
            
            feats = extract_features(path)
            all_feature_names.update(feats.keys())
            data_dicts.append({"path": path, "label": 1, "group": source_img, "feats": feats})
        except Exception as e:
            print(f"Error extracting stego {path}: {e}")
            
    feature_names = sorted(list(all_feature_names))
    
    for d in data_dicts:
        vec = [d["feats"].get(fn, 0.0) for fn in feature_names]
        X_list.append(vec)
        y_list.append(d["label"])
        groups.append(d["group"])
        
    return np.array(X_list), np.array(y_list), np.array(groups), feature_names

def train_and_evaluate():
    clean_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "clean")
    stego_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "stego")
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    
    os.makedirs(models_dir, exist_ok=True)
    
    # We will generate a fake tiny dataset if it doesn't exist just for the script to run without crashing
    if not os.path.exists(clean_dir) or len(glob.glob(os.path.join(clean_dir, "*.*"))) == 0:
        print("Dataset not found. Generating dummy dataset for testing pipeline...")
        os.makedirs(clean_dir, exist_ok=True)
        import cv2
        for i in range(10):
            cv2.imwrite(os.path.join(clean_dir, f"dummy_{i}.png"), np.random.randint(0, 256, (64, 64, 3), dtype=np.uint8))
        from dataset_generator import generate_dataset
        generate_dataset(clean_dir, stego_dir, rates=[0.1, 0.5])
        
    X, y, groups, feature_names = load_data(clean_dir, stego_dir)
    print(f"Loaded {len(X)} samples with {len(feature_names)} features.")
    
    # Save feature schema
    with open(os.path.join(models_dir, "feature_schema.json"), "w") as f:
        json.dump(feature_names, f)
        
    # GroupShuffleSplit to prevent data leakage
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups))
    
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    
    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    joblib.dump(scaler, os.path.join(models_dir, "scaler_v1.pkl"))
    
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000),
        "SVM": SVC(probability=True),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42)
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_scaled, y_train)
        
        y_pred = model.predict(X_test_scaled)
        y_prob = model.predict_proba(X_test_scaled)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        try:
            auc = roc_auc_score(y_test, y_prob)
        except ValueError:
            auc = 0.5 # if only one class in y_true
            
        print(f"{name} Results: Acc: {acc:.4f}, AUC: {auc:.4f}")
        
        results[name] = {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "roc_auc": auc
        }
        
        joblib.dump(model, os.path.join(models_dir, f"{name.lower()}_v1.pkl"))
        
        # Feature importance for Random Forest
        if name == "RandomForest":
            importances = model.feature_importances_
            indices = np.argsort(importances)[::-1]
            top_features = [{"feature": feature_names[i], "importance": float(importances[i])} for i in indices[:10]]
            results[name]["top_features"] = top_features
            
    # Save metadata
    with open(os.path.join(models_dir, "model_metadata.json"), "w") as f:
        json.dump(results, f, indent=4)
        
    print("Training complete. Models and metrics saved.")

if __name__ == "__main__":
    train_and_evaluate()
