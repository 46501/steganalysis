"""tests/test_detect_ml_steganalysis.py - Tests for ML detector fallback behavior."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from detect.ml_steganalysis import MLSteganalysisDetector

FIXTURES = Path(__file__).parent / "fixtures"


def test_ml_detector_returns_structured_result():
    det = MLSteganalysisDetector()
    data = (FIXTURES / "sample.png").read_bytes()
    r = det.analyze(data, "sample.png", classical={"chi2": 0.2, "rs": 0.1})
    assert r.method == "ml"
    assert 0.0 <= r.confidence <= 1.0
    assert "verdict" in r.details


def test_ml_detector_handles_edge_cases():
    import io
    from PIL import Image

    det = MLSteganalysisDetector()

    # Empty bytes
    r_empty = det.analyze(b"", "empty.png")
    assert r_empty.method == "ml"
    assert r_empty.confidence == 0.0
    assert r_empty.details["verdict"] == "ERROR"

    # Corrupt bytes
    r_corrupt = det.analyze(b"corrupt-data", "corrupt.png")
    assert r_corrupt.method == "ml"
    assert r_corrupt.confidence == 0.0
    assert r_corrupt.details["verdict"] == "ERROR"

    # 1x1 pixel image (prevent division by zero or NaN)
    img = Image.new("L", (1, 1), 128)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    r_tiny = det.analyze(buf.getvalue(), "tiny.png")
    assert r_tiny.method == "ml"
    assert r_tiny.confidence == 0.0
    assert not (r_tiny.confidence != r_tiny.confidence)  # not NaN
