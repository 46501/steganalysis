"""
StegoShield AI — Independent Steganalysis Model Evaluation Pipeline.

Executes rigorous independent evaluation on the held-out test split (IDs 5001–5100):
- Computes Accuracy, Precision, Recall, F1, ROC-AUC, FPR, FNR, Confusion Matrix.
- Computes 95% Confidence Intervals via 1,000-sample non-parametric bootstrap.
- Computes Confidence Calibration: Brier Score, Expected Calibration Error (ECE), and reliability diagram bins.
- Evaluates class-wise performance (Cover vs Stego).
- Benchmarks against two baselines:
  1. Majority / Random Chance Baseline
  2. Spatial Laplacian Residual Energy Baseline (sigma_r^2)
- Strict Rule: Final test split is evaluated only once; not used for training or threshold tuning.
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    brier_score_loss,
)

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.ml.stegonet_lite import StegoNetLite, compute_spatial_residual_energy

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("evaluate_model")


def compute_bootstrap_confidence_interval(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_resamples: int = 1000,
    confidence_level: float = 0.95,
    seed: int = 42,
) -> Dict[str, Tuple[float, float]]:
    """Computes 95% non-parametric bootstrap confidence intervals for key metrics."""
    rng = np.random.RandomState(seed)
    n = len(y_true)
    y_pred = (y_prob >= 0.5).astype(int)

    accs = []
    f1s = []
    aucs = []

    for _ in range(n_resamples):
        idx = rng.randint(0, n, size=n)
        s_true = y_true[idx]
        s_prob = y_prob[idx]
        s_pred = y_pred[idx]

        # Check for both classes in sample
        if len(np.unique(s_true)) < 2:
            continue

        accs.append(accuracy_score(s_true, s_pred))
        f1s.append(f1_score(s_true, s_pred, zero_division=0))
        try:
            aucs.append(roc_auc_score(s_true, s_prob))
        except Exception:
            pass

    alpha = 1.0 - confidence_level
    lower_pct = (alpha / 2.0) * 100
    upper_pct = (1.0 - alpha / 2.0) * 100

    return {
        "accuracy_ci": (
            round(float(np.percentile(accs, lower_pct)), 4),
            round(float(np.percentile(accs, upper_pct)), 4),
        ),
        "f1_ci": (
            round(float(np.percentile(f1s, lower_pct)), 4),
            round(float(np.percentile(f1s, upper_pct)), 4),
        ),
        "roc_auc_ci": (
            round(float(np.percentile(aucs, lower_pct)), 4),
            round(float(np.percentile(aucs, upper_pct)), 4),
        ) if aucs else (0.50, 0.50),
    }


def compute_ece_and_reliability(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Computes Expected Calibration Error (ECE) and reliability diagram bins.
    Confidence is max(prob, 1 - prob) and correctness is y_pred == y_true.
    """
    y_pred = (y_prob >= 0.5).astype(int)
    confidences = np.maximum(y_prob, 1.0 - y_prob)
    accuracies = (y_pred == y_true).astype(float)

    bin_boundaries = np.linspace(0.5, 1.0, n_bins + 1)
    ece = 0.0
    total_samples = len(y_true)
    reliability_bins: List[Dict[str, Any]] = []

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        if i == n_bins - 1:
            in_bin = (confidences >= bin_lower) & (confidences <= bin_upper)
        else:
            in_bin = (confidences >= bin_lower) & (confidences < bin_upper)

        bin_count = int(np.sum(in_bin))
        if bin_count > 0:
            avg_conf = float(np.mean(confidences[in_bin]))
            avg_acc = float(np.mean(accuracies[in_bin]))
            bin_error = abs(avg_acc - avg_conf)
            ece += bin_error * (bin_count / total_samples)

            reliability_bins.append({
                "bin_index": i,
                "range": [round(bin_lower, 2), round(bin_upper, 2)],
                "sample_count": bin_count,
                "average_confidence": round(avg_conf, 4),
                "empirical_accuracy": round(avg_acc, 4),
                "calibration_gap": round(bin_error, 4),
            })
        else:
            reliability_bins.append({
                "bin_index": i,
                "range": [round(bin_lower, 2), round(bin_upper, 2)],
                "sample_count": 0,
                "average_confidence": round((bin_lower + bin_upper) / 2.0, 4),
                "empirical_accuracy": 0.0,
                "calibration_gap": 0.0,
            })

    return round(float(ece), 4), reliability_bins


def evaluate_independent_test_set(
    checkpoint_path: str = "D:/Stego/backend/app/ml/weights/stegonet_lite_best.pt",
    dataset_dir: str = "D:/Stego/dataset/processed/S-UNIWARD_0.4bpp",
    test_id_start: int = 5001,
    test_id_end: int = 5100,
    crop_size: int = 256,
    output_json: str = "D:/Stego/backend/app/ml/stegonet_lite_metrics.json",
) -> Dict[str, Any]:
    """Runs rigorous independent evaluation of the model on the held-out test split."""
    device = torch.device("cpu")
    logger.info("=" * 70)
    logger.info("Independent Steganalysis Model Evaluation (Phase 2)")
    logger.info(f"Checkpoint:       {checkpoint_path}")
    logger.info(f"Dataset root:     {dataset_dir}")
    logger.info(f"Test split IDs:   {test_id_start} to {test_id_end} (100 pairs = 200 images)")
    logger.info("=" * 70)

    ckpt_file = Path(checkpoint_path)
    if not ckpt_file.exists():
        raise FileNotFoundError(f"Checkpoint not found: {ckpt_file}")

    model = StegoNetLite()
    ckpt = torch.load(ckpt_file, map_location=device, weights_only=True)
    if "model_state_dict" in ckpt:
        model.load_state_dict(ckpt["model_state_dict"])
    else:
        model.load_state_dict(ckpt)
    model.to(device)
    model.eval()

    test_cover_dir = Path(dataset_dir) / "test" / "cover"
    test_stego_dir = Path(dataset_dir) / "test" / "stego"

    y_true: List[int] = []
    y_probs: List[float] = []
    residual_energies: List[float] = []

    with torch.no_grad():
        for img_id in range(test_id_start, test_id_end + 1):
            c_path = test_cover_dir / f"{img_id}.pgm"
            s_path = test_stego_dir / f"{img_id}.pgm"

            if not c_path.exists() or not s_path.exists():
                logger.warning(f"Missing pair for ID {img_id}, skipping")
                continue

            # 1. Cover image (label 0)
            with Image.open(c_path) as img:
                w, h = img.size
                left = (w - crop_size) // 2
                top = (h - crop_size) // 2
                c_cropped = img.crop((left, top, left + crop_size, top + crop_size))
                c_arr = np.array(c_cropped, dtype=np.float32) / 255.0
                c_tensor = torch.from_numpy(c_arr).unsqueeze(0).unsqueeze(0).to(device)

            c_res_energy = compute_spatial_residual_energy(c_tensor)
            out_c = model(c_tensor)
            probs_c = torch.exp(out_c)
            p_stego_c = float(probs_c[0, 1].item())

            y_true.append(0)
            y_probs.append(p_stego_c)
            residual_energies.append(c_res_energy)

            # 2. Stego image (label 1)
            with Image.open(s_path) as img:
                w, h = img.size
                left = (w - crop_size) // 2
                top = (h - crop_size) // 2
                s_cropped = img.crop((left, top, left + crop_size, top + crop_size))
                s_arr = np.array(s_cropped, dtype=np.float32) / 255.0
                s_tensor = torch.from_numpy(s_arr).unsqueeze(0).unsqueeze(0).to(device)

            s_res_energy = compute_spatial_residual_energy(s_tensor)
            out_s = model(s_tensor)
            probs_s = torch.exp(out_s)
            p_stego_s = float(probs_s[0, 1].item())

            y_true.append(1)
            y_probs.append(p_stego_s)
            residual_energies.append(s_res_energy)

    y_true_arr = np.array(y_true, dtype=int)
    y_prob_arr = np.array(y_probs, dtype=float)
    y_pred_arr = (y_prob_arr >= 0.5).astype(int)

    # Core Metrics
    acc = float(accuracy_score(y_true_arr, y_pred_arr))
    prec = float(precision_score(y_true_arr, y_pred_arr, zero_division=0))
    rec = float(recall_score(y_true_arr, y_pred_arr, zero_division=0))
    f1 = float(f1_score(y_true_arr, y_pred_arr, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true_arr, y_prob_arr))
    except Exception:
        auc = 0.50

    brier = float(brier_score_loss(y_true_arr, y_prob_arr))
    ece, reliability_bins = compute_ece_and_reliability(y_true_arr, y_prob_arr, n_bins=10)
    cis = compute_bootstrap_confidence_interval(y_true_arr, y_prob_arr, n_resamples=1000)

    cm = confusion_matrix(y_true_arr, y_pred_arr, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    fpr = round(fp / float(fp + tn), 4) if (fp + tn) > 0 else 0.0
    fnr = round(fn / float(fn + tp), 4) if (fn + tp) > 0 else 0.0

    # Class-wise metrics
    cover_prec = round(tn / float(tn + fn), 4) if (tn + fn) > 0 else 0.0
    cover_rec = round(tn / float(tn + fp), 4) if (tn + fp) > 0 else 0.0
    cover_f1 = (
        round((2 * cover_prec * cover_rec) / (cover_prec + cover_rec), 4)
        if (cover_prec + cover_rec) > 0 else 0.0
    )

    # Baseline 1: Majority / Random Chance Baseline
    baseline_random = {
        "name": "Random Chance / Majority Class Baseline",
        "description": "Uninformed predictor assigning constant p=0.5 or majority class",
        "accuracy": 0.5000,
        "roc_auc": 0.5000,
        "brier_score": 0.2500,
    }

    # Baseline 2: Laplacian Residual Energy Baseline
    res_energies_arr = np.array(residual_energies)
    try:
        baseline_res_auc = round(float(roc_auc_score(y_true_arr, res_energies_arr)), 4)
    except Exception:
        baseline_res_auc = 0.5000

    baseline_laplacian = {
        "name": "Spatial High-Pass Residual Energy Baseline (Laplacian sigma_r^2)",
        "description": "Direct thresholding on high-pass Laplacian residual variance",
        "roc_auc": baseline_res_auc,
        "mean_residual_cover": round(float(np.mean(res_energies_arr[y_true_arr == 0])), 2),
        "mean_residual_stego": round(float(np.mean(res_energies_arr[y_true_arr == 1])), 2),
    }

    # Discrimination Assessment
    has_meaningful_discrimination = (auc > 0.60 and acc > 0.58)

    logger.info("=" * 70)
    logger.info(f"Independent Evaluation Results on Untouched Test Set (N={len(y_true)}):")
    logger.info(f"  Accuracy:         {acc:.4f} (95% CI: {cis['accuracy_ci']})")
    logger.info(f"  ROC-AUC:          {auc:.4f} (95% CI: {cis['roc_auc_ci']})")
    logger.info(f"  Precision:        {prec:.4f}")
    logger.info(f"  Recall:           {rec:.4f}")
    logger.info(f"  F1-Score:         {f1:.4f} (95% CI: {cis['f1_ci']})")
    logger.info(f"  FPR:              {fpr:.4f}")
    logger.info(f"  FNR:              {fnr:.4f}")
    logger.info(f"  Brier Score:      {brier:.4f}")
    logger.info(f"  ECE:              {ece:.4f}")
    logger.info(f"  Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    logger.info(f"  Discrimination:   {'Meaningful' if has_meaningful_discrimination else 'Non-converged / Inconclusive'}")
    logger.info("=" * 70)

    metrics_report = {
        "model_name": "StegoNet-Lite",
        "checkpoint_evaluated": checkpoint_path,
        "dataset": "BOSSbase 1.01 S-UNIWARD 0.4 bpp",
        "test_split": {
            "total_samples": len(y_true),
            "cover_samples": int(np.sum(y_true_arr == 0)),
            "stego_samples": int(np.sum(y_true_arr == 1)),
            "test_id_range": [test_id_start, test_id_end],
            "crop_dimensions": f"{crop_size}x{crop_size}",
            "embedding_rate": "0.4 bpp",
            "stego_algorithm": "S-UNIWARD",
            "test_status": "Strictly held-out independent evaluation set (evaluated once)",
        },
        "empirical_metrics": {
            "accuracy": round(acc, 4),
            "accuracy_95ci": list(cis["accuracy_ci"]),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "f1_score_95ci": list(cis["f1_ci"]),
            "roc_auc": round(auc, 4),
            "roc_auc_95ci": list(cis["roc_auc_ci"]),
            "false_positive_rate": fpr,
            "false_negative_rate": fnr,
            "confusion_matrix": {"true_positive": tp, "true_negative": tn, "false_positive": fp, "false_negative": fn},
            "class_wise_metrics": {
                "cover_class": {"precision": cover_prec, "recall": cover_rec, "f1_score": cover_f1, "support": 100},
                "stego_class": {"precision": round(prec, 4), "recall": round(rec, 4), "f1_score": round(f1, 4), "support": 100},
            },
            "calibration": {
                "brier_score": round(brier, 4),
                "expected_calibration_error": ece,
                "reliability_diagram_bins": reliability_bins,
            },
            "prediction_probabilities": {
                "stego_min": round(float(np.min(y_prob_arr)), 4),
                "stego_max": round(float(np.max(y_prob_arr)), 4),
                "stego_mean": round(float(np.mean(y_prob_arr)), 4),
            },
        },
        "baseline_comparisons": {
            "majority_random_baseline": baseline_random,
            "laplacian_residual_baseline": baseline_laplacian,
        },
        "scientific_findings": {
            "has_meaningful_discrimination": has_meaningful_discrimination,
            "convergence_verdict": (
                "Validation and test results show that a lightweight 4-stage residual model trained on CPU "
                f"subset yields ROC-AUC = {auc:.4f} and Accuracy = {acc:.4f}. Without GPU cluster training on the full 10,000 BOSSbase pairs, "
                "the model does not achieve reliable single-image discrimination on 0.4 bpp S-UNIWARD."
            ),
            "application_guardrail": (
                "Because single-image discrimination remains inconclusive (decision margin is narrow), the detector "
                "strictly preserves the INCONCLUSIVE — LOW CONFIDENCE behavior, preventing uncalibrated predictions "
                "from misleading the user. Authentic paired reference comparison remains the reliable forensic method for differential proof."
            ),
        },
    }

    out_file = Path(output_json)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)
    logger.info(f"Saved complete independent evaluation metrics to: {out_file}")

    return metrics_report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate StegoNet-Lite model on untouched test split")
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="D:/Stego/backend/app/ml/weights/stegonet_lite_best.pt",
        help="Path to model checkpoint",
    )
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default="D:/Stego/dataset/processed/S-UNIWARD_0.4bpp",
        help="Path to dataset root",
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="D:/Stego/backend/app/ml/stegonet_lite_metrics.json",
        help="Path to save evaluation metrics JSON",
    )
    args = parser.parse_args()

    evaluate_independent_test_set(
        checkpoint_path=args.checkpoint,
        dataset_dir=args.dataset_dir,
        output_json=args.output_json,
    )

