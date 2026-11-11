import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlaskConical,
  Upload,
  Binary,
  Layers,
  Lock,
  Unlock,
  Split,
  History,
  Activity,
  Cpu,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Save,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import PixelLoupeMagnifier from '../components/analysis/PixelLoupeMagnifier';

export default function ForensicsLab() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Active workspace tab: 'inspector' | 'manipulation' | 'embedding' | 'steganalysis' | 'comparison' | 'history'
  const [activeTab, setActiveTab] = useState('inspector');
  const [manipulationSubTab, setManipulationSubTab] = useState('pixel'); // 'pixel' | 'bulk' | 'bitplane'
  const [embeddingSubTab, setEmbeddingSubTab] = useState('embed'); // 'embed' | 'extract'

  // Image state (Original is immutable reference)
  const [originalMeta, setOriginalMeta] = useState(null);
  const [originalImageB64, setOriginalImageB64] = useState(null);
  const [modifiedImageB64, setModifiedImageB64] = useState(null);
  const [modifiedHash, setModifiedHash] = useState(null);

  // Canvas & Inspection Interaction State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedPixel, setSelectedPixel] = useState({ x: 0, y: 0 });
  const [pixelDetails, setPixelDetails] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Bulk bit manipulation state
  const [bulkMode, setBulkMode] = useState('lsb_only');
  const [bulkPlane, setBulkPlane] = useState(0);
  const [bulkPercentage, setBulkPercentage] = useState(10);
  const [bulkSeed, setBulkSeed] = useState(42);
  const [bulkAction, setBulkAction] = useState('toggle');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [lastBulkResult, setLastBulkResult] = useState(null);

  // Bit plane visualization state
  const [activePlane, setActivePlane] = useState(0);
  const [activeChannel, setActiveChannel] = useState('gray');
  const [bitplaneData, setBitplaneData] = useState(null);
  const [bitplaneLoading, setBitplaneLoading] = useState(false);

  // Secret message embedding state
  const [secretText, setSecretText] = useState('Confidential StegoLab Verification Payload #2026');
  const [embedPassword, setEmbedPassword] = useState('');
  const [embedProcessing, setEmbedProcessing] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);

  // Message extraction state
  const [extractPassword, setExtractPassword] = useState('');
  const [extractProcessing, setExtractProcessing] = useState(false);
  const [extractResult, setExtractResult] = useState(null);

  // Forensic Comparison State
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Steganalysis State
  const [analysisTarget, setAnalysisTarget] = useState('modified'); // 'original' | 'modified'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Experiment History State
  const [experiments, setExperiments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notification / Alert Banner
  const [statusMessage, setStatusMessage] = useState(null);

  const canvasRef = useRef(null);

  // Load sample image on mount for instant demonstration
  useEffect(() => {
    loadSampleCover();
    loadExperimentsList();
  }, []);

  const showStatus = (msg, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // --------------------------------------------------------------------------
  // Preset Sample Loader
  // --------------------------------------------------------------------------
  const loadSampleCover = async () => {
    try {
      setInspectLoading(true);
      const res = await fetch('/samples/sample_cover.png');
      const blob = await res.blob();
      const file = new File([blob], 'sample_cover_5001.png', { type: 'image/png' });
      await handleImageUpload(file);
    } catch (e) {
      console.warn('Failed to load preset cover sample:', e);
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
      setModifiedImageB64(data.lossless_png_b64); // initially derived equals original
      setModifiedHash(data.sha256_hash);
      setComparisonData(null);
      setAnalysisResult(null);
      setLastBulkResult(null);

      // Auto-inspect center pixel
      const cx = Math.floor(data.width / 2);
      const cy = Math.floor(data.height / 2);
      setSelectedPixel({ x: cx, y: cy });
      await fetchPixelDetails(data.lossless_png_b64, cx, cy);

      showStatus(`Loaded immutable reference: ${data.filename} (${data.dimensions})`);
    } catch (err) {
      showStatus(err.response?.data?.detail || err.message || 'Image upload failed', true);
    } finally {
      setInspectLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 2: Pixel Inspector & Bit Toggling
  // --------------------------------------------------------------------------
  const fetchPixelDetails = async (imgB64, x, y) => {
    try {
      const details = await steganalysisApi.inspectLabPixel(imgB64, x, y);
      setPixelDetails(details);
    } catch (e) {
      console.warn('Pixel inspection failed:', e);
    }
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !originalMeta) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = originalMeta.width / rect.width;
    const scaleY = originalMeta.height / rect.height;

    const px = Math.max(0, Math.min(originalMeta.width - 1, Math.floor(clickX * scaleX)));
    const py = Math.max(0, Math.min(originalMeta.height - 1, Math.floor(clickY * scaleY)));

    setSelectedPixel({ x: px, y: py });
    fetchPixelDetails(modifiedImageB64 || originalImageB64, px, py);
  };

  const handleToggleBit = async (channelIndex, bitPos) => {
    if (!pixelDetails || !modifiedImageB64) return;
    const channel = pixelDetails.channels[channelIndex];
    if (!channel) return;

    try {
      const toggleRes = await steganalysisApi.toggleLabBit(channel.value, bitPos);
      const applyRes = await steganalysisApi.applyLabPixel(
        modifiedImageB64,
        selectedPixel.x,
        selectedPixel.y,
        channelIndex,
        toggleRes.modified_value
      );

      setModifiedImageB64(applyRes.modified_image_b64);
      setModifiedHash(applyRes.modified_sha256);
      await fetchPixelDetails(applyRes.modified_image_b64, selectedPixel.x, selectedPixel.y);

      showStatus(
        `Pixel (${selectedPixel.x}, ${selectedPixel.y}) ${channel.channel}: ${toggleRes.original_value} -> ${toggleRes.modified_value} (${toggleRes.delta > 0 ? '+' : ''}${toggleRes.delta}) [Bit ${bitPos} flipped]`
      );
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Failed to toggle bit', true);
    }
  };

  const handleResetPixel = async (channelIndex) => {
    if (!originalImageB64 || !selectedPixel) return;
    try {
      // Re-fetch original pixel value
      const origDetails = await steganalysisApi.inspectLabPixel(originalImageB64, selectedPixel.x, selectedPixel.y);
      const origVal = origDetails.channels[channelIndex].value;

      const applyRes = await steganalysisApi.applyLabPixel(
        modifiedImageB64,
        selectedPixel.x,
        selectedPixel.y,
        channelIndex,
        origVal
      );

      setModifiedImageB64(applyRes.modified_image_b64);
      setModifiedHash(applyRes.modified_sha256);
      await fetchPixelDetails(applyRes.modified_image_b64, selectedPixel.x, selectedPixel.y);
      showStatus(`Reset pixel (${selectedPixel.x}, ${selectedPixel.y}) to original value ${origVal}`);
    } catch (err) {
      showStatus('Failed to reset pixel', true);
    }
  };

  // --------------------------------------------------------------------------
  // Bulk Bit Manipulation
  // --------------------------------------------------------------------------
  const handleRunBulkManipulation = async () => {
    if (!originalImageB64) return;
    try {
      setBulkProcessing(true);
      const res = await steganalysisApi.manipulateLabBulk({
        image_b64: originalImageB64,
        mode: bulkMode,
        plane: parseInt(bulkPlane, 10),
        percentage: parseFloat(bulkPercentage),
        seed: parseInt(bulkSeed, 10),
        channel: 'all',
        action: bulkAction,
      });

      setModifiedImageB64(res.modified_image_b64);
      setModifiedHash(res.modified_sha256);
      setLastBulkResult(res);
      await fetchPixelDetails(res.modified_image_b64, selectedPixel.x, selectedPixel.y);
      showStatus(
        `Generated modified image: ${res.modified_pixels_count.toLocaleString()} pixels (${res.modification_percent}%) modified.`
      );
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Bulk manipulation failed', true);
    } finally {
      setBulkProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // Bit-Plane Visualization
  // --------------------------------------------------------------------------
  const loadBitplane = useCallback(async () => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64) return;
    try {
      setBitplaneLoading(true);
      const res = await steganalysisApi.getLabBitplane(targetB64, activePlane, activeChannel);
      setBitplaneData(res);
    } catch (e) {
      console.warn('Failed to load bitplane:', e);
    } finally {
      setBitplaneLoading(false);
    }
  }, [modifiedImageB64, originalImageB64, activePlane, activeChannel]);

  useEffect(() => {
    if (activeTab === 'manipulation' && manipulationSubTab === 'bitplane') {
      loadBitplane();
    }
  }, [activeTab, manipulationSubTab, activePlane, activeChannel, loadBitplane]);

  // --------------------------------------------------------------------------
  // Step 3: Secret Message Embedding & Extraction
  // --------------------------------------------------------------------------
  const handleEmbedMessage = async () => {
    if (!originalImageB64 || !secretText.trim()) return;
    try {
      setEmbedProcessing(true);
      const res = await steganalysisApi.embedLabSecret(
        originalImageB64,
        secretText.trim(),
        embedPassword.trim() || null
      );
      setEmbedResult(res);
      setModifiedImageB64(res.stego_image_b64);
      setModifiedHash(res.modified_sha256);
      showStatus(`Secret message successfully embedded (${res.payload_bytes} bytes payload).`);
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Embedding rejected', true);
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
        showStatus(res.status, true);
      }
    } catch (err) {
      setExtractResult({ success: false, status: err.response?.data?.detail || 'Extraction failed' });
      showStatus(err.response?.data?.detail || 'Extraction failed', true);
    } finally {
      setExtractProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 5: Steganalysis Inference
  // --------------------------------------------------------------------------
  const handleRunSteganalysis = async () => {
    const targetB64 = analysisTarget === 'original' ? originalImageB64 : modifiedImageB64;
    if (!targetB64) return;

    try {
      setAnalysisLoading(true);
      const res = await steganalysisApi.analyzeLabImage(targetB64, 'StegoNet-Lite');
      setAnalysisResult(res);
      showStatus(`StegoNet-Lite classified as ${res.verdict} (${(res.confidence * 100).toFixed(1)}%)`);
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Steganalysis failed', true);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Step 6: Forensic Comparison
  // --------------------------------------------------------------------------
  const handleRunComparison = useCallback(async () => {
    if (!originalImageB64 || !modifiedImageB64) return;
    try {
      setComparisonLoading(true);
      const res = await steganalysisApi.compareLabPair(originalImageB64, modifiedImageB64);
      setComparisonData(res);
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Forensic comparison failed', true);
    } finally {
      setComparisonLoading(false);
    }
  }, [originalImageB64, modifiedImageB64]);

  useEffect(() => {
    if (activeTab === 'comparison' && originalImageB64 && modifiedImageB64 && !comparisonData) {
      handleRunComparison();
    }
  }, [activeTab, originalImageB64, modifiedImageB64, comparisonData, handleRunComparison]);

  // --------------------------------------------------------------------------
  // Step 7: Save Experiment & History
  // --------------------------------------------------------------------------
  const handleSaveExperiment = async () => {
    if (!originalMeta || !modifiedHash) return;
    try {
      let comp = comparisonData;
      if (!comp) {
        comp = await steganalysisApi.compareLabPair(originalImageB64, modifiedImageB64);
        setComparisonData(comp);
      }

      const payload = {
        experiment_name: `Lab Experiment: ${bulkMode.replace('_', ' ').toUpperCase()} (${originalMeta.filename})`,
        experiment_type: embedResult ? 'lsb_embedding' : 'bit_manipulation',
        original_filename: originalMeta.filename,
        original_file_hash: originalMeta.sha256_hash,
        modified_file_hash: modifiedHash,
        dimensions: originalMeta.dimensions,
        color_mode: originalMeta.color_mode,
        parameters: {
          bulkMode,
          bulkPlane,
          bulkPercentage,
          bulkSeed,
          hasEmbedding: Boolean(embedResult),
        },
        comparison: comp,
        analysis: analysisResult,
        original_image_b64: originalImageB64,
        modified_image_b64: modifiedImageB64,
        diff_map_b64: comp.diff_map_b64,
      };

      await steganalysisApi.saveLabExperiment(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showStatus('Experiment saved to SQLite audit ledger.');
      loadExperimentsList();
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Failed to save experiment', true);
    }
  };

  const loadExperimentsList = async () => {
    try {
      setHistoryLoading(true);
      const items = await steganalysisApi.listLabExperiments(50);
      setExperiments(items);
    } catch (e) {
      console.warn('Failed to load experiment history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReopenExperiment = async (expId) => {
    try {
      const exp = await steganalysisApi.getLabExperiment(expId);
      if (exp.original_image_b64) setOriginalImageB64(exp.original_image_b64);
      if (exp.modified_image_b64) setModifiedImageB64(exp.modified_image_b64);
      setModifiedHash(exp.modified_file_hash);
      setComparisonData(exp.comparison);
      setAnalysisResult(exp.analysis);
      setActiveTab('comparison');
      showStatus(`Reopened experiment: ${exp.experiment_name}`);
    } catch (err) {
      showStatus('Failed to reopen experiment', true);
    }
  };

  const handleDeleteExperiment = async (expId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this experiment record?')) return;
    try {
      await steganalysisApi.deleteLabExperiment(expId);
      loadExperimentsList();
      showStatus('Experiment deleted.');
    } catch (err) {
      showStatus('Failed to delete experiment', true);
    }
  };

  const handleResetToOriginal = () => {
    if (!originalImageB64) return;
    setModifiedImageB64(originalImageB64);
    setModifiedHash(originalMeta?.sha256_hash || null);
    setComparisonData(null);
    setAnalysisResult(null);
    setLastBulkResult(null);
    setEmbedResult(null);
    if (selectedPixel) {
      fetchPixelDetails(originalImageB64, selectedPixel.x, selectedPixel.y);
    }
    showStatus('Workspace reset to immutable original cover reference.');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Header Banner & Scientific Lab Identity */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-6 rounded-2xl bg-[#090909] border border-[#292929] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#151515] border border-[#292929] text-white">
              <FlaskConical className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#777777]">
              Scientific Research Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Interactive Steganography & Forensics Laboratory
          </h1>
          <p className="text-xs text-[#B3B3B3] max-w-2xl leading-relaxed mt-1">
            Perform lossless bit-level pixel modifications, secret message embedding experiments, deep residual
            steganalysis, and bit-accurate forensic difference verification.
          </p>
        </div>

        {/* Global Experiment Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleResetToOriginal}
            className="px-3.5 py-2 rounded-xl bg-[#151515] hover:bg-[#222222] text-[#B3B3B3] hover:text-white border border-[#292929] text-xs font-semibold flex items-center gap-1.5 transition"
            title="Restore workspace to unchanged original reference"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Workspace</span>
          </button>

          <button
            onClick={handleSaveExperiment}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-black text-xs font-semibold flex items-center gap-1.5 transition theme-btn-primary"
            title="Save current experiment configuration and findings to database"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5 text-black" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? 'Saved to Audit Ledger' : 'Save Experiment'}</span>
          </button>
        </div>
      </div>

      {/* Global Status Message Toast */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            statusMessage.isError
              ? 'bg-[#181818] border-red-500/50 text-white'
              : 'bg-[#151515] border-[#383838] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-white shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[#777777] hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. Scientific Workflow Stepper Indicator */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#292929] overflow-x-auto scrollbar-none">
        <div className="flex items-center min-w-[700px] justify-between text-xs font-mono">
          {[
            { id: 'inspector', step: '01', label: 'Upload & Inspect' },
            { id: 'manipulation', step: '02', label: 'Modify Bits' },
            { id: 'embedding', step: '03', label: 'Conceal Message' },
            { id: 'steganalysis', step: '04', label: 'Run Steganalysis' },
            { id: 'comparison', step: '05', label: 'Compare Forensics' },
            { id: 'history', step: '06', label: 'Audit History' },
          ].map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#242424] text-white border border-[#383838] font-bold shadow-sm'
                      : 'text-[#777777] hover:text-white'
                  }`}
                >
                  <span className="text-[10px] opacity-60 font-semibold">{item.step}.</span>
                  <span>{item.label}</span>
                </button>
                {idx < 5 && <ChevronRight className="w-3.5 h-3.5 text-[#383838] shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Main Split Laboratory Canvas Layout */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================ */}
        {/* LEFT PANEL: Interactive Image Canvas & Inspection HUD */}
        {/* ================================================================ */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
            {/* Canvas Header & Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Carrier Micro-Viewport
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#292929] text-[#B3B3B3]">
                  {originalMeta?.dimensions || 'No Image'}
                </span>
              </div>

              {/* Zoom & Pan Controls */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0A0A0A] border border-[#292929]">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded text-[#777777] hover:text-white hover:bg-[#181818]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-[#B3B3B3] px-1 select-none">
                  {(zoomLevel * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                  className="p-1 rounded text-[#777777] hover:text-white hover:bg-[#181818]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded text-[#777777] hover:text-white hover:bg-[#181818]"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Image Canvas Area */}
            <div className="relative rounded-xl border border-[#292929] bg-[#0A0A0A] overflow-hidden flex items-center justify-center min-h-[380px] select-none">
              {inspectLoading ? (
                <div className="flex flex-col items-center gap-2 text-xs text-[#777777]">
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                  <span>Loading lossless pixel stream...</span>
                </div>
              ) : modifiedImageB64 ? (
                <div
                  className="overflow-auto max-h-[500px] w-full flex items-center justify-center p-2"
                  style={{ cursor: 'crosshair' }}
                >
                  <img
                    ref={canvasRef}
                    src={modifiedImageB64}
                    alt="Inspection Carrier"
                    onClick={handleCanvasClick}
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      imageRendering: 'pixelated',
                      maxWidth: '100%',
                    }}
                    className="transition-transform duration-100 border border-[#242424] shadow-md"
                  />
                </div>
              ) : (
                <div className="p-8 text-center space-y-2 text-[#777777]">
                  <Upload className="w-8 h-8 mx-auto text-[#555555]" />
                  <p className="text-xs">No image loaded. Upload an image to begin.</p>
                </div>
              )}

              {/* Coordinate Reticle Badge */}
              {originalMeta && (
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#090909]/90 border border-[#292929] text-[10px] font-mono text-white flex items-center gap-2">
                  <span>Selected Pixel:</span>
                  <span className="font-bold">
                    X: {selectedPixel.x}, Y: {selectedPixel.y}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Preset Selector & Upload Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#292929]">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-white border border-[#292929] text-xs font-semibold flex items-center gap-1.5 transition">
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/x-portable-graymap,.pgm"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                </label>

                <button
                  onClick={loadSampleCover}
                  className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#222222] text-[#B3B3B3] hover:text-white border border-[#292929] text-xs font-medium transition"
                >
                  Sample Cover (#5001)
                </button>
              </div>

              {/* Immutable Hash Verification */}
              {originalMeta && (
                <div className="text-[11px] font-mono text-[#777777] flex items-center gap-1.5">
                  <span>Orig SHA-256:</span>
                  <span className="text-white font-bold">{originalMeta.sha256_hash.slice(0, 10)}...</span>
                  <button
                    onClick={() => copyToClipboard(originalMeta.sha256_hash)}
                    className="hover:text-white p-0.5"
                    title="Copy Full SHA-256"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metadata & Auxiliary Statistical Cards */}
          {originalMeta && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[10px] text-[#777777] block">Shannon Entropy</span>
                <span className="text-sm font-bold text-white block mt-0.5">{originalMeta.entropy} bpp</span>
                <span className="text-[9px] text-[#777777]">Natural distribution</span>
              </div>
              <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[10px] text-[#777777] block">Residual Energy σr²</span>
                <span className="text-sm font-bold text-white block mt-0.5">{originalMeta.residual_energy}</span>
                <span className="text-[9px] text-[#777777]">High-pass variance</span>
              </div>
              <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[10px] text-[#777777] block">Color Channels</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {originalMeta.channels === 3 ? 'RGB (24-bit)' : 'Grayscale (8-bit)'}
                </span>
                <span className="text-[9px] text-[#777777]">{originalMeta.format} format</span>
              </div>
              <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[10px] text-[#777777] block">Total Pixels</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {originalMeta.total_pixels.toLocaleString()}
                </span>
                <span className="text-[9px] text-[#777777]">{(originalMeta.file_size_bytes / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* RIGHT PANEL: Tabbed Scientific Workstation Controls */}
        {/* ================================================================ */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-5">
            {/* -------------------------------------------------------------- */}
            {/* TAB 1: IMAGE INSPECTOR */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'inspector' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-white" />
                    <span>Scientific Image Inspection & Integrity</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#292929] text-[#B3B3B3]">
                    Step 1 of 5
                  </span>
                </div>

                {originalMeta ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] space-y-2">
                      <div className="flex justify-between py-1 border-b border-[#242424]">
                        <span className="text-[#777777]">Original Filename</span>
                        <span className="text-white font-mono font-medium">{originalMeta.filename}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242424]">
                        <span className="text-[#777777]">Geometry Dimensions</span>
                        <span className="text-white font-mono font-medium">{originalMeta.dimensions} px</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242424]">
                        <span className="text-[#777777]">Lossless Color Space</span>
                        <span className="text-white font-mono font-medium">{originalMeta.color_mode} ({originalMeta.channels} channel{originalMeta.channels > 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242424]">
                        <span className="text-[#777777]">Mean Intensity / Std Dev</span>
                        <span className="text-white font-mono font-medium">μ = {originalMeta.mean_intensity}, σ = {originalMeta.std_dev}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#777777]">SHA-256 Digest</span>
                        <span className="text-white font-mono text-[11px] truncate max-w-[240px]">{originalMeta.sha256_hash}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#151515] border border-[#292929] space-y-1.5">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        Lossless Processing Policy
                      </span>
                      <p className="text-[11px] text-[#B3B3B3] leading-relaxed">
                        Uploaded images are converted to uncompressed memory arrays. JPEG recompression is disabled
                        to protect discrete integer pixel values from lossy quantizer perturbations.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('manipulation')}
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-black text-xs font-semibold flex items-center justify-center gap-2 transition theme-btn-primary"
                      >
                        <span>Proceed to Bit Manipulation Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#777777]">Upload an image to review metadata.</p>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 2: BIT MANIPULATION STUDIO */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'manipulation' && (
              <div className="space-y-4">
                {/* Sub-tab navigation */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
                  <button
                    onClick={() => setManipulationSubTab('pixel')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      manipulationSubTab === 'pixel'
                        ? 'bg-[#242424] text-white font-bold border border-[#383838]'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    Pixel Bit Inspector
                  </button>
                  <button
                    onClick={() => setManipulationSubTab('bulk')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      manipulationSubTab === 'bulk'
                        ? 'bg-[#242424] text-white font-bold border border-[#383838]'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    Bulk Manipulation
                  </button>
                  <button
                    onClick={() => setManipulationSubTab('bitplane')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      manipulationSubTab === 'bitplane'
                        ? 'bg-[#242424] text-white font-bold border border-[#383838]'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    Bit-Plane Slicer
                  </button>
                </div>

                {/* Sub-View A: Individual Pixel Inspector & Bit Toggling */}
                {manipulationSubTab === 'pixel' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#B3B3B3] font-mono text-[11px]">
                        Target Coordinate: ({selectedPixel.x}, {selectedPixel.y})
                      </span>
                      <span className="text-[#777777] text-[10px] font-mono">Click canvas to pick pixel</span>
                    </div>

                    {pixelDetails?.channels?.map((ch, cIdx) => (
                      <div key={cIdx} className="p-4 rounded-xl bg-[#151515] border border-[#292929] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                            <span className="font-bold text-white text-xs">{ch.channel}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-xs">
                            <span className="text-[#777777]">Dec: <strong className="text-white">{ch.value}</strong></span>
                            <span className="text-[#777777]">Hex: <strong className="text-white">{ch.hex}</strong></span>
                            <button
                              onClick={() => handleResetPixel(cIdx)}
                              className="text-[10px] text-[#777777] hover:text-white underline"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        {/* Interactive 8-Bit Register Display */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#777777] px-1">
                            <span>MSB (Bit 7)</span>
                            <span>LSB (Bit 0)</span>
                          </div>
                          <div className="grid grid-cols-8 gap-1.5">
                            {/* Render bits from MSB (7) down to LSB (0) */}
                            {[7, 6, 5, 4, 3, 2, 1, 0].map((bitPos) => {
                              const bitVal = (ch.value >> bitPos) & 1;
                              const isLSB = bitPos === 0;
                              return (
                                <button
                                  key={bitPos}
                                  onClick={() => handleToggleBit(cIdx, bitPos)}
                                  className={`p-2 rounded-lg border font-mono text-center transition-all ${
                                    bitVal === 1
                                      ? 'bg-white text-black border-white font-bold'
                                      : 'bg-[#181818] text-[#777777] border-[#292929] hover:text-white hover:border-[#383838]'
                                  } ${isLSB ? 'ring-1 ring-white/50' : ''}`}
                                  title={`Bit ${bitPos} (${isLSB ? 'LSB' : bitPos === 7 ? 'MSB' : 'Plane ' + bitPos}) - Click to flip`}
                                >
                                  <div className="text-sm leading-none">{bitVal}</div>
                                  <div className="text-[8px] opacity-75 mt-0.5">{bitPos}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Binary String Representation */}
                        <div className="p-2 rounded-lg bg-[#0A0A0A] border border-[#242424] font-mono text-[11px] flex items-center justify-between">
                          <span className="text-[#777777]">Binary Byte:</span>
                          <span className="text-white font-bold tracking-widest">{ch.binary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-View B: Bulk Bit Manipulation Experiments */}
                {manipulationSubTab === 'bulk' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[#777777] block text-[11px] mb-1">Experiment Manipulation Mode</label>
                        <select
                          value={bulkMode}
                          onChange={(e) => setBulkMode(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-[#151515] border border-[#292929] text-white text-xs outline-none"
                        >
                          <option value="lsb_only">LSB Only (Bit Position 0)</option>
                          <option value="two_lsb">Two LSBs (Bit Positions 0 & 1)</option>
                          <option value="custom_plane">Target Specific Bit Plane (0–7)</option>
                          <option value="random_bits">Pseudo-Random Bit Plane Slicing</option>
                        </select>
                      </div>

                      {bulkMode === 'custom_plane' && (
                        <div>
                          <label className="text-[#777777] block text-[11px] mb-1">Bit Plane (0=LSB, 7=MSB)</label>
                          <input
                            type="number"
                            min="0"
                            max="7"
                            value={bulkPlane}
                            onChange={(e) => setBulkPlane(e.target.value)}
                            className="w-full p-2 rounded-xl bg-[#151515] border border-[#292929] text-white text-xs outline-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[#777777] block text-[11px] mb-1">
                            Modification Rate: {bulkPercentage}%
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="100"
                            step="0.5"
                            value={bulkPercentage}
                            onChange={(e) => setBulkPercentage(e.target.value)}
                            className="w-full accent-white cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[#777777] block text-[11px] mb-1">Reproducible RNG Seed</label>
                          <input
                            type="number"
                            value={bulkSeed}
                            onChange={(e) => setBulkSeed(e.target.value)}
                            className="w-full p-2 rounded-xl bg-[#151515] border border-[#292929] text-white text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleRunBulkManipulation}
                      disabled={bulkProcessing}
                      className="w-full py-3 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-xs flex items-center justify-center gap-2 transition theme-btn-primary"
                    >
                      {bulkProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                          <span>Executing Deterministic Mutation...</span>
                        </>
                      ) : (
                        <>
                          <Binary className="w-4 h-4 text-black" />
                          <span>Generate Derived Mutated Image</span>
                        </>
                      )}
                    </button>

                    {lastBulkResult && (
                      <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#777777]">Modified Pixels:</span>
                          <span className="text-white font-bold">{lastBulkResult.modified_pixels_count.toLocaleString()} px ({lastBulkResult.modification_percent}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#777777]">Modified Bits:</span>
                          <span className="text-white font-bold">{lastBulkResult.modified_bits_count.toLocaleString()} bits</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#777777]">Derived SHA-256:</span>
                          <span className="text-white font-mono text-[10px]">{lastBulkResult.modified_sha256.slice(0, 16)}...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-View C: Interactive Bit-Plane Slicer */}
                {manipulationSubTab === 'bitplane' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#777777] text-[11px]">Bit Plane:</span>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                          <button
                            key={p}
                            onClick={() => setActivePlane(p)}
                            className={`px-2.5 py-1 rounded text-xs transition ${
                              activePlane === p
                                ? 'bg-white text-black font-bold'
                                : 'bg-[#151515] text-[#777777] hover:text-white border border-[#292929]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#292929] flex items-center justify-center min-h-[220px]">
                      {bitplaneLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-white" />
                      ) : bitplaneData ? (
                        <div className="space-y-2 text-center w-full">
                          <img
                            src={bitplaneData.bitplane_b64}
                            alt="Bit Plane"
                            className="max-h-[240px] mx-auto border border-[#242424] rounded-lg shadow-sm"
                          />
                          <div className="text-[10px] text-[#777777]">
                            Entropy: {bitplaneData.plane_entropy} bpp • {bitplaneData.plane_label}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-[#777777] leading-relaxed">
                      Scientific note: LSB noise resembles high-frequency white noise. However, visual noise alone
                      does not prove steganography, as natural camera sensor Poisson noise also occupies low bit planes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 3: SECRET MESSAGE EMBEDDING STUDIO */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'embedding' && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
                  <button
                    onClick={() => setEmbeddingSubTab('embed')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      embeddingSubTab === 'embed'
                        ? 'bg-[#242424] text-white font-bold border border-[#383838]'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    Embed Secret Message
                  </button>
                  <button
                    onClick={() => setEmbeddingSubTab('extract')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      embeddingSubTab === 'extract'
                        ? 'bg-[#242424] text-white font-bold border border-[#383838]'
                        : 'text-[#777777] hover:text-white'
                    }`}
                  >
                    Extract Secret Message
                  </button>
                </div>

                {embeddingSubTab === 'embed' ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[#777777] block text-[11px] font-mono mb-1">
                        Secret Text Message (UTF-8)
                      </label>
                      <textarea
                        rows={4}
                        value={secretText}
                        onChange={(e) => setSecretText(e.target.value)}
                        placeholder="Enter secret message to conceal..."
                        className="w-full p-3 rounded-xl bg-[#151515] border border-[#292929] text-white text-xs font-mono outline-none resize-none"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-[#777777] mt-1">
                        <span>Payload Size: {new Blob([secretText]).size} bytes</span>
                        <span>Max Capacity: {originalMeta ? Math.floor((originalMeta.total_pixels - 112) / 8).toLocaleString() : 0} bytes</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[#777777] block text-[11px] font-mono mb-1">
                        Optional Encryption Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={embedPassword}
                          onChange={(e) => setEmbedPassword(e.target.value)}
                          placeholder="Leave blank for unencrypted plaintext LSB..."
                          className="w-full p-2.5 rounded-xl bg-[#151515] border border-[#292929] text-white text-xs font-mono outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-[#555555]">
                          {embedPassword ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleEmbedMessage}
                      disabled={embedProcessing || !secretText.trim()}
                      className="w-full py-3 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-xs flex items-center justify-center gap-2 transition theme-btn-primary"
                    >
                      {embedProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <Lock className="w-4 h-4 text-black" />
                      )}
                      <span>Embed Secret Message (LSB Substitution)</span>
                    </button>

                    {embedResult && (
                      <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#777777]">Payload Length:</span>
                          <span className="text-white font-bold">{embedResult.payload_bytes} bytes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#777777]">Capacity Utilization:</span>
                          <span className="text-white font-bold">{embedResult.capacity_used_percent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#777777]">Integrity Format:</span>
                          <span className="text-white">{embedResult.header_format}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <label className="text-[#777777] block text-[11px] mb-1">Decryption Password (if encrypted)</label>
                      <input
                        type="password"
                        value={extractPassword}
                        onChange={(e) => setExtractPassword(e.target.value)}
                        placeholder="Enter password if payload was encrypted..."
                        className="w-full p-2.5 rounded-xl bg-[#151515] border border-[#292929] text-white text-xs outline-none"
                      />
                    </div>

                    <button
                      onClick={handleExtractMessage}
                      disabled={extractProcessing}
                      className="w-full py-3 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-xs flex items-center justify-center gap-2 transition theme-btn-primary"
                    >
                      {extractProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                      <span>Extract & Verify StegoLab Payload</span>
                    </button>

                    {extractResult && (
                      <div className="p-4 rounded-xl bg-[#151515] border border-[#292929] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Extracted Secret Text</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${extractResult.success ? 'bg-[#242424] text-white border-[#383838]' : 'bg-[#181818] text-[#777777] border-[#292929]'}`}>
                            {extractResult.status}
                          </span>
                        </div>
                        <pre className="p-3 rounded-lg bg-[#0A0A0A] border border-[#242424] text-white text-xs whitespace-pre-wrap break-all">
                          {extractResult.secret_text || '(No plaintext recovered)'}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 4: STEGANALYSIS INFERENCE */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'steganalysis' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-white" />
                    <span>Deep Residual Steganalysis Evaluation</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#292929] text-[#B3B3B3]">
                    StegoNet-Lite
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#777777] font-mono text-[11px]">Evaluation Target:</span>
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0A0A0A] border border-[#292929]">
                    <button
                      onClick={() => setAnalysisTarget('modified')}
                      className={`px-3 py-1 rounded text-xs transition ${
                        analysisTarget === 'modified'
                          ? 'bg-[#242424] text-white font-bold'
                          : 'text-[#777777] hover:text-white'
                      }`}
                    >
                      Derived Modified Image
                    </button>
                    <button
                      onClick={() => setAnalysisTarget('original')}
                      className={`px-3 py-1 rounded text-xs transition ${
                        analysisTarget === 'original'
                          ? 'bg-[#242424] text-white font-bold'
                          : 'text-[#777777] hover:text-white'
                      }`}
                    >
                      Original Reference Cover
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRunSteganalysis}
                  disabled={analysisLoading}
                  className="w-full py-3 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-xs flex items-center justify-center gap-2 transition theme-btn-primary"
                >
                  {analysisLoading ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Activity className="w-4 h-4 text-black" />}
                  <span>Evaluate with StegoNet-Lite CNN</span>
                </button>

                {analysisResult && (
                  <div className="p-4 rounded-xl bg-[#151515] border border-[#292929] space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[#777777] block text-[10px]">Classification Interpretation:</span>
                        <span className="text-[10px] text-[#777777]">
                          {analysisResult.score_type || 'Uncalibrated Model Score'}
                        </span>
                      </div>
                      <span className="text-base font-bold text-white px-2.5 py-0.5 rounded bg-[#242424] border border-[#383838]">
                        {analysisResult.verdict}
                      </span>
                    </div>

                    {/* Dual Probability Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Cover: {(analysisResult.cover_probability * 100).toFixed(1)}%</span>
                        <span>Stego: {(analysisResult.stego_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#0A0A0A] overflow-hidden flex border border-[#242424]">
                        <div
                          style={{ width: `${analysisResult.cover_probability * 100}%` }}
                          className="bg-[#555555]"
                        />
                        <div
                          style={{ width: `${analysisResult.stego_probability * 100}%` }}
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#242424] text-[10px] text-[#B3B3B3] leading-relaxed font-sans">
                      {analysisResult.scientific_disclaimer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 5: FORENSIC COMPARISON ENGINE */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'comparison' && (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Split className="w-4 h-4 text-white" />
                    <span>Exact Pixel-by-Pixel Forensic Comparison</span>
                  </h3>
                  <button
                    onClick={handleRunComparison}
                    disabled={comparisonLoading}
                    className="text-xs text-[#B3B3B3] hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${comparisonLoading ? 'animate-spin' : ''}`} />
                    <span>Recalculate</span>
                  </button>
                </div>

                {comparisonLoading ? (
                  <div className="py-8 text-center text-[#777777]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-white" />
                    <span>Computing exact array differences...</span>
                  </div>
                ) : comparisonData ? (
                  <div className="space-y-4">
                    {/* Exact Pixel Changes Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                        <span className="text-[10px] text-[#777777] block">Changed Pixels</span>
                        <span className="text-sm font-bold text-white block mt-0.5">
                          {comparisonData.changed_pixels.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#777777]">
                          {comparisonData.changed_pixel_percent}% change rate
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                        <span className="text-[10px] text-[#777777] block">Unchanged Pixels</span>
                        <span className="text-sm font-bold text-white block mt-0.5">
                          {comparisonData.unchanged_pixels.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#777777]">Bit-fidelity intact</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                        <span className="text-[10px] text-[#777777] block">Total Bit Changes</span>
                        <span className="text-sm font-bold text-white block mt-0.5">
                          {comparisonData.total_bit_changes.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#777777]">Hamming distance</span>
                      </div>
                    </div>

                    {/* Statistical Shift Metrics */}
                    <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] space-y-2">
                      <span className="text-xs font-bold text-white block">Statistical Distribution Shifts</span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#777777] block">Shannon Entropy:</span>
                          <span className="text-white">
                            {comparisonData.statistics.original_entropy} → {comparisonData.statistics.modified_entropy} (Δ {comparisonData.statistics.delta_entropy > 0 ? '+' : ''}{comparisonData.statistics.delta_entropy})
                          </span>
                        </div>
                        <div>
                          <span className="text-[#777777] block">Residual Energy σr²:</span>
                          <span className="text-white">
                            {comparisonData.statistics.original_residual_energy} → {comparisonData.statistics.modified_residual_energy} (Δ {comparisonData.statistics.delta_residual_energy > 0 ? '+' : ''}{comparisonData.statistics.delta_residual_energy})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amplified Difference Map Visualization */}
                    {comparisonData.diff_map_b64 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-white block">Amplified Perturbation Map</span>
                        <div className="p-2 rounded-xl bg-[#0A0A0A] border border-[#292929] text-center">
                          <img
                            src={comparisonData.diff_map_b64}
                            alt="Amplified Perturbation Map"
                            className="max-h-[220px] mx-auto border border-[#242424] rounded-lg shadow-sm"
                          />
                          <span className="text-[10px] text-[#777777] mt-1 block">
                            White = +1 Perturbation • Gray = -1 Perturbation • Black = Unaltered Pixel
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Synchronized 8x Micro-Loupe Inspector */}
                    {originalImageB64 && modifiedImageB64 && (
                      <div className="pt-2">
                        <PixelLoupeMagnifier
                          coverSrc={originalImageB64}
                          stegoSrc={modifiedImageB64}
                          isPaired={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[#777777]">Run a modification experiment to inspect forensic differences.</p>
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 6: EXPERIMENT AUDIT HISTORY */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'history' && (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-white" />
                    <span>Laboratory Experiment Ledger</span>
                  </h3>
                  <button onClick={loadExperimentsList} className="text-[#777777] hover:text-white flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {historyLoading ? (
                  <div className="py-8 text-center text-[#777777]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-white" />
                    <span>Loading experiment history...</span>
                  </div>
                ) : experiments.length === 0 ? (
                  <p className="text-center py-6 text-[#777777]">No saved laboratory experiments yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {experiments.map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => handleReopenExperiment(exp.id)}
                        className="p-3 rounded-xl bg-[#151515] hover:bg-[#1A1A1A] border border-[#292929] cursor-pointer transition flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white truncate text-xs">{exp.experiment_name}</div>
                          <div className="text-[10px] text-[#777777] flex items-center gap-2 mt-0.5">
                            <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{exp.changed_pixels.toLocaleString()} px ({exp.change_rate_percent}%)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={steganalysisApi.getLabDownloadUrl(exp.id)}
                            download={`modified_${exp.id}.png`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#242424]"
                            title="Download Modified PNG"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={(e) => handleDeleteExperiment(exp.id, e)}
                            className="p-1.5 rounded-lg text-[#777777] hover:text-red-400 hover:bg-[#242424]"
                            title="Delete Experiment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

