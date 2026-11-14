import React, { useState } from 'react';
import {
  Split,
  Upload,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Maximize2,
  ShieldCheck,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';
import ComparisonWipeSlider from '../analysis/ComparisonWipeSlider';
import PixelLoupeMagnifier from '../analysis/PixelLoupeMagnifier';

export default function DualImageComparator({
  microscopeOriginalB64,
  microscopeModifiedB64,
  showStatus,
}) {
  // Ingestion state
  const [coverB64, setCoverB64] = useState(microscopeOriginalB64 || null);
  const [coverMeta, setCoverMeta] = useState(null);
  const [stegoB64, setStegoB64] = useState(microscopeModifiedB64 || null);
  const [stegoMeta, setStegoMeta] = useState(null);

  // Comparison results state
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState('slider'); // 'slider' | 'loupe' | 'diff_map' | 'heatmap'

  // Helper to convert File to Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadCover = async (file) => {
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setCoverB64(b64);
      setCoverMeta({ filename: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
      setComparisonData(null);
    } catch (e) {
      showStatus('Failed to read cover reference file', true);
    }
  };

  const handleUploadStego = async (file) => {
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setStegoB64(b64);
      setStegoMeta({ filename: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
      setComparisonData(null);
    } catch (e) {
      showStatus('Failed to read suspect stego file', true);
    }
  };

  const handleLoadSampleCover = async () => {
    try {
      const res = await fetch('/samples/sample_cover.png');
      const blob = await res.blob();
      const b64 = await fileToBase64(blob);
      setCoverB64(b64);
      setCoverMeta({ filename: 'sample_cover_5001.png', size: '256 KB (BOSSbase)' });
      setComparisonData(null);
    } catch (e) {
      showStatus('Failed to load preset cover sample', true);
    }
  };

  const handleLoadSampleStego = async () => {
    try {
      const res = await fetch('/samples/sample_stego.png');
      const blob = await res.blob();
      const b64 = await fileToBase64(blob);
      setStegoB64(b64);
      setStegoMeta({ filename: 'sample_stego_5001.png', size: '256 KB (S-UNIWARD 0.4bpp)' });
      setComparisonData(null);
    } catch (e) {
      showStatus('Failed to load preset stego sample', true);
    }
  };

  const handleImportMicroscope = () => {
    if (microscopeOriginalB64) {
      setCoverB64(microscopeOriginalB64);
      setCoverMeta({ filename: 'Microscope_Cover.png', size: 'Active Microscope Ingestion' });
    }
    if (microscopeModifiedB64) {
      setStegoB64(microscopeModifiedB64);
      setStegoMeta({ filename: 'Microscope_Modified.png', size: 'Active Microscope Candidate' });
    }
    setComparisonData(null);
    showStatus('Imported active images from Microscope workspace.');
  };

  const handleRunComparison = async () => {
    if (!coverB64 || !stegoB64) {
      showStatus('Please provide both Cover Reference and Suspect Carrier images.', true);
      return;
    }

    try {
      setIsLoading(true);
      const res = await steganalysisApi.compareLabPair(coverB64, stegoB64);
      setComparisonData(res);
      showStatus(`Differential analysis completed: ${res.changed_pixels?.toLocaleString()} px (${res.changed_percent}%) modified.`);
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Forensic comparison failed. Ensure images have identical dimensions.', true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Dual Image Ingestion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cover Reference Slot */}
        <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3">
          <div className="flex items-center justify-between border-b border-[#142036] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                1. Baseline Cover Reference
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleLoadSampleCover}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30 transition"
              >
                Sample Cover
              </button>
            </div>
          </div>

          {coverB64 ? (
            <div className="relative group w-full h-48 rounded-xl overflow-hidden border border-[#142036] bg-black/60 flex items-center justify-center">
              <img src={coverB64} alt="Cover Reference" className="max-h-full max-w-full object-contain" />
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold cursor-pointer hover:bg-cyan-400 transition">
                  Replace Cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadCover(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-[#050914]/90 backdrop-blur-md text-[10px] font-mono text-[#94A3B8] truncate">
                {coverMeta?.filename || 'Cover Reference Loaded'} {coverMeta?.size ? `(${coverMeta.size})` : ''}
              </div>
            </div>
          ) : (
            <label className="w-full h-48 rounded-xl border-2 border-dashed border-[#1B2B48] hover:border-cyan-500/50 bg-[#050914] flex flex-col items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-6 h-6 text-cyan-400" />
              <span className="text-xs text-white font-semibold">Upload Cover Baseline</span>
              <span className="text-[10px] text-[#64748B]">PNG, BMP, PGM uncompressed raster</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadCover(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {/* Suspect Carrier Slot */}
        <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3">
          <div className="flex items-center justify-between border-b border-[#142036] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                2. Suspect Carrier (Stego Candidate)
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleLoadSampleStego}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A1224] hover:bg-[#0F1C36] text-rose-300 border border-rose-500/30 transition"
              >
                Sample Stego
              </button>
            </div>
          </div>

          {stegoB64 ? (
            <div className="relative group w-full h-48 rounded-xl overflow-hidden border border-[#142036] bg-black/60 flex items-center justify-center">
              <img src={stegoB64} alt="Suspect Carrier" className="max-h-full max-w-full object-contain" />
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer hover:bg-rose-400 transition">
                  Replace Suspect
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadStego(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-[#050914]/90 backdrop-blur-md text-[10px] font-mono text-[#94A3B8] truncate">
                {stegoMeta?.filename || 'Suspect Carrier Loaded'} {stegoMeta?.size ? `(${stegoMeta.size})` : ''}
              </div>
            </div>
          ) : (
            <label className="w-full h-48 rounded-xl border-2 border-dashed border-[#1B2B48] hover:border-rose-500/50 bg-[#050914] flex flex-col items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-6 h-6 text-rose-400" />
              <span className="text-xs text-white font-semibold">Upload Suspect Carrier</span>
              <span className="text-[10px] text-[#64748B]">Investigate for concealed payload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadStego(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48]">
        <div className="flex items-center gap-2">
          {(microscopeOriginalB64 || microscopeModifiedB64) && (
            <button
              type="button"
              onClick={handleImportMicroscope}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Active from Microscope</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleRunComparison}
          disabled={isLoading || !coverB64 || !stegoB64}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Calculating Differential Metrics...</span>
            </>
          ) : (
            <>
              <Split className="w-4 h-4" />
              <span>Run Differential Forensics</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Results Section (Rendered when comparisonData is available) */}
      {comparisonData && (
        <div className="space-y-4">
          {/* Quantitative Metrics HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
                Changed Pixels
              </span>
              <div className="text-lg font-bold text-rose-400 mt-1">
                {comparisonData.changed_pixels?.toLocaleString() ?? '--'} px
              </div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">
                Change Rate: <strong className="text-white">{comparisonData.changed_percent ?? '0.00'}%</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
                PSNR (Fidelity)
              </span>
              <div className="text-lg font-bold text-white mt-1">
                {comparisonData.psnr_db != null ? `${comparisonData.psnr_db.toFixed(1)} dB` : '∞ (Identical)'}
              </div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">
                {comparisonData.psnr_db > 50 ? 'Imperceptible embedding' : 'High distortion'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
                Hamming Distance
              </span>
              <div className="text-lg font-bold text-cyan-300 mt-1">
                {comparisonData.hamming_distance?.toLocaleString() ?? '--'} bits
              </div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">Total flipped bit count</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
                Entropy Shift ΔH
              </span>
              <div className="text-lg font-bold text-emerald-300 mt-1">
                {comparisonData.entropy_diff != null ? comparisonData.entropy_diff.toFixed(4) : '--'}
              </div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">
                Mod: {comparisonData.entropy_mod?.toFixed(3) ?? '--'} vs Orig: {comparisonData.entropy_orig?.toFixed(3) ?? '--'}
              </div>
            </div>
          </div>

          {/* Interactive Visual Evidence Viewer */}
          <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4">
            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142036] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Visual Evidence Mode:
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('slider')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                    activeViewMode === 'slider'
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:text-white'
                  }`}
                >
                  Split Curtain Slider
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('loupe')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                    activeViewMode === 'loupe'
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:text-white'
                  }`}
                >
                  Synchronized 8x Loupe
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('diff_map')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                    activeViewMode === 'diff_map'
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:text-white'
                  }`}
                >
                  Amplified Diff Map
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('heatmap')}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                    activeViewMode === 'heatmap'
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:text-white'
                  }`}
                >
                  Residual Heatmap
                </button>
              </div>
            </div>

            {/* Display Component Based on View Mode */}
            {activeViewMode === 'slider' && (
              <div className="flex justify-center p-2 bg-black/40 rounded-xl">
                <ComparisonWipeSlider
                  originalSrc={coverB64}
                  heatmapSrc={comparisonData.heatmap_b64}
                  diffMapSrc={comparisonData.diff_map_b64}
                  coverSrc={coverB64}
                  stegoSrc={stegoB64}
                  isPaired={true}
                />
              </div>
            )}

            {activeViewMode === 'loupe' && (
              <div className="flex justify-center p-2 bg-black/40 rounded-xl">
                <PixelLoupeMagnifier
                  coverSrc={coverB64}
                  stegoSrc={stegoB64}
                  diffSrc={comparisonData.diff_map_b64}
                />
              </div>
            )}

            {activeViewMode === 'diff_map' && (
              <div className="flex flex-col items-center gap-2 p-2 bg-black/40 rounded-xl">
                <div className="max-h-[500px] overflow-hidden rounded-xl border border-[#142036]">
                  <img
                    src={comparisonData.diff_map_b64}
                    alt="Amplified Diff Map"
                    className="max-h-[500px] object-contain"
                  />
                </div>
                <div className="text-[11px] font-mono text-[#94A3B8]">
                  Amplified Differential Map: Non-black pixels represent isolated &plusmn;1 LSB modifications.
                </div>
              </div>
            )}

            {activeViewMode === 'heatmap' && (
              <div className="flex flex-col items-center gap-2 p-2 bg-black/40 rounded-xl">
                <div className="max-h-[500px] overflow-hidden rounded-xl border border-[#142036]">
                  <img
                    src={comparisonData.heatmap_b64}
                    alt="Residual Variance Heatmap"
                    className="max-h-[500px] object-contain"
                  />
                </div>
                <div className="text-[11px] font-mono text-[#94A3B8]">
                  High-pass residual variance: Highlights regions with abnormal noise concentration.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

