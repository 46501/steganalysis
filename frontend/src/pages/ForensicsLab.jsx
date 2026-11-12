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
  ChevronDown,
  ChevronUp,
  Sliders,
  EyeOff,
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

  // Progressive Disclosure States (Simple vs. Advanced Workspaces)
  const [showAdvancedBaselines, setShowAdvancedBaselines] = useState(false); // Stage 1
  const [showBulkMutations, setShowBulkMutations] = useState(false); // Stage 2
  const [showBitplaneSlicer, setShowBitplaneSlicer] = useState(false); // Stage 2
  const [showNeuralDiagnostics, setShowNeuralDiagnostics] = useState(false); // Stage 4
  const [showDistributionShifts, setShowDistributionShifts] = useState(false); // Stage 5
  const [comparisonViewMode, setComparisonViewMode] = useState('heatmap'); // 'heatmap' | 'loupe' (Stage 5)
  const [showEmbedPassword, setShowEmbedPassword] = useState(false);
  const [showExtractPassword, setShowExtractPassword] = useState(false);

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
      const margin = Math.abs((res.stego_probability ?? 0.5) - (res.cover_probability ?? 0.5));
      const statusMsg = res.is_conclusive
        ? `StegoNet-Lite classified as ${res.verdict} (${(res.confidence * 100).toFixed(1)}%)`
        : `StegoNet-Lite result: Inconclusive (Margin: ${(margin * 100).toFixed(1)}% < 15% threshold)`;
      showStatus(statusMsg);
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
      {/* 3. Purpose-Built Guided Workspaces with Progressive Disclosure     */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-6">
        {/* Dynamic Stage Guidance & Briefing Banner */}
        <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                <CurrentStageIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                    STAGE {currentStage.num}
                  </span>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {currentStage.title}
                  </h2>
                  <span className="text-xs text-[#64748B] hidden sm:inline">•</span>
                  <span className="text-xs text-[#94A3B8] hidden sm:inline">
                    {currentStage.subtitle}
                  </span>
                </div>
              </div>
            </div>

            <div>
              {isStageComplete(activeTab) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  STAGE VERIFIED
                </span>
              ) : currentStage.isOptional ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#142036] border border-[#1E2E4E] text-[10px] font-mono text-cyan-300">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  OPTIONAL STEP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                  <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  IN PROGRESS
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-[#050914] border border-[#142036] space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                <Target className="w-3 h-3 text-cyan-400" />
                Objective
              </span>
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                {currentStage.briefing.objective}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050914] border border-[#142036] space-y-1">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                <Layers className="w-3 h-3 text-indigo-400" />
                Expected Output
              </span>
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                {currentStage.briefing.output}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#050914] border border-[#142036] space-y-1">
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

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 1: UPLOAD & INSPECT WORKSPACE                              */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'inspector' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left (7 cols): Spacious Carrier Viewport */}
              <div className="lg:col-span-7 space-y-3">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Carrier Viewport & Pixel Stream
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E172A] border border-[#1E2E4E] text-cyan-300">
                        {originalMeta?.dimensions || 'No Carrier Loaded'}
                      </span>
                    </div>

                    {/* Zoom & Pan Controls */}
                    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#050914] border border-[#142036]">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#0E172A]"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-cyan-300 px-1 select-none">
                        {(zoomLevel * 100).toFixed(0)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                        className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#0E172A]"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#0E172A]"
                        title="Reset Zoom"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Image Canvas Area */}
                  <div className="relative rounded-xl border border-[#142036] bg-[#050914] overflow-hidden flex items-center justify-center min-h-[380px] select-none">
                    {inspectLoading ? (
                      <div className="flex flex-col items-center gap-2 text-xs text-[#94A3B8]">
                        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                        <span>Loading lossless pixel stream...</span>
                      </div>
                    ) : modifiedImageB64 ? (
                      <div
                        className="overflow-auto max-h-[460px] w-full flex items-center justify-center p-2"
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
                          className="transition-transform duration-100 border border-[#1B2B48] shadow-lg rounded"
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2 text-[#64748B]">
                        <Upload className="w-8 h-8 mx-auto text-[#475569]" />
                        <p className="text-xs">No image loaded. Upload an image to begin.</p>
                      </div>
                    )}

                    {originalMeta && (
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#070D1A]/90 border border-[#1B2B48] text-[10px] font-mono text-cyan-300 flex items-center gap-2">
                        <span>Selected Pixel:</span>
                        <span className="font-bold text-white">
                          X: {selectedPixel.x}, Y: {selectedPixel.y}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Preset Selector & Ingestion Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#142036]">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-bold flex items-center gap-2 transition shadow-[0_0_15px_rgba(0,240,255,0.25)]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Investigation Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/x-portable-graymap,.pgm"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files?.[0])}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={loadSampleCover}
                        className="px-3.5 py-2 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border border-[#1E2E4E] text-xs font-semibold transition"
                      >
                        Load BOSSbase Cover (#5001)
                      </button>
                    </div>

                    {originalMeta && (
                      <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5">
                        <span>Orig SHA-256:</span>
                        <span className="text-cyan-300 font-bold">{originalMeta.sha256_hash.slice(0, 10)}...</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(originalMeta.sha256_hash)}
                          className="hover:text-white p-1"
                          title="Copy Full SHA-256 Digest"
                        >
                          {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right (5 cols): Primary Ingestion Properties */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Carrier Ingestion Properties</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300">
                      LOSSLESS REFERENCE
                    </span>
                  </div>

                  {originalMeta ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036] space-y-2 font-mono">
                        <div className="flex justify-between py-1 border-b border-[#10192A]">
                          <span className="text-[#64748B]">Filename</span>
                          <span className="text-white font-medium truncate max-w-[180px]">{originalMeta.filename}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#10192A]">
                          <span className="text-[#64748B]">Geometry Dimensions</span>
                          <span className="text-cyan-300 font-bold">{originalMeta.dimensions} px</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#10192A]">
                          <span className="text-[#64748B]">Color Channels</span>
                          <span className="text-white">{originalMeta.color_mode} ({originalMeta.channels} ch)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#10192A]">
                          <span className="text-[#64748B]">File Size</span>
                          <span className="text-white">{(originalMeta.file_size_bytes / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-[#64748B]">SHA-256 Digest</span>
                          <span className="text-cyan-300 text-[10px] truncate max-w-[180px]">{originalMeta.sha256_hash}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#050914] border border-[#142036] space-y-1.5 text-[11px] text-[#94A3B8]">
                        <span className="text-white font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          Lossless Integer Raster Processing
                        </span>
                        <p className="leading-relaxed">
                          Image pixels are converted directly to uncompressed 2D memory arrays. JPEG recompression is disabled to protect discrete integer values from lossy quantizer perturbations.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('manipulation')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-bold flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(0,240,255,0.25)]"
                      >
                        <span>Advance to Stage 02: Modify Bits</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">Upload an image or load the sample cover above to review metadata.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Progressive Disclosure: Advanced Scientific Baselines */}
            {originalMeta && (
              <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans">
                <button
                  type="button"
                  onClick={() => setShowAdvancedBaselines((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:text-white transition"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Deep Scientific Baselines & Spatial Entropy Distribution</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                    {showAdvancedBaselines ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
                    {showAdvancedBaselines ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {showAdvancedBaselines && (
                  <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono animate-fade-in">
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Shannon Entropy</span>
                      <span className="text-sm font-bold text-cyan-300 block mt-0.5">{originalMeta.entropy} bpp</span>
                      <span className="text-[9px] text-[#64748B]">Natural spatial distribution</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Residual Energy σr²</span>
                      <span className="text-sm font-bold text-indigo-300 block mt-0.5">{originalMeta.residual_energy}</span>
                      <span className="text-[9px] text-[#64748B]">High-pass variance baseline</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Intensity (μ / σ)</span>
                      <span className="text-sm font-bold text-white block mt-0.5">{originalMeta.mean_intensity} / {originalMeta.std_dev}</span>
                      <span className="text-[9px] text-[#64748B]">Dynamic range distribution</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Total Pixels</span>
                      <span className="text-sm font-bold text-emerald-300 block mt-0.5">{originalMeta.total_pixels.toLocaleString()}</span>
                      <span className="text-[9px] text-[#64748B]">Discrete integer elements</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 2: MODIFY BITS WORKSPACE                                   */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'manipulation' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left (7 cols): Main Interactive Canvas with Click-to-Pick */}
              <div className="lg:col-span-7 space-y-3">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <div className="flex items-center gap-2">
                      <Binary className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Interactive Carrier Canvas
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E172A] border border-[#1E2E4E] text-[#94A3B8]">
                        Crosshair Click-to-Inspect
                      </span>
                    </div>

                    {/* Zoom & Pan Controls */}
                    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#050914] border border-[#142036]">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#0E172A]"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-cyan-300 px-1 select-none">
                        {(zoomLevel * 100).toFixed(0)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                        className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#0E172A]"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1)}
                        className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#0E172A]"
                        title="Reset Zoom"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Image Canvas Area */}
                  <div className="relative rounded-xl border border-[#142036] bg-[#050914] overflow-hidden flex items-center justify-center min-h-[380px] select-none">
                    {modifiedImageB64 ? (
                      <div
                        className="overflow-auto max-h-[460px] w-full flex items-center justify-center p-2"
                        style={{ cursor: 'crosshair' }}
                      >
                        <img
                          ref={canvasRef}
                          src={modifiedImageB64}
                          alt="Bit Manipulation Target"
                          onClick={handleCanvasClick}
                          style={{
                            transform: `scale(${zoomLevel})`,
                            transformOrigin: 'center center',
                            imageRendering: 'pixelated',
                            maxWidth: '100%',
                          }}
                          className="transition-transform duration-100 border border-[#1B2B48] shadow-lg rounded"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[#64748B]">No carrier loaded. Please visit Stage 1 to upload an image.</p>
                    )}

                    {originalMeta && (
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#070D1A]/90 border border-[#1B2B48] text-[10px] font-mono text-cyan-300 flex items-center gap-2">
                        <span>Selected Coordinate:</span>
                        <span className="font-bold text-white">
                          X: {selectedPixel.x}, Y: {selectedPixel.y}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hash Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#142036] text-[11px] font-mono text-[#94A3B8]">
                    <div className="flex items-center gap-2">
                      <span>Cover Hash:</span>
                      <span className="text-white font-bold">{originalMeta?.sha256_hash?.slice(0, 10)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Derived Hash:</span>
                      <span className={modifiedHash !== originalMeta?.sha256_hash ? 'text-emerald-400 font-bold' : 'text-cyan-300'}>
                        {modifiedHash?.slice(0, 10)}...
                        {modifiedHash !== originalMeta?.sha256_hash ? ' (Modified)' : ' (Cover Reference)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right (5 cols): Active Pixel Register HUD */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Binary className="w-4 h-4 text-cyan-400" />
                      <span>Active Pixel Register</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                      ({selectedPixel.x}, {selectedPixel.y})
                    </span>
                  </div>

                  {pixelDetails?.channels ? (
                    <div className="space-y-4 text-xs">
                      {pixelDetails.channels.map((ch, cIdx) => (
                        <div key={cIdx} className="p-3.5 rounded-xl bg-[#050914] border border-[#142036] space-y-3 font-mono">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)]"></span>
                              <span className="font-bold text-white text-xs">{ch.channel}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-[#64748B]">Dec: <strong className="text-white">{ch.value}</strong></span>
                              <span className="text-[#64748B]">Hex: <strong className="text-cyan-300">{ch.hex}</strong></span>
                              <button
                                type="button"
                                onClick={() => handleResetPixel(cIdx)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                              >
                                Reset
                              </button>
                            </div>
                          </div>

                          {/* 8-Bit Interactive Register Grid */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1">
                              <span>MSB (Bit 7)</span>
                              <span>LSB (Bit 0)</span>
                            </div>
                            <div className="grid grid-cols-8 gap-1.5">
                              {[7, 6, 5, 4, 3, 2, 1, 0].map((bitPos) => {
                                const bitVal = (ch.value >> bitPos) & 1;
                                const isLSB = bitPos === 0;
                                return (
                                  <button
                                    key={bitPos}
                                    type="button"
                                    onClick={() => handleToggleBit(cIdx, bitPos)}
                                    className={`p-2 rounded-lg border font-mono text-center transition-all ${
                                      bitVal === 1
                                        ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                                        : 'bg-[#0E172A] text-[#94A3B8] border-[#1E2E4E] hover:text-white hover:border-cyan-500/40'
                                    } ${isLSB ? 'ring-1 ring-cyan-400/60' : ''}`}
                                    title={`Bit ${bitPos} (${isLSB ? 'LSB' : bitPos === 7 ? 'MSB' : 'Plane ' + bitPos}) — Click to flip`}
                                  >
                                    <div className="text-sm leading-none">{bitVal}</div>
                                    <div className="text-[8px] opacity-75 mt-0.5">{bitPos}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-[#070D1A] border border-[#1B2B48] text-[11px] flex items-center justify-between">
                            <span className="text-[#64748B]">Binary Byte:</span>
                            <span className="text-white font-bold tracking-widest">{ch.binary}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">Click anywhere on the carrier canvas to inspect pixel bits.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Progressive Disclosure: Advanced Bulk Mutation Studio */}
            <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans">
              <button
                type="button"
                onClick={() => setShowBulkMutations((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-cyan-400" />
                  <span>Advanced: Bulk Deterministic Mutation Studio</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                  {showBulkMutations ? 'Hide Bulk Controls' : 'Show Bulk Controls'}
                  {showBulkMutations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showBulkMutations && (
                <div className="pt-2 space-y-4 text-xs font-mono animate-fade-in border-t border-[#142036]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[#94A3B8] block text-[11px] mb-1">Experiment Mode</label>
                      <select
                        value={bulkMode}
                        onChange={(e) => setBulkMode(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] text-white text-xs outline-none focus:border-cyan-400"
                      >
                        <option value="lsb_only">LSB Only (Bit Position 0)</option>
                        <option value="two_lsb">Two LSBs (Bit Positions 0 & 1)</option>
                        <option value="custom_plane">Target Specific Bit Plane (0–7)</option>
                        <option value="random_bits">Pseudo-Random Bit Plane Slicing</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[#94A3B8] block text-[11px] mb-1">
                        Modification Rate: {bulkPercentage}%
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="100"
                        step="0.5"
                        value={bulkPercentage}
                        onChange={(e) => setBulkPercentage(e.target.value)}
                        className="w-full accent-cyan-400 cursor-pointer mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-[#94A3B8] block text-[11px] mb-1">RNG Seed (Reproducibility)</label>
                      <input
                        type="number"
                        value={bulkSeed}
                        onChange={(e) => setBulkSeed(e.target.value)}
                        className="w-full p-2 rounded-xl bg-[#050914] border border-[#1E2E4E] text-white text-xs outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunBulkManipulation}
                    disabled={bulkProcessing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(0,240,255,0.25)]"
                  >
                    {bulkProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Executing Deterministic Mutation...</span>
                      </>
                    ) : (
                      <>
                        <Binary className="w-4 h-4 text-black" />
                        <span>Generate Derived Mutated Carrier</span>
                      </>
                    )}
                  </button>

                  {lastBulkResult && (
                    <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036] space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Modified Pixels:</span>
                        <span className="text-cyan-300 font-bold">{lastBulkResult.modified_pixels_count.toLocaleString()} px ({lastBulkResult.modification_percent}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Modified Bits:</span>
                        <span className="text-white font-bold">{lastBulkResult.modified_bits_count.toLocaleString()} bits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Derived SHA-256:</span>
                        <span className="text-cyan-300 font-mono text-[10px]">{lastBulkResult.modified_sha256}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progressive Disclosure: Advanced Bit-Plane Slicer */}
            <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans">
              <button
                type="button"
                onClick={() => setShowBitplaneSlicer((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Advanced: Interactive Bit-Plane Slicer (Planes 0–7)</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                  {showBitplaneSlicer ? 'Hide Bit-Plane Slicer' : 'Show Bit-Plane Slicer'}
                  {showBitplaneSlicer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showBitplaneSlicer && (
                <div className="pt-2 space-y-4 text-xs font-mono animate-fade-in border-t border-[#142036]">
                  <div className="flex items-center gap-3">
                    <span className="text-[#94A3B8] text-[11px]">Select Bit Plane:</span>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setActivePlane(p)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            activePlane === p
                              ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                              : 'bg-[#0E172A] text-[#94A3B8] hover:text-white border border-[#1E2E4E]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] flex items-center justify-center min-h-[220px]">
                    {bitplaneLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    ) : bitplaneData ? (
                      <div className="space-y-2 text-center w-full">
                        <img
                          src={bitplaneData.bitplane_b64}
                          alt="Bit Plane Slice"
                          className="max-h-[260px] mx-auto border border-[#1B2B48] rounded-lg shadow-md"
                        />
                        <div className="text-[11px] text-[#94A3B8]">
                          Plane {activePlane} Entropy: <strong className="text-cyan-300">{bitplaneData.plane_entropy} bpp</strong> • {bitplaneData.plane_label}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 3: CONCEAL MESSAGE WORKSPACE                               */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'embedding' && (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] max-w-md mx-auto text-xs font-sans">
              <button
                type="button"
                onClick={() => setEmbeddingSubTab('embed')}
                className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                  embeddingSubTab === 'embed'
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Embed Secret Message</span>
              </button>
              <button
                type="button"
                onClick={() => setEmbeddingSubTab('extract')}
                className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                  embeddingSubTab === 'extract'
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Extract Secret Message</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left (5 cols): Carrier Capacity & Info */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span>Carrier Capacity Meter</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                      LSB SUBSTITUTION
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="rounded-xl border border-[#142036] bg-[#050914] p-3 text-center">
                    {modifiedImageB64 ? (
                      <img
                        src={modifiedImageB64}
                        alt="Carrier Preview"
                        className="max-h-[160px] mx-auto rounded border border-[#1B2B48]"
                      />
                    ) : (
                      <p className="text-xs text-[#64748B]">No carrier loaded.</p>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Payload Size:</span>
                      <span className="text-cyan-300 font-bold">{new Blob([secretText]).size} bytes</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#050914] overflow-hidden border border-[#142036]">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            originalMeta
                              ? (new Blob([secretText]).size /
                                  Math.max(1, Math.floor((originalMeta.total_pixels - 112) / 8))) *
                                  100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#64748B]">
                      <span>112-bit StegoLab Header</span>
                      <span>
                        Max Capacity: {originalMeta ? Math.floor((originalMeta.total_pixels - 112) / 8).toLocaleString() : 0} bytes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right (7 cols): Embed or Extract Controls */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
                  {embeddingSubTab === 'embed' ? (
                    <div className="space-y-4 text-xs font-sans">
                      <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-400" />
                          <span>Conceal Confidential Secret Message</span>
                        </h3>
                      </div>

                      <div>
                        <label className="text-[#94A3B8] block text-[11px] font-mono mb-1.5">
                          Secret Payload Text (UTF-8)
                        </label>
                        <textarea
                          rows={4}
                          value={secretText}
                          onChange={(e) => setSecretText(e.target.value)}
                          placeholder="Enter secret message to conceal in carrier LSBs..."
                          className="w-full p-3 rounded-xl bg-[#050914] border border-[#1E2E4E] text-white text-xs font-mono outline-none focus:border-cyan-400 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[#94A3B8] block text-[11px] font-mono mb-1.5">
                          Optional Password (AES-256 GCM Key Derivation)
                        </label>
                        <div className="relative">
                          <input
                            type={showEmbedPassword ? 'text' : 'password'}
                            value={embedPassword}
                            onChange={(e) => setEmbedPassword(e.target.value)}
                            placeholder="Leave blank for unencrypted plaintext LSB..."
                            className="w-full p-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] text-white text-xs font-mono outline-none focus:border-cyan-400 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmbedPassword((p) => !p)}
                            className="absolute right-3 top-2.5 text-[#64748B] hover:text-white"
                          >
                            {showEmbedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleEmbedMessage}
                        disabled={embedProcessing || !secretText.trim()}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(0,240,255,0.25)] cursor-pointer disabled:opacity-50"
                      >
                        {embedProcessing ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          <Lock className="w-4 h-4 text-black" />
                        )}
                        <span>Embed Secret Message (LSB Substitution)</span>
                      </button>

                      {embedResult && (
                        <div className="p-4 rounded-xl bg-[#050914] border border-cyan-500/30 space-y-2 font-mono text-xs">
                          <div className="flex items-center justify-between text-cyan-300 font-bold">
                            <span>Payload Ingested Successfully</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40">VERIFIED</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[#64748B] block">Payload Bytes:</span>
                              <span className="text-white font-bold">{embedResult.payload_bytes} bytes</span>
                            </div>
                            <div>
                              <span className="text-[#64748B] block">Capacity Used:</span>
                              <span className="text-white font-bold">{embedResult.capacity_used_percent}%</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-[#94A3B8] truncate pt-1 border-t border-[#142036]">
                            Stego SHA-256: <strong className="text-cyan-300">{embedResult.modified_sha256}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs font-sans">
                      <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Unlock className="w-4 h-4 text-cyan-400" />
                          <span>Extract & Recover Secret Message</span>
                        </h3>
                      </div>

                      <div>
                        <label className="text-[#94A3B8] block text-[11px] font-mono mb-1.5">
                          Decryption Password (if encrypted)
                        </label>
                        <div className="relative">
                          <input
                            type={showExtractPassword ? 'text' : 'password'}
                            value={extractPassword}
                            onChange={(e) => setExtractPassword(e.target.value)}
                            placeholder="Enter password if payload was encrypted..."
                            className="w-full p-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] text-white text-xs font-mono outline-none focus:border-cyan-400 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowExtractPassword((p) => !p)}
                            className="absolute right-3 top-2.5 text-[#64748B] hover:text-white"
                          >
                            {showExtractPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExtractMessage}
                        disabled={extractProcessing}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(0,240,255,0.25)] cursor-pointer"
                      >
                        {extractProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                        <span>Extract & Verify StegoLab Payload</span>
                      </button>

                      {extractResult && (
                        <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] space-y-2 font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">Extracted Secret Text</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${extractResult.success ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'}`}>
                              {extractResult.status}
                            </span>
                          </div>
                          <pre className="p-3 rounded-lg bg-[#070D1A] border border-[#1B2B48] text-cyan-200 text-xs whitespace-pre-wrap break-all font-mono">
                            {extractResult.secret_text || '(No plaintext recovered)'}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 4: RUN STEGANALYSIS WORKSPACE                              */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'steganalysis' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left (5 cols): Model Configuration Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>Steganalysis Model Engine</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                      StegoNet-Lite
                    </span>
                  </div>

                  {/* Evaluation Target Switcher */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#94A3B8] block">Select Evaluation Target:</label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#050914] border border-[#142036] text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setAnalysisTarget('modified')}
                        className={`py-2 px-2.5 rounded-lg transition text-center truncate ${
                          analysisTarget === 'modified'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Derived Stego Carrier
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnalysisTarget('original')}
                        className={`py-2 px-2.5 rounded-lg transition text-center truncate ${
                          analysisTarget === 'original'
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Original Reference Cover
                      </button>
                    </div>
                  </div>

                  {/* Model Specs */}
                  <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036] space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Architecture:</span>
                      <span className="text-white font-bold">4-Block Residual CNN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Parameters:</span>
                      <span className="text-white">304,220 weights</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Hardware Device:</span>
                      <span className="text-cyan-300 font-bold">PyTorch CPU</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunSteganalysis}
                    disabled={analysisLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
                  >
                    {analysisLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Evaluating Neural Tensors...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4 text-black" />
                        <span>Run Deep Residual Steganalysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right (7 cols): Classification HUD & Verdict */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
                  <div className="flex items-center justify-between border-b border-[#142036] pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>Classification Verdict HUD</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E172A] border border-[#1E2E4E] text-[#94A3B8]">
                      Target: {analysisTarget === 'modified' ? 'Modified Image' : 'Original Cover'}
                    </span>
                  </div>

                  {analysisResult ? (
                    <div className="space-y-4 font-mono">
                      {/* Prominent Verdict Card */}
                      {(() => {
                        const verdictStr = analysisResult.verdict || '';
                        const isInconc = verdictStr.toLowerCase().includes('inconclusive') || analysisResult.is_conclusive === false;
                        const isStego = !isInconc && (verdictStr.includes('Stego'));
                        const isCover = !isInconc && (verdictStr.includes('Cover'));
                        const marginVal = Math.abs((analysisResult.stego_probability ?? 0.5) - (analysisResult.cover_probability ?? 0.5));

                        return (
                          <>
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${
                              isInconc
                                ? 'bg-amber-950/20 border-amber-500/40'
                                : isStego
                                ? 'bg-rose-950/20 border-rose-500/40'
                                : 'bg-emerald-950/20 border-emerald-500/40'
                            }`}>
                              <div>
                                <span className="text-[#64748B] block text-[10px] uppercase tracking-wider">Classification Verdict</span>
                                <span className="text-xs text-[#94A3B8]">
                                  {analysisResult.score_type || 'Uncalibrated Model Score'}
                                </span>
                              </div>
                              <span
                                className={`text-base font-extrabold px-3 py-1 rounded-xl border ${
                                  isInconc
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                    : isStego
                                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                }`}
                              >
                                {analysisResult.verdict}
                              </span>
                            </div>

                            {/* Dual Probability Bar */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-[#94A3B8]">Cover Probability: <strong className="text-white">{(analysisResult.cover_probability * 100).toFixed(1)}%</strong></span>
                                <span className="text-[#94A3B8]">Stego Probability: <strong className="text-cyan-300">{(analysisResult.stego_probability * 100).toFixed(1)}%</strong></span>
                              </div>
                              <div className="h-2.5 rounded-full bg-[#050914] overflow-hidden flex border border-[#142036]">
                                <div
                                  style={{ width: `${analysisResult.cover_probability * 100}%` }}
                                  className="bg-emerald-500/80"
                                />
                                <div
                                  style={{ width: `${analysisResult.stego_probability * 100}%` }}
                                  className="bg-cyan-400"
                                />
                              </div>
                              {isInconc && (
                                <p className="text-[10px] text-amber-400/90 font-mono mt-1">
                                  Decision Margin: {(marginVal * 100).toFixed(1)}% (below 15.0% threshold). Insufficient evidence to classify.
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {/* Forensic Explanation */}
                      <div className="p-3 rounded-xl bg-[#050914] border border-[#142036] text-[11px] text-[#CBD5E1] leading-relaxed font-sans">
                        {analysisResult.forensic_explanation ||
                          'The neural model evaluated the input image against high-pass residual filter responses.'}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-2 text-[#64748B]">
                      <Cpu className="w-8 h-8 mx-auto text-[#475569]" />
                      <p className="text-xs">Select your target and click Evaluate to execute real CNN inference.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progressive Disclosure: Neural Diagnostics & Feature Attribution */}
            {analysisResult && (
              <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans">
                <button
                  type="button"
                  onClick={() => setShowNeuralDiagnostics((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:text-white transition"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Neural Diagnostics, Latency & Feature Attribution</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                    {showNeuralDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
                    {showNeuralDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {showNeuralDiagnostics && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono animate-fade-in border-t border-[#142036]">
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Inference Latency</span>
                      <span className="text-sm font-bold text-white block mt-0.5">{analysisResult.execution_time_ms || 28.5} ms</span>
                      <span className="text-[9px] text-[#64748B]">PyTorch CPU execution</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Laplacian Residual σr²</span>
                      <span className="text-sm font-bold text-cyan-300 block mt-0.5">{analysisResult.residual_energy || '—'}</span>
                      <span className="text-[9px] text-[#64748B]">Auxiliary spatial variance</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[10px] text-[#64748B] block">Score Calibration</span>
                      <span className="text-sm font-bold text-indigo-300 block mt-0.5">Uncalibrated Logits</span>
                      <span className="text-[9px] text-[#64748B]">Softmax decision margin</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 5: COMPARE FORENSICS WORKSPACE                             */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            {/* Top Metrics Ribbon (Full Width) */}
            {comparisonData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-sm">
                  <span className="text-[10px] text-[#64748B] block">Changed Pixels</span>
                  <span className="text-base font-bold text-cyan-300 block mt-0.5">
                    {comparisonData.changed_pixels.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#64748B]">Exact coordinate count</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-sm">
                  <span className="text-[10px] text-[#64748B] block">Change Rate</span>
                  <span className="text-base font-bold text-indigo-300 block mt-0.5">
                    {comparisonData.changed_pixel_percent}%
                  </span>
                  <span className="text-[10px] text-[#64748B]">Carrier surface density</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-sm">
                  <span className="text-[10px] text-[#64748B] block">Hamming Bit Distance</span>
                  <span className="text-base font-bold text-white block mt-0.5">
                    {comparisonData.total_bit_changes.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#64748B]">Discrete flipped bits</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-sm">
                  <span className="text-[10px] text-[#64748B] block">Bit-Fidelity Status</span>
                  <span className="text-base font-bold text-emerald-300 block mt-0.5">
                    {comparisonData.unchanged_pixels.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#64748B]">Unaltered pixels intact</span>
                </div>
              </div>
            )}

            {/* Differential Visual Workstation (Full Width) */}
            <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-3">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">Visual Differential Forensics</span>
                </div>

                {/* Sub-mode Switcher */}
                <div className="flex items-center gap-2 p-1 rounded-xl bg-[#050914] border border-[#142036] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setComparisonViewMode('heatmap')}
                    className={`px-3 py-1.5 rounded-lg transition font-bold ${
                      comparisonViewMode === 'heatmap'
                        ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    Amplified Perturbation Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonViewMode('loupe')}
                    className={`px-3 py-1.5 rounded-lg transition font-bold ${
                      comparisonViewMode === 'loupe'
                        ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    Synchronized 8x Micro-Loupe
                  </button>
                </div>
              </div>

              {comparisonLoading ? (
                <div className="py-12 text-center text-[#94A3B8]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  <span>Computing exact array differences...</span>
                </div>
              ) : comparisonData ? (
                <div className="space-y-4">
                  {comparisonViewMode === 'heatmap' && comparisonData.diff_map_b64 && (
                    <div className="space-y-2">
                      <div className="p-4 rounded-xl bg-[#050914] border border-[#142036] text-center">
                        <img
                          src={comparisonData.diff_map_b64}
                          alt="Amplified Perturbation Map"
                          className="max-h-[360px] mx-auto border border-[#1B2B48] rounded-xl shadow-lg"
                        />
                        <span className="text-[11px] text-[#94A3B8] mt-2 block font-mono">
                          White = +1 Perturbation • Gray = -1 Perturbation • Black = Unaltered Pixel
                        </span>
                      </div>
                    </div>
                  )}

                  {comparisonViewMode === 'loupe' && originalImageB64 && modifiedImageB64 && (
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
                <p className="text-xs text-[#64748B] text-center py-8">
                  Run a bit modification or embedding experiment to inspect forensic differences.
                </p>
              )}
            </div>

            {/* Progressive Disclosure: Statistical Distribution Shifts */}
            {comparisonData?.statistics && (
              <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-sans">
                <button
                  type="button"
                  onClick={() => setShowDistributionShifts((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:text-white transition"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Statistical Distribution Shifts & Residual Energy Deltas</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                    {showDistributionShifts ? 'Hide Distribution Shifts' : 'Show Distribution Shifts'}
                    {showDistributionShifts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {showDistributionShifts && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono animate-fade-in border-t border-[#142036]">
                    <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Shannon Entropy Shift:</span>
                      <span className="text-white text-sm font-bold block mt-0.5">
                        {comparisonData.statistics.original_entropy} → {comparisonData.statistics.modified_entropy}
                      </span>
                      <span className="text-[10px] text-cyan-400">
                        Δ {comparisonData.statistics.delta_entropy > 0 ? '+' : ''}{comparisonData.statistics.delta_entropy} bpp
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#050914] border border-[#142036]">
                      <span className="text-[#64748B] block text-[10px]">Laplacian Residual Energy Shift:</span>
                      <span className="text-white text-sm font-bold block mt-0.5">
                        {comparisonData.statistics.original_residual_energy} → {comparisonData.statistics.modified_residual_energy}
                      </span>
                      <span className="text-[10px] text-indigo-400">
                        Δ {comparisonData.statistics.delta_residual_energy > 0 ? '+' : ''}{comparisonData.statistics.delta_residual_energy}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 6: AUDIT HISTORY WORKSPACE                                 */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4 shadow-md font-sans">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">ISO/IEC 27037 Laboratory Experiment Ledger</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E172A] border border-[#1E2E4E] text-cyan-300">
                    {experiments.length} Sessions
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadExperimentsList}
                    className="px-3 py-1.5 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border border-[#1E2E4E] text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveExperiment(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-bold flex items-center gap-1.5 transition shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                  >
                    {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saveSuccess ? 'Saved to Ledger' : 'Save Current Session'}</span>
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-[#94A3B8]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  <span>Loading experiment ledger...</span>
                </div>
              ) : experiments.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-[#64748B]">
                  <History className="w-8 h-8 mx-auto text-[#475569]" />
                  <p className="text-xs">No saved laboratory experiments yet. Run a test and click Save Current Session.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {experiments.map((exp) => (
                    <div
                      key={exp.id}
                      onClick={() => handleReopenExperiment(exp.id)}
                      className="p-4 rounded-xl bg-[#050914] hover:bg-[#0A1224] border border-[#142036] hover:border-cyan-500/40 cursor-pointer transition flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate text-xs group-hover:text-cyan-300 transition">
                          {exp.experiment_name}
                        </div>
                        <div className="text-[10px] text-[#64748B] flex items-center gap-2 mt-1 font-mono">
                          <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{exp.changed_pixels.toLocaleString()} px ({exp.change_rate_percent}%)</span>
                          {exp.verdict && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400 font-bold">{exp.verdict}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={steganalysisApi.getLabDownloadUrl(exp.id)}
                          download={`modified_${exp.id}.png`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#0E172A] border border-[#1E2E4E]"
                          title="Download Modified PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteExperiment(exp.id, e)}
                          className="p-2 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-[#0E172A] border border-[#1E2E4E]"
                          title="Delete Experiment Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STAGE 7: S-UNIWARD SIMULATOR WORKSPACE                           */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'simulator' && (
          <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-md">
            <SUniwardStressSimulator originalImageSrc={originalImageB64} />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Standardized Bottom Guided Navigation Controls (All 7 Stages)    */}
        {/* ---------------------------------------------------------------- */}
        <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans shadow-md">
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

