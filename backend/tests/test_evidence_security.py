"""Tests for Stored XSS prevention and safe report generation in DigitalEvidenceArchiveService."""

from app.services.evidence_service import DigitalEvidenceArchiveService


def test_certificate_html_escapes_xss_vectors():
    malicious_case_data = {
        "id": 1337,
        "case_number": '<script>alert("XSS_CASE")</script>',
        "filename": '<img src=x onerror="alert(document.cookie)">.png',
        "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "file_size_bytes": 1024,
        "image_format": '<svg onload=alert(1)>',
        "verdict": "Stego",
        "confidence": 0.99,
        "cover_probability": 0.01,
        "stego_probability": 0.99,
        "residual_energy": 12.34,
        "execution_time_ms": 15.0,
        "device": "cpu",
        "model_name": 'StegoNet"><script>evil()</script>',
        "forensic_explanation": '<iframe src="javascript:alert(1)"></iframe>',
    }

    html_out = DigitalEvidenceArchiveService._build_certificate_html(malicious_case_data)

    # Verify no raw unescaped script or iframe tags exist
    assert "<script>" not in html_out
    assert "</script>" not in html_out
    assert "<iframe" not in html_out
    assert '<img src=x' not in html_out
    assert '<svg onload' not in html_out

    # Verify proper HTML entities are present
    assert "&lt;script&gt;" in html_out
    assert "&lt;iframe" in html_out
    assert "&lt;img" in html_out
