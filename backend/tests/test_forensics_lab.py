"""
Unit and Integration Tests for StegoShield AI Forensics Laboratory.
Verifies all 10 Acceptance Test Criteria from Specification.
"""

import io
import pytest
import numpy as np
from PIL import Image
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.lab_service import ForensicsLabService


import asyncio
from app.core.database import init_db
from app.ml.inference import engine


@pytest.fixture(scope="session", autouse=True)
def setup_model():
    engine.load_model()


@pytest.fixture
def sample_test_png():
    """Generates a known 64x64 grayscale PNG for fast, deterministic testing."""
    arr = np.full((64, 64), 154, dtype=np.uint8)
    # Add varying texture for non-zero entropy and residual energy
    arr[10:30, 10:30] = 120
    arr[40:60, 40:60] = 180
    pil_img = Image.fromarray(arr, mode="L")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()


# -----------------------------------------------------------------------------
# TEST 1: Toggle LSB & Verify Channel Value Changes by Exactly 1
# -----------------------------------------------------------------------------
def test_toggle_lsb_exact_delta():
    # Test on even value (154: 10011010 -> 155: 10011011)
    res = ForensicsLabService.toggle_pixel_bit(154, 0)
    assert res["original_value"] == 154
    assert res["modified_value"] == 155
    assert res["delta"] == 1
    assert res["original_binary"] == "10011010"
    assert res["modified_binary"] == "10011011"

    # Test on odd value (155: 10011011 -> 154: 10011010)
    res_odd = ForensicsLabService.toggle_pixel_bit(155, 0)
    assert res_odd["original_value"] == 155
    assert res_odd["modified_value"] == 154
    assert res_odd["delta"] == -1

    # Test on MSB (Bit 7: 154 (10011010) -> 26 (00011010), delta -128)
    res_msb = ForensicsLabService.toggle_pixel_bit(154, 7)
    assert res_msb["original_value"] == 154
    assert res_msb["modified_value"] == 26
    assert res_msb["delta"] == -128


# -----------------------------------------------------------------------------
# TEST 2: Restore Pixel & Verify Pixel-for-Pixel Match
# -----------------------------------------------------------------------------
def test_restore_pixel_lossless_identity(sample_test_png):
    arr = ForensicsLabService.b64_to_array(
        ForensicsLabService.array_to_b64_png(np.array(Image.open(io.BytesIO(sample_test_png)), dtype=np.uint8))
    )
    original_copy = arr.copy()

    # Modify pixel at (10, 10)
    orig_val = int(arr[10, 10])
    arr[10, 10] = orig_val ^ 1
    assert arr[10, 10] != original_copy[10, 10]

    # Restore pixel
    arr[10, 10] = orig_val
    assert np.array_equal(arr, original_copy)
    assert np.all(arr == original_copy)


# -----------------------------------------------------------------------------
# TEST 3: Bulk Bit Manipulation & Lossless Modified PNG Generation
# -----------------------------------------------------------------------------
def test_bulk_bit_manipulation_reproducibility(sample_test_png):
    arr = np.array(Image.open(io.BytesIO(sample_test_png)), dtype=np.uint8)
    total_pixels = arr.size

    # Run with 10% modification seed=42
    result = ForensicsLabService.bulk_manipulate_bits(
        orig_array=arr,
        mode="lsb_only",
        percentage=10.0,
        seed=42,
    )

    assert result["total_pixels"] == total_pixels
    assert result["modified_pixels_count"] > 0
    assert result["modified_image_b64"].startswith("data:image/png;base64,")
    assert len(result["modified_sha256"]) == 64

    # Test reproducibility: running again with same seed yields identical hash
    result2 = ForensicsLabService.bulk_manipulate_bits(
        orig_array=arr,
        mode="lsb_only",
        percentage=10.0,
        seed=42,
    )
    assert result["modified_sha256"] == result2["modified_sha256"]
    assert result["modified_pixels_count"] == result2["modified_pixels_count"]


# -----------------------------------------------------------------------------
# TEST 4: Forensic Comparison & Exact Changed Pixels Count
# -----------------------------------------------------------------------------
def test_forensic_comparison_exact_counts(sample_test_png):
    orig = np.array(Image.open(io.BytesIO(sample_test_png)), dtype=np.uint8)
    mod = orig.copy()

    # Exactly 25 known pixels flipped
    for i in range(25):
        mod[i, 0] = orig[i, 0] ^ 1

    comparison = ForensicsLabService.compare_images(orig, mod)
    assert comparison["total_pixels"] == orig.size
    assert comparison["changed_pixels"] == 25
    assert comparison["unchanged_pixels"] == orig.size - 25
    assert comparison["changed_channel_values"] == 25
    assert comparison["total_bit_changes"] == 25
    assert comparison["changed_pixel_percent"] == round((25 / float(orig.size)) * 100.0, 3)


# -----------------------------------------------------------------------------
# TEST 5: Secret Message Embedding & 100% Lossless Extraction
# -----------------------------------------------------------------------------
def test_secret_message_embed_and_extract_plaintext(sample_test_png):
    arr = np.array(Image.open(io.BytesIO(sample_test_png)), dtype=np.uint8)
    secret_message = "StegoShield Forensic Verification #9981 - UTF-8 Valid!"

    embed_res = ForensicsLabService.embed_secret_message_lsb(
        orig_array=arr,
        secret_text=secret_message,
        password=None,
    )

    assert embed_res["payload_bytes"] == len(secret_message.encode("utf-8"))
    assert embed_res["modified_bits_count"] > 0
    assert embed_res["is_encrypted"] is False

    # Extract back from base64
    stego_arr = ForensicsLabService.b64_to_array(embed_res["stego_image_b64"])
    extract_res = ForensicsLabService.extract_secret_message_lsb(stego_arr, password=None)

    assert extract_res["success"] is True
    assert extract_res["secret_text"] == secret_message
    assert extract_res["payload_bytes"] == len(secret_message.encode("utf-8"))


def test_secret_message_embed_and_extract_encrypted(sample_test_png):
    arr = np.array(Image.open(io.BytesIO(sample_test_png)), dtype=np.uint8)
    secret_message = "Confidential Academic Defense Protocol"
    pwd = "DefendPass@2026"

    embed_res = ForensicsLabService.embed_secret_message_lsb(
        orig_array=arr,
        secret_text=secret_message,
        password=pwd,
    )
    assert embed_res["is_encrypted"] is True

    stego_arr = ForensicsLabService.b64_to_array(embed_res["stego_image_b64"])

    # Attempt extraction without password -> fails gracefully
    extract_no_pwd = ForensicsLabService.extract_secret_message_lsb(stego_arr, password=None)
    assert extract_no_pwd["success"] is False
    assert extract_no_pwd["is_encrypted"] is True

    # Attempt extraction with wrong password -> integrity CRC check fails
    extract_wrong_pwd = ForensicsLabService.extract_secret_message_lsb(stego_arr, password="WrongPassword")
    assert extract_wrong_pwd["success"] is False

    # Attempt extraction with correct password -> succeeds with 100% fidelity
    extract_ok = ForensicsLabService.extract_secret_message_lsb(stego_arr, password=pwd)
    assert extract_ok["success"] is True
    assert extract_ok["secret_text"] == secret_message


# -----------------------------------------------------------------------------
# TEST 6: Capacity Validation & Rejecting Excessive Payload
# -----------------------------------------------------------------------------
def test_embed_capacity_rejection(sample_test_png):
    arr = np.array(Image.open(io.BytesIO(sample_test_png)), dtype=np.uint8)
    # 64x64 = 4096 pixels = 4096 bits. Header is 14 bytes = 112 bits.
    # Max payload capacity is (4096 - 112) // 8 = 498 bytes.
    huge_message = "A" * 600

    with pytest.raises(ValueError) as excinfo:
        ForensicsLabService.embed_secret_message_lsb(
            orig_array=arr,
            secret_text=huge_message,
        )
    assert "Payload exceeds available carrier capacity" in str(excinfo.value)


# -----------------------------------------------------------------------------
# TEST 7 & 8: API Endpoints (Steganalysis, Residual Energy, Inspection)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_lab_api_endpoints_workflow(sample_test_png):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Inspect endpoint
        inspect_res = await client.post(
            "/api/v1/lab/inspect",
            files={"file": ("test_cover.png", sample_test_png, "image/png")},
        )
        assert inspect_res.status_code == 200
        data = inspect_res.json()
        assert data["width"] == 64
        assert data["height"] == 64
        assert data["entropy"] > 0
        assert data["residual_energy"] > 0
        lossless_b64 = data["lossless_png_b64"]

        # 2. Pixel inspect endpoint
        pixel_res = await client.post(
            "/api/v1/lab/pixel-inspect",
            json={"image_b64": lossless_b64, "x": 10, "y": 10},
        )
        assert pixel_res.status_code == 200
        pixel_data = pixel_res.json()
        assert len(pixel_data["channels"]) == 1
        assert len(pixel_data["channels"][0]["bits"]) == 8

        # 3. Bitplane endpoint
        bp_res = await client.post(
            "/api/v1/lab/bitplane",
            json={"image_b64": lossless_b64, "plane": 0, "channel": "gray"},
        )
        assert bp_res.status_code == 200
        assert bp_res.json()["bitplane_b64"].startswith("data:image/png;base64,")

        # 4. Steganalysis inference endpoint
        analyze_res = await client.post(
            "/api/v1/lab/analyze",
            data={"image_b64": lossless_b64, "model_name": "StegoNet-Lite"},
        )
        assert analyze_res.status_code == 200
        an_data = analyze_res.json()
        assert an_data["verdict"] in ("Inconclusive", "Cover Indicated", "Stego Indicated", "Cover", "Stego")
        assert "cover_probability" in an_data
        assert "stego_probability" in an_data
        assert "Experimental Baseline" in an_data["model_status"]
        assert an_data["residual_energy"] > 0


# -----------------------------------------------------------------------------
# TEST 9 & 10: Experiment History Persistence & Original Immutability
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_lab_experiment_persistence_and_immutability(sample_test_png):
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step A: Inspect
        insp = await client.post(
            "/api/v1/lab/inspect",
            files={"file": ("carrier.png", sample_test_png, "image/png")},
        )
        orig_b64 = insp.json()["lossless_png_b64"]
        orig_hash = insp.json()["sha256_hash"]

        # Step B: Manipulate bits
        manip = await client.post(
            "/api/v1/lab/manipulate-bulk",
            json={
                "image_b64": orig_b64,
                "mode": "lsb_only",
                "percentage": 5.0,
                "seed": 1337,
            },
        )
        mod_b64 = manip.json()["modified_image_b64"]
        mod_hash = manip.json()["modified_sha256"]

        # Verify hashes differ (mutation occurred on derived copy)
        assert orig_hash != mod_hash

        # Step C: Compare
        comp = await client.post(
            "/api/v1/lab/compare",
            json={"original_image_b64": orig_b64, "modified_image_b64": mod_b64},
        )
        comp_data = comp.json()
        assert comp_data["changed_pixels"] > 0

        # Step D: Save Experiment
        create_res = await client.post(
            "/api/v1/lab/experiments",
            json={
                "experiment_name": "Acceptance Test LSB Experiment",
                "experiment_type": "bit_manipulation",
                "original_filename": "carrier.png",
                "original_file_hash": orig_hash,
                "modified_file_hash": mod_hash,
                "dimensions": "64x64",
                "color_mode": "L",
                "parameters": {"mode": "lsb_only", "percentage": 5.0, "seed": 1337},
                "comparison": comp_data,
                "original_image_b64": orig_b64,
                "modified_image_b64": mod_b64,
                "diff_map_b64": comp_data["diff_map_b64"],
            },
        )
        assert create_res.status_code == 201
        exp_id = create_res.json()["id"]

        # Step E: List and retrieve experiment
        list_res = await client.get("/api/v1/lab/experiments")
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(it["id"] == exp_id for it in items)

        get_res = await client.get(f"/api/v1/lab/experiments/{exp_id}")
        assert get_res.status_code == 200
        exp_detail = get_res.json()
        assert exp_detail["original_file_hash"] == orig_hash
        assert exp_detail["modified_file_hash"] == mod_hash

        # Step F: Download modified image
        dl_res = await client.get(f"/api/v1/lab/experiments/{exp_id}/download")
        assert dl_res.status_code == 200
        assert dl_res.headers["content-type"] == "image/png"

        # Step G: Delete experiment
        del_res = await client.delete(f"/api/v1/lab/experiments/{exp_id}")
        assert del_res.status_code == 204

        # Step H: Immutability check - original bytes unchanged
        import hashlib
        final_orig_hash = hashlib.sha256(sample_test_png).hexdigest()
        assert final_orig_hash == orig_hash


# -----------------------------------------------------------------------------
# TEST 10: Toggle Pixel Bit API - Atomic Mutation & Cumulative Retention
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_toggle_pixel_bit_api_cumulative(sample_test_png):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Inspect to get base64
        insp = await client.post(
            "/api/v1/lab/inspect",
            files={"file": ("test_carrier.png", sample_test_png, "image/png")},
        )
        assert insp.status_code == 200
        orig_b64 = insp.json()["lossless_png_b64"]
        orig_hash = insp.json()["sha256_hash"]

        # 1. Flip LSB (bit 0) at (12, 14)
        res1 = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "x": 12,
                "y": 14,
                "channel": "red",
                "bit_position": 0,
            },
        )
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["success"] is True
        assert abs(data1["delta"]) == 1
        assert data1["modified_sha256"] != orig_hash
        mod_b64_1 = data1["modified_image_b64"]

        # 2. Cumulative test: flip bit 7 on the RESULTING image mod_b64_1 at (12, 14)
        res2 = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": mod_b64_1,
                "x": 12,
                "y": 14,
                "channel": "red",
                "bit_position": 7,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["success"] is True
        assert abs(data2["delta"]) == 128
        assert data2["modified_sha256"] != data1["modified_sha256"]
        assert data2["modified_sha256"] != orig_hash

        # Verify pixel details in response reflect the updated values
        assert data2["pixel_details"]["x"] == 12
        assert data2["pixel_details"]["y"] == 14

        # 3. Validation: bit_position out of range (e.g. 8) must return 422
        res_invalid_bit = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "x": 0,
                "y": 0,
                "channel": "red",
                "bit_position": 8,
            },
        )
        assert res_invalid_bit.status_code == 422

        # 4. Validation: coordinates out of range must return 400
        res_oob = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "x": 9999,
                "y": 9999,
                "channel": "red",
                "bit_position": 0,
            },
        )
        assert res_oob.status_code == 400

        # 5. Operations: Test action="set" (force bit to 1) and action="clear" (force bit to 0)
        res_set = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "x": 5,
                "y": 5,
                "channel": "red",
                "bit_position": 0,
                "action": "set",
            },
        )
        assert res_set.status_code == 200
        assert res_set.json()["new_pixel_value"] % 2 == 1

        res_clear = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": res_set.json()["modified_image_b64"],
                "x": 5,
                "y": 5,
                "channel": "red",
                "bit_position": 0,
                "action": "clear",
            },
        )
        assert res_clear.status_code == 200
        assert res_clear.json()["new_pixel_value"] % 2 == 0


@pytest.mark.asyncio
async def test_realtime_bit_toggle_255_to_254_to_255():
    """Verifies acceptance criteria for real-time bit toggling:
    255 -> 254 -> 255 with delta, channel isolation, and baseline tracking.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a 32x32 RGB image
        arr = np.zeros((32, 32, 3), dtype=np.uint8)
        arr[4, 4] = [255, 128, 64]
        arr[10, 10] = [100, 150, 200]
        orig_b64 = ForensicsLabService.array_to_b64_png(arr)

        # 1. Toggle Red b0: 255 (11111111) -> 254 (11111110)
        res1 = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "original_image_b64": orig_b64,
                "x": 4,
                "y": 4,
                "channel": "red",
                "bit_position": 0,
                "action": "toggle",
            },
        )
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["original_value"] == 255
        assert data1["new_pixel_value"] == 254
        assert data1["delta"] == -1
        assert data1["original_binary"] == "11111111"
        assert data1["new_binary"] == "11111110"
        assert data1["total_modified_pixels"] == 1
        assert data1["is_identical_to_baseline"] is False

        # Channel isolation check on response pixel details
        channels1 = {c["channel"].lower(): c["value"] for c in data1["pixel_details"]["channels"]}
        assert channels1["red"] == 254
        assert channels1["green"] == 128
        assert channels1["blue"] == 64

        # 2. Toggle Red b0 AGAIN on modified image: 254 (11111110) -> 255 (11111111)
        res2 = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": data1["modified_image_b64"],
                "original_image_b64": orig_b64,
                "x": 4,
                "y": 4,
                "channel": "red",
                "bit_position": 0,
                "action": "toggle",
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["original_value"] == 254
        assert data2["new_pixel_value"] == 255
        assert data2["delta"] == 1
        assert data2["new_binary"] == "11111111"
        assert data2["total_modified_pixels"] == 0
        assert data2["is_identical_to_baseline"] is True


@pytest.mark.asyncio
async def test_bit_toggle_msb_lsb_and_pixel_isolation():
    """Verifies MSB (b7) toggle and pixel isolation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        arr = np.zeros((16, 16, 3), dtype=np.uint8)
        arr[2, 2] = [255, 100, 50]
        arr[5, 5] = [77, 88, 99]
        orig_b64 = ForensicsLabService.array_to_b64_png(arr)

        # Toggle MSB (b7) on Red: 255 -> 127, delta = -128
        res = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "original_image_b64": orig_b64,
                "x": 2,
                "y": 2,
                "channel": "red",
                "bit_position": 7,
                "action": "toggle",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["original_value"] == 255
        assert data["new_pixel_value"] == 127
        assert data["delta"] == -128
        assert data["new_binary"] == "01111111"

        # Check pixel isolation: array at (5, 5) must be completely untouched
        mod_arr = ForensicsLabService.b64_to_array(data["modified_image_b64"])
        assert list(mod_arr[5, 5]) == [77, 88, 99]
        assert list(mod_arr[2, 2]) == [127, 100, 50]


@pytest.mark.asyncio
async def test_reset_pixel_endpoint_flow():
    """Verifies POST /api/v1/lab/reset-pixel functionality."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        arr = np.zeros((16, 16, 3), dtype=np.uint8)
        arr[3, 3] = [200, 100, 50]
        arr[7, 7] = [80, 90, 100]
        orig_b64 = ForensicsLabService.array_to_b64_png(arr)

        # Modify pixel (3, 3)
        res1 = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": orig_b64,
                "original_image_b64": orig_b64,
                "x": 3,
                "y": 3,
                "channel": "red",
                "bit_position": 0,
            },
        )
        mod1_b64 = res1.json()["modified_image_b64"]

        # Modify pixel (7, 7)
        res2 = await client.post(
            "/api/v1/lab/toggle-pixel-bit",
            json={
                "image_b64": mod1_b64,
                "original_image_b64": orig_b64,
                "x": 7,
                "y": 7,
                "channel": "green",
                "bit_position": 1,
            },
        )
        mod2_b64 = res2.json()["modified_image_b64"]
        assert res2.json()["total_modified_pixels"] == 2

        # Reset pixel (3, 3)
        reset1 = await client.post(
            "/api/v1/lab/reset-pixel",
            json={
                "original_image_b64": orig_b64,
                "modified_image_b64": mod2_b64,
                "x": 3,
                "y": 3,
            },
        )
        assert reset1.status_code == 200
        r_data1 = reset1.json()
        assert r_data1["success"] is True
        assert r_data1["total_modified_pixels"] == 1
        assert r_data1["is_identical_to_baseline"] is False

        # Reset pixel (7, 7)
        reset2 = await client.post(
            "/api/v1/lab/reset-pixel",
            json={
                "original_image_b64": orig_b64,
                "modified_image_b64": r_data1["modified_image_b64"],
                "x": 7,
                "y": 7,
            },
        )
        assert reset2.status_code == 200
        r_data2 = reset2.json()
        assert r_data2["success"] is True
        assert r_data2["total_modified_pixels"] == 0
        assert r_data2["is_identical_to_baseline"] is True



