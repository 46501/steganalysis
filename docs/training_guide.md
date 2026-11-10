# SRNet Steganalysis Training Guide

A complete operational guide for training, evaluating, and checkpointing the 12-layer **SRNet** (Spatial Rich Model-based Residual Network) architecture on the **S-UNIWARD 0.4 bpp** BOSSbase dataset.

---

## 1. Environment Setup

### 1.1 Prerequisites
- **Python**: Python 3.10+ (tested on Python 3.12 and 3.14)
- **PyTorch**: PyTorch 2.2+ (CPU or CUDA enabled)
- **Dependencies**: Listed in `backend/requirements.txt`

Install required dependencies:
```bash
pip install -r backend/requirements.txt
```

### 1.2 GPU & Hardware Detection
The training engine automatically detects whether CUDA is available:
- **CUDA GPU Available**: Utilizes `cuda:0`, activates pinned memory in DataLoaders (`pin_memory=True`), and selects high-throughput batch sizes (e.g. 16 pairs = 32 images).
- **CPU Fallback**: Gracefully operates on CPU, disables pinned memory, and selects conservative batch sizes (e.g. 2 to 4 pairs = 4 to 8 images) to prevent memory saturation.

To verify CUDA availability from the command line:
```bash
python -c "import torch; print('CUDA Available:', torch.cuda.is_available(), '| Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

---

## 2. Dataset Structure

The dataset loader expects the standard 10,000-pair S-UNIWARD dataset partitioned into isolated splits:

```text
D:\Stego\dataset\processed\S-UNIWARD_0.4bpp\
├── train\
│   ├── cover\          # 4,000 files (1.pgm .. 4000.pgm) [Label 0]
│   └── stego\          # 4,000 files (1.pgm .. 4000.pgm) [Label 1]
├── val\
│   ├── cover\          # 1,000 files (4001.pgm .. 5000.pgm) [Label 0]
│   └── stego\          # 1,000 files (4001.pgm .. 5000.pgm) [Label 1]
└── test\
    ├── cover\          # 5,000 files (5001.pgm .. 10000.pgm) [Label 0] [ISOLATED]
    └── stego\          # 5,000 files (5001.pgm .. 10000.pgm) [Label 1] [ISOLATED]
```

### 2.1 Paired Mini-Batch Processing
Steganalysis networks are sensitive to batch normalization statistics. To eliminate covariate shift and BN bias between classes:
- Each batch of size $B$ loads $B$ covers and $B$ corresponding stegos.
- Images are stacked to form a mini-batch of $2B$ images with exact 50/50 balance.
- Images are normalized directly from raw P5 bytes into $[0.0, 1.0]$ float32 tensors of shape `(1, 512, 512)`.
- No image resizing is applied to preserve delicate $\pm 1$ stego pixel modifications.

---

## 3. Training Commands

The training pipeline entry point is located at `backend/training/train.py`.

### 3.1 Verification Smoke Test
Before starting full multi-epoch training, run a quick smoke test (1 epoch, 2 training batches, 1 validation batch) to verify pipeline integrity:
```powershell
python backend/training/train.py --smoke-test
```

### 3.2 Standard Training Execution
Launch full training using default hyper-parameters (Adamax optimizer, $lr=0.001$, step decay every 30 epochs):
```powershell
python backend/training/train.py --epochs 50 --lr 0.001
```

### 3.3 Custom GPU Configuration
On high-VRAM systems (8GB+ GPU), increase batch size and worker processes:
```powershell
python backend/training/train.py --batch-size 16 --num-workers 4 --epochs 50
```

### 3.4 Resume from Interrupted Training
If training was interrupted, resume from the latest checkpoint:
```powershell
python backend/training/train.py --resume
```

---

## 4. Configuration Options & CLI Flags

| Flag | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `--dataset-dir` | `str` | `D:\Stego\dataset\processed\S-UNIWARD_0.4bpp` | Path to dataset containing train, val, and test splits |
| `--checkpoints-dir` | `str` | `D:\Stego\backend\checkpoints` | Target directory for saving model checkpoints |
| `--logs-dir` | `str` | `D:\Stego\backend\logs` | Target directory for text logs and history JSON |
| `--epochs` | `int` | `50` | Total number of training epochs |
| `--batch-size` | `int` | Auto (16 GPU / 2 CPU) | Number of image pairs per mini-batch ($2B$ images) |
| `--lr` | `float` | `0.001` | Initial learning rate for Adamax optimizer |
| `--lr-step-size`| `int` | `30` | Epoch interval for $10\times$ learning rate decay |
| `--patience` | `int` | `15` | Early stopping patience (consecutive epochs without val improvement) |
| `--seed` | `int` | `42` | Global random seed for deterministic execution |
| `--num-workers` | `int` | `0` | DataLoader subprocess count (0 recommended on Windows) |
| `--resume` | `flag`| `False` | Resume training from `latest_checkpoint.pt` |
| `--smoke-test` | `flag`| `False` | Run quick 1-epoch minimal-batch smoke test |

---

## 5. Checkpoints & Logging Structure

All training artifacts are organized under `backend/`:

```text
backend/
├── checkpoints/
│   ├── best_checkpoint.pt       # Checkpoint with highest validation accuracy
│   └── latest_checkpoint.pt     # Most recent epoch checkpoint for resuming
└── logs/
    ├── training.log             # Text log with timestamped metrics per epoch
    └── training_history.json    # Structured JSON log of loss, accuracy, and F1 history
```

### 5.1 Checkpoint Data Dictionary
Every saved checkpoint contains:
- `epoch`: Current completed epoch index.
- `model_state_dict`: Weights and biases of all 12 SRNet layers.
- `optimizer_state_dict`: Adamax internal moments and parameter states.
- `scheduler_state_dict`: Learning rate step counter.
- `best_val_acc`: Best validation accuracy achieved so far.
- `best_val_loss`: Best validation loss achieved so far.
- `train_metrics`: Training loss, accuracy, and duration.
- `val_metrics`: Validation loss, accuracy, precision, recall, and F1-score.
- `seed`: Random seed used for generation.
- `timestamp`: Epoch completion timestamp.

---

## 6. Evaluation & Test Set Isolation

To prevent test-set data leakage and overfitting:
- **Strict Isolation**: The 5,000 test pairs (IDs `5001` to `10000`) are **never evaluated** during the training or model selection loops.
- **Model Selection**: Only the validation split (`val/`) is used for tracking best metrics and early stopping.
- **Final Evaluation**: Once training is fully completed, load `best_checkpoint.pt` and evaluate once on the test DataLoader.

---

## 7. Running Automated Tests

Run the complete automated pytest suite:
```powershell
python -m pytest backend/tests -v
```

This verifies:
1. Binary P5 PGM reading directly into normalized float32 tensors.
2. Complete split isolation between Train, Val, and Test.
3. Correct binary labels (Cover = 0, Stego = 1).
4. Balanced paired batch collation.
5. SRNet forward pass on $512 \times 512$ inputs.
6. Negative Log-Likelihood loss calculation and gradient backpropagation.
7. Atomic checkpoint save, load, and parameter equality.
8. Resume logic and epoch resumption.

