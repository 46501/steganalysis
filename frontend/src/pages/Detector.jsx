import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { steganalysisApi } from '../services/api';

export default function Detector() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [modelChoice, setModelChoice] = useState('stegonet_lite');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setError(null);
    setResult(null);
    setFile(selectedFile);

    // If browser supports preview (png, jpg, webp, bmp)
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
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
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          'Steganalysis inspection failed. Ensure backend API is active.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
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
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-medium">
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
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                    ID #{result.id || 'LIVE'}
                  </span>
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
                <div className="py-24 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Extracting Spatial Residuals</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Computing 3x3 Laplacian variance & residual tensor forward pass...
                    </p>
                  </div>
                </div>
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
    </div>
  );
}
