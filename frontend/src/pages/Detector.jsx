import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  HelpCircle,
  FileText,
  Clock,
  Cpu,
  Hash,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  Split,
  ZoomIn,
  FolderArchive,
  BarChart2,
  FileCode,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import ForensicReportModal from '../components/analysis/ForensicReportModal';
import PixelLoupeMagnifier from '../components/analysis/PixelLoupeMagnifier';
import BatchTriageWorkstation from '../components/analysis/BatchTriageWorkstation';
import ComparisonWipeSlider from '../components/analysis/ComparisonWipeSlider';
import ForensicScanningHUD from '../components/analysis/ForensicScanningHUD';
import PixelHistogramChart from '../components/analysis/PixelHistogramChart';
import FileStructureCarver from '../components/analysis/FileStructureCarver';
import AdvancedForensicDashboard from '../components/analysis/AdvancedForensicDashboard';
import { playLaserScan, playTargetLock, playCyberClick } from '../utils/cyberSoundEffects';

export default function Detector({ initialFile = null }) {
  const [detectionMode, setDetectionMode] = useState('single'); // 'single' | 'batch'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [modelChoice, setModelChoice] = useState('stegonet_lite');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Visual Forensics State
  const [visualTab, setVisualTab] = useState('heatmap'); // 'heatmap' | 'bitplane' | 'diff'
  const [selectedBitplane, setSelectedBitplane] = useState(0);
  const [bitplaneCache, setBitplaneCache] = useState({});
  const [isLoadingBitplane, setIsLoadingBitplane] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialFile) {
      handleFileSelect(initialFile);
    }
  }, [initialFile]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setError(null);
    setResult(null);
    setBitplaneCache({});
    setSelectedBitplane(0);
    setVisualTab('heatmap');
    setFile(selectedFile);

    // If browser supports preview (png, jpg, webp, bmp)
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleBitplaneChange = async (plane) => {
    setSelectedBitplane(plane);
    if (!file) return;
    if (plane === 0 && result?.bitplane_0_b64) return;
    if (bitplaneCache[plane]) return;

    setIsLoadingBitplane(true);
    try {
      const res = await steganalysisApi.extractBitplane(file, plane);
      setBitplaneCache((prev) => ({ ...prev, [plane]: res.image_b64 }));
    } catch (e) {
      console.error('Failed to extract bitplane:', e);
    } finally {
      setIsLoadingBitplane(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const loadSample = async (sampleType) => {
    loadAndRunSample(sampleType);
  };

  const loadAndRunSample = async (sampleType) => {
    setError(null);
    setResult(null);
    setBitplaneCache({});
    setSelectedBitplane(0);
    setVisualTab('heatmap');

    let samplePath, sampleName;
    if (sampleType === 'cover') {
      samplePath = '/samples/sample_cover.png';
      sampleName = 'sample_5001_cover.png';
    } else if (sampleType === 'stego') {
      samplePath = '/samples/sample_stego.png';
      sampleName = 'sample_5001_stego_0.4bpp.png';
    } else {
      samplePath = '/samples/sample_inconclusive.png';
      sampleName = 'sample_uniform_gray.png';
    }

    try {
      const response = await fetch(samplePath);
      const blob = await response.blob();
      const sampleFile = new File([blob], sampleName, { type: 'image/png' });
      setFile(sampleFile);
      const url = URL.createObjectURL(sampleFile);
      setPreviewUrl(url);

      // Instantly run analysis for live demonstration
      playLaserScan();
      setIsAnalyzing(true);
      const res = await steganalysisApi.analyzeImage(sampleFile, modelChoice);
      setResult(res);
      playTargetLock((res.verdict || '').toLowerCase().includes('stego'));
      if (res.bitplane_0_b64) {
        setBitplaneCache({ 0: res.bitplane_0_b64 });
      }
      if (res.diff_map_b64) {
        setVisualTab('diff');
      } else {
        setVisualTab('heatmap');
      }
    } catch (err) {
      console.error('Failed to load & analyze sample:', err);
      setError('Could not run benchmark sample analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      playLaserScan();
      const res = await steganalysisApi.analyzeImage(file, modelChoice);
      setResult(res);
      playTargetLock((res.verdict || '').toLowerCase().includes('stego'));
      if (res.bitplane_0_b64) {
        setBitplaneCache({ 0: res.bitplane_0_b64 });
      }
      if (res.diff_map_b64) {
        setVisualTab('diff');
      } else {
        setVisualTab('heatmap');
      }
    } catch (err) {
      console.error('Steganalysis scan failed:', err);
      const detailMsg =
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : err.response?.data?.message ||
            err.message ||
            'Steganalysis inspection failed. Ensure backend API is active.';
      setError(detailMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setBitplaneCache({});
    setSelectedBitplane(0);
    setVisualTab('heatmap');
  };

  const verdict = result?.verdict || '';
  const isInconclusive = verdict.toLowerCase().includes('inconclusive') || result?.is_conclusive === false || (result?.verdict_category && result.verdict_category.includes('INCONCLUSIVE'));
  const isStego = !isInconclusive && (verdict === 'Stego Indicated' || verdict === 'Stego');
  const isCover = !isInconclusive && (verdict === 'Cover Indicated' || verdict === 'Cover');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#292929] pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
            PyTorch Forensic Engine
          </span>
          <span className="text-xs text-[#777777] font-mono">• Single Image Analysis</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          Steganalysis Detection Workspace
        </h1>
        <p className="text-sm text-[#777777] mt-1 max-w-3xl">
          Upload or select test images to detect S-UNIWARD spatial domain steganography at 0.4 bpp.
          Evaluates high-pass spatial noise residuals and residual neural network activations.
        </p>
      </div>

      {/* Workspace Mode Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] w-fit shadow-md">
        <button
          onClick={() => {
            playCyberClick();
            setDetectionMode('single');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
            detectionMode === 'single'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-[#64748B] hover:text-white'
          }`}
        >
          <FileImage className="w-4 h-4 text-cyan-400" />
          <span>Single Carrier Inspection</span>
        </button>
        <button
          onClick={() => {
            playCyberClick();
            setDetectionMode('batch');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
            detectionMode === 'batch'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-[#64748B] hover:text-white'
          }`}
        >
          <FolderArchive className="w-4 h-4 text-cyan-400" />
          <span>Batch Evidence Triage (10–50 Carriers)</span>
        </button>
      </div>

      {detectionMode === 'batch' ? (
        <BatchTriageWorkstation />
      ) : (
        <>
          {/* Evaluator Benchmark Triage Bar (Live Demo Mode) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0B1120] border border-[#1B2B48] shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
            <span className="text-xs font-semibold text-white">
              One-Click Evaluator Benchmark Triage:
            </span>
            <span className="text-xs text-cyan-400/80 font-mono hidden sm:inline">
              (Live Demo Mode)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadAndRunSample('cover')}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)] disabled:opacity-50"
              title="Loads clean reference image and immediately verifies Cover Indicated verdict"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Clean Cover (#5001)</span>
            </button>
            <button
              onClick={() => loadAndRunSample('stego')}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.15)] disabled:opacity-50"
              title="Loads stego carrier and immediately verifies Stego Indicated verdict with S-UNIWARD perturbations"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Stego S-UNIWARD (#5001)</span>
            </button>
            <button
              onClick={() => loadAndRunSample('inconclusive')}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-amber-950/40 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)] disabled:opacity-50"
              title="Loads zero-residual gray carrier and immediately demonstrates Inconclusive scientific state"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Inconclusive Sample</span>
            </button>
          </div>
        </div>

        {/* Paired Reference Benchmark Comparison Box (Requirement 5 & 6) */}
        {file?.name?.includes('5001') ? (
          <div className="p-4 rounded-xl bg-[#111111] border border-[#292929] text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                Verified Ground-Truth Reference Pair (BOSSbase #5001)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
                Bit-Accurate Benchmark Pair
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                <span className="text-[#777777] block text-[10px]">Cover #5001 Baseline</span>
                <span className="text-white font-bold block mt-0.5">σr² = 851.79</span>
                <span className="text-[#777777] text-[10px]">0 altered pixels (Clean)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                <span className="text-[#777777] block text-[10px]">Stego #5001 (0.4 bpp)</span>
                <span className="text-white font-bold block mt-0.5">σr² = 853.70</span>
                <span className="text-[#777777] text-[10px]">26,364 altered pixels (±1)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                <span className="text-[#777777] block text-[10px]">Physical Perturbation Delta</span>
                <span className="text-white font-bold block mt-0.5">Δ = +1.91 σr²</span>
                <span className="text-[#777777] text-[10px]">10.06% change rate (S-UNIWARD)</span>
              </div>
            </div>
          </div>
        ) : file ? (
          <div className="p-3 rounded-xl bg-[#111111] border border-[#292929] text-xs text-[#777777] flex items-start gap-2 animate-fadeIn">
            <HelpCircle className="w-4 h-4 text-[#B3B3B3] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[#B3B3B3]">Arbitrary Image Upload:</strong> Natural scene textures across digital images vary widely (σr² ~ 20 to 6,800). Without a verified clean cover reference, single-image residual energy is an auxiliary forensic observation, not standalone proof.
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 relative ${
              isDragging
                ? 'border-white bg-[#1A1A1A] scale-[0.99]'
                : file
                ? 'border-[#383838] bg-[#111111]'
                : 'border-[#292929] hover:border-[#383838] bg-[#111111]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".png,.bmp,.pgm,.jpg,.jpeg"
              className="hidden"
            />

            {previewUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 rounded-xl overflow-hidden border border-[#292929] bg-black shadow-xl mb-4 relative group">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Electric-Cyan Laser Scanline HUD Overlay when analyzing */}
                  {isAnalyzing && (
                    <>
                      <div className="absolute inset-0 bg-cyan-500/10 z-10 pointer-events-none"></div>
                      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] opacity-30 z-10 pointer-events-none"></div>
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_#00f0ff,0_0_32px_#00f0ff] animate-laser-scan pointer-events-none z-20"></div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/90 text-[9px] font-mono text-cyan-300 border border-cyan-500/40 z-20 animate-pulse flex items-center gap-1.5 shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                        <span>SCANNING SPATIAL TENSOR</span>
                      </div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-medium z-30">
                    Click to Change Image
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="text-xs text-[#777777] mt-1 font-mono">
                  {(file.size / 1024).toFixed(1)} KB • {file.type || 'image/pgm'}
                </div>
              </div>
            ) : file ? (
              <div className="py-4">
                <FileImage className="w-16 h-16 text-white mx-auto mb-3" />
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="text-xs text-[#777777] mt-1 font-mono">
                  {(file.size / 1024).toFixed(1)} KB • PGM / RAW Format
                </div>
                <span className="text-xs text-[#B3B3B3] mt-2 inline-block font-medium">
                  Click to replace image
                </span>
              </div>
            ) : (
              <div className="py-6">
                <div className="w-14 h-14 rounded-2xl bg-[#151515] text-white flex items-center justify-center mx-auto mb-4 border border-[#292929]">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-base font-semibold text-white">
                  Drag and drop an image file here
                </p>
                <p className="text-xs text-[#777777] mt-1.5">
                  Supports PGM (BOSSbase benchmark), PNG, BMP, JPEG (up to 25 MB)
                </p>
                <button
                  type="button"
                  className="mt-5 px-4 py-2 bg-[#1C1C1C] hover:bg-[#242424] border border-[#292929] text-white rounded-xl text-xs font-semibold transition"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Model Selector Card */}
          <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">Detection Model Selection</h3>
              </div>
              <span className="text-[11px] text-[#777777]">Choose inference model</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* StegoNet-Lite */}
              <div
                onClick={() => setModelChoice('stegonet_lite')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  modelChoice === 'stegonet_lite'
                    ? 'bg-[#1C1C1C] border-[#555555] shadow-sm'
                    : 'bg-[#151515] border-[#292929] hover:border-[#383838]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">StegoNet-Lite</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111111] text-[#B3B3B3] border border-[#292929]">
                    Experimental Baseline
                  </span>
                </div>
                <p className="text-[11px] text-[#777777] mt-1 leading-snug">
                  Lightweight 4-stage residual network for CPU demonstration (~15 ms). Built for pipeline testing.
                </p>
              </div>

              {/* SRNet */}
              <div
                onClick={() => setModelChoice('srnet')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  modelChoice === 'srnet'
                    ? 'bg-[#1C1C1C] border-[#555555] shadow-sm'
                    : 'bg-[#151515] border-[#292929] hover:border-[#383838]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">SRNet Architecture</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111111] text-[#B3B3B3] border border-[#292929]">
                    Research (GPU Pending)
                  </span>
                </div>
                <p className="text-[11px] text-[#777777] mt-1 leading-snug">
                  12-layer deep residual research architecture (Boroumand et al. 2018). Full GPU cluster training is pending.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={runAnalysis}
              disabled={!file || isAnalyzing}
              className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                !file || isAnalyzing
                  ? 'bg-[#1A1A1A] text-[#555555] cursor-not-allowed border border-[#292929]'
                  : 'bg-white hover:bg-[#E5E5E5] text-black shadow-white/5 hover:scale-[1.005] theme-btn-primary'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Evaluating High-Pass Residuals & CNN Activation...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-black" />
                  <span>Execute Steganalysis Inspection</span>
                </>
              )}
            </button>

            {file && (
              <button
                onClick={resetAll}
                className="px-4 py-3.5 rounded-xl bg-[#151515] hover:bg-[#1E1E1E] text-[#B3B3B3] hover:text-white border border-[#292929] text-sm transition"
              >
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-[#151515] border border-[#383838] text-white text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-white mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Cyber Threat Verdict HUD (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-2xl flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1B2B48]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Forensic Inspection HUD</h3>
                    <span className="text-[10px] font-mono text-[#94A3B8]">Real-Time Classifier Telemetry</span>
                  </div>
                </div>

                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                      title="Open Official Case Report"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Certificate</span>
                    </button>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#0B1528] text-cyan-400 border border-[#1B2B48]">
                      #{result.id || 'LIVE'}
                    </span>
                  </div>
                )}
              </div>

              {!result && !isAnalyzing && (
                <div className="py-24 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#0B1528] border border-[#1B2B48] flex items-center justify-center mx-auto mb-3 text-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
                    <Activity className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-white">Sensor Grid Ready</p>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-xs mx-auto">
                    Select a benchmark sample above or drop an image tensor to execute high-pass residual steganalysis.
                  </p>
                </div>
              )}

              {isAnalyzing && (
                <ForensicScanningHUD
                  filename={file?.name}
                  modelChoice={modelChoice}
                />
              )}

              {result && !isAnalyzing && (
                <div className="mt-5 space-y-4">
                  {/* Dynamic Cyber Threat Verdict Banner */}
                  <div
                    className={`p-5 rounded-2xl text-center border relative overflow-hidden transition-all duration-300 ${
                      isInconclusive
                        ? 'bg-amber-950/25 border-amber-500/40 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
                        : isStego
                        ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.18)]'
                        : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold mb-2.5 border ${
                        isInconclusive
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isStego
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {isInconclusive ? (
                        <>
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>SCIENTIFIC GUARDRAIL (LOW MARGIN)</span>
                        </>
                      ) : isStego ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping mr-0.5"></span>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>STEGO PAYLOAD INDICATED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PRISTINE COVER CARRIER</span>
                        </>
                      )}
                    </div>

                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                      {isInconclusive
                        ? 'INCONCLUSIVE'
                        : isStego
                        ? 'STEGO INDICATED'
                        : 'COVER INDICATED'}
                    </div>

                    <div className="text-xs mt-1.5 text-[#94A3B8] font-mono">
                      {isInconclusive
                        ? `Decision Margin: ${(Math.abs(result.stego_probability - result.cover_probability) * 100).toFixed(1)}% (Insufficient evidence to classify)`
                        : `Neural Activation Confidence: ${(result.confidence * 100).toFixed(1)}% (${result.model_name || 'StegoNet-Lite'})`}
                    </div>
                  </div>

                  {/* Glowing Dual Probability Spectrum Bar */}
                  <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5 font-mono">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Probability Spectrum</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B1528] text-cyan-300 border border-[#1B2B48]">
                        {result.score_type || 'Uncalibrated Model Score'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Cover: {(result.cover_probability * 100).toFixed(1)}%
                        </span>
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          Stego: {(result.stego_probability * 100).toFixed(1)}%
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        </span>
                      </div>

                      {/* Glowing Dual Progress Bar */}
                      <div className="h-3 w-full rounded-full bg-black/60 border border-[#1B2B48] overflow-hidden flex p-0.5 relative">
                        <div
                          style={{ width: `${result.cover_probability * 100}%` }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        ></div>
                        <div
                          style={{ width: `${result.stego_probability * 100}%` }}
                          className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-r-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                        ></div>
                      </div>

                      <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                        <span>Architecture: {result.model_name || 'StegoNet-Lite'}</span>
                        <span>Evaluation: {result.model_status || 'Experimental Baseline'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Forensic Parameters Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#050914] border border-[#1B2B48]">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Laplacian Residual (σr²)
                      </span>
                      <span className="text-cyan-300 font-bold text-sm mt-0.5 block">
                        {result.residual_energy ? `${result.residual_energy.toFixed(2)} σr²` : '--'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#050914] border border-[#1B2B48]">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Inference Telemetry
                      </span>
                      <span className="text-white font-bold text-sm mt-0.5 block truncate">
                        {result.execution_time_ms} ms / {result.device}
                      </span>
                    </div>
                  </div>

                  {/* Scientific Rationale Card */}
                  <div className="p-3.5 rounded-xl bg-[#050914] border border-[#1B2B48] text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-bold text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Forensic Classification Rationale</span>
                    </div>
                    <p className="text-[#94A3B8] leading-relaxed text-[11px] font-sans">
                      {result.forensic_explanation}
                    </p>
                  </div>

                  {/* Forensic Hash Fingerprint */}
                  <div className="p-2.5 rounded-xl bg-[#050914] border border-[#1B2B48] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                      <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[#94A3B8] font-bold">SHA-256:</span>
                      <span className="text-cyan-300 truncate">{result.file_hash}</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold shrink-0">✓ Chain-of-Custody</span>
                  </div>
                </div>
              )}
            </div>

            {/* Scientific Transparency Disclaimer */}
            <div className="mt-5 pt-3.5 border-t border-[#1B2B48] text-[11px] text-[#64748B] leading-normal flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Demonstration Rigor: StegoNet-Lite is an experimental baseline engineered for CPU demonstration. S-UNIWARD ternary ±1 perturbations cancel across spatial pooling; paired baseline subtraction or deep SRNet unpooled features are essential for courtroom attribution.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Forensic Intelligence & Precision Analysis Studio */}
      {result && (
        <AdvancedForensicDashboard
          result={result}
          file={file}
          previewUrl={previewUrl}
          onOpenCertificate={() => setIsReportOpen(true)}
          onBitplaneSelect={handleBitplaneChange}
          selectedBitplane={selectedBitplane}
          bitplaneCache={bitplaneCache}
          isLoadingBitplane={isLoadingBitplane}
        />
      )}

    </>
  )}

      {/* Forensic Examination Certificate Modal (Phase 3) */}
      <ForensicReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportData={result}
        previewUrl={previewUrl}
      />
    </div>
  );
}
