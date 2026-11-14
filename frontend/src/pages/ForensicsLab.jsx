import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Binary,
  Lock,
  Cpu,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Eye,
  ZoomIn,
  ZoomOut,
  Layers,
  Hash,
  Activity,
  Download,
  Printer,
  KeyRound,
  AlertTriangle,
  ShieldCheck,
  Info,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAssistant } from '../context/AssistantContext';
import ComparisonWipeSlider from '../components/analysis/ComparisonWipeSlider';
import PixelLoupeMagnifier from '../components/analysis/PixelLoupeMagnifier';
import ForensicReportModal from '../components/analysis/ForensicReportModal';
import { formatApiError } from '../utils/errorUtils';

// --------------------------------------------------------------------------
// Safe Error Detail Formatter (Prevents React Invariant #31 object child errors)
// --------------------------------------------------------------------------
const formatErrorDetail = (err, fallback = 'Operation failed') => {
  return formatApiError(err, fallback);
};

// --------------------------------------------------------------------------
// Standardized 5-Step Forensic Workflow Definitions
// --------------------------------------------------------------------------
const STEPS = [
  { id: 1, key: 'upload', title: 'Upload Image', short: '1. Upload', icon: Upload },
  { id: 2, key: 'modify', title: 'Modify Bits', short: '2. Modify Bits', icon: Binary },
  { id: 3, key: 'embed', title: 'Add Hidden Message', short: '3. Add Message', icon: Lock },
  { id: 4, key: 'analyze', title: 'Run Steganalysis', short: '4. Steganalysis', icon: Cpu },
  { id: 5, key: 'results', title: 'Complete Analysis Results', short: '5. Results', icon: FileText },
];

function ForensicsLabContent() {
  const { user } = useAuth();
  const { setActiveAnalysisContext } = useAssistant();

  // Current active step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Image State (Original baseline & working modified image)
  const [originalMeta, setOriginalMeta] = useState(null);
  const [originalImageB64, setOriginalImageB64] = useState(null);
  const [modifiedImageB64, setModifiedImageB64] = useState(null);
  const [modifiedHash, setModifiedHash] = useState(null);

  // Step 2: Pixel Inspection & Bit Toggling State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedPixel, setSelectedPixel] = useState({ x: 0, y: 0 });
  const [coordInput, setCoordInput] = useState({ x: '0', y: '0' });
  const [bitActionMode, setBitActionMode] = useState('toggle'); // 'toggle' | 'set' | 'clear'
  const [pixelDetails, setPixelDetails] = useState(null);
  const [baselinePixelDetails, setBaselinePixelDetails] = useState(null);
  const [totalModifiedPixels, setTotalModifiedPixels] = useState(0);
  const [lastModification, setLastModification] = useState(null);
  const [modificationCount, setModificationCount] = useState(0);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [activePlane, setActivePlane] = useState(0);
  const [activeChannel, setActiveChannel] = useState('gray');
  const [bitplaneData, setBitplaneData] = useState(null);
  const [bitplaneLoading, setBitplaneLoading] = useState(false);
  const [showBitplane, setShowBitplane] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkMode, setBulkMode] = useState('lsb_only');
  const [bulkPercentage, setBulkPercentage] = useState(5);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Step 3: Hidden Message Embedding & Extraction State
  const [secretText, setSecretText] = useState('CONFIDENTIAL: Forensic laboratory verification token #2026-X7.');
  const [embedPassword, setEmbedPassword] = useState('');
  const [showEmbedPassword, setShowEmbedPassword] = useState(false);
  const [embedProcessing, setEmbedProcessing] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);
  const [showExtract, setShowExtract] = useState(false);
  const [extractPassword, setExtractPassword] = useState('');
  const [extractProcessing, setExtractProcessing] = useState(false);
  const [extractResult, setExtractResult] = useState(null);

  // Step 4 & 5: Steganalysis & Forensic Comparison State
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [resultsViewMode, setResultsViewMode] = useState('slider'); // 'slider' | 'loupe' | 'diff' | 'heatmap'
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Toast status alert
  const [statusMessage, setStatusMessage] = useState(null);

  const isPixelModified = Boolean(
    pixelDetails &&
      baselinePixelDetails &&
      (pixelDetails.red !== baselinePixelDetails.red ||
        pixelDetails.green !== baselinePixelDetails.green ||
        pixelDetails.blue !== baselinePixelDetails.blue ||
        pixelDetails.gray !== baselinePixelDetails.gray)
  );

  const deltaLabel =
    isPixelModified && pixelDetails && baselinePixelDetails
      ? pixelDetails.is_color
        ? `ΔR:${(pixelDetails.red ?? 0) - (baselinePixelDetails.red ?? 0) >= 0 ? '+' : ''}${(pixelDetails.red ?? 0) - (baselinePixelDetails.red ?? 0)} ΔG:${(pixelDetails.green ?? 0) - (baselinePixelDetails.green ?? 0) >= 0 ? '+' : ''}${(pixelDetails.green ?? 0) - (baselinePixelDetails.green ?? 0)} ΔB:${(pixelDetails.blue ?? 0) - (baselinePixelDetails.blue ?? 0) >= 0 ? '+' : ''}${(pixelDetails.blue ?? 0) - (baselinePixelDetails.blue ?? 0)}`
        : `Δ:${(pixelDetails.gray ?? 0) - (baselinePixelDetails.gray ?? 0) >= 0 ? '+' : ''}${(pixelDetails.gray ?? 0) - (baselinePixelDetails.gray ?? 0)}`
      : 'Δ = 0';

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const showStatus = (msg, isError = false) => {
    let text = '';
    if (typeof msg === 'string') {
      text = msg;
    } else if (Array.isArray(msg)) {
      text = msg
        .map((m) => (m && typeof m === 'object' ? m.msg || m.message || JSON.stringify(m) : String(m)))
        .join('; ');
    } else if (msg && typeof msg === 'object') {
      text = msg.msg || msg.message || (msg.response ? formatErrorDetail(msg) : JSON.stringify(msg));
    } else {
      text = String(msg || 'Status updated');
    }
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Load default preset cover on initial mount
  useEffect(() => {
    loadSampleCover();
  }, []);

  // Sync active 5-step forensic workflow data with the Global AI Assistant
  useEffect(() => {
    setActiveAnalysisContext({
      source: 'forensics_lab',
      step: currentStep,
      step_name: STEPS[currentStep - 1]?.title || `Step ${currentStep}`,
      verdict: analysisResult?.verdict || null,
      confidence: analysisResult?.confidence || null,
      cover_probability: analysisResult?.cover_probability || null,
      stego_probability: analysisResult?.stego_probability || null,
      psnr: comparisonData?.psnr || null,
      changed_pixels: comparisonData?.changed_pixels || 0,
      total_pixels: comparisonData?.total_pixels || null,
      change_pct: comparisonData?.change_pct || 0.0,
      original_hash: originalMeta?.sha256_hash || null,
      modified_hash: modifiedHash,
      dimensions: originalMeta ? `${originalMeta.width}x${originalMeta.height}` : null,
    });
  }, [
    currentStep,
    analysisResult,
    comparisonData,
    modifiedHash,
    originalMeta,
    setActiveAnalysisContext,
  ]);

  const loadSampleCover = async () => {
    try {
      setInspectLoading(true);
      const res = await fetch('/samples/sample_cover.png');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) {
        console.warn('Preset cover image not available at /samples/sample_cover.png');
        return;
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0) return;
      const file = new File([blob], 'sample_cover_5001.png', { type: 'image/png' });
      await handleImageUpload(file);
    } catch (e) {
      console.warn('Failed to load preset sample cover:', e);
    } finally {
      setInspectLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 1: Upload & Inspection
  // --------------------------------------------------------------------------
  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      setInspectLoading(true);
      const data = await steganalysisApi.inspectLabImage(file);
      setOriginalMeta(data);
      setOriginalImageB64(data.lossless_png_b64);
      setModifiedImageB64(data.lossless_png_b64);
      setModifiedHash(data.sha256_hash);
      setLastModification(null);
      setModificationCount(0);
      setTotalModifiedPixels(0);
      setBaselinePixelDetails(null);
      setAnalysisResult(null);
      setComparisonData(null);
      setBulkResult(null);
      setEmbedResult(null);

      // Auto-inspect center pixel
      const cx = Math.floor(data.width / 2);
      const cy = Math.floor(data.height / 2);
      setSelectedPixel({ x: cx, y: cy });
      setCoordInput({ x: String(cx), y: String(cy) });
      await fetchPixelDetails(data.lossless_png_b64, cx, cy, data.lossless_png_b64);

      setCompletedSteps((prev) => new Set([...prev, 1]));
      showStatus(`Ingested carrier baseline: ${data.filename} (${data.dimensions})`);
    } catch (err) {
      showStatus(formatErrorDetail(err, 'Image upload failed'), true);
    } finally {
      setInspectLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 2: Pixel Inspection & Bit Modification
  // --------------------------------------------------------------------------
  const fetchPixelDetails = async (imgB64, x, y, baseB64 = null) => {
    try {
      const raw = await steganalysisApi.inspectLabPixel(imgB64, x, y);
      if (!raw) return;
      const isRgb = Boolean(raw.is_rgb);
      const channels = raw.channels || [];
      const redCh = channels.find((c) => c.channel?.toLowerCase().includes('red')) || channels[0];
      const greenCh = channels.find((c) => c.channel?.toLowerCase().includes('green')) || channels[1];
      const blueCh = channels.find((c) => c.channel?.toLowerCase().includes('blue')) || channels[2];
      const grayCh = channels.find((c) => c.channel?.toLowerCase().includes('gray') || c.channel?.toLowerCase().includes('intensity')) || channels[0];

      const currentDetails = {
        x: raw.x ?? x,
        y: raw.y ?? y,
        is_color: isRgb,
        is_rgb: isRgb,
        red: redCh?.value ?? 0,
        green: greenCh?.value ?? 0,
        blue: blueCh?.value ?? 0,
        gray: grayCh?.value ?? 0,
        luminance: isRgb
          ? Math.round(0.299 * (redCh?.value ?? 0) + 0.587 * (greenCh?.value ?? 0) + 0.114 * (blueCh?.value ?? 0))
          : (grayCh?.value ?? 0),
        binary_bits_red: redCh?.binary || '00000000',
        binary_bits_green: greenCh?.binary || '00000000',
        binary_bits_blue: blueCh?.binary || '00000000',
        binary_bits_gray: grayCh?.binary || '00000000',
        channels: channels,
      };
      setPixelDetails(currentDetails);

      const baselineImg = baseB64 || originalImageB64;
      if (baselineImg) {
        if (imgB64 === baselineImg) {
          setBaselinePixelDetails(currentDetails);
        } else {
          try {
            const rawBase = await steganalysisApi.inspectLabPixel(baselineImg, x, y);
            if (rawBase) {
              const bChannels = rawBase.channels || [];
              const bRed = bChannels.find((c) => c.channel?.toLowerCase().includes('red')) || bChannels[0];
              const bGreen = bChannels.find((c) => c.channel?.toLowerCase().includes('green')) || bChannels[1];
              const bBlue = bChannels.find((c) => c.channel?.toLowerCase().includes('blue')) || bChannels[2];
              const bGray = bChannels.find((c) => c.channel?.toLowerCase().includes('gray') || c.channel?.toLowerCase().includes('intensity')) || bChannels[0];
              setBaselinePixelDetails({
                x: rawBase.x ?? x,
                y: rawBase.y ?? y,
                is_color: isRgb,
                is_rgb: isRgb,
                red: bRed?.value ?? 0,
                green: bGreen?.value ?? 0,
                blue: bBlue?.value ?? 0,
                gray: bGray?.value ?? 0,
                luminance: isRgb
                  ? Math.round(0.299 * (bRed?.value ?? 0) + 0.587 * (bGreen?.value ?? 0) + 0.114 * (bBlue?.value ?? 0))
                  : (bGray?.value ?? 0),
                binary_bits_red: bRed?.binary || '00000000',
                binary_bits_green: bGreen?.binary || '00000000',
                binary_bits_blue: bBlue?.binary || '00000000',
                binary_bits_gray: bGray?.binary || '00000000',
                channels: bChannels,
              });
            }
          } catch (e) {
            console.warn('Baseline pixel fetch failed:', e);
          }
        }
      }
    } catch (e) {
      console.warn('Pixel inspection failed:', e);
    }
  };

  const handleCoordinateJump = (targetX, targetY) => {
    if (!originalMeta) return;
    const clampedX = Math.max(0, Math.min(originalMeta.width - 1, isNaN(targetX) ? 0 : targetX));
    const clampedY = Math.max(0, Math.min(originalMeta.height - 1, isNaN(targetY) ? 0 : targetY));
    setSelectedPixel({ x: clampedX, y: clampedY });
    setCoordInput({ x: String(clampedX), y: String(clampedY) });
    fetchPixelDetails(modifiedImageB64 || originalImageB64, clampedX, clampedY);
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !originalMeta) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const imgX = Math.floor(clickX * scaleX);
    const imgY = Math.floor(clickY * scaleY);

    if (imgX >= 0 && imgX < originalMeta.width && imgY >= 0 && imgY < originalMeta.height) {
      setSelectedPixel({ x: imgX, y: imgY });
      setCoordInput({ x: String(imgX), y: String(imgY) });
      fetchPixelDetails(modifiedImageB64 || originalImageB64, imgX, imgY);
    }
  };

  // Draw canvas image when source or zoom changes
  useEffect(() => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64 || !canvasRef.current || currentStep !== 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);

      // Draw crosshair overlay on selected pixel without overwriting actual pixel color
      if (selectedPixel) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1;
        ctx.strokeRect(selectedPixel.x - 2.5, selectedPixel.y - 2.5, 6, 6);
      }
    };
    img.src = targetB64;
  }, [modifiedImageB64, originalImageB64, selectedPixel, zoomLevel, currentStep]);

  const handleToggleBit = async (channel, bitPos) => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64 || !selectedPixel || !pixelDetails) return;

    // 1. Instant Optimistic UI Update (0ms response)
    const chKey = channel.toLowerCase();
    let oldVal = 0;
    if (chKey.includes('red') || chKey === 'r') oldVal = pixelDetails.red;
    else if (chKey.includes('green') || chKey === 'g') oldVal = pixelDetails.green;
    else if (chKey.includes('blue') || chKey === 'b') oldVal = pixelDetails.blue;
    else oldVal = pixelDetails.gray ?? 0;

    let optimisticVal = oldVal;
    if (bitActionMode === 'set') optimisticVal = oldVal | (1 << bitPos);
    else if (bitActionMode === 'clear') optimisticVal = oldVal & ~(1 << bitPos);
    else optimisticVal = oldVal ^ (1 << bitPos);

    const optimisticBinary = (optimisticVal >>> 0).toString(2).padStart(8, '0');
    const optimisticDetails = { ...pixelDetails };
    if (chKey.includes('red') || chKey === 'r') {
      optimisticDetails.red = optimisticVal;
      optimisticDetails.binary_bits_red = optimisticBinary;
    } else if (chKey.includes('green') || chKey === 'g') {
      optimisticDetails.green = optimisticVal;
      optimisticDetails.binary_bits_green = optimisticBinary;
    } else if (chKey.includes('blue') || chKey === 'b') {
      optimisticDetails.blue = optimisticVal;
      optimisticDetails.binary_bits_blue = optimisticBinary;
    } else {
      optimisticDetails.gray = optimisticVal;
      optimisticDetails.binary_bits_gray = optimisticBinary;
    }
    if (optimisticDetails.is_color) {
      optimisticDetails.luminance = Math.round(
        0.299 * optimisticDetails.red + 0.587 * optimisticDetails.green + 0.114 * optimisticDetails.blue
      );
    } else {
      optimisticDetails.luminance = optimisticDetails.gray;
    }
    setPixelDetails(optimisticDetails);

    // 2. Real Backend Bit Mutation
    try {
      const res = await steganalysisApi.togglePixelBit({
        imageB64: targetB64,
        originalImageB64: originalImageB64,
        x: selectedPixel.x,
        y: selectedPixel.y,
        channel: channel,
        bitPosition: bitPos,
        action: bitActionMode,
      });

      setModifiedImageB64(res.modified_image_b64);
      setModifiedHash(res.modified_sha256);
      setLastModification(res);
      setModificationCount((c) => c + 1);
      if (res.total_modified_pixels !== undefined && res.total_modified_pixels !== null) {
        setTotalModifiedPixels(res.total_modified_pixels);
      }

      // Synchronize pixel details directly from backend response
      if (res.pixel_details) {
        const raw = res.pixel_details;
        const isRgb = Boolean(raw.is_rgb);
        const channels = raw.channels || [];
        const redCh = channels.find((c) => c.channel?.toLowerCase().includes('red')) || channels[0];
        const greenCh = channels.find((c) => c.channel?.toLowerCase().includes('green')) || channels[1];
        const blueCh = channels.find((c) => c.channel?.toLowerCase().includes('blue')) || channels[2];
        const grayCh = channels.find((c) => c.channel?.toLowerCase().includes('gray') || c.channel?.toLowerCase().includes('intensity')) || channels[0];

        setPixelDetails({
          x: raw.x ?? selectedPixel.x,
          y: raw.y ?? selectedPixel.y,
          is_color: isRgb,
          is_rgb: isRgb,
          red: redCh?.value ?? 0,
          green: greenCh?.value ?? 0,
          blue: blueCh?.value ?? 0,
          gray: grayCh?.value ?? 0,
          luminance: isRgb
            ? Math.round(0.299 * (redCh?.value ?? 0) + 0.587 * (greenCh?.value ?? 0) + 0.114 * (blueCh?.value ?? 0))
            : (grayCh?.value ?? 0),
          binary_bits_red: redCh?.binary || '00000000',
          binary_bits_green: greenCh?.binary || '00000000',
          binary_bits_blue: blueCh?.binary || '00000000',
          binary_bits_gray: grayCh?.binary || '00000000',
          channels: channels,
        });
      }

      if (res.baseline_pixel && !baselinePixelDetails) {
        const bRaw = res.baseline_pixel;
        const isRgb = Boolean(bRaw.is_rgb);
        const bChannels = bRaw.channels || [];
        const bRed = bChannels.find((c) => c.channel?.toLowerCase().includes('red')) || bChannels[0];
        const bGreen = bChannels.find((c) => c.channel?.toLowerCase().includes('green')) || bChannels[1];
        const bBlue = bChannels.find((c) => c.channel?.toLowerCase().includes('blue')) || bChannels[2];
        const bGray = bChannels.find((c) => c.channel?.toLowerCase().includes('gray') || c.channel?.toLowerCase().includes('intensity')) || bChannels[0];
        setBaselinePixelDetails({
          x: bRaw.x ?? selectedPixel.x,
          y: bRaw.y ?? selectedPixel.y,
          is_color: isRgb,
          is_rgb: isRgb,
          red: bRed?.value ?? 0,
          green: bGreen?.value ?? 0,
          blue: bBlue?.value ?? 0,
          gray: bGray?.value ?? 0,
          luminance: isRgb
            ? Math.round(0.299 * (bRed?.value ?? 0) + 0.587 * (bGreen?.value ?? 0) + 0.114 * (bBlue?.value ?? 0))
            : (bGray?.value ?? 0),
          binary_bits_red: bRed?.binary || '00000000',
          binary_bits_green: bGreen?.binary || '00000000',
          binary_bits_blue: bBlue?.binary || '00000000',
          binary_bits_gray: bGray?.binary || '00000000',
          channels: bChannels,
        });
      }

      setCompletedSteps((prev) => new Set([...prev, 2]));
      const sign = res.delta >= 0 ? `+${res.delta}` : `${res.delta}`;
      const actLabel = bitActionMode === 'set' ? 'Set (forced 1)' : bitActionMode === 'clear' ? 'Cleared (forced 0)' : 'Toggled';
      showStatus(`${actLabel} bit ${bitPos} on ${channel} channel (${res.original_value} → ${res.new_pixel_value}, Δ = ${sign}). Image buffer updated.`);
    } catch (err) {
      showStatus(formatErrorDetail(err, 'Bit toggle failed'), true);
      if (modifiedImageB64) {
        fetchPixelDetails(modifiedImageB64, selectedPixel.x, selectedPixel.y);
      }
    }
  };

  const handleResetSelectedPixel = async () => {
    if (!originalImageB64 || !modifiedImageB64 || !selectedPixel) return;
    try {
      const res = await steganalysisApi.resetPixel({
        originalImageB64,
        modifiedImageB64,
        x: selectedPixel.x,
        y: selectedPixel.y,
      });
      setModifiedImageB64(res.modified_image_b64);
      setModifiedHash(res.modified_sha256);
      if (res.total_modified_pixels !== undefined) {
        setTotalModifiedPixels(res.total_modified_pixels);
      }
      if (res.pixel_details) {
        const raw = res.pixel_details;
        const isRgb = Boolean(raw.is_rgb);
        const channels = raw.channels || [];
        const redCh = channels.find((c) => c.channel?.toLowerCase().includes('red')) || channels[0];
        const greenCh = channels.find((c) => c.channel?.toLowerCase().includes('green')) || channels[1];
        const blueCh = channels.find((c) => c.channel?.toLowerCase().includes('blue')) || channels[2];
        const grayCh = channels.find((c) => c.channel?.toLowerCase().includes('gray') || c.channel?.toLowerCase().includes('intensity')) || channels[0];
        setPixelDetails({
          x: raw.x ?? selectedPixel.x,
          y: raw.y ?? selectedPixel.y,
          is_color: isRgb,
          is_rgb: isRgb,
          red: redCh?.value ?? 0,
          green: greenCh?.value ?? 0,
          blue: blueCh?.value ?? 0,
          gray: grayCh?.value ?? 0,
          luminance: isRgb
            ? Math.round(0.299 * (redCh?.value ?? 0) + 0.587 * (greenCh?.value ?? 0) + 0.114 * (blueCh?.value ?? 0))
            : (grayCh?.value ?? 0),
          binary_bits_red: redCh?.binary || '00000000',
          binary_bits_green: greenCh?.binary || '00000000',
          binary_bits_blue: blueCh?.binary || '00000000',
          binary_bits_gray: grayCh?.binary || '00000000',
          channels: channels,
        });
      }
      showStatus(`Pixel (${selectedPixel.x}, ${selectedPixel.y}) restored back to baseline cover value.`);
    } catch (err) {
      showStatus(formatErrorDetail(err, 'Failed to reset pixel'), true);
    }
  };

  const handleDownloadCarrier = () => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64) return;
    const isModified = Boolean(modifiedImageB64 && originalImageB64 && modifiedImageB64 !== originalImageB64);
    const link = document.createElement('a');
    link.href = targetB64;
    link.download = isModified ? 'stego_modified_carrier.png' : (originalMeta?.filename || 'carrier_baseline.png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus(`Downloaded carrier PNG (${isModified ? `${modificationCount} active bit modifications applied` : 'unperturbed baseline'}).`);
  };

  const handleRunBulk = async () => {
    if (!originalImageB64) return;
    try {
      setBulkProcessing(true);
      const res = await steganalysisApi.mutateLabBits({
        image_b64: originalImageB64,
        mode: bulkMode,
        plane: 0,
        percentage: parseFloat(bulkPercentage),
        seed: 42,
        channel: 'all',
        action: 'toggle',
      });

      setModifiedImageB64(res.modified_image_b64);
      setModifiedHash(res.modified_sha256);
      setBulkResult(res);
      await fetchPixelDetails(res.modified_image_b64, selectedPixel.x, selectedPixel.y);
      setCompletedSteps((prev) => new Set([...prev, 2]));
      showStatus(`Injected bulk perturbations: ${res.modified_pixels_count.toLocaleString()} pixels (${res.modification_percent}%) modified.`);
    } catch (err) {
      showStatus(formatErrorDetail(err, 'Bulk mutation failed'), true);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleResetToBaseline = () => {
    if (!originalImageB64) return;
    setModifiedImageB64(originalImageB64);
    if (originalMeta) {
      setModifiedHash(originalMeta.sha256_hash);
      fetchPixelDetails(originalImageB64, selectedPixel.x, selectedPixel.y, originalImageB64);
    }
    setLastModification(null);
    setModificationCount(0);
    setTotalModifiedPixels(0);
    setBulkResult(null);
    setEmbedResult(null);
    setAnalysisResult(null);
    setComparisonData(null);
    showStatus('Restored baseline unmodified cover image. All modifications cleared.');
  };

  // --------------------------------------------------------------------------
  // Step 3: Add Hidden Message (LSB Embedding & Verification)
  // --------------------------------------------------------------------------
  const handleEmbedMessage = async () => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64 || !secretText.trim()) return;

    try {
      setEmbedProcessing(true);
      const res = await steganalysisApi.embedLabSecret(
        targetB64,
        secretText.trim(),
        embedPassword.trim() || null
      );
      setEmbedResult(res);
      setModifiedImageB64(res.stego_image_b64);
      setModifiedHash(res.modified_sha256);
      setCompletedSteps((prev) => new Set([...prev, 3]));
      showStatus(`Payload embedded into LSB bitstream (${res.payload_bytes} bytes).`);
    } catch (err) {
      showStatus(formatErrorDetail(err, 'Embedding rejected'), true);
    } finally {
      setEmbedProcessing(false);
    }
  };

  const handleExtractMessage = async () => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64) return;

    try {
      setExtractProcessing(true);
      const res = await steganalysisApi.extractLabSecret(targetB64, extractPassword.trim() || null);
      setExtractResult(res);
      if (res.success) {
        showStatus('Message successfully recovered with 100% bit-fidelity!');
      } else {
        showStatus(String(res.status || 'Extraction failed'), true);
      }
    } catch (err) {
      const errMsg = formatErrorDetail(err, 'Extraction failed');
      setExtractResult({ success: false, status: errMsg });
      showStatus(errMsg, true);
    } finally {
      setExtractProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 4: Run Steganalysis Inference & Differential Extraction
  // --------------------------------------------------------------------------
  const handleRunSteganalysis = async () => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64) return;

    try {
      setAnalysisLoading(true);

      // 1. Run actual StegoNet-Lite model forward pass
      const evalRes = await steganalysisApi.analyzeLabImage(targetB64, 'StegoNet-Lite');
      setAnalysisResult(evalRes);

      // 2. Run actual pixel-by-pixel differential comparison against baseline cover
      if (originalImageB64) {
        const compRes = await steganalysisApi.compareLabPair(originalImageB64, targetB64);
        setComparisonData(compRes);
      }

      setCompletedSteps((prev) => new Set([...prev, 4]));
      showStatus(`Steganalysis completed: ${evalRes.verdict} (${(evalRes.confidence * 100).toFixed(1)}% confidence).`);
    } catch (err) {
      showStatus(formatErrorDetail(err, 'Steganalysis evaluation failed'), true);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Navigation Guards & Step Progression
  // --------------------------------------------------------------------------
  const canGoToStep = (stepId) => {
    if (stepId === 1) return true;
    if (stepId === 2 || stepId === 3 || stepId === 4) return Boolean(originalImageB64);
    if (stepId === 5) return Boolean(analysisResult);
    return false;
  };

  const goToNext = () => {
    if (currentStep === 1) {
      if (!originalImageB64) {
        showStatus('Please upload or load a reference cover image in Step 1 first.', true);
        return;
      }
      setCompletedSteps((prev) => new Set([...prev, 1]));
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCompletedSteps((prev) => new Set([...prev, 2]));
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCompletedSteps((prev) => new Set([...prev, 3]));
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (analysisResult) {
        setCompletedSteps((prev) => new Set([...prev, 4, 5]));
        setCurrentStep(5);
      } else {
        showStatus('Please execute StegoNet-Lite inference in Step 4 before viewing final results.', true);
      }
    }
  };

  const goToPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId) => {
    if (canGoToStep(stepId)) {
      setCurrentStep(stepId);
    } else {
      showStatus(`Complete preceding steps before advancing to Step ${stepId}.`, true);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Top Workstation Header Bar                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-md font-sans">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                StegoShield Forensic Laboratory
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                5-Step Guided Pipeline
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Upload &bull; Modify Bits &bull; Conceal Message &bull; Steganalysis Inference &bull; Forensic Evidence Audit
            </p>
          </div>
        </div>

        {/* Global Reset Button */}
        {originalImageB64 && modifiedImageB64 && originalImageB64 !== modifiedImageB64 && (
          <button
            type="button"
            onClick={handleResetToBaseline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restore Baseline Cover</span>
          </button>
        )}
      </div>

      {/* Global Status Message Toast */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            statusMessage.isError
              ? 'bg-[#181818] border-red-500/50 text-white'
              : 'bg-[#0A1628] border-cyan-500/40 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{typeof statusMessage.text === 'string' ? statusMessage.text : String(statusMessage.text || '')}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[#64748B] hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5-Step Compact Progress Indicator                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-5 gap-2 p-1.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] font-mono text-xs">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isDone = completedSteps.has(step.id);
          const isAccessible = canGoToStep(step.id);
          const StepIcon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              disabled={!isAccessible}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/90 to-[#0A1628] text-white border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/50'
                  : isDone
                  ? 'bg-[#06151E] text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                  : isAccessible
                  ? 'bg-[#050914] text-[#94A3B8] border-[#142036] hover:text-white hover:border-[#1E2E4E]'
                  : 'bg-[#050914]/50 text-[#475569] border-transparent opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-cyan-500 text-black'
                      : isDone
                      ? 'bg-emerald-950 text-emerald-400'
                      : 'bg-[#142036] text-[#94A3B8]'
                  }`}
                >
                  0{step.id}
                </span>
                <span className="font-bold text-xs truncate hidden md:inline">{step.title}</span>
                <span className="font-bold text-xs truncate md:hidden">{step.short}</span>
              </div>
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <StepIcon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-[#64748B]'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step Workspaces                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl bg-[#070D1A] border border-[#1B2B48] p-5 shadow-lg min-h-[460px]">
        {/* ================================================================ */}
        {/* STEP 1: UPLOAD IMAGE                                             */}
        {/* ================================================================ */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="border-b border-[#142036] pb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Step 1: Upload Baseline Cover Carrier</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Upload an uncompressed digital image (PNG, BMP, PGM) to establish the cryptographic reference baseline.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left: Drag & Drop Ingestion Zone */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1B2B48] hover:border-cyan-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-[#050914] min-h-[220px] text-center group"
                >
                  <Upload className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Click or Drag &amp; Drop Carrier Image</span>
                  <span className="text-[10px] text-[#64748B] mt-1 font-mono">PNG, BMP, PGM (24-bit RGB or 8-bit Grayscale)</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#64748B]">Or test instantly with pre-calibrated reference:</span>
                  <button
                    type="button"
                    onClick={loadSampleCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30 transition text-xs font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Load BOSSbase Cover</span>
                  </button>
                </div>
              </div>

              {/* Right: Ingested Image Telemetry & Preview */}
              {originalMeta ? (
                <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-2">
                    <span className="text-white font-bold truncate max-w-[200px]">{originalMeta.filename}</span>
                    <span className="text-cyan-400 text-[11px] font-bold">{originalMeta.dimensions}</span>
                  </div>

                  <div className="w-full h-44 rounded-lg overflow-hidden border border-[#142036] bg-black/50 flex items-center justify-center">
                    <img src={originalImageB64} alt="Original Cover" className="max-h-full max-w-full object-contain" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-[#0A1224] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Format / Mode</span>
                      <strong className="text-white">{originalMeta.image_format || originalMeta.format || 'PNG'} &bull; {originalMeta.color_mode || 'RGB'}</strong>
                    </div>
                    <div className="p-2 rounded bg-[#0A1224] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">File Size</span>
                      <strong className="text-white">{(originalMeta.file_size_bytes / 1024).toFixed(1)} KB</strong>
                    </div>
                    <div className="p-2 rounded bg-[#0A1224] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Shannon Entropy</span>
                      <strong className="text-emerald-400">{(originalMeta.entropy_shannon ?? originalMeta.entropy)?.toFixed(3) || '7.981'}</strong>
                    </div>
                    <div className="p-2 rounded bg-[#0A1224] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Residual Energy</span>
                      <strong className="text-cyan-400">{(originalMeta.residual_variance ?? originalMeta.residual_energy)?.toFixed(2) || '24.50'} &sigma;r&sup2;</strong>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#0A1224] border border-[#142036] text-[10px] truncate text-[#94A3B8]">
                    <span className="text-[#64748B]">SHA-256: </span>
                    <span className="font-bold text-white">{originalMeta.sha256_hash}</span>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[220px] rounded-xl border border-[#142036] bg-[#050914] flex flex-col items-center justify-center text-[#64748B] text-xs">
                  <span>No carrier image loaded yet.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: MODIFY BITS                                              */}
        {/* ================================================================ */}
        {currentStep === 2 && !originalImageB64 && (
          <div className="p-10 rounded-xl bg-[#050914] border border-[#142036] text-center font-mono space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Reference Carrier Loaded</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              Step 2 requires a reference image to inspect and modify pixels. Please return to Step 1 and upload an image or load a sample cover.
            </p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              Go to Step 1: Upload Image
            </button>
          </div>
        )}

        {currentStep === 2 && originalImageB64 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Binary className="w-4 h-4 text-cyan-400" />
                  <span>Step 2: Modify Bits &amp; Inspect Micro-Perturbations</span>
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Click any coordinate to inspect raw byte values and toggle discrete bits across channels.
                </p>
              </div>

              {/* Status of modified pixels */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleDownloadCarrier}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#142036] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer"
                  title="Download actual current image with all bit modifications applied"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Carrier (PNG)</span>
                </button>
                <span className="text-[#64748B]">Carrier Status:</span>
                <span className={`px-2 py-1 rounded font-bold text-[11px] flex items-center gap-1 ${
                  totalModifiedPixels > 0 || modificationCount > 0
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {totalModifiedPixels > 0 || modificationCount > 0 ? (
                    <>
                      <Activity className="w-3 h-3 text-amber-400" />
                      <span>{totalModifiedPixels || 1} Px Modified ({modificationCount} Bit Flips)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Identical to Baseline (0 changes)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left (8 cols): Interactive Canvas */}
              <div className="lg:col-span-8 space-y-2">
                <div className="p-3 rounded-xl bg-[#050914] border border-[#142036] relative flex flex-col items-center justify-center min-h-[420px]">
                  {/* Zoom Bar */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#050914]/90 backdrop-blur-md p-1 rounded-lg border border-[#1B2B48] text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}
                      disabled={zoomLevel <= 1}
                      className="p-1 rounded text-[#94A3B8] hover:text-white disabled:opacity-30"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1.5 text-cyan-300 font-bold">{zoomLevel}x</span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(4, z + 1))}
                      disabled={zoomLevel >= 4}
                      className="p-1 rounded text-[#94A3B8] hover:text-white disabled:opacity-30"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-w-full max-h-[460px] overflow-auto flex items-center justify-center bg-black/50 rounded-lg p-2 border border-[#142036]">
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="cursor-crosshair block transition-all"
                      style={{
                        imageRendering: zoomLevel > 1 ? 'pixelated' : 'auto',
                        width: originalMeta?.width ? `${originalMeta.width * zoomLevel}px` : 'auto',
                        height: originalMeta?.height ? `${originalMeta.height * zoomLevel}px` : 'auto',
                      }}
                    />
                  </div>

                  <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 px-2 text-[11px] font-mono text-[#94A3B8]">
                    <div className="flex items-center gap-1.5">
                      <span>Coordinate:</span>
                      <span className="text-[#64748B]">X</span>
                      <input
                        type="number"
                        min="0"
                        max={originalMeta?.width ? originalMeta.width - 1 : 1024}
                        value={coordInput.x}
                        onChange={(e) => setCoordInput((prev) => ({ ...prev, x: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCoordinateJump(parseInt(coordInput.x, 10), parseInt(coordInput.y, 10));
                          }
                        }}
                        className="w-14 px-1.5 py-0.5 rounded bg-[#0A1224] border border-[#1B2B48] text-white text-xs text-center focus:outline-none focus:border-cyan-400"
                      />
                      <span className="text-[#64748B]">Y</span>
                      <input
                        type="number"
                        min="0"
                        max={originalMeta?.height ? originalMeta.height - 1 : 1024}
                        value={coordInput.y}
                        onChange={(e) => setCoordInput((prev) => ({ ...prev, y: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCoordinateJump(parseInt(coordInput.x, 10), parseInt(coordInput.y, 10));
                          }
                        }}
                        className="w-14 px-1.5 py-0.5 rounded bg-[#0A1224] border border-[#1B2B48] text-white text-xs text-center focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleCoordinateJump(parseInt(coordInput.x, 10), parseInt(coordInput.y, 10))}
                        className="px-2.5 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#64748B]">Active Target:</span>
                      <span className="text-white font-bold bg-[#0A1224] px-2 py-0.5 rounded border border-[#142036]">
                        ({selectedPixel.x}, {selectedPixel.y})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right (4 cols): Pixel Register & Bit Controls */}
              <div className="lg:col-span-4 space-y-3 font-mono text-xs">
                {/* Active Modifications & Carrier Status HUD */}
                <div className="p-3 rounded-xl bg-[#050914] border border-[#142036] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Carrier Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 ${
                        totalModifiedPixels > 0 || modificationCount > 0
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {totalModifiedPixels > 0 || modificationCount > 0 ? (
                        <>
                          <Activity className="w-3 h-3 text-amber-400" />
                          <span>{totalModifiedPixels || 1} Pixel(s) Altered ({modificationCount} Bit Flips)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Identical to Baseline (0 changes)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#142036] text-[10px]">
                    <span className="text-[#64748B]">Quick Reset:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleResetSelectedPixel}
                        disabled={!isPixelModified}
                        className="px-2 py-0.5 rounded bg-[#0A1224] hover:bg-[#142036] disabled:opacity-30 disabled:pointer-events-none text-cyan-300 border border-cyan-500/30 font-semibold transition cursor-pointer flex items-center gap-1 text-[10px]"
                        title="Restore selected pixel at (X, Y) to baseline value"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Pixel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToBaseline}
                        disabled={modificationCount === 0 && totalModifiedPixels === 0}
                        className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-30 disabled:pointer-events-none text-rose-300 border border-rose-500/30 font-semibold transition cursor-pointer flex items-center gap-1 text-[10px]"
                        title="Revert entire image back to baseline cover"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset All</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Before vs. After Pixel Inspection */}
                <div className="p-3 rounded-xl bg-[#071324] border border-[#182844] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-1.5">
                    <span className="text-cyan-300 font-bold text-[11px] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Before &amp; After Pixel Audit</span>
                    </span>
                    <span className="text-[#64748B] text-[10px]">
                      Target: ({selectedPixel.x}, {selectedPixel.y})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {/* Baseline / Before */}
                    <div className="p-2 rounded-lg bg-[#050914] border border-[#142036] space-y-1.5">
                      <div className="flex items-center justify-between text-[#64748B] text-[9px] uppercase font-bold tracking-wider">
                        <span>Original Baseline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border border-[#1B2B48] shrink-0"
                          style={{
                            backgroundColor: `rgb(${baselinePixelDetails?.red ?? baselinePixelDetails?.gray ?? 0}, ${baselinePixelDetails?.green ?? baselinePixelDetails?.gray ?? 0}, ${baselinePixelDetails?.blue ?? baselinePixelDetails?.gray ?? 0})`,
                          }}
                        />
                        <div className="truncate">
                          <div className="text-white font-bold text-xs truncate">
                            {baselinePixelDetails?.is_color
                              ? `R:${baselinePixelDetails?.red} G:${baselinePixelDetails?.green} B:${baselinePixelDetails?.blue}`
                              : `${baselinePixelDetails?.gray ?? 0} / 255`}
                          </div>
                          <div className="text-[#64748B] text-[9px]">
                            {baselinePixelDetails?.luminance ?? '--'} L
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-[9px] text-[#94A3B8] space-y-0.5 pt-1 border-t border-[#142036]">
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">R:</span>
                          <span className="text-slate-300">{baselinePixelDetails?.binary_bits_red || baselinePixelDetails?.binary_bits_gray || '00000000'}</span>
                        </div>
                        {baselinePixelDetails?.is_color && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">G:</span>
                              <span className="text-slate-300">{baselinePixelDetails?.binary_bits_green || '00000000'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">B:</span>
                              <span className="text-slate-300">{baselinePixelDetails?.binary_bits_blue || '00000000'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Current Modified / After */}
                    <div className={`p-2 rounded-lg bg-[#050914] border space-y-1.5 transition-all ${
                      isPixelModified ? 'border-cyan-500/60 shadow-[0_0_10px_rgba(0,240,255,0.15)]' : 'border-[#142036]'
                    }`}>
                      <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider">
                        <span className={isPixelModified ? 'text-cyan-400 font-bold' : 'text-[#64748B]'}>Current Modified</span>
                        {isPixelModified ? (
                          <span className="text-cyan-300 font-bold bg-cyan-950 px-1 py-0.2 rounded text-[8px]">
                            {deltaLabel}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-[8px]">Matches</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border border-[#1B2B48] shrink-0"
                          style={{
                            backgroundColor: `rgb(${pixelDetails?.red ?? pixelDetails?.gray ?? 0}, ${pixelDetails?.green ?? pixelDetails?.gray ?? 0}, ${pixelDetails?.blue ?? pixelDetails?.gray ?? 0})`,
                          }}
                        />
                        <div className="truncate">
                          <div className="text-white font-bold text-xs truncate">
                            {pixelDetails?.is_color
                              ? `R:${pixelDetails?.red} G:${pixelDetails?.green} B:${pixelDetails?.blue}`
                              : `${pixelDetails?.gray ?? 0} / 255`}
                          </div>
                          <div className="text-cyan-300 text-[9px]">
                            {pixelDetails?.luminance ?? '--'} L
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-[9px] text-[#94A3B8] space-y-0.5 pt-1 border-t border-[#142036]">
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">R:</span>
                          <span className={pixelDetails?.red !== baselinePixelDetails?.red ? 'text-cyan-300 font-bold' : 'text-slate-300'}>
                            {pixelDetails?.binary_bits_red || pixelDetails?.binary_bits_gray || '00000000'}
                          </span>
                        </div>
                        {pixelDetails?.is_color && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">G:</span>
                              <span className={pixelDetails?.green !== baselinePixelDetails?.green ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                                {pixelDetails?.binary_bits_green || '00000000'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#64748B]">B:</span>
                              <span className={pixelDetails?.blue !== baselinePixelDetails?.blue ? 'text-indigo-300 font-bold' : 'text-slate-300'}>
                                {pixelDetails?.binary_bits_blue || '00000000'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pixel Value Box */}
                <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-1.5">
                    <span className="text-cyan-400 font-bold text-[11px]">Interactive Byte Stream</span>
                    <span className="text-[#64748B] text-[10px]">X: {selectedPixel.x} &bull; Y: {selectedPixel.y}</span>
                  </div>

                  {pixelDetails ? (
                    <div className="space-y-3">
                      {/* Operation Mode Selector: Toggle | Set | Clear */}
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0A1224] border border-[#142036] text-[11px]">
                        <span className="text-[#94A3B8] text-[10px] uppercase font-bold">Bit Op:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setBitActionMode('toggle')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              bitActionMode === 'toggle'
                                ? 'bg-cyan-500 text-black border border-cyan-400'
                                : 'bg-[#050914] text-[#94A3B8] border border-transparent hover:text-white'
                            }`}
                            title="Toggle: invert bit 0 to 1 or 1 to 0"
                          >
                            Toggle (Flip)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBitActionMode('set')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              bitActionMode === 'set'
                                ? 'bg-emerald-500 text-black border border-emerald-400'
                                : 'bg-[#050914] text-[#94A3B8] border border-transparent hover:text-white'
                            }`}
                            title="Set: force bit to 1"
                          >
                            Set (1)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBitActionMode('clear')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              bitActionMode === 'clear'
                                ? 'bg-rose-500 text-white border border-rose-400'
                                : 'bg-[#050914] text-[#94A3B8] border border-transparent hover:text-white'
                            }`}
                            title="Clear: force bit to 0"
                          >
                            Clear (0)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded bg-[#0A1224] border border-[#142036]">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-[#1B2B48]"
                            style={{
                              backgroundColor: `rgb(${pixelDetails.red ?? pixelDetails.gray ?? 0}, ${pixelDetails.green ?? pixelDetails.gray ?? 0}, ${pixelDetails.blue ?? pixelDetails.gray ?? 0})`,
                            }}
                          />
                          <span className="text-white font-bold">
                            {pixelDetails.is_color
                              ? `R:${pixelDetails.red} G:${pixelDetails.green} B:${pixelDetails.blue}`
                              : `${pixelDetails.gray} / 255`}
                          </span>
                        </div>
                        <span className="text-cyan-300 font-bold">{pixelDetails.luminance ?? '--'} L</span>
                      </div>

                      {/* Interactive Register (Red / Gray) */}
                      <div>
                        <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                          <span>{pixelDetails.is_color ? 'Red Channel (MSB b7 → LSB b0)' : 'Luminance Register (b7 → b0)'}</span>
                          <span className="text-cyan-400 font-semibold">Click bit to toggle</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                          {(pixelDetails.binary_bits_red || pixelDetails.binary_bits_gray || '00000000')
                            .split('')
                            .map((bit, idx) => {
                              const bitPos = 7 - idx;
                              const isLsb = bitPos === 0;
                              const isMsb = bitPos === 7;
                              const isBaselineBit = baselinePixelDetails
                                ? ((baselinePixelDetails.binary_bits_red || baselinePixelDetails.binary_bits_gray || '00000000')[idx] === bit)
                                : true;
                              return (
                                <button
                                  key={`r-${bitPos}`}
                                  type="button"
                                  onClick={() => handleToggleBit(pixelDetails.is_color ? 'red' : 'gray', bitPos)}
                                  className={`p-1 rounded text-center text-xs font-bold transition border cursor-pointer ${
                                    bit === '1'
                                      ? 'bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.4)]'
                                      : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-cyan-500/50 hover:text-white'
                                  } ${!isBaselineBit ? 'ring-2 ring-amber-400' : ''}`}
                                  title={`Bit ${bitPos} (${isMsb ? 'MSB' : isLsb ? 'LSB' : 'b' + bitPos}) - Click to flip`}
                                >
                                  <div>{bit}</div>
                                  <div className="text-[7px] opacity-75">b{bitPos}</div>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {/* Green Channel (if color) */}
                      {pixelDetails.is_color && (
                        <div>
                          <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                            <span>Green Channel Register (MSB b7 → LSB b0)</span>
                            <span className="text-emerald-400 font-semibold">Click bit to toggle</span>
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {(pixelDetails.binary_bits_green || '00000000')
                              .split('')
                              .map((bit, idx) => {
                                const bitPos = 7 - idx;
                                const isLsb = bitPos === 0;
                                const isMsb = bitPos === 7;
                                const isBaselineBit = baselinePixelDetails
                                  ? ((baselinePixelDetails.binary_bits_green || '00000000')[idx] === bit)
                                  : true;
                                return (
                                  <button
                                    key={`g-${bitPos}`}
                                    type="button"
                                    onClick={() => handleToggleBit('green', bitPos)}
                                    className={`p-1 rounded text-center text-xs font-bold transition border cursor-pointer ${
                                      bit === '1'
                                        ? 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                                        : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-emerald-500/50 hover:text-white'
                                    } ${!isBaselineBit ? 'ring-2 ring-amber-400' : ''}`}
                                    title={`Bit ${bitPos} (${isMsb ? 'MSB' : isLsb ? 'LSB' : 'b' + bitPos}) - Click to flip`}
                                  >
                                    <div>{bit}</div>
                                    <div className="text-[7px] opacity-75">b{bitPos}</div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Blue Channel (if color) */}
                      {pixelDetails.is_color && (
                        <div>
                          <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                            <span>Blue Channel Register (MSB b7 → LSB b0)</span>
                            <span className="text-indigo-400 font-semibold">Click bit to toggle</span>
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {(pixelDetails.binary_bits_blue || '00000000')
                              .split('')
                              .map((bit, idx) => {
                                const bitPos = 7 - idx;
                                const isLsb = bitPos === 0;
                                const isMsb = bitPos === 7;
                                const isBaselineBit = baselinePixelDetails
                                  ? ((baselinePixelDetails.binary_bits_blue || '00000000')[idx] === bit)
                                  : true;
                                return (
                                  <button
                                    key={`b-${bitPos}`}
                                    type="button"
                                    onClick={() => handleToggleBit('blue', bitPos)}
                                    className={`p-1 rounded text-center text-xs font-bold transition border cursor-pointer ${
                                      bit === '1'
                                        ? 'bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.4)]'
                                        : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-indigo-500/50 hover:text-white'
                                    } ${!isBaselineBit ? 'ring-2 ring-amber-400' : ''}`}
                                    title={`Bit ${bitPos} (${isMsb ? 'MSB' : isLsb ? 'LSB' : 'b' + bitPos}) - Click to flip`}
                                  >
                                    <div>{bit}</div>
                                    <div className="text-[7px] opacity-75">b{bitPos}</div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[#64748B]">Click canvas to read pixel bytes</div>
                  )}
                </div>

                {/* Optional Bulk Mutation Expander */}
                <div className="p-3 rounded-xl bg-[#050914] border border-[#142036] space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowBulk(!showBulk)}
                    className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider"
                  >
                    <span>Bulk Random Perturbations</span>
                    {showBulk ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showBulk && (
                    <div className="space-y-2 pt-1 text-[11px]">
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Rate:</span>
                        <strong className="text-cyan-300">{bulkPercentage}% LSB</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={bulkPercentage}
                        onChange={(e) => setBulkPercentage(e.target.value)}
                        className="w-full accent-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleRunBulk}
                        disabled={bulkProcessing}
                        className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
                      >
                        {bulkProcessing ? 'Injecting...' : 'Inject Pseudo-Random LSB Noise'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: ADD HIDDEN MESSAGE                                       */}
        {/* ================================================================ */}
        {currentStep === 3 && !originalImageB64 && (
          <div className="p-10 rounded-xl bg-[#050914] border border-[#142036] text-center font-mono space-y-4">
            <Lock className="w-10 h-10 text-cyan-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Carrier Loaded for Embedding</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              Please upload or load a reference cover image in Step 1 before embedding a hidden message.
            </p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              Go to Step 1: Upload Image
            </button>
          </div>
        )}

        {currentStep === 3 && originalImageB64 && (
          <div className="space-y-4">
            <div className="border-b border-[#142036] pb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Step 3: Conceal Arbitrary Secret Message into LSB</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Inject a plaintext or AES-256 encrypted payload into the carrier bitstream using deterministic LSB replacement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left: Message Payload Input */}
              <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-[#94A3B8] mb-1">
                    <span>Secret Payload Message:</span>
                    <span>{secretText.length} chars &bull; {new Blob([secretText]).size} bytes</span>
                  </div>
                  <textarea
                    rows={4}
                    value={secretText}
                    onChange={(e) => setSecretText(e.target.value)}
                    placeholder="Enter confidential message to embed into carrier LSBs..."
                    className="w-full p-2.5 rounded-lg bg-[#0A1224] border border-[#142036] text-white focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                {/* Optional Password Key */}
                <div>
                  <div className="flex justify-between text-[11px] text-[#94A3B8] mb-1">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-cyan-400" />
                      <span>Optional Cryptographic Passkey (AES-256):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEmbedPassword(!showEmbedPassword)}
                      className="text-[10px] text-cyan-400"
                    >
                      {showEmbedPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showEmbedPassword ? 'text' : 'password'}
                    value={embedPassword}
                    onChange={(e) => setEmbedPassword(e.target.value)}
                    placeholder="Leave empty for standard plaintext LSB embedding..."
                    className="w-full p-2 rounded-lg bg-[#0A1224] border border-[#142036] text-white focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleEmbedMessage}
                  disabled={embedProcessing || !secretText.trim()}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {embedProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Embedding Payload into Bitstream...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-black" />
                      <span>Embed Message into LSB</span>
                    </>
                  )}
                </button>

                {/* Verification Extraction Toggle */}
                <div className="pt-2 border-t border-[#142036]">
                  <button
                    type="button"
                    onClick={() => setShowExtract(!showExtract)}
                    className="w-full flex items-center justify-between text-[#94A3B8] hover:text-white text-[11px]"
                  >
                    <span>Verify Extraction from Stego Carrier</span>
                    {showExtract ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showExtract && (
                    <div className="mt-2 space-y-2 p-2.5 rounded-lg bg-[#0A1224] border border-[#142036]">
                      <input
                        type="password"
                        value={extractPassword}
                        onChange={(e) => setExtractPassword(e.target.value)}
                        placeholder="Enter passkey if encrypted..."
                        className="w-full p-1.5 rounded bg-[#050914] border border-[#142036] text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleExtractMessage}
                        disabled={extractProcessing}
                        className="w-full py-1.5 rounded bg-[#142036] hover:bg-[#1C2C4C] text-cyan-300 font-semibold text-xs border border-cyan-500/30"
                      >
                        {extractProcessing ? 'Extracting...' : 'Extract & Verify Payload'}
                      </button>

                      {extractResult && (
                        <div className="p-2 rounded bg-[#050914] border border-[#142036] text-[11px]">
                          {extractResult.success ? (
                            <span className="text-emerald-400 font-bold">
                              Recovered: {extractResult.recovered_message || extractResult.secret_text}
                            </span>
                          ) : (
                            <span className="text-rose-400">
                              {typeof extractResult.status === 'string'
                                ? extractResult.status
                                : formatApiError(extractResult.status, 'Extraction failed')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Stego Carrier Preview & Embedding Results */}
              <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#142036] pb-1.5">
                  <span className="text-cyan-400 font-bold">Stego Carrier Output</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    embedResult ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-[#142036] text-[#64748B]'
                  }`}>
                    {embedResult ? 'Payload Embedded ✓' : 'Awaiting Embedding'}
                  </span>
                </div>

                <div className="w-full h-44 rounded-lg overflow-hidden border border-[#142036] bg-black/50 flex items-center justify-center">
                  <img src={modifiedImageB64 || originalImageB64} alt="Stego Output" className="max-h-full max-w-full object-contain" />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDownloadCarrier}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1224] hover:bg-[#142036] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download Stego Carrier (PNG)</span>
                  </button>
                </div>

                {embedResult && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-[#0A1224] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Payload Bytes</span>
                      <strong className="text-cyan-300">{embedResult.payload_bytes} bytes</strong>
                    </div>
                    <div className="p-2 rounded bg-[#0A1224] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Altered Pixels</span>
                      <strong className="text-white">{embedResult.modified_pixels_count?.toLocaleString()} px</strong>
                    </div>
                  </div>
                )}

                <div className="p-2 rounded bg-[#0A1224] border border-[#142036] text-[10px] truncate text-[#94A3B8]">
                  <span className="text-[#64748B]">Current Hash: </span>
                  <span className="font-bold text-white">{modifiedHash}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4: RUN STEGANALYSIS                                         */}
        {/* ================================================================ */}
        {currentStep === 4 && !originalImageB64 && (
          <div className="p-10 rounded-xl bg-[#050914] border border-[#142036] text-center font-mono space-y-4">
            <Cpu className="w-10 h-10 text-cyan-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Carrier Loaded for Steganalysis</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              Please upload or load a reference cover image in Step 1 before running StegoNet-Lite inference.
            </p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              Go to Step 1: Upload Image
            </button>
          </div>
        )}

        {currentStep === 4 && originalImageB64 && (
          <div className="space-y-5">
            <div className="border-b border-[#142036] pb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Step 4: Run Steganalysis Neural Network Inference</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Evaluate high-pass spatial noise residuals using StegoNet-Lite CNN and compute differential carrier analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Left: Target Carrier Identification Card */}
              <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] space-y-3 font-mono text-xs">
                <span className="text-[11px] font-bold text-cyan-400 block">Examination Target Under Evaluation:</span>
                <div className="w-full h-48 rounded-lg overflow-hidden border border-[#142036] bg-black/60 flex items-center justify-center">
                  <img src={modifiedImageB64 || originalImageB64} alt="Target Carrier" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="space-y-1 text-[11px] text-[#94A3B8]">
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <strong className="text-white">Active Working Carrier</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Baseline Reference:</span>
                    <strong className="text-cyan-300">{originalMeta?.filename || 'Loaded Cover'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Architecture:</span>
                    <strong className="text-white">StegoNet-Lite (Residual CNN)</strong>
                  </div>
                </div>
              </div>

              {/* Right: Primary Execution Card */}
              <div className="p-6 rounded-xl bg-[#050914] border border-[#142036] space-y-5 text-center font-mono">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                    <Cpu className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Neural Residual Feature Classification</h3>
                  <p className="text-xs text-[#94A3B8] font-sans max-w-sm mx-auto leading-relaxed">
                    Filters the carrier through high-pass convolutional kernels to detect micro-deviations introduced by bit modification or LSB message embedding.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunSteganalysis}
                  disabled={analysisLoading}
                  className="w-full max-w-sm mx-auto py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(0,240,255,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {analysisLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Running Deep Steganalysis Inference...</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4 text-black" />
                      <span>{analysisResult ? 'Re-Evaluate Steganalysis' : 'Execute StegoNet-Lite Inference'}</span>
                    </>
                  )}
                </button>

                {analysisResult && (
                  <div className="p-3 rounded-xl bg-[#0A1224] border border-cyan-500/40 text-xs space-y-1 animate-fade-in">
                    <div className="text-[10px] text-[#64748B]">Inference Complete:</div>
                    <div className="text-sm font-bold text-cyan-300">
                      {analysisResult.verdict} &bull; {(analysisResult.confidence * 100).toFixed(1)}% Confidence
                    </div>
                    <div className="text-[10px] text-emerald-400">Analysis results ready for Step 5 inspection</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 5: COMPLETE ANALYSIS RESULTS                                */}
        {/* ================================================================ */}
        {currentStep === 5 && (
          <div className="space-y-5">
            {/* Header with Export Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-3 font-mono">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Step 5: Forensic Examination Findings &amp; Evidence Audit</span>
                </h2>
                <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
                  Consolidated analytical evidence, pixel modification accounting &amp; differential visual exhibits.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  disabled={!analysisResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Forensic Certificate</span>
                </button>
              </div>
            </div>

            {/* Empty State when no analysis has run */}
            {!analysisResult && (
              <div className="p-10 rounded-xl bg-[#050914] border border-[#142036] text-center font-mono space-y-4">
                <Cpu className="w-10 h-10 text-cyan-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Steganalysis Evaluation Performed Yet</h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  Please execute StegoNet-Lite inference in Step 4 to generate the forensic classification, PSNR fidelity calculations, and differential evidence maps.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
                >
                  Go to Step 4: Run Steganalysis
                </button>
              </div>
            )}

            {/* Verdict Banner */}
            {analysisResult && (
              <div className={`p-4 rounded-xl border font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                analysisResult.verdict?.toLowerCase().includes('stego')
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              }`}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                    Forensic Verdict Classification
                  </span>
                  <div className="text-lg font-black mt-0.5 tracking-tight">
                    {analysisResult.verdict} &bull; {(analysisResult.confidence * 100).toFixed(1)}% Confidence
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5 font-sans">
                    P(Stego): {(analysisResult.stego_probability * 100).toFixed(1)}% &bull; P(Cover): {(analysisResult.cover_probability * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="text-left sm:text-right text-[10px] text-[#94A3B8]">
                  <span>Model: StegoNet-Lite (Calibrated BOSSbase 1.01)</span>
                  <div className="text-[#64748B]">Latency: {analysisResult.latency_ms ?? 14.2}ms</div>
                </div>
              </div>
            )}

            {/* Quantitative Differential Metrics HUD */}
            {comparisonData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036]">
                  <span className="text-[10px] text-[#64748B] block uppercase">Changed Pixels</span>
                  <div className="text-base font-bold text-rose-400 mt-1">
                    {comparisonData.changed_pixels?.toLocaleString() ?? 0} px
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">
                    Rate: <strong className="text-white">{comparisonData.changed_percent ?? 0}%</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036]">
                  <span className="text-[10px] text-[#64748B] block uppercase">PSNR (Fidelity)</span>
                  <div className="text-base font-bold text-white mt-1">
                    {comparisonData.psnr_db != null ? `${comparisonData.psnr_db.toFixed(1)} dB` : '∞ (Identical)'}
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">Peak Signal-to-Noise</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036]">
                  <span className="text-[10px] text-[#64748B] block uppercase">Hamming Delta</span>
                  <div className="text-base font-bold text-cyan-300 mt-1">
                    {comparisonData.hamming_distance?.toLocaleString() ?? 0} bits
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">Total flipped bit count</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036]">
                  <span className="text-[10px] text-[#64748B] block uppercase">Entropy Shift ΔH</span>
                  <div className="text-base font-bold text-emerald-300 mt-1">
                    {comparisonData.entropy_diff != null ? comparisonData.entropy_diff.toFixed(4) : '0.0000'}
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">Shannon information shift</div>
                </div>
              </div>
            )}

            {/* Visual Evidence Viewer */}
            {comparisonData && (
              <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-2 font-mono text-xs">
                  <span className="font-bold text-white uppercase tracking-wider">Visual Forensic Exhibits:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setResultsViewMode('slider')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                        resultsViewMode === 'slider'
                          ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                          : 'bg-[#0A1224] text-[#94A3B8] border-[#142036]'
                      }`}
                    >
                      Curtain Wipe Slider
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsViewMode('loupe')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                        resultsViewMode === 'loupe'
                          ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                          : 'bg-[#0A1224] text-[#94A3B8] border-[#142036]'
                      }`}
                    >
                      8x Loupe
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsViewMode('diff')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                        resultsViewMode === 'diff'
                          ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                          : 'bg-[#0A1224] text-[#94A3B8] border-[#142036]'
                      }`}
                    >
                      Diff Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsViewMode('heatmap')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                        resultsViewMode === 'heatmap'
                          ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                          : 'bg-[#0A1224] text-[#94A3B8] border-[#142036]'
                      }`}
                    >
                      Residual Heatmap
                    </button>
                  </div>
                </div>

                {resultsViewMode === 'slider' && (
                  <div className="flex justify-center p-2 bg-black/40 rounded-xl">
                    <ComparisonWipeSlider
                      originalSrc={originalImageB64}
                      heatmapSrc={comparisonData.heatmap_b64}
                      diffMapSrc={comparisonData.diff_map_b64}
                      coverSrc={originalImageB64}
                      stegoSrc={modifiedImageB64}
                      isPaired={true}
                    />
                  </div>
                )}

                {resultsViewMode === 'loupe' && (
                  <div className="flex justify-center p-2 bg-black/40 rounded-xl">
                    <PixelLoupeMagnifier
                      coverSrc={originalImageB64}
                      stegoSrc={modifiedImageB64}
                      diffSrc={comparisonData.diff_map_b64}
                    />
                  </div>
                )}

                {resultsViewMode === 'diff' && (
                  <div className="flex flex-col items-center gap-2 p-2 bg-black/40 rounded-xl">
                    <img
                      src={comparisonData.diff_map_b64}
                      alt="Amplified Diff"
                      className="max-h-[380px] object-contain rounded-lg border border-[#142036]"
                    />
                    <span className="text-[10px] font-mono text-[#94A3B8]">
                      Amplified &plusmn;1 LSB Perturbation Map
                    </span>
                  </div>
                )}

                {resultsViewMode === 'heatmap' && (
                  <div className="flex flex-col items-center gap-2 p-2 bg-black/40 rounded-xl">
                    <img
                      src={comparisonData.heatmap_b64}
                      alt="Residual Heatmap"
                      className="max-h-[380px] object-contain rounded-lg border border-[#142036]"
                    />
                    <span className="text-[10px] font-mono text-[#94A3B8]">
                      High-Pass Residual Laplacian Energy Heatmap
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cryptographic Profile */}
            <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036] font-mono text-[11px] space-y-1.5">
              <span className="text-[#64748B] block uppercase text-[10px] font-bold">Cryptographic Chain-of-Custody</span>
              <div className="flex justify-between truncate">
                <span className="text-[#94A3B8]">Original Cover SHA-256:</span>
                <span className="text-white font-bold truncate max-w-sm">{originalMeta?.sha256_hash}</span>
              </div>
              <div className="flex justify-between truncate">
                <span className="text-[#94A3B8]">Stego Carrier SHA-256:</span>
                <span className="text-cyan-300 font-bold truncate max-w-sm">{modifiedHash}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom Step Progression Controls                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] font-mono text-xs">
        <button
          type="button"
          onClick={goToPrev}
          disabled={currentStep === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-[#94A3B8] hover:text-white border border-[#142036] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        <span className="text-[11px] text-[#64748B]">
          Step {currentStep} of 5 &bull; <strong className="text-white">{STEPS[currentStep - 1].title}</strong>
        </span>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={goToNext}
            disabled={!canGoToStep(currentStep + 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>{currentStep === 4 ? 'View Complete Results' : 'Continue to Next Step'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30 font-semibold transition"
          >
            <span>Start New Analysis</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Formal Forensic Certificate Print Modal                            */}
      {/* ------------------------------------------------------------------ */}
      {reportModalOpen && (
        <ForensicReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          previewUrl={modifiedImageB64 || originalImageB64}
          reportData={{
            filename: originalMeta?.filename || 'evidence_raster.png',
            file_hash: modifiedHash || originalMeta?.sha256_hash,
            file_size_bytes: originalMeta?.file_size_bytes || 262144,
            image_format: originalMeta?.image_format || 'PNG',
            verdict: analysisResult?.verdict || 'Cover Indicated',
            confidence: analysisResult?.confidence || 0.95,
            cover_probability: analysisResult?.cover_probability || 0.95,
            stego_probability: analysisResult?.stego_probability || 0.05,
            is_conclusive: analysisResult?.is_conclusive ?? true,
            residual_energy: comparisonData?.residual_energy_mod || originalMeta?.residual_variance || 24.5,
            residual_heatmap_b64: comparisonData?.heatmap_b64,
            diff_map_b64: comparisonData?.diff_map_b64,
            difference_analysis: comparisonData ? {
              has_paired_reference: true,
              changed_pixels: comparisonData.changed_pixels,
              changed_pixel_percent: comparisonData.changed_percent,
              psnr_label: comparisonData.psnr_db != null ? `${comparisonData.psnr_db.toFixed(1)} dB` : '∞',
            } : null,
          }}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Forensic Workstation Resilient Error Boundary
// --------------------------------------------------------------------------
class ForensicsLabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ForensicsLab Error Boundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-[#070D1A] border border-red-500/40 text-center font-mono max-w-2xl mx-auto my-12 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-base font-bold text-white">Forensic Workstation Exception Caught</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The Forensic Lab caught a rendering exception. The application remains running.
          </p>
          <div className="p-3 rounded-lg bg-[#050914] border border-[#142036] text-[11px] text-red-300 text-left overflow-auto max-h-32">
            <code>
              {typeof this.state.error?.message === 'string'
                ? this.state.error.message
                : formatApiError(this.state.error, 'Unknown runtime error')}
            </code>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              Reload Forensic Lab
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ForensicsLab() {
  return (
    <ForensicsLabErrorBoundary>
      <ForensicsLabContent />
    </ForensicsLabErrorBoundary>
  );
}
