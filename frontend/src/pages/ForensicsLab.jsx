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
  ArrowLeft,
  Target,
  Compass,
  FileCheck2,
  X,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PixelLoupeMagnifier from '../components/analysis/PixelLoupeMagnifier';
import SUniwardStressSimulator from '../components/analysis/SUniwardStressSimulator';

// --------------------------------------------------------------------------
// Standardized 7-Stage Forensic Laboratory Workflow Metadata
// --------------------------------------------------------------------------
export const STAGES = [
  {
    id: 'inspector',
    num: '01',
    title: 'Upload & Inspect',
    shortTitle: 'Inspect',
    subtitle: 'Cryptographic baseline ingestion & spatial integrity analysis',
    icon: Upload,
    nextId: 'manipulation',
    nextLabel: 'Modify Bits',
    nextDesc: 'Toggle individual pixel bits, run bulk mutations, or slice bit planes',
    prevId: null,
    prevLabel: null,
    isOptional: false,
    tag: 'INTEGRITY BASELINE',
    briefing: {
      objective: 'Ingest raw digital carrier and verify cryptographic baseline integrity (SHA-256 digest, Shannon entropy, residual variance).',
      output: 'Immutable 24-bit/8-bit uncompressed raster array with statistical baselines and lossless coordinates.',
      action: 'Upload an investigation carrier or load the calibrated BOSSbase sample cover reference.',
    },
  },
  {
    id: 'manipulation',
    num: '02',
    title: 'Modify Bits',
    shortTitle: 'Modify Bits',
    subtitle: 'Bit-level manipulation studio & spatial bit-plane slicing',
    icon: Binary,
    nextId: 'embedding',
    nextLabel: 'Conceal Message',
    nextDesc: 'Conceal encrypted or plaintext UTF-8 payloads into carrier LSBs',
    prevId: 'inspector',
    prevLabel: 'Upload & Inspect',
    isOptional: true,
    tag: 'BIT MUTATION',
    briefing: {
      objective: 'Selectively modify discrete bits across color channels to observe high-frequency noise perturbation responses.',
      output: 'Derived candidate stego image with recorded Hamming changes and modified SHA-256 hash.',
      action: 'Flip bits on the register, run bulk deterministic mutations, or advance directly with original cover.',
    },
  },
  {
    id: 'embedding',
    num: '03',
    title: 'Conceal Message',
    shortTitle: 'Conceal',
    subtitle: 'Steganographic message injection & bitstream recovery',
    icon: Lock,
    nextId: 'steganalysis',
    nextLabel: 'Run Steganalysis',
    nextDesc: 'Evaluate candidate image with deep residual neural networks',
    prevId: 'manipulation',
    prevLabel: 'Modify Bits',
    isOptional: true,
    tag: 'PAYLOAD INGESTION',
    briefing: {
      objective: 'Conceal confidential UTF-8 text into carrier LSBs with optional encryption keys, or extract an existing message.',
      output: 'Stego image embedding verifiable bitstream payload with capacity tracking.',
      action: 'Embed a test secret payload, verify extraction, or skip directly to Steganalysis.',
    },
  },
  {
    id: 'steganalysis',
    num: '04',
    title: 'Run Steganalysis',
    shortTitle: 'Steganalysis',
    subtitle: 'Deep residual convolutional neural network detection',
    icon: Cpu,
    nextId: 'comparison',
    nextLabel: 'Compare Forensics',
    nextDesc: 'Calculate pixel-level Hamming divergence and amplified difference maps',
    prevId: 'embedding',
    prevLabel: 'Conceal Message',
    isOptional: false,
    tag: 'ML INFERENCE',
    briefing: {
      objective: 'Subject the candidate carrier to deep residual CNN classification (StegoNet-Lite / SRNet) to detect high-pass residual anomalies.',
      output: 'Calibrated detection probability scores (Cover vs. Stego), confidence index, and scientific interpretation.',
      action: 'Choose evaluation target (Derived Modified or Original Cover) and launch CNN evaluation.',
    },
  },
  {
    id: 'comparison',
    num: '05',
    title: 'Compare Forensics',
    shortTitle: 'Compare',
    subtitle: 'Pixel-by-pixel differential forensics & amplified heatmaps',
    icon: Split,
    nextId: 'history',
    nextLabel: 'Audit History',
    nextDesc: 'Commit experimental parameters to the permanent SQLite forensic ledger',
    prevId: 'steganalysis',
    prevLabel: 'Run Steganalysis',
    isOptional: false,
    tag: 'DIFFERENTIAL AUDIT',
    briefing: {
      objective: 'Execute exhaustive array-level differential comparison between original cover and modified candidate.',
      output: 'Exact changed pixel count, change rate percentage, Hamming distance, amplified difference map, and 8x synchronized micro-loupe.',
      action: 'Examine spatial perturbation heatmaps and statistical entropy shifts.',
    },
  },
  {
    id: 'history',
    num: '06',
    title: 'Audit History',
    shortTitle: 'Audit Ledger',
    subtitle: 'Cryptographic laboratory session ledger & audit trail',
    icon: History,
    nextId: 'simulator',
    nextLabel: 'S-UNIWARD Simulator',
    nextDesc: 'Stress-test content-adaptive embedding against wavelet distortion costs',
    prevId: 'comparison',
    prevLabel: 'Compare Forensics',
    isOptional: false,
    tag: 'ISO/IEC 27037 LEDGER',
    briefing: {
      objective: 'Preserve experimental parameters, hashes, and comparative findings in the immutable SQLite forensic audit ledger.',
      output: 'Archived experiment ledger entries with downloadable modified PNGs and audit sign-off.',
      action: 'Save the current forensic session or reload previous experimental runs.',
    },
  },
  {
    id: 'simulator',
    num: '07',
    title: 'S-UNIWARD Simulator',
    shortTitle: 'Simulator',
    subtitle: 'Content-adaptive distortion cost & detectability curves',
    icon: Sparkles,
    nextId: null,
    nextLabel: 'Finish Experiment / Return to Overview',
    nextDesc: 'Complete forensic examination cycle and return to Image Inspector',
    prevId: 'history',
    prevLabel: 'Audit History',
    isOptional: false,
    tag: 'ADAPTIVE STRESS-TEST',
    briefing: {
      objective: 'Simulate state-of-the-art content-adaptive steganography (S-UNIWARD) distortion costs across directional wavelet subbands.',
      output: 'Spatial modification probability heatmaps, wet paper code embedding simulation, and detectability curves.',
      action: 'Adjust payload bpp and wet paper parameters to benchmark adaptive evasion boundaries.',
    },
  },
];

export default function ForensicsLab() {
  const { user, isGuest, triggerGuestPrompt } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Active workspace tab: 'inspector' | 'manipulation' | 'embedding' | 'steganalysis' | 'comparison' | 'history' | 'simulator'
  const [activeTab, setActiveTab] = useState('inspector');
  const [manipulationSubTab, setManipulationSubTab] = useState('pixel'); // 'pixel' | 'bulk' | 'bitplane'
  const [embeddingSubTab, setEmbeddingSubTab] = useState('embed'); // 'embed' | 'extract'
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

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

  useEffect(() => {
    loadExperimentsList();
  }, [user]);

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
  const handleSaveExperiment = async (bypassGuestCheck = false) => {
    if (!originalMeta || !modifiedHash) return;

    if (isGuest && !bypassGuestCheck) {
      triggerGuestPrompt(
        'Save Experiment to Workspace',
        'You are currently exploring as a Guest. Sign in or register to link this experiment to your permanent investigator portfolio, or proceed as guest.',
        () => handleSaveExperiment(true)
      );
      return;
    }

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

  // --------------------------------------------------------------------------
  // Stage Completion Evaluation & Guided Stepper Helpers
  // --------------------------------------------------------------------------
  const isStageComplete = (stageId) => {
    switch (stageId) {
      case 'inspector':
        return Boolean(originalMeta);
      case 'manipulation':
        return Boolean(lastBulkResult || (originalMeta && modifiedHash && modifiedHash !== originalMeta.sha256_hash));
      case 'embedding':
        return Boolean(embedResult || extractResult);
      case 'steganalysis':
        return Boolean(analysisResult);
      case 'comparison':
        return Boolean(comparisonData);
      case 'history':
        return experiments.length > 0 || saveSuccess;
      case 'simulator':
        return true;
      default:
        return false;
    }
  };

  const completedCount = STAGES.filter((s) => isStageComplete(s.id)).length;
  const progressPercent = Math.round((completedCount / STAGES.length) * 100);

  const currentStageIndex = STAGES.findIndex((s) => s.id === activeTab);
  const currentStage = STAGES[currentStageIndex] || STAGES[0];
  const CurrentStageIcon = currentStage.icon;

  const goToNextStage = () => {
    if (currentStage.nextId) {
      setActiveTab(currentStage.nextId);
    } else {
      setActiveTab('inspector');
    }
  };

  const goToPreviousStage = () => {
    if (currentStage.prevId) {
      setActiveTab(currentStage.prevId);
    }
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
            onClick={() => setResetConfirmOpen(true)}
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
      {/* 2. Prominent Guided 7-Stage Cyber Workflow Stepper */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-4 rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] space-y-3 shadow-md">
        {/* Stepper Header with Stage Progress Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs font-sans">
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-400 font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30">
              STAGE {currentStage.num} OF 07
            </span>
            <span className="text-white font-bold text-sm">
              {currentStage.title}
            </span>
            <span className="hidden lg:inline text-xs text-[#94A3B8]">
              — {currentStage.subtitle}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-[#94A3B8]">
            <span>{completedCount}/7 Stages Verified</span>
            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-[#142036] overflow-hidden border border-[#1E2E4E]">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-cyan-300 font-bold">{progressPercent}%</span>
          </div>
        </div>

        {/* Desktop 7-Step Horizontal Stepper Grid */}
        <div className="hidden md:grid grid-cols-7 gap-2 pt-1">
          {STAGES.map((s, idx) => {
            const isActive = activeTab === s.id;
            const isCompleted = isStageComplete(s.id);
            const StepIcon = s.icon;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(s.id)}
                className={`relative p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between min-h-[76px] cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-br from-cyan-950/80 to-[#0A1628] border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                    : isCompleted
                    ? 'bg-[#06151E]/90 border-emerald-500/40 text-emerald-200 hover:border-emerald-400/60'
                    : s.isOptional
                    ? 'bg-[#070D1A]/80 border-[#1B2B48] text-[#94A3B8] hover:border-cyan-500/30 hover:text-white'
                    : 'bg-[#050914]/80 border-[#142036] text-[#64748B] hover:text-[#94A3B8] hover:border-[#1E2E4E]'
                }`}
                title={`Stage ${s.num}: ${s.title}`}
              >
                {/* Top Row: Number badge & Status Icon */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-cyan-500 text-black font-extrabold'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-[#101D38] text-cyan-400'
                    }`}
                  >
                    {s.num}
                  </span>

                  <div>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                    ) : (
                      <StepIcon className="w-3 h-3 text-[#64748B] group-hover:text-cyan-400 transition" />
                    )}
                  </div>
                </div>

                {/* Bottom Row: Title & Mini Status Text */}
                <div className="mt-1.5">
                  <div className="text-[11px] font-bold tracking-tight truncate leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5 truncate opacity-75">
                    {isCompleted
                      ? 'Verified ✓'
                      : isActive
                      ? 'Active Now'
                      : s.isOptional
                      ? 'Optional'
                      : 'Pending'}
                  </div>
                </div>

                {/* Active Indicator Glow Underline */}
                {isActive && (
                  <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(0,240,255,1)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile View: Compact Stage Switcher */}
        <div className="md:hidden flex items-center justify-between gap-2 p-2 rounded-xl bg-[#050914] border border-[#142036]">
          <button
            type="button"
            onClick={goToPreviousStage}
            disabled={!currentStage.prevId}
            className="p-2 rounded-lg bg-[#0E172A] border border-[#1E2E4E] text-[#94A3B8] disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Stage"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center min-w-0 flex-1 px-2">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-cyan-400 font-semibold">
              <span>STAGE {currentStage.num} / 07</span>
              {isStageComplete(currentStage.id) && (
                <span className="text-emerald-400 font-bold">• VERIFIED</span>
              )}
            </div>
            <div className="text-xs font-bold text-white truncate mt-0.5">
              {currentStage.title}
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextStage}
            className="p-2 rounded-lg bg-[#0E172A] border border-cyan-500/40 text-cyan-300"
            title="Next Stage"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
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
          <div className="p-5 rounded-2xl bg-[#090E1A]/95 border border-[#1B2B48] space-y-5 shadow-lg">
            {/* -------------------------------------------------------------- */}
            {/* Stage Guidance Briefing Card (Dynamic Per Active Stage)        */}
            {/* -------------------------------------------------------------- */}
            <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142036] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                    <CurrentStageIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                        STAGE {currentStage.num}
                      </span>
                      <h2 className="text-sm font-bold text-white tracking-wide">
                        {currentStage.title}
                      </h2>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {currentStage.subtitle}
                    </p>
                  </div>
                </div>

                {/* Stage Status Badge */}
                <div>
                  {isStageComplete(activeTab) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      STAGE VERIFIED
                    </span>
                  ) : currentStage.isOptional ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#142036] border border-[#1E2E4E] text-[10px] font-mono text-cyan-300">
                      <Info className="w-3 h-3 text-cyan-400" />
                      OPTIONAL STEP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                      <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
                      IN PROGRESS
                    </span>
                  )}
                </div>
              </div>

              {/* Structured 3-Part Briefing Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#050914] border border-[#142036] space-y-1">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                    <Target className="w-3 h-3 text-cyan-400" />
                    Objective
                  </span>
                  <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                    {currentStage.briefing.objective}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050914] border border-[#142036] space-y-1">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    Expected Output
                  </span>
                  <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                    {currentStage.briefing.output}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050914] border border-[#142036] space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                    <Compass className="w-3 h-3 text-emerald-400" />
                    Action Guidance
                  </span>
                  <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                    {currentStage.briefing.action}
                  </p>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* TAB 1: IMAGE INSPECTOR */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'inspector' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1B2B48] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span>Scientific Image Inspection & Integrity</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                    STAGE 01 OF 07
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
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-bold flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(0,240,255,0.25)]"
                      >
                        <span>Advance to Stage 02: Modify Bits</span>
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

            {/* -------------------------------------------------------------- */}
            {/* TAB 7: S-UNIWARD PAYLOAD STRESS-TESTER & DETECTABILITY SIMULATOR */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'simulator' && (
              <SUniwardStressSimulator originalImageSrc={originalImageB64} />
            )}

            {/* -------------------------------------------------------------- */}
            {/* Standardized Bottom Guided Navigation Controls (All 7 Stages) */}
            {/* -------------------------------------------------------------- */}
            <div className="pt-5 border-t border-[#1B2B48] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans">
              {/* Left: Previous Stage Button */}
              <button
                type="button"
                onClick={goToPreviousStage}
                disabled={!currentStage.prevId}
                className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  currentStage.prevId
                    ? 'bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border-[#1E2E4E] hover:border-cyan-500/40 cursor-pointer shadow-sm'
                    : 'bg-[#050914] text-[#475569] border-[#142036] cursor-not-allowed opacity-40'
                }`}
                title={currentStage.prevLabel ? `Go back to ${currentStage.prevLabel}` : 'First stage'}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {currentStage.prevLabel ? `Previous: ${currentStage.prevLabel}` : 'First Stage'}
                </span>
              </button>

              {/* Center: Stage Progress & Verification Status Pill */}
              <div className="text-center text-[11px] font-mono text-[#94A3B8] flex items-center justify-center gap-2">
                <span>Stage {currentStage.num} of 07</span>
                <span>•</span>
                <span className={isStageComplete(activeTab) ? 'text-emerald-400 font-bold' : currentStage.isOptional ? 'text-cyan-300' : 'text-amber-300'}>
                  {isStageComplete(activeTab)
                    ? 'Stage Verified ✓'
                    : currentStage.isOptional
                    ? 'Optional (Ready to Advance)'
                    : 'Action Pending'}
                </span>
              </div>

              {/* Right: Continue to Next Stage Button */}
              <button
                type="button"
                onClick={goToNextStage}
                className="group relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs tracking-wide transition shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] flex flex-col items-center sm:items-end justify-center cursor-pointer"
                title={currentStage.nextLabel ? `Proceed to ${currentStage.nextLabel}` : 'Finish forensic examination'}
              >
                <div className="flex items-center gap-1.5">
                  <span>{currentStage.nextId ? `Continue to ${currentStage.nextLabel}` : 'Finish & Return to Overview'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="text-[10px] text-slate-900 font-medium font-sans opacity-85">
                  {currentStage.nextDesc}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Reset Workspace Confirmation Dialog Modal                          */}
      {/* ------------------------------------------------------------------ */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-md rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_50px_rgba(0,0,0,0.9)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Reset Forensic Workspace?</h4>
                <p className="text-xs text-[#94A3B8]">Restore immutable original cover reference</p>
              </div>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              This action will revert all modified pixels, cleared payloads, and generated stego results back to the original unmodified cover reference. Any unsaved experiment analysis will be discarded.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border border-[#1E2E4E] text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetToOriginal();
                  setResetConfirmOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

