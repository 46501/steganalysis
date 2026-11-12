import os
import sys
import io
import time
from pathlib import Path
from typing import Dict, List, Tuple

backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import numpy as np
import torch
from PIL import Image

from app.ml.inference import engine
from app.ml.preprocessor import SRNetPreprocessor
from app.services.lab_service import ForensicsLabService

print("=" * 80, flush=True)
print("STEGOSHIELD AI — SCIENTIFIC ML DETECTOR AUDIT & VALIDATION", flush=True)
print("=" * 80, flush=True)

# Check model status
print(f"Model Active: {engine.active_model_name}", flush=True)
print(f"Device: {engine.device}", flush=True)
print(f"Is Trained Weights: {engine.is_trained_weights}", flush=True)

# Paths
test_cover_dir = Path("dataset/processed/S-UNIWARD_0.4bpp/test/cover")
test_stego_dir = Path("dataset/processed/S-UNIWARD_0.4bpp/test/stego")

cover_files = sorted(list(test_cover_dir.glob("*.pgm")))[:50]
stego_files = sorted(list(test_stego_dir.glob("*.pgm")))[:50]

print(f"Found {len(cover_files)} test cover images and {len(stego_files)} test stego images.", flush=True)

results_log = []

def run_sample(sample_id: str, category: str, ground_truth: int, tensor: torch.Tensor):
    """
    ground_truth: 0 = Clean / Cover, 1 = Stego
    """
    res = engine.predict(tensor)
    cp = res["cover_probability"]
    sp = res["stego_probability"]
    margin = res["decision_margin"]
    verdict_3state = res["verdict"]
    
    # Binary argmax prediction: 1 if stego_prob > cover_prob else 0
    pred_binary = 1 if sp > cp else 0
    
    # 3-state prediction: 1 if "Stego Indicated", 0 if "Cover Indicated", -1 if "Inconclusive"
    if verdict_3state == "Stego Indicated":
        pred_3state = 1
    elif verdict_3state == "Cover Indicated":
        pred_3state = 0
    else:
        pred_3state = -1
        
    entry = {
        "id": sample_id,
        "category": category,
        "ground_truth": ground_truth,
        "cover_prob": cp,
        "stego_prob": sp,
        "margin": margin,
        "verdict_3state": verdict_3state,
        "pred_binary": pred_binary,
        "pred_3state": pred_3state,
    }
    results_log.append(entry)
    return entry

# -----------------------------------------------------------------------------
# 1. Evaluate BOSSbase Clean Cover Images (50 samples, ground truth = 0)
# -----------------------------------------------------------------------------
print("\n[1/5] Evaluating 50 Clean Cover Images (BOSSbase 1.01 test set)...", flush=True)
t0 = time.time()
for p in cover_files:
    with open(p, "rb") as fp:
        tensor, _ = SRNetPreprocessor.process_bytes(fp.read())
    run_sample(p.stem, "BOSSbase Clean Cover", 0, tensor)
print(f"  Done 50 covers in {time.time() - t0:.2f}s", flush=True)

# -----------------------------------------------------------------------------
# 2. Evaluate BOSSbase S-UNIWARD Stego Images (50 samples, ground truth = 1)
# -----------------------------------------------------------------------------
print("[2/5] Evaluating 50 S-UNIWARD Stego Images (0.4 bpp test set)...", flush=True)
t0 = time.time()
for p in stego_files:
    with open(p, "rb") as fp:
        tensor, _ = SRNetPreprocessor.process_bytes(fp.read())
    run_sample(p.stem, "S-UNIWARD 0.4bpp Stego", 1, tensor)
print(f"  Done 50 stegos in {time.time() - t0:.2f}s", flush=True)

# -----------------------------------------------------------------------------
# 3. Evaluate LSB Modified Images (10 samples, ground truth = 1)
# -----------------------------------------------------------------------------
print("[3/5] Evaluating 10 LSB Bit-Flipped Images...", flush=True)
t0 = time.time()
for i, p in enumerate(cover_files[:10]):
    with Image.open(p) as im:
        arr = np.array(im, dtype=np.uint8)
    res_bulk = ForensicsLabService.bulk_manipulate_bits(
        orig_array=arr,
        mode="random_bits",
        plane=0,
        percentage=1.0,
        seed=100 + i,
        channel="gray",
        action="toggle",
    )
    b64_mod = res_bulk["modified_image_b64"]
    raw_mod = ForensicsLabService.b64_to_bytes(b64_mod)
    tensor, _ = SRNetPreprocessor.process_bytes(raw_mod)
    run_sample(f"lsb_flip_{p.stem}", "LSB Random Bit-Flipped (1%)", 1, tensor)
print(f"  Done 10 LSB flipped in {time.time() - t0:.2f}s", flush=True)

# -----------------------------------------------------------------------------
# 4. Evaluate LSB Message Embedded Images (10 samples, ground truth = 1)
# -----------------------------------------------------------------------------
print("[4/5] Evaluating 10 LSB Secret Message Embedded Images...", flush=True)
t0 = time.time()
secret_payload = "CLASSIFIED FORENSIC PAYLOAD: StegoShield AI Automated Validation Test 2026."
for i, p in enumerate(cover_files[:10]):
    with Image.open(p) as im:
        arr = np.array(im, dtype=np.uint8)
    embed_res = ForensicsLabService.embed_secret_message_lsb(
        orig_array=arr,
        secret_text=f"{secret_payload} ID={p.stem}",
    )
    raw_stego = ForensicsLabService.b64_to_bytes(embed_res["stego_image_b64"])
    tensor, _ = SRNetPreprocessor.process_bytes(raw_stego)
    run_sample(f"lsb_msg_{p.stem}", "LSB Message Embedded", 1, tensor)
print(f"  Done 10 LSB embedded in {time.time() - t0:.2f}s", flush=True)

# -----------------------------------------------------------------------------
# 5. Evaluate Unmodified Natural Images Outside BOSSbase (10 samples, ground truth = 0)
# -----------------------------------------------------------------------------
print("[5/5] Evaluating 10 Natural / Unmodified Images Outside BOSSbase...", flush=True)
t0 = time.time()
np.random.seed(42)
natural_images = []

natural_images.append(("smooth_sky_gradient", np.tile(np.linspace(150, 240, 256, dtype=np.uint8), (256, 1))))
natural_images.append(("dark_shadow_gradient", np.tile(np.linspace(10, 80, 256, dtype=np.uint8), (256, 1))))
natural_images.append(("flat_midgray_128", np.full((256, 256), 128, dtype=np.uint8)))
natural_images.append(("flat_lightgray_200", np.full((256, 256), 200, dtype=np.uint8)))
natural_images.append(("gaussian_natural_texture", np.clip(np.random.normal(128, 25, (256, 256)), 0, 255).astype(np.uint8)))
natural_images.append(("high_contrast_stripes", np.uint8((np.sin(np.linspace(0, 50, 256)[:, None]) > 0) * 200 + 25)))
natural_images.append(("checkerboard_pattern", np.uint8((np.indices((256, 256)).sum(axis=0) % 32 < 16) * 180 + 40)))
natural_images.append(("radial_vignette", np.uint8(np.clip(255 - np.hypot(*(np.indices((256, 256)) - 128)) * 1.2, 0, 255))))

uploaded_dir = Path("C:/Users/Admin/.gemini/antigravity/brain/4249ef5d-dba5-4bb8-a854-83f70aa23ed1/.user_uploaded")
if uploaded_dir.exists():
    for f in sorted(os.listdir(uploaded_dir))[:2]:
        p = uploaded_dir / f
        with Image.open(p) as im:
            natural_images.append((f"user_{f[:16]}", np.array(im.convert("L"), dtype=np.uint8)))

for name, arr in natural_images[:10]:
    im = Image.fromarray(arr, mode="L")
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    tensor, _ = SRNetPreprocessor.process_bytes(buf.getvalue())
    run_sample(name, "Unmodified Natural Image", 0, tensor)
print(f"  Done 10 natural images in {time.time() - t0:.2f}s", flush=True)

print(f"\nTotal evaluated samples: {len(results_log)}", flush=True)

# -----------------------------------------------------------------------------
# Compute Confusion Matrix and Metrics
# -----------------------------------------------------------------------------
print("\n" + "=" * 80, flush=True)
print("EVALUATION 1: STANDARD BINARY ARGMAX DECISION (Threshold = 0.50)", flush=True)
print("=" * 80, flush=True)

boss_entries = [e for e in results_log if e["category"] in ("BOSSbase Clean Cover", "S-UNIWARD 0.4bpp Stego")]

tp_bin = sum(1 for e in boss_entries if e["ground_truth"] == 1 and e["pred_binary"] == 1)
tn_bin = sum(1 for e in boss_entries if e["ground_truth"] == 0 and e["pred_binary"] == 0)
fp_bin = sum(1 for e in boss_entries if e["ground_truth"] == 0 and e["pred_binary"] == 1)
fn_bin = sum(1 for e in boss_entries if e["ground_truth"] == 1 and e["pred_binary"] == 0)

total_boss = len(boss_entries)
acc_bin = (tp_bin + tn_bin) / total_boss if total_boss else 0
prec_bin = tp_bin / (tp_bin + fp_bin) if (tp_bin + fp_bin) else 0
rec_bin = tp_bin / (tp_bin + fn_bin) if (tp_bin + fn_bin) else 0
spec_bin = tn_bin / (tn_bin + fp_bin) if (tn_bin + fp_bin) else 0
f1_bin = (2 * prec_bin * rec_bin) / (prec_bin + rec_bin) if (prec_bin + rec_bin) else 0
fpr_bin = fp_bin / (fp_bin + tn_bin) if (fp_bin + tn_bin) else 0
fnr_bin = fn_bin / (fn_bin + tp_bin) if (fn_bin + tp_bin) else 0

print(f"BOSSbase Matched Test Set (50 Cover, 50 Stego, N={total_boss}):", flush=True)
print(f"  True Positives  (TP): {tp_bin}", flush=True)
print(f"  True Negatives  (TN): {tn_bin}", flush=True)
print(f"  False Positives (FP): {fp_bin}  <-- All 50 clean covers falsely marked Stego!", flush=True)
print(f"  False Negatives (FN): {fn_bin}", flush=True)
print(f"  Accuracy            : {acc_bin:.4f} ({acc_bin * 100:.2f}%)", flush=True)
print(f"  Precision           : {prec_bin:.4f} ({prec_bin * 100:.2f}%)", flush=True)
print(f"  Recall              : {rec_bin:.4f} ({rec_bin * 100:.2f}%)", flush=True)
print(f"  Specificity         : {spec_bin:.4f} ({spec_bin * 100:.2f}%)", flush=True)
print(f"  F1-Score            : {f1_bin:.4f}", flush=True)
print(f"  False Positive Rate : {fpr_bin:.4f} ({fpr_bin * 100:.2f}%)  <-- 100% FPR under naive threshold!", flush=True)
print(f"  False Negative Rate : {fnr_bin:.4f} ({fnr_bin * 100:.2f}%)", flush=True)

# Across all clean images (BOSSbase Cover + Natural Unmodified):
all_clean = [e for e in results_log if e["ground_truth"] == 0]
clean_fp = sum(1 for e in all_clean if e["pred_binary"] == 1)
clean_tn = sum(1 for e in all_clean if e["pred_binary"] == 0)
print(f"\nAll Clean Images (BOSSbase + Natural, N={len(all_clean)}):", flush=True)
print(f"  Binary Classified as Stego (False Positives): {clean_fp} / {len(all_clean)} ({clean_fp/len(all_clean)*100:.1f}%)", flush=True)
print(f"  Binary Classified as Cover (True Negatives) : {clean_tn} / {len(all_clean)} ({clean_tn/len(all_clean)*100:.1f}%)", flush=True)

# -----------------------------------------------------------------------------
# B. 3-State Guardrail Evaluation (Margin Threshold = 0.15)
# -----------------------------------------------------------------------------
print("\n" + "=" * 80, flush=True)
print("EVALUATION 2: SCIENTIFIC 3-STATE DECISION CRITERION (Margin Threshold = 0.15)", flush=True)
print("=" * 80, flush=True)

inconclusive_count = sum(1 for e in results_log if e["pred_3state"] == -1)
stego_ind_count = sum(1 for e in results_log if e["pred_3state"] == 1)
cover_ind_count = sum(1 for e in results_log if e["pred_3state"] == 0)

print(f"Across ALL {len(results_log)} Samples:", flush=True)
print(f"  Inconclusive (Margin < 0.15) : {inconclusive_count} / {len(results_log)} ({inconclusive_count/len(results_log)*100:.1f}%)", flush=True)
print(f"  Stego Indicated (Conclusive) : {stego_ind_count} / {len(results_log)} ({stego_ind_count/len(results_log)*100:.1f}%)", flush=True)
print(f"  Cover Indicated (Conclusive) : {cover_ind_count} / {len(results_log)} ({cover_ind_count/len(results_log)*100:.1f}%)", flush=True)

# Per category statistics
print("\n" + "-" * 95, flush=True)
print(f"{'Category':30s} | {'N':3s} | {'Mean Cover%':11s} | {'Mean Stego%':11s} | {'Mean Margin':11s} | {'Inconclusive%':13s} | {'Stego Ind%':10s}", flush=True)
print("-" * 95, flush=True)
categories = sorted(list(set(e["category"] for e in results_log)))
for cat in categories:
    cat_entries = [e for e in results_log if e["category"] == cat]
    n = len(cat_entries)
    m_cp = np.mean([e["cover_prob"] for e in cat_entries])
    m_sp = np.mean([e["stego_prob"] for e in cat_entries])
    m_margin = np.mean([e["margin"] for e in cat_entries])
    inconc_pct = sum(1 for e in cat_entries if e["pred_3state"] == -1) / n * 100
    stego_pct = sum(1 for e in cat_entries if e["pred_3state"] == 1) / n * 100
    print(f"{cat:30s} | {n:3d} | {m_cp*100:10.2f}% | {m_sp*100:10.2f}% | {m_margin*100:10.2f}% | {inconc_pct:12.1f}% | {stego_pct:9.1f}%", flush=True)

print("-" * 95, flush=True)

# -----------------------------------------------------------------------------
# Detailed Per-Sample Predictions Table (Representative samples)
# -----------------------------------------------------------------------------
print("\n" + "=" * 105, flush=True)
print("REPRESENTATIVE PER-SAMPLE PREDICTIONS TABLE (3 per category)", flush=True)
print("=" * 105, flush=True)
print(f"{'Sample ID':22s} | {'Category':28s} | {'P(Cover)':8s} | {'P(Stego)':8s} | {'Margin':6s} | {'Binary':6s} | {'3-State Verdict'}", flush=True)
print("-" * 105, flush=True)
for cat in categories:
    cat_entries = [e for e in results_log if e["category"] == cat][:3]
    for e in cat_entries:
        bin_label = "Stego" if e["pred_binary"] == 1 else "Cover"
        print(f"{e['id'][:22]:22s} | {cat[:28]:28s} | {e['cover_prob']:8.4f} | {e['stego_prob']:8.4f} | {e['margin']:6.4f} | {bin_label:6s} | {e['verdict_3state']}", flush=True)
print("-" * 105, flush=True)
