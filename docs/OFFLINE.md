# StegoVault Offline Guide

StegoVault never downloads an executable or a model, on first run or later.

- **`--offline` / `STEGOVAULT_OFFLINE=1`** (or `STEGOFORGE_OFFLINE=1`) switches network access off: dead drops, the update check and the HTTP client refuse to run. Everything else works the same.
- **ML model:** shipped inside the package (`models/model_quantized.onnx`, with a `.sha256` sidecar). `stegovault init` copies it to `~/.stegovault/models`; `STEGOVAULT_MODEL_SHA256` pins its hash.
- **FFmpeg** is needed only to convert MP3, FLAC and OGG audio. Install it with your package manager (`sudo apt install ffmpeg`), set `STEGOVAULT_FFMPEG=/path/to/ffmpeg`, or rely on the `imageio-ffmpeg` dependency. Video methods use PyAV's own libraries and need no ffmpeg binary.
- **Web UI:** fully self-contained. Fonts are served from the package (`web/static/fonts`, SIL OFL) and the page makes no request to any third party.
- **`stegovault doctor`** reports what this installation can and cannot do, without touching the network.
