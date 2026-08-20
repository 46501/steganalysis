import os
import glob
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import cv2
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.ml.cnn import StegoCNN

class StegoDataset(Dataset):
    def __init__(self, file_paths, labels, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        
    def __len__(self):
        return len(self.file_paths)
        
    def __getitem__(self, idx):
        path = self.file_paths[idx]
        label = self.labels[idx]
        
        # Load image (BGR)
        img = cv2.imread(path, cv2.IMREAD_COLOR)
        if img is None:
            # Fallback for bad images
            img = np.zeros((64, 64, 3), dtype=np.uint8)
            
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Normalize to [0, 1] and transpose to (C, H, W)
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        
        return torch.tensor(img), torch.tensor([label], dtype=torch.float32)

def load_split_data(clean_dir, stego_dir):
    print("Discovering dataset for CNN...")
    file_paths = []
    labels = []
    groups = []
    
    clean_images = glob.glob(os.path.join(clean_dir, "*.*"))
    stego_images = glob.glob(os.path.join(stego_dir, "*.*"))
    stego_images = [f for f in stego_images if not f.endswith('.json')]
    
    for path in clean_images:
        file_paths.append(path)
        labels.append(0)
        groups.append(os.path.basename(path))
        
    metadata_path = os.path.join(stego_dir, "dataset_metadata.json")
    stego_metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            stego_metadata = json.load(f)
            
    for path in stego_images:
        filename = os.path.basename(path)
        source_img = stego_metadata.get(filename, {}).get("source_image", filename)
        
        file_paths.append(path)
        labels.append(1)
        groups.append(source_img)
        
    file_paths = np.array(file_paths)
    labels = np.array(labels)
    groups = np.array(groups)
    
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(file_paths, labels, groups))
    
    return file_paths[train_idx], labels[train_idx], file_paths[test_idx], labels[test_idx]

def train_cnn():
    clean_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "clean")
    stego_dir = os.path.join(os.path.dirname(__file__), "..", "dataset", "stego")
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    
    os.makedirs(models_dir, exist_ok=True)
    
    X_train, y_train, X_test, y_test = load_split_data(clean_dir, stego_dir)
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")
    
    train_dataset = StegoDataset(X_train, y_train)
    test_dataset = StegoDataset(X_test, y_test)
    
    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=8, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    model = StegoCNN().to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    epochs = 5
    best_loss = float('inf')
    
    train_losses = []
    val_losses = []
    
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
        epoch_loss = running_loss / len(train_loader.dataset)
        train_losses.append(epoch_loss)
        
        # Validation
        model.eval()
        val_loss = 0.0
        all_targets = []
        all_probs = []
        all_preds = []
        
        with torch.no_grad():
            for inputs, targets in test_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                
                probs = torch.sigmoid(outputs).cpu().numpy()
                preds = (probs > 0.5).astype(int)
                
                all_targets.extend(targets.cpu().numpy())
                all_probs.extend(probs)
                all_preds.extend(preds)
                
        epoch_val_loss = val_loss / len(test_loader.dataset)
        val_losses.append(epoch_val_loss)
        
        acc = accuracy_score(all_targets, all_preds)
        print(f"Epoch {epoch+1}/{epochs} - Train Loss: {epoch_loss:.4f} - Val Loss: {epoch_val_loss:.4f} - Val Acc: {acc:.4f}")
        
        if epoch_val_loss < best_loss:
            best_loss = epoch_val_loss
            torch.save(model.state_dict(), os.path.join(models_dir, "cnn_v1.pth"))
            
    # Calculate final metrics on the best model
    model.load_state_dict(torch.load(os.path.join(models_dir, "cnn_v1.pth")))
    model.eval()
    
    all_targets = []
    all_probs = []
    all_preds = []
    
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.sigmoid(outputs).cpu().numpy()
            preds = (probs > 0.5).astype(int)
            
            all_targets.extend(targets.numpy())
            all_probs.extend(probs)
            all_preds.extend(preds)
            
    acc = accuracy_score(all_targets, all_preds)
    prec = precision_score(all_targets, all_preds, zero_division=0)
    rec = recall_score(all_targets, all_preds, zero_division=0)
    f1 = f1_score(all_targets, all_preds, zero_division=0)
    try:
        auc = roc_auc_score(all_targets, all_probs)
    except ValueError:
        auc = 0.5
        
    metrics = {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "roc_auc": auc,
        "train_losses": train_losses,
        "val_losses": val_losses
    }
    
    # We will merge this with model_metadata.json
    metadata_path = os.path.join(models_dir, "model_metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            full_metadata = json.load(f)
    else:
        full_metadata = {}
        
    full_metadata["CNN"] = metrics
    
    with open(metadata_path, "w") as f:
        json.dump(full_metadata, f, indent=4)
        
    print("CNN Training complete.")

if __name__ == "__main__":
    train_cnn()
