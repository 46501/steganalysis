import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  Layers,
  ZoomIn,
  Split,
  Eye,
  Sliders,
  BarChart2,
  FileText,
  Hash,
  Clock,
  Cpu,
  Info,
  Maximize2,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Target,
  Grid,
  Percent,
} from 'lucide-react';
import PixelLoupeMagnifier from './PixelLoupeMagnifier';
import ComparisonWipeSlider from './ComparisonWipeSlider';
import PixelHistogramChart from './PixelHistogramChart';
import FileStructureCarver from './FileStructureCarver';

function SectorOverlayGrid({ sectors, selectedSector, onSelectSector, isVisible }) {
  if (!isVisible || !sectors || sectors.length !== 16) return null;
  return (
    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 z-20 pointer-events-auto">
      {sectors.map((sec) => {
        const isSelected = selectedSector === sec.sector_index;
        return (
          <div
            key={sec.sector_index}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSector(isSelected ? null : sec.sector_index);
            }}
            className={`relative border border-cyan-500/25 cursor-pointer transition-all flex flex-col justify-between p-1 group/sec ${
              isSelected
                ? 'border-2 border-cyan-400 bg-cyan-500/30 shadow-[inset_0_0_14px_rgba(6,182,212,0.5)] z-20'
                : 'hover:bg-cyan-500/15 hover:border-cyan-400/60'
            }`}
            title={`Sector #${sec.sector_index} (${sec.row},${sec.col}) - Entropy: ${sec.local_entropy}, Residual: ${sec.residual_energy}${sec.changed_pixels !== null ? `, Altered: ${sec.changed_pixels} px (${sec.changed_pixel_percent}%)` : ''}`}
          >
            <div className="flex items-center justify-between pointer-events-none">
              <span
                className={`text-[9px] font-mono font-bold px-1 rounded ${
                  isSelected ? 'bg-cyan-400 text-black shadow-sm' : 'bg-black/75 text-cyan-300'
                }`}
              >
                #{sec.sector_index}
              </span>
              {sec.changed_pixel_percent !== null && sec.changed_pixel_percent > 0 && (
                <span className="text-[8px] font-mono font-bold text-rose-300 bg-black/80 px-1 rounded">
                  {sec.changed_pixel_percent}%
                </span>
              )}
            </div>
            <div className="text-[8px] font-mono text-[#94A3B8] opacity-0 group-hover/sec:opacity-100 transition-opacity bg-black/80 px-1 rounded pointer-events-none truncate">
              {sec.texture_complexity}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * AdvancedForensicDashboard
 *
 * Comprehensive Digital Image Forensics Intelligence Suite.
 * Fulfills Phases 2, 3, 4, 5, 6, 8, 9 of the StegoShield AI Forensic Rigor Upgrade.
 */
export default function AdvancedForensicDashboard({
  result,
  file,
  previewUrl,
  onOpenCertificate,
  onBitplaneSelect,
  selectedBitplane,
  bitplaneCache,
  isLoadingBitplane,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdvancedView, setIsAdvancedView] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [showSectorGridOverlay, setShowSectorGridOverlay] = useState(true);
  const [diffViewMode, setDiffViewMode] = useState('ternary'); // 'ternary' | 'heatmap' | 'wipe' | 'loupe'
  const [amplificationFactor, setAmplificationFactor] = useState(50);
  const [expandedMetric, setExpandedMetric] = useState(null);

  if (!result) return null;

  const verdict = result.verdict || '';
  const isInconclusive = verdict.toLowerCase().includes('inconclusive') || result.is_conclusive === false;
  const isStego = !isInconclusive && (verdict === 'Stego Indicated' || verdict === 'Stego');
  const isCover = !isInconclusive && (verdict === 'Cover Indicated' || verdict === 'Cover');

  const diffAnalysis = result.difference_analysis;
  const hasPaired = Boolean(diffAnalysis && diffAnalysis.has_paired_reference);
  const sectors = result.spatial_sectors_4x4 || [];
  const texture = result.texture_analysis;
  const stats = result.advanced_statistical_suite;
  const freq = result.frequency_analysis;
  const payload = result.payload_analysis;
  const attribution = result.algorithm_attribution;
  const fusion = result.evidence_summary;

  const tabs = [
    { id: 'overview', label: '1. Overview', icon: Activity },
    { id: 'pixels', label: '2. Pixel Forensics', icon: Grid },
    { id: 'statistical', label: '3. Statistical Suite', icon: BarChart2 },
    { id: 'frequency', label: '4. Frequency (FFT)', icon: Zap },
    { id: 'attribution', label: '5. Payload & Attribution', icon: Target },
    { id: 'evidence', label: '6. Evidence Report', icon: FileText },
    { id: 'carver', label: '7. Container Carver', icon: Layers },
  ];

  return (
    <div className="rounded-2xl bg-[#090D16] border border-[#1B2B48] shadow-2xl overflow-hidden animate-fadeIn text-slate-100 font-sans">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[#1B2B48] bg-[#050914] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Advanced Forensic Intelligence Studio
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                NIST SP 800-86 Compliant
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Scientific multi-modal steganalysis • Pixel diffs, sector entropy, FFT &amp; attribution
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Certificate Action */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAdvancedView(!isAdvancedView)}
            className="px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#334155] text-xs font-mono text-cyan-300 transition flex items-center gap-1.5"
            title="Toggle between Simple Executive and Deep Forensic view"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isAdvancedView ? 'Switch to Simple View' : 'Switch to Advanced View'}</span>
          </button>

          {onOpenCertificate && (
            <button
              onClick={onOpenCertificate}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-semibold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Official Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 bg-[#070D1A] border-b border-[#1B2B48] flex items-center gap-1 overflow-x-auto scrollbar-none py-2 font-mono text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)] font-bold'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#0F172A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW                                                   */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Primary Verdict & Assessment Banner */}
            <div
              className={`p-5 rounded-2xl border text-center relative overflow-hidden ${
                isInconclusive
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  : isStego
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.15)]'
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-current/30 text-xs font-mono font-bold mb-2">
                {isInconclusive ? (
                  <>
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>SCIENTIFIC GUARDRAIL (INCONCLUSIVE)</span>
                  </>
                ) : isStego ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>STEGANOGRAPHIC PAYLOAD INDICATED</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>PRISTINE COVER CARRIER INDICATED</span>
                  </>
                )}
              </div>

              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
                {result.verdict_category || result.verdict}
              </div>

              <p className="text-xs text-[#94A3B8] mt-2 max-w-2xl mx-auto leading-relaxed">
                {result.forensic_explanation}
              </p>

              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[#94A3B8]">
                <span>
                  Evidence Status:{' '}
                  <strong className="text-cyan-300">
                    {fusion?.evidence_strength || (hasPaired ? 'Verified Paired Evidence' : 'Single-Image Model Prediction')}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Model: <strong className="text-white">{result.model_name || 'StegoNet-Lite'}</strong> ({result.model_status || 'Experimental Baseline'})
                </span>
                <span>•</span>
                <span>
                  SHA-256: <strong className="text-white">{(result.file_hash || '').slice(0, 12)}...</strong>
                </span>
              </div>
            </div>

            {/* Metric Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Neural Classification */}
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                  Neural Model Probability
                </span>
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-mono font-bold text-white">
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    Score: {result.score_type || 'Uncalibrated Logit'}
                  </span>
                </div>
                <div className="space-y-1 pt-1 font-mono text-[11px]">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>P(Cover):</span>
                    <span className="text-emerald-400">{(result.cover_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>P(Stego):</span>
                    <span className="text-rose-400">{(result.stego_probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Paired Modification Count */}
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                  Paired Pixel Alterations
                </span>
                {hasPaired ? (
                  <>
                    <div className="text-xl font-mono font-bold text-rose-300">
                      {diffAnalysis.changed_pixels?.toLocaleString()} px
                    </div>
                    <div className="text-xs font-mono text-[#94A3B8]">
                      {diffAnalysis.changed_pixel_percent}% change rate ({diffAnalysis.total_modified_bits?.toLocaleString()} bits)
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300 pt-1">
                      +1: {diffAnalysis.plus_one_changes?.toLocaleString()} | -1: {diffAnalysis.minus_one_changes?.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-mono text-[#94A3B8] italic pt-1">
                      No Reference Supplied
                    </div>
                    <p className="text-[10px] text-[#64748B] leading-tight">
                      Exact pixel deltas require a matching cover baseline.
                    </p>
                  </>
                )}
              </div>

              {/* Card 3: Residual Energy & LSB Entropy */}
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                  High-Pass Residual Energy (σr²)
                </span>
                <div className="text-xl font-mono font-bold text-cyan-300">
                  {result.residual_energy ? result.residual_energy.toFixed(2) : '--'}
                </div>
                <div className="text-xs font-mono text-[#94A3B8]">
                  LSB Entropy: <strong className="text-white">{stats?.lsb_shannon_entropy?.value ?? '--'}</strong> / 1.000
                </div>
                <div className="text-[10px] text-[#64748B]">
                  Spatial gradient energy across high-frequency bands
                </div>
              </div>

              {/* Card 4: Algorithmic Attribution */}
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                  Algorithm Attribution
                </span>
                <div className="text-sm font-mono font-bold text-amber-300 truncate">
                  {attribution?.candidate_technique || 'Unknown / Unclassified'}
                </div>
                <div className="text-[10px] font-mono text-cyan-400">
                  Status: {attribution?.validation_status || 'Evaluating'}
                </div>
                <div className="text-[10px] text-[#64748B] truncate">
                  {attribution?.supporting_observations?.[0] || 'Statistical evaluation active.'}
                </div>
              </div>
            </div>

            {/* Multi-Modal Evidence Summary Card */}
            {fusion && (
              <div className="p-5 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1B2B48] pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Multi-Modal Forensic Evidence Synthesis</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px]">
                    {fusion.evidence_strength}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] text-[#64748B] block uppercase font-bold">
                    Direct Observations:
                  </span>
                  <ul className="space-y-1.5 text-[#94A3B8] font-sans text-xs">
                    {(fusion.observed_evidence || []).map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {fusion.unresolved_questions?.length > 0 && (
                  <div className="pt-2 border-t border-[#1B2B48] space-y-1.5">
                    <span className="text-[11px] text-amber-400 block uppercase font-bold flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Unresolved Forensic Inquiries:</span>
                    </span>
                    <ul className="space-y-1 text-[#94A3B8] font-sans text-xs">
                      {fusion.unresolved_questions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-black/40 border border-[#1B2B48] text-[11px] text-[#64748B] font-sans leading-relaxed">
                  <strong>Scientific Integrity Note:</strong> {fusion.limitations_summary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: PIXEL FORENSICS & SECTOR ANALYSIS                          */}
        {/* ================================================================= */}
        {activeTab === 'pixels' && (
          <div className="space-y-6">
            {/* Visual Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B2B48] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                  <span>Pixel-Level Difference &amp; Spatial Localization</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Direct empirical subtraction against baseline reference and 4×4 spatial sector mapping.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(diffViewMode === 'ternary' || diffViewMode === 'heatmap') && (
                  <button
                    type="button"
                    onClick={() => setShowSectorGridOverlay(!showSectorGridOverlay)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                      showSectorGridOverlay
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)] font-bold'
                        : 'bg-[#050914] text-[#64748B] border-[#1B2B48] hover:text-white'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>4×4 Sector Overlay: {showSectorGridOverlay ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050914] border border-[#1B2B48] font-mono text-xs">
                  <button
                    onClick={() => setDiffViewMode('ternary')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      diffViewMode === 'ternary' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-[#64748B] hover:text-white'
                    }`}
                  >
                    Ternary Map
                  </button>
                  <button
                    onClick={() => setDiffViewMode('heatmap')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      diffViewMode === 'heatmap' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-[#64748B] hover:text-white'
                    }`}
                  >
                    Residual Heatmap
                  </button>
                  <button
                    onClick={() => setDiffViewMode('loupe')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      diffViewMode === 'loupe' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-[#64748B] hover:text-white'
                    }`}
                  >
                    8× Pixel Loupe
                  </button>
                  <button
                    onClick={() => setDiffViewMode('wipe')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      diffViewMode === 'wipe' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-[#64748B] hover:text-white'
                    }`}
                  >
                    Split Wipe
                  </button>
                </div>
              </div>
            </div>

            {/* Paired Metrics Dashboard (Only shown if paired reference exists) */}
            {hasPaired ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                  <span className="text-[10px] text-[#64748B] block">Altered Pixels</span>
                  <span className="text-base font-bold text-rose-300">{diffAnalysis.changed_pixels?.toLocaleString()} px</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                  <span className="text-[10px] text-[#64748B] block">Perturbation Rate</span>
                  <span className="text-base font-bold text-rose-300">{diffAnalysis.changed_pixel_percent}%</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                  <span className="text-[10px] text-[#64748B] block">+1 Alterations</span>
                  <span className="text-base font-bold text-emerald-400">{diffAnalysis.plus_one_changes?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                  <span className="text-[10px] text-[#64748B] block">-1 Alterations</span>
                  <span className="text-base font-bold text-rose-400">{diffAnalysis.minus_one_changes?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                  <span className="text-[10px] text-[#64748B] block">Ternary Balance</span>
                  <span className="text-base font-bold text-cyan-300">{diffAnalysis.ternary_balance_ratio?.toFixed(3)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                  <span className="text-[10px] text-[#64748B] block">PSNR</span>
                  <span className="text-base font-bold text-white">{diffAnalysis.psnr_label}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] flex items-start gap-3 text-xs">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-[#94A3B8] leading-relaxed">
                  <strong>Single Image Analysis Active:</strong> Exact pixel modification counts and ±1 deltas are strictly
                  reported only when an original cover reference is provided. To observe live paired metrics, click the{' '}
                  <strong className="text-white">"Stego (5001 S-UNIWARD)"</strong> sample button above or upload matching pairs.
                </div>
              </div>
            )}

            {/* Display active visual exhibit */}
            {diffViewMode === 'ternary' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden border border-[#1B2B48] bg-black shadow-xl relative group select-none">
                    <img
                      src={result.diff_map_b64 || previewUrl}
                      alt="Ternary Difference Map"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white border border-[#334155] z-10 pointer-events-none">
                      Ternary Perturbation Map
                    </div>
                    <SectorOverlayGrid
                      sectors={sectors}
                      selectedSector={selectedSector}
                      onSelectSector={setSelectedSector}
                      isVisible={showSectorGridOverlay}
                    />
                  </div>

                  {/* Active Sector Quick HUD */}
                  {selectedSector !== null && sectors[selectedSector] && (
                    <div className="w-72 sm:w-80 mt-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 font-mono text-[11px] text-cyan-200 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Sector #{selectedSector} ({sectors[selectedSector].row},{sectors[selectedSector].col})
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/30">
                          {sectors[selectedSector].texture_complexity}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#94A3B8] mt-1">
                        <span>Entropy: <strong className="text-white">{sectors[selectedSector].local_entropy}</strong></span>
                        <span>Residual: <strong className="text-white">{sectors[selectedSector].residual_energy}</strong></span>
                      </div>
                      {sectors[selectedSector].changed_pixels !== null && (
                        <div className="mt-1 text-rose-300 font-bold text-[10px] flex justify-between border-t border-cyan-500/20 pt-1">
                          <span>Altered:</span>
                          <span>{sectors[selectedSector].changed_pixels.toLocaleString()} px ({sectors[selectedSector].changed_pixel_percent}%)</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-[#1B2B48]">
                        <button
                          type="button"
                          onClick={() => setDiffViewMode('loupe')}
                          className="text-[10px] text-cyan-400 hover:text-cyan-200 font-bold flex items-center gap-1"
                        >
                          <ZoomIn className="w-3 h-3" /> Inspect in 8× Loupe
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSector(null)}
                          className="text-[10px] text-[#64748B] hover:text-white"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-7 space-y-4 text-xs font-mono">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <span>Ternary Alteration Color Legend</span>
                    </h4>
                    <p className="text-[#94A3B8] mt-1 font-sans leading-relaxed">
                      Content-adaptive algorithms (e.g. S-UNIWARD) apply balanced ternary modifications ($\pm 1$)
                      to minimize high-order spatial distortion cost functions.
                    </p>
                  </div>

                  <div className="space-y-2 p-3.5 rounded-xl bg-[#070D1A] border border-[#1B2B48]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-[#34D399]"></span>
                        <span className="text-white">+1 Modification</span>
                      </div>
                      <span className="text-emerald-400 font-bold">{diffAnalysis?.plus_one_changes?.toLocaleString() || '--'} px</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-[#F87171]"></span>
                        <span className="text-white">-1 Modification</span>
                      </div>
                      <span className="text-rose-400 font-bold">{diffAnalysis?.minus_one_changes?.toLocaleString() || '--'} px</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-[#F59E0B]"></span>
                        <span className="text-white">Other Alterations (&gt;1 or &lt;-1)</span>
                      </div>
                      <span className="text-amber-400 font-bold">{diffAnalysis?.other_changes?.toLocaleString() || 0} px</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#1B2B48] pt-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-[#0B0F19] border border-[#334155]"></span>
                        <span className="text-[#94A3B8]">Unaltered Pixels</span>
                      </div>
                      <span className="text-[#64748B]">{diffAnalysis?.unchanged_pixels?.toLocaleString() || '--'} px</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {diffViewMode === 'heatmap' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden border border-[#1B2B48] bg-black shadow-xl relative group select-none">
                    <img
                      src={result.residual_heatmap_b64 || previewUrl}
                      alt="Residual Heatmap"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white border border-[#334155] z-10 pointer-events-none">
                      Laplacian Residual Heatmap
                    </div>
                    <SectorOverlayGrid
                      sectors={sectors}
                      selectedSector={selectedSector}
                      onSelectSector={setSelectedSector}
                      isVisible={showSectorGridOverlay}
                    />
                  </div>

                  {/* Active Sector Quick HUD */}
                  {selectedSector !== null && sectors[selectedSector] && (
                    <div className="w-72 sm:w-80 mt-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 font-mono text-[11px] text-cyan-200 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Sector #{selectedSector} ({sectors[selectedSector].row},{sectors[selectedSector].col})
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/30">
                          {sectors[selectedSector].texture_complexity}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#94A3B8] mt-1">
                        <span>Entropy: <strong className="text-white">{sectors[selectedSector].local_entropy}</strong></span>
                        <span>Residual: <strong className="text-white">{sectors[selectedSector].residual_energy}</strong></span>
                      </div>
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-[#1B2B48]">
                        <button
                          type="button"
                          onClick={() => setDiffViewMode('loupe')}
                          className="text-[10px] text-cyan-400 hover:text-cyan-200 font-bold flex items-center gap-1"
                        >
                          <ZoomIn className="w-3 h-3" /> Inspect in 8× Loupe
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSector(null)}
                          className="text-[10px] text-[#64748B] hover:text-white"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-7 space-y-3 text-xs">
                  <h4 className="text-sm font-bold text-white">Spatial Laplacian Residual Heatmap</h4>
                  <p className="text-[#94A3B8] leading-relaxed">
                    Maps the high-pass spatial noise residual $\sigma_r^2$. Steganographic perturbations manifest as
                    localized high-frequency energy spikes along texture edges.
                  </p>
                  <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48] font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Filter Kernel:</span>
                      <span className="text-white">3×3 High-Pass Laplacian</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Measured Residual Energy (σr²):</span>
                      <span className="text-cyan-300 font-bold">{result.residual_energy?.toFixed(3) || '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {diffViewMode === 'loupe' && (
              <PixelLoupeMagnifier
                coverSrc="/samples/sample_cover.png"
                stegoSrc={result.diff_map_b64 ? previewUrl : '/samples/sample_stego.png'}
                currentSrc={previewUrl}
                isPaired={hasPaired}
              />
            )}

            {diffViewMode === 'wipe' && (
              <ComparisonWipeSlider
                originalSrc={previewUrl}
                heatmapSrc={result.residual_heatmap_b64}
                diffMapSrc={result.diff_map_b64}
                coverSrc="/samples/sample_cover.png"
                stegoSrc={result.diff_map_b64 ? previewUrl : '/samples/sample_stego.png'}
                isPaired={hasPaired}
              />
            )}

            {/* 4x4 Spatial Sector Analysis Grid (16 Regions) */}
            {sectors.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#1B2B48]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Grid className="w-4 h-4 text-cyan-400" />
                      <span>4×4 Spatial Sector Decomposition (16 Equal Quadrants)</span>
                    </h4>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Click any sector below to inspect local entropy, residual energy, and regional alteration density.
                    </p>
                  </div>
                  {selectedSector !== null && (
                    <button
                      onClick={() => setSelectedSector(null)}
                      className="text-[11px] font-mono text-cyan-300 hover:underline"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {sectors.map((sec) => {
                    const isSelected = selectedSector === sec.sector_index;
                    return (
                      <div
                        key={sec.sector_index}
                        onClick={() => setSelectedSector(isSelected ? null : sec.sector_index)}
                        className={`p-3 rounded-xl border cursor-pointer transition font-mono text-xs ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                            : 'bg-[#070D1A] border-[#1B2B48] hover:border-[#334155] text-[#94A3B8]'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white text-[11px]">
                            Sector #{sec.sector_index} ({sec.row},{sec.col})
                          </span>
                          <span className="text-[10px] px-1 rounded bg-black/50 text-cyan-300">
                            {sec.texture_complexity}
                          </span>
                        </div>
                        <div className="text-[11px] space-y-0.5 text-[#64748B]">
                          <div>Entropy: <strong className="text-white">{sec.local_entropy}</strong></div>
                          <div>Residual: <strong className="text-white">{sec.residual_energy}</strong></div>
                          {sec.changed_pixels !== null && (
                            <div className="text-rose-400 font-bold">
                              Altered: {sec.changed_pixels.toLocaleString()} px ({sec.changed_pixel_percent}%)
                            </div>
                          )}
                          {isSelected && (
                            <div className="mt-2 pt-1.5 border-t border-cyan-400/30 flex justify-between items-center text-[10px]">
                              <span className="text-cyan-300 font-bold">Active Region</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDiffViewMode('loupe');
                                }}
                                className="text-cyan-400 hover:text-cyan-200 underline flex items-center gap-1"
                              >
                                <ZoomIn className="w-2.5 h-2.5" /> Loupe
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Texture vs Smooth Region Analysis */}
            {texture && (
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-3 font-mono text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Texture Complexity &amp; Embedding Region Distribution</span>
                </span>
                <p className="text-[#94A3B8] font-sans text-xs">
                  {texture.forensic_finding}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48]">
                    <span className="text-[10px] text-[#64748B] block">Smooth Surface Zone</span>
                    <span className="text-base font-bold text-white">{texture.texture_composition?.smooth_percent}%</span>
                    {texture.modification_distribution && (
                      <span className="text-[10px] text-rose-300 block mt-0.5">
                        {texture.modification_distribution.smooth_region_percent}% of alterations
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48]">
                    <span className="text-[10px] text-[#64748B] block">Textured Gradient Zone</span>
                    <span className="text-base font-bold text-white">{texture.texture_composition?.textured_percent}%</span>
                    {texture.modification_distribution && (
                      <span className="text-[10px] text-rose-300 block mt-0.5">
                        {texture.modification_distribution.textured_region_percent}% of alterations
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48]">
                    <span className="text-[10px] text-[#64748B] block">High-Frequency Edge Zone</span>
                    <span className="text-base font-bold text-white">{texture.texture_composition?.edge_percent}%</span>
                    {texture.modification_distribution && (
                      <span className="text-[10px] text-rose-300 block mt-0.5">
                        {texture.modification_distribution.edge_region_percent}% of alterations
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: STATISTICAL SUITE                                          */}
        {/* ================================================================= */}
        {activeTab === 'statistical' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Advanced Statistical Forensics Suite (10 Classical Indicators)</span>
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
                Statistical measurements describe spatial entropy and residual distributions. They are diagnostic indicators,
                not standalone proof of steganography.
              </p>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(stats).map(([metricKey, metricData]) => {
                  const isExpanded = expandedMetric === metricKey;
                  return (
                    <div
                      key={metricKey}
                      className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2 font-mono text-xs hover:border-[#334155] transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold uppercase tracking-wider text-[11px]">
                          {metricKey.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => setExpandedMetric(isExpanded ? null : metricKey)}
                          className="text-[10px] text-cyan-300 flex items-center gap-1 hover:underline"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                        </button>
                      </div>

                      {/* Display metric values */}
                      <div className="text-lg font-bold text-cyan-300">
                        {typeof metricData.value !== 'undefined'
                          ? metricData.value
                          : typeof metricData.variance !== 'undefined'
                          ? `Var: ${metricData.variance}`
                          : typeof metricData.mean !== 'undefined'
                          ? `Mean: ${metricData.mean}`
                          : typeof metricData.statistic !== 'undefined'
                          ? `Stat: ${metricData.statistic}`
                          : typeof metricData.transition_diagonal_dominance !== 'undefined'
                          ? `Trace: ${metricData.transition_diagonal_dominance}`
                          : '--'}
                      </div>

                      <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                        {metricData.description}
                      </p>

                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-[#1B2B48] space-y-1.5 text-[10px] font-sans">
                          <div className="text-emerald-300">
                            <strong>Forensic Relevance:</strong> {metricData.forensic_relevance}
                          </div>
                          <div className="text-amber-300">
                            <strong>Known Limitations:</strong> {metricData.limitations}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bitplane Slicer Studio */}
            <div className="p-5 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono">Bit-Plane Slicer (Planes 0 to 7)</h4>
                  <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
                    Plane 0 exposes high-frequency LSB noise, while Planes 5–7 carry visual scene geometry.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                    <button
                      key={p}
                      onClick={() => onBitplaneSelect && onBitplaneSelect(p)}
                      disabled={isLoadingBitplane}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                        selectedBitplane === p
                          ? 'bg-cyan-500 text-black font-extrabold shadow'
                          : 'bg-[#0F172A] hover:bg-[#1E293B] text-[#94A3B8]'
                      }`}
                    >
                      B{p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-64 h-64 rounded-xl overflow-hidden border border-[#1B2B48] bg-black">
                  <img
                    src={bitplaneCache?.[selectedBitplane] || (selectedBitplane === 0 ? result.bitplane_0_b64 : previewUrl)}
                    alt={`Bit Plane ${selectedBitplane}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: FREQUENCY ANALYSIS (FFT)                                   */}
        {/* ================================================================= */}
        {activeTab === 'frequency' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>2D Frequency Domain Analysis (Fast Fourier Transform)</span>
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
                Evaluates low vs. high spatial frequency energy distributions. Steganographic noise concentrates in high-frequency bands.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex justify-center">
                <div className="w-72 h-72 rounded-2xl overflow-hidden border border-[#1B2B48] bg-black shadow-xl">
                  <img
                    src={freq?.spectrum_b64 || result.fft_spectrum_b64 || previewUrl}
                    alt="2D FFT Spectrum"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="md:col-span-7 space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                  <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                    Spectral Energy Partition
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-[#1B2B48]">
                      <span className="text-[10px] text-[#64748B] block">Low-Frequency Energy</span>
                      <span className="text-base font-bold text-emerald-300">
                        {freq?.spectral_energy_distribution?.low_frequency_percent ?? '--'}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-[#1B2B48]">
                      <span className="text-[10px] text-[#64748B] block">High-Frequency Energy</span>
                      <span className="text-base font-bold text-cyan-300">
                        {freq?.spectral_energy_distribution?.high_frequency_percent ?? '--'}%
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] pt-1">
                    High-to-Low Ratio: <strong className="text-white">{freq?.spectral_energy_distribution?.high_to_low_energy_ratio ?? '--'}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs font-sans leading-relaxed">
                  <strong>Scientific Disclaimer:</strong> {freq?.scientific_disclaimer}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: PAYLOAD & ALGORITHM ATTRIBUTION                            */}
        {/* ================================================================= */}
        {activeTab === 'attribution' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Steganography Algorithm Fingerprinting &amp; Payload Estimation</span>
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
                Rigorous forensic classification of embedding mechanisms and capacity estimation adhering to academic standards.
              </p>
            </div>

            {/* Algorithm Fingerprint Card */}
            {attribution && (
              <div className="p-5 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1B2B48] pb-3">
                  <div>
                    <span className="text-[10px] uppercase text-[#64748B] font-bold block">Candidate Embedding Technique</span>
                    <span className="text-lg font-bold text-cyan-300 mt-0.5 block">{attribution.candidate_technique}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                    {attribution.validation_status}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] uppercase text-emerald-400 font-bold block">Supporting Observations:</span>
                  <ul className="space-y-1 text-[#94A3B8] font-sans text-xs">
                    {(attribution.supporting_observations || []).map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {attribution.contradicting_observations?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#1B2B48]">
                    <span className="text-[11px] uppercase text-rose-400 font-bold block">Contradicting / Cautionary Observations:</span>
                    <ul className="space-y-1 text-[#94A3B8] font-sans text-xs">
                      {attribution.contradicting_observations.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48] text-[11px] text-[#64748B] font-sans">
                  <strong>Attribution Limitation:</strong> {attribution.limitations}
                </div>
              </div>
            )}

            {/* Payload Estimation Card */}
            {payload && (
              <div className="p-5 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-4 font-mono text-xs">
                <div className="border-b border-[#1B2B48] pb-2">
                  <h4 className="text-xs font-bold text-white uppercase">Scientifically Rigorous Payload Accounting</h4>
                  <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
                    Clearly distinguishes ground-truth benchmark rates from empirical measurements and unknown values.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48]">
                    <span className="text-[10px] text-[#64748B] block">Known Benchmark Rate</span>
                    <span className="text-sm font-bold text-cyan-300 block mt-1">
                      {payload.known_benchmark_rate || 'No Benchmark Tag'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48]">
                    <span className="text-[10px] text-[#64748B] block">Measured Modification Rate</span>
                    <span className="text-sm font-bold text-rose-300 block mt-1">
                      {payload.measured_change_rate_percent !== null ? `${payload.measured_change_rate_percent}%` : 'Requires Paired Reference'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-[#1B2B48]">
                    <span className="text-[10px] text-[#64748B] block">LSB Sample Pairs Estimate</span>
                    <span className="text-sm font-bold text-white block mt-1">
                      {payload.lsb_sample_pairs_estimated_rate !== null ? `${payload.lsb_sample_pairs_estimated_rate} bpp` : 'Not Applicable'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#050914] border border-[#1B2B48] space-y-1 text-[11px] font-sans text-[#94A3B8]">
                  <div className="font-bold text-white">Academic Payload Status:</div>
                  <p>{payload.adaptive_steganography_status}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: EVIDENCE REPORT & CERTIFICATE                              */}
        {/* ================================================================= */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#1B2B48] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Digital Forensics Chain-of-Custody Dossier</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
                  ISO/IEC 27037 &amp; NIST SP 800-86 structured evidence package with cryptographic validation.
                </p>
              </div>

              {onOpenCertificate && (
                <button
                  onClick={onOpenCertificate}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition flex items-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.3)]"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Printable Official Certificate</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                <span className="text-[10px] uppercase text-[#64748B] font-bold block">Evidence Identification</span>
                <div className="space-y-1 text-[#94A3B8]">
                  <div>Filename: <strong className="text-white">{result.filename}</strong></div>
                  <div>SHA-256 Hash: <strong className="text-cyan-300 break-all">{result.file_hash}</strong></div>
                  <div>File Size: <strong className="text-white">{(result.file_size_bytes / 1024).toFixed(1)} KB</strong></div>
                  <div>Timestamp: <strong className="text-white">{result.created_at || 'LIVE SESSION'}</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#070D1A] border border-[#1B2B48] space-y-2">
                <span className="text-[10px] uppercase text-[#64748B] font-bold block">Inference Engine Verification</span>
                <div className="space-y-1 text-[#94A3B8]">
                  <div>Model Name: <strong className="text-white">{result.model_name || 'StegoNet-Lite'}</strong></div>
                  <div>Model Status: <strong className="text-amber-300">{result.model_status || 'Experimental Baseline'}</strong></div>
                  <div>Inference Latency: <strong className="text-white">{result.execution_time_ms} ms</strong></div>
                  <div>Computation Device: <strong className="text-white">{result.device}</strong></div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] text-xs font-sans text-[#94A3B8] leading-relaxed">
              <strong>Forensic Audit Standard Disclaimer:</strong> This evidence summary reflects empirical calculations,
              lossless bit comparisons, and uncalibrated model scores. While cryptographic SHA-256 integrity confirms chain-of-custody,
              legal or courtroom admissibility requires independent peer-verification and accredited forensic sign-off.
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: CONTAINER CARVER                                           */}
        {/* ================================================================= */}
        {activeTab === 'carver' && file && (
          <FileStructureCarver file={file} />
        )}
      </div>
    </div>
  );
}

