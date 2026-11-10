# System Architecture & Technical Specifications

## 1. System Overview

```text
[ React + Vite Client ]
          │
          │ Multipart / JSON HTTP
          ▼
    [ FastAPI API ]
          │
    ┌─────┴───────────────────────┐
    ▼                             ▼
[ Preprocessor ]          [ PostgreSQL DB ]
    │                             │
    ▼ (Tensor 1x1x256x256)        │
[ PyTorch SRNet Engine ]          │
    │                             │
    └─────────► [ Result Service ] ◄
```

## 2. End-to-End Steganalysis Pipeline

1. **Ingestion & Validation**:
   - The user submits an image (`.png`, `.bmp`, `.pgm`, `.jpg`) through the frontend UI or REST API.
   - The backend validates the magic byte header (MIME type) and file size constraints.
   - An image hash (SHA-256) is computed for deduplication and audit tracking.

2. **Preprocessing**:
   - The image is converted into single-channel 8-bit grayscale.
   - Resized/cropped to the native SRNet resolution ($256 \times 256$).
   - Normalized into a PyTorch floating tensor of shape `(1, 1, 256, 256)`.

3. **SRNet Deep Residual Inference**:
   - Input passes through two Type 1 non-pooling layers.
   - Passes through five Type 2 residual blocks (zero downsampling to preserve weak noise fingerprints).
   - Passes through four Type 3 downsampling residual blocks (incorporating average pooling).
   - Evaluated by Type 4 Global Average Pooling (GAP) producing a 512-dim vector.
   - Dense classification head computes logits and softmax probabilities:
     - `Class 0`: Cover Image (no hidden data detected)
     - `Class 1`: Stego Image (steganographic payload detected)

4. **Persistence & Reporting**:
   - The scan record, probability distribution, confidence score, and metadata are saved to PostgreSQL.
   - The structured response is returned to the client and displayed in real-time.

## 3. SRNet Layer Specifications

| Stage | Block Type | In Channels | Out Channels | Downsampling |
|-------|------------|-------------|--------------|--------------|
| 1-2   | Type 1     | 1 -> 64     | 64 -> 16     | None         |
| 3-7   | Type 2     | 16          | 16           | None         |
| 8-11  | Type 3     | 16, 16, 64, 128 | 16, 64, 128, 256 | AvgPool 3x3 s2 |
| 12    | Type 4     | 256         | 512          | GAP (1x1)    |
| Head  | Dense      | 512         | 2            | Softmax Logits|

