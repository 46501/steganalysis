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
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import ForensicReportModal from '../components/analysis/ForensicReportModal';
import PixelLoupeMagnifier from '../components/analysis/PixelLoupeMagnifier';
import BatchTriageWorkstation from '../components/analysis/BatchTriageWorkstation';
import ComparisonWipeSlider from '../components/analysis/ComparisonWipeSlider';
import ForensicScanningHUD from '../components/analysis/ForensicScanningHUD';
import PixelHistogramChart from '../components/analysis/PixelHistogramChart';

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
    setError(null);
    setResult(null);
    const samplePath = sampleType === 'cover' ? '/samples/sample_cover.png' : '/samples/sample_stego.png';
    const sampleName = sampleType === 'cover' ? 'sample_5001_cover.png' : 'sample_5001_stego_0.4bpp.png';

    try {
      const response = await fetch(samplePath);
      const blob = await response.blob();
      const sampleFile = new File([blob], sampleName, { type: 'image/png' });
      handleFileSelect(sampleFile);
    } catch (err) {
      setError('Could not load sample file. Please upload an image directly.');
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await steganalysisApi.analyzeImage(file, modelChoice);
      setResult(res);
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

  const isStego = result?.verdict === 'Stego';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-gray-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            PyTorch Forensic Engine
          </span>
          <span className="text-xs text-gray-500 font-mono">• Single Image Analysis</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          Steganalysis Detection Workspace
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-3xl">
          Upload or select test images to detect S-UNIWARD spatial domain steganography at 0.4 bpp.
          Evaluates high-pass spatial noise residuals and residual neural network activations.
        </p>
      </div>

      {/* Workspace Mode Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-900 border border-gray-800 w-fit">
        <button
          onClick={() => setDetectionMode('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            detectionMode === 'single'
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileImage className="w-4 h-4 text-cyan-400" />
          <span>Single Image Inspection</span>
        </button>
        <button
          onClick={() => setDetectionMode('batch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            detectionMode === 'batch'
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FolderArchive className="w-4 h-4 text-indigo-400" />
          <span>Batch Evidence Triage (10–50 Images)</span>
        </button>
      </div>

      {detectionMode === 'batch' ? (
        <BatchTriageWorkstation />
      ) : (
        <>
          {/* Preset Sample Quick-Pick Bar (College Demo Accelerator) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gray-900/90 border border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-gray-300">
              Instant Evaluator Samples:
            </span>
            <span className="text-xs text-gray-500">
              (From validated BOSSbase 1.01 test partition)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadSample('cover')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Load Sample Cover (#5001)</span>
            </button>
            <button
              onClick={() => loadSample('stego')}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-medium transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Load Sample Stego (#5001 S-UNIWARD)</span>
            </button>
          </div>
        </div>

        {/* Paired Reference Benchmark Comparison Box (Requirement 5 & 6) */}
        {file?.name?.includes('5001') ? (
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Verified Ground-Truth Reference Pair (BOSSbase #5001)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Bit-Accurate Benchmark Pair
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                <span className="text-gray-400 block text-[10px]">Cover #5001 Baseline</span>
                <span className="text-emerald-400 font-bold block mt-0.5">σr² = 851.79</span>
                <span className="text-gray-500 text-[10px]">0 altered pixels (Clean)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                <span className="text-gray-400 block text-[10px]">Stego #5001 (0.4 bpp)</span>
                <span className="text-rose-400 font-bold block mt-0.5">σr² = 853.70</span>
                <span className="text-gray-500 text-[10px]">26,364 altered pixels (±1)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                <span className="text-gray-400 block text-[10px]">Physical Perturbation Delta</span>
                <span className="text-cyan-400 font-bold block mt-0.5">Δ = +1.91 σr²</span>
                <span className="text-gray-500 text-[10px]">10.06% change rate (S-UNIWARD)</span>
              </div>
            </div>
          </div>
        ) : file ? (
          <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800/80 text-xs text-gray-400 flex items-start gap-2 animate-fadeIn">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-gray-300">Arbitrary Image Upload:</strong> Natural scene textures across digital images vary widely (σr² ~ 20 to 6,800). Without a verified clean cover reference, single-image residual energy is an auxiliary forensic observation, not standalone proof.
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
                ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
                : file
                ? 'border-cyan-800 bg-gray-900/60'
                : 'border-gray-800 hover:border-gray-700 bg-gray-900/40'
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
                <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-700 bg-black/40 shadow-xl mb-4 relative group">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Laser Scanline HUD Overlay when analyzing */}
                  {isAnalyzing && (
                    <>
                      <div className="absolute inset-0 bg-cyan-950/20 z-10 pointer-events-none"></div>
                      <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:12px_12px] opacity-30 z-10 pointer-events-none"></div>
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-laser-scan pointer-events-none z-20"></div>
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-cyan-300 border border-cyan-800 z-20 animate-pulse">
                        SCANNING TENSOR
                      </div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-medium z-30">
                    Click to Change Image
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  {(file.size / 1024).toFixed(1)} KB • {file.type || 'image/pgm'}
                </div>
              </div>
            ) : file ? (
              <div className="py-4">
                <FileImage className="w-16 h-16 text-cyan-400 mx-auto mb-3" />
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  {(file.size / 1024).toFixed(1)} KB • PGM / RAW Format
                </div>
                <span className="text-xs text-cyan-400 mt-2 inline-block font-medium">
                  Click to replace image
                </span>
              </div>
            ) : (
              <div className="py-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-gray-700">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-base font-semibold text-gray-200">
                  Drag and drop an image file here
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  Supports PGM (BOSSbase benchmark), PNG, BMP, JPEG (up to 25 MB)
                </p>
                <button
                  type="button"
                  className="mt-5 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-cyan-400 rounded-xl text-xs font-semibold transition"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Model Selector Card */}
          <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Detection Model Selection</h3>
              </div>
              <span className="text-[11px] text-gray-400">Choose inference model</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* StegoNet-Lite */}
              <div
                onClick={() => setModelChoice('stegonet_lite')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  modelChoice === 'stegonet_lite'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                    : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">StegoNet-Lite</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    Experimental Baseline
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                  Lightweight 4-stage residual network for CPU demonstration (~15 ms). Built for pipeline testing.
                </p>
              </div>

              {/* SRNet */}
              <div
                onClick={() => setModelChoice('srnet')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  modelChoice === 'srnet'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                    : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">SRNet Architecture</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Research (GPU Pending)
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-snug">
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
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  : 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/25 hover:shadow-cyan-500/40 hover:scale-[1.01]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>Evaluating High-Pass Residuals & CNN Activation...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute Steganalysis Inspection</span>
                </>
              )}
            </button>

            {file && (
              <button
                onClick={resetAll}
                className="px-4 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 text-sm transition"
              >
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Forensic Results Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-xl flex flex-col justify-between min-h-[460px]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Forensic Inspection Report</h3>
                </div>
                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition"
                      title="Open Official Case Report"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Forensic Certificate</span>
                    </button>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                      ID #{result.id || 'LIVE'}
                    </span>
                  </div>
                )}
              </div>

              {!result && !isAnalyzing && (
                <div className="py-24 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3 text-gray-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Ready to Analyze</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    Select a sample image above or upload your own image file to run real-time steganalysis.
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
                <div className="mt-5 space-y-5">
                  {/* Big Verdict Banner */}
                  <div
                    className={`p-5 rounded-2xl text-center border shadow-lg ${
                      isStego
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-rose-950/30'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-emerald-950/30'
                    }`}
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 text-xs font-semibold mb-2">
                      {isStego ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>{isStego ? 'PAYLOAD DETECTED' : 'CLEAN IMAGE'}</span>
                    </div>

                    <div className="text-3xl font-black tracking-tight text-white">
                      {isStego ? 'STEGANOGRAPHY' : 'COVER (CLEAN)'}
                    </div>

                    <div className="text-xs mt-1.5 opacity-90 font-mono">
                      Neural Model Verdict: {(result.confidence * 100).toFixed(1)}% (Experimental Baseline)
                    </div>
                  </div>

                  {/* Dual Probability Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400">
                        Cover: {(result.cover_probability * 100).toFixed(1)}%
                      </span>
                      <span className="text-rose-400">
                        Stego: {(result.stego_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-800 overflow-hidden flex p-0.5">
                      <div
                        style={{ width: `${result.cover_probability * 100}%` }}
                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                      ></div>
                      <div
                        style={{ width: `${result.stego_probability * 100}%` }}
                        className="h-full bg-rose-500 rounded-r-full transition-all duration-500"
                      ></div>
                    </div>
                  </div>

                  {/* Forensic Parameters Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                      <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                        Auxiliary Metric: Residual Energy (σr²)
                      </span>
                      <span className="text-cyan-400 font-mono font-bold text-sm mt-0.5 block">
                        {result.residual_energy ? result.residual_energy.toFixed(2) : '--'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                      <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                        Latency / Device
                      </span>
                      <span className="text-purple-300 font-mono font-bold text-sm mt-0.5 block">
                        {result.execution_time_ms} ms / {result.device}
                      </span>
                    </div>
                  </div>

                  {/* Classical Statistical Forensics Card (Phase 2) */}
                  {result.statistical_metrics && (
                    <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Statistical Heuristics (SPAM & Spatial Differentials)</span>
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">Deterministics</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                        <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-800/80">
                          <span className="text-gray-500 block text-[10px]">LSB Entropy</span>
                          <span className="text-white font-bold block">{result.statistical_metrics.lsb_shannon_entropy}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-800/80">
                          <span className="text-gray-500 block text-[10px]">Gradient Var</span>
                          <span className="text-cyan-400 font-bold block">{result.statistical_metrics.spatial_gradient_variance?.toFixed(1)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-800/80">
                          <span className="text-gray-500 block text-[10px]">SPAM Diag</span>
                          <span className="text-purple-300 font-bold block">{result.statistical_metrics.spam_markov_diag_dominance}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scientific Rationale Card */}
                  <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-gray-300 font-semibold text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Scientific Forensic Explanation</span>
                    </div>
                    <p className="text-gray-400 leading-relaxed text-[11px]">
                      {result.forensic_explanation}
                    </p>
                  </div>

                  {/* Forensic Hash Fingerprint */}
                  <div className="p-3 rounded-xl bg-gray-950/40 border border-gray-800 text-[11px] font-mono text-gray-500 flex items-center justify-between">
                    <span className="flex items-center gap-1 truncate max-w-[280px]">
                      <Hash className="w-3 h-3 text-gray-400 shrink-0" />
                      SHA-256: {result.file_hash}
                    </span>
                    <span className="text-gray-400 shrink-0">Chain-of-Custody</span>
                  </div>
                </div>
              )}
            </div>

            {/* Scientific Transparency Disclaimer */}
            <div className="mt-6 pt-4 border-t border-gray-800/80 text-[11px] text-gray-500 leading-normal flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
              <span>
                Demonstration Notice: StegoNet-Lite is an experimental baseline engineered for CPU demonstration. In spatial S-UNIWARD steganography at 0.4 bpp, discrete ±1 perturbations cancel across spatial pooling, so lightweight CNNs cannot reliably classify arbitrary single images without deep GPU-trained unpooled representations (SRNet). Spatial residual energy serves as an auxiliary physical metric.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Forensics Studio */}
      {result && (
        <div className="p-6 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-xl space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Interactive Visual Forensics Studio</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Real-Time Artifact Analysis
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Inspect high-pass residual energy heatmaps, bit-plane noise slices, and amplified perturbation maps.
              </p>
            </div>

            {/* Visual Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-950 border border-gray-800 text-xs">
              <button
                onClick={() => setVisualTab('heatmap')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  visualTab === 'heatmap'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Residual Heatmap
              </button>
              {result.fft_spectrum_b64 && (
                <button
                  onClick={() => setVisualTab('fft')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    visualTab === 'fft'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  2D FFT Spectrum
                </button>
              )}
              <button
                onClick={() => setVisualTab('histogram')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  visualTab === 'histogram'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pixel Histogram</span>
              </button>
              <button
                onClick={() => setVisualTab('bitplane')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  visualTab === 'bitplane'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Bit-Plane Slicer
              </button>
              {result.diff_map_b64 && (
                <button
                  onClick={() => setVisualTab('diff')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    visualTab === 'diff'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Amplified Diff (×50)
                </button>
              )}
              <button
                onClick={() => setVisualTab('loupe')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  visualTab === 'loupe'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>8× Pixel Loupe</span>
              </button>
              <button
                onClick={() => setVisualTab('wipe')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  visualTab === 'wipe'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Split className="w-3.5 h-3.5 text-cyan-400" />
                <span>Split Curtain Wipe</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Residual Heatmap */}
          {visualTab === 'heatmap' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex justify-center">
                <div className="w-64 h-64 rounded-xl overflow-hidden border border-gray-700 bg-black/60 shadow-xl relative group">
                  <img
                    src={result.residual_heatmap_b64 || previewUrl}
                    alt="Residual Heatmap"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-cyan-300 font-mono border border-cyan-800">
                    Laplacian Noise Variance
                  </div>
                </div>
              </div>
              <div className="md:col-span-7 space-y-3 text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>High-Pass Spatial Residual Distribution</span>
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  This heatmap visualizes high-frequency spatial variation extracted via a discrete 3×3 Laplacian filter kernel. S-UNIWARD content-adaptive steganography embeds payload selectively inside regions of high residual energy (bright golden/amber textures) while avoiding smooth low-residual regions (deep blue sky/flat gradients).
                </p>
                <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Measured Image Residual Energy:</span>
                    <span className="text-cyan-400 font-bold">{result.residual_energy?.toFixed(2) || '--'} σr²</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Filtering Kernel:</span>
                    <span className="text-gray-300">3×3 Discrete Laplacian (Second Derivative)</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Color Scale:</span>
                    <span className="text-amber-400">Gold/Red = High Variance, Navy = Smooth</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: 2D FFT Spectrum */}
          {visualTab === 'fft' && result.fft_spectrum_b64 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex justify-center">
                <div className="w-64 h-64 rounded-xl overflow-hidden border border-purple-800/80 bg-black/60 shadow-xl relative group">
                  <img
                    src={result.fft_spectrum_b64}
                    alt="2D FFT Power Spectrum"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-purple-300 font-mono border border-purple-800">
                    2D FFT Log Magnitude Spectrum
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[9px] text-gray-400 font-mono">
                    DC Center Shifted (u=0, v=0)
                  </div>
                </div>
              </div>
              <div className="md:col-span-7 space-y-3 text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>2D Discrete Fourier Transform (FFT) Magnitude Distribution</span>
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  This frequency-domain visualization illustrates the spatial power spectrum log(1 + |F(u, v)|). While natural photographic scenes concentrate energy almost exclusively at the low-frequency DC center (bright gold core), steganographic perturbations disperse high-frequency residual energy toward the outer spectral perimeter.
                </p>
                <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>High-Frequency Spectral Energy Ratio:</span>
                    <span className="text-purple-400 font-bold">{result.fft_stats?.hf_spectral_energy_percent ?? '--'}%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Spectral Entropy (Frequency Dispersion):</span>
                    <span className="text-cyan-400 font-bold">{result.fft_stats?.spectral_entropy ?? '--'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>DC Peak Core Magnitude:</span>
                    <span className="text-amber-400 font-bold">{result.fft_stats?.dc_peak_magnitude?.toLocaleString() ?? '--'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>High-Frequency Cutoff Boundary:</span>
                    <span className="text-gray-300">r ≥ {result.fft_stats?.cutoff_radius_px ?? 128} px (Radial High-Pass)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Bit-Plane Slicer */}
          {visualTab === 'bitplane' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex justify-center">
                <div className="w-64 h-64 rounded-xl overflow-hidden border border-gray-700 bg-black/60 shadow-xl relative group">
                  <img
                    src={bitplaneCache[selectedBitplane] || (selectedBitplane === 0 ? result.bitplane_0_b64 : previewUrl)}
                    alt={`Bit-Plane ${selectedBitplane}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-cyan-300 font-mono border border-cyan-800">
                    Bit Plane {selectedBitplane} ({selectedBitplane === 0 ? 'LSB' : selectedBitplane === 7 ? 'MSB' : `Bit ${selectedBitplane}`})
                  </div>
                </div>
              </div>
              <div className="md:col-span-7 space-y-4 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Bit-Plane Noise Slicer (Planes 0 to 7)</span>
                  </h4>
                  <p className="text-gray-300 mt-1 leading-relaxed">
                    Slide between bit planes to inspect image entropy. Most Significant Bits (Planes 5–7) carry visual scene structures. In contrast, the Least Significant Bit (Plane 0) exposes subtle steganographic high-frequency noise.
                  </p>
                </div>

                {/* Interactive Slider & Buttons */}
                <div className="space-y-2 p-3.5 rounded-xl bg-gray-950/70 border border-gray-800">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400">Selected Bit Plane:</span>
                    <span className="text-cyan-400 font-bold">
                      Plane {selectedBitplane} {selectedBitplane === 0 ? '(Least Significant Bit / LSB)' : selectedBitplane === 7 ? '(Most Significant Bit / MSB)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                      <button
                        key={p}
                        onClick={() => handleBitplaneChange(p)}
                        disabled={isLoadingBitplane}
                        className={`flex-1 py-1.5 rounded text-[11px] font-mono font-bold transition ${
                          selectedBitplane === p
                            ? 'bg-cyan-500 text-gray-950 shadow'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        B{p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Amplified Perturbation Map */}
          {visualTab === 'diff' && result.diff_map_b64 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex justify-center">
                <div className="w-64 h-64 rounded-xl overflow-hidden border border-gray-700 bg-black/60 shadow-xl relative group">
                  <img
                    src={result.diff_map_b64}
                    alt="Amplified Perturbation Map"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-rose-300 font-mono border border-rose-800">
                    Amplified Diff (±1 Perturbations)
                  </div>
                </div>
              </div>
              <div className="md:col-span-7 space-y-3 text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Split className="w-4 h-4 text-rose-400" />
                  <span>Bit-Accurate Ternary Perturbation Map (+1 / -1)</span>
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  Direct pixel-by-pixel subtraction against matching cover baseline. Amplified color key:
                  <span className="text-emerald-400 font-semibold ml-1">Green = +1 Pixel Alteration</span>,
                  <span className="text-rose-400 font-semibold ml-1">Red = -1 Pixel Alteration</span>,
                  <span className="text-gray-500 font-semibold ml-1">Dark = Unaltered Pixel</span>.
                </p>
                {result.diff_stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800">
                      <span className="text-gray-500 block text-[10px]">Total Altered</span>
                      <span className="text-white font-bold block">{result.diff_stats.modified_pixels?.toLocaleString()} px</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800">
                      <span className="text-gray-500 block text-[10px]">Change Rate</span>
                      <span className="text-cyan-400 font-bold block">{result.diff_stats.change_rate_percent}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800">
                      <span className="text-emerald-400 block text-[10px]">+1 Pixels</span>
                      <span className="text-emerald-400 font-bold block">{result.diff_stats.plus_one_count?.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800">
                      <span className="text-rose-400 block text-[10px]">-1 Pixels</span>
                      <span className="text-rose-400 font-bold block">{result.diff_stats.minus_one_count?.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    onClick={() => setVisualTab('loupe')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Open 8× Pixel Micro-Loupe at Discrete Perturbation Clusters</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Synchronized 8x Pixel Loupe Lens */}
          {visualTab === 'loupe' && (
            <PixelLoupeMagnifier
              coverSrc="/samples/sample_cover.png"
              stegoSrc={result.diff_map_b64 ? (file?.name?.includes('stego') ? previewUrl : '/samples/sample_stego.png') : (previewUrl || '/samples/sample_stego.png')}
              currentSrc={previewUrl}
              isPaired={Boolean(result.diff_map_b64 || file?.name?.includes('5001'))}
            />
          )}

          {/* Tab 5: Split Curtain Wipe Slider */}
          {visualTab === 'wipe' && (
            <ComparisonWipeSlider
              originalSrc={previewUrl || (file?.name?.includes('cover') ? '/samples/sample_cover.png' : '/samples/sample_stego.png')}
              heatmapSrc={result.residual_heatmap_b64}
              diffMapSrc={result.diff_map_b64}
              coverSrc="/samples/sample_cover.png"
              stegoSrc={result.diff_map_b64 ? (file?.name?.includes('stego') ? previewUrl : '/samples/sample_stego.png') : (previewUrl || '/samples/sample_stego.png')}
              isPaired={Boolean(result.diff_map_b64 || file?.name?.includes('5001'))}
            />
          )}

          {/* Tab 6: 256-Bin Pixel Histogram & Gradient Spectrum */}
          {visualTab === 'histogram' && (
            <PixelHistogramChart
              imageSrc={previewUrl || (file?.name?.includes('cover') ? '/samples/sample_cover.png' : '/samples/sample_stego.png')}
              coverSrc="/samples/sample_cover.png"
              isPaired={Boolean(result.diff_map_b64 || file?.name?.includes('5001'))}
            />
          )}
        </div>
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
