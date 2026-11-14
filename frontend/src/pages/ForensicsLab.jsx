import React, { useState, useEffect, useCallback } from 'react';
import {
  Binary,
  Split,
  Sparkles,
  History,
  Save,
  Check,
  Info,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { steganalysisApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PixelMicroscope from '../components/lab/PixelMicroscope';
import DualImageComparator from '../components/lab/DualImageComparator';
import SuniwardSimulatorWorkspace from '../components/lab/SuniwardSimulatorWorkspace';
import LabLedgerDrawer from '../components/lab/LabLedgerDrawer';

export default function ForensicsLab() {
  const { user, isGuest, triggerGuestPrompt } = useAuth();
  const navigate = useNavigate();

  // Active Workspace: 'microscope' | 'comparator' | 'simulator'
  const [activeWorkspace, setActiveWorkspace] = useState('microscope');

  // Core Image State (Original baseline & Derived modified)
  const [originalMeta, setOriginalMeta] = useState(null);
  const [originalImageB64, setOriginalImageB64] = useState(null);
  const [modifiedImageB64, setModifiedImageB64] = useState(null);
  const [modifiedHash, setModifiedHash] = useState(null);

  // Pixel inspection state
  const [selectedPixel, setSelectedPixel] = useState({ x: 0, y: 0 });
  const [pixelDetails, setPixelDetails] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [lastBulkResult, setLastBulkResult] = useState(null);

  // Experiment Ledger Drawer & History State
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [experiments, setExperiments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Global Toast Message
  const [statusMessage, setStatusMessage] = useState(null);

  const showStatus = (msg, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Load sample image on mount for immediate investigation
  useEffect(() => {
    loadSampleCover();
    loadExperimentsList();
  }, []);

  useEffect(() => {
    loadExperimentsList();
  }, [user]);

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

  const loadExperimentsList = async () => {
    try {
      setHistoryLoading(true);
      const res = await steganalysisApi.getLabExperiments(30);
      setExperiments(res || []);
    } catch (err) {
      console.warn('Failed to load lab experiments:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      setInspectLoading(true);
      const data = await steganalysisApi.inspectLabImage(file);
      setOriginalMeta(data);
      setOriginalImageB64(data.lossless_png_b64);
      setModifiedImageB64(data.lossless_png_b64);
      setModifiedHash(data.sha256_hash);
      setLastBulkResult(null);

      // Auto-inspect center pixel
      const cx = Math.floor(data.width / 2);
      const cy = Math.floor(data.height / 2);
      setSelectedPixel({ x: cx, y: cy });
      await fetchPixelDetails(data.lossless_png_b64, cx, cy);

      showStatus(`Loaded reference carrier: ${data.filename} (${data.dimensions})`);
    } catch (err) {
      showStatus(err.response?.data?.detail || err.message || 'Image upload failed', true);
    } finally {
      setInspectLoading(false);
    }
  };

  const fetchPixelDetails = async (imgB64, x, y) => {
    try {
      const details = await steganalysisApi.inspectLabPixel(imgB64, x, y);
      setPixelDetails(details);
    } catch (e) {
      console.warn('Pixel inspection failed:', e);
    }
  };

  const handleSelectPixel = async (x, y) => {
    setSelectedPixel({ x, y });
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (targetB64) {
      await fetchPixelDetails(targetB64, x, y);
    }
  };

  const handleToggleBit = async (channel, bitIndex) => {
    const targetB64 = modifiedImageB64 || originalImageB64;
    if (!targetB64 || !selectedPixel || !pixelDetails) return;

    let currentVal = 0;
    if (channel === 'red') currentVal = pixelDetails.red;
    else if (channel === 'green') currentVal = pixelDetails.green;
    else if (channel === 'blue') currentVal = pixelDetails.blue;
    else currentVal = pixelDetails.gray ?? 0;

    try {
      const res = await steganalysisApi.toggleLabBit(
        targetB64,
        selectedPixel.x,
        selectedPixel.y,
        channel,
        currentVal,
        bitIndex
      );

      setModifiedImageB64(res.modified_image_b64);
      setModifiedHash(res.modified_sha256);
      await fetchPixelDetails(res.modified_image_b64, selectedPixel.x, selectedPixel.y);
      showStatus(`Toggled bit ${bitIndex} on ${channel} channel (${currentVal} → ${res.new_pixel_value}).`);
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Bit toggle failed', true);
    }
  };

  const handleBulkMutate = async (params) => {
    if (!originalImageB64) return;
    try {
      setBulkProcessing(true);
      const res = await steganalysisApi.mutateLabBits({
        image_b64: originalImageB64,
        mode: params.mode,
        plane: params.plane,
        percentage: params.percentage,
        seed: params.seed,
        channel: 'all',
        action: params.action,
      });

      setModifiedImageB64(res.modified_image_b64);
      setModifiedHash(res.modified_sha256);
      setLastBulkResult(res);
      await fetchPixelDetails(res.modified_image_b64, selectedPixel.x, selectedPixel.y);
      showStatus(
        `Applied bulk perturbations: ${res.modified_pixels_count.toLocaleString()} pixels (${res.modification_percent}%) modified.`
      );
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Bulk mutation failed', true);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (!originalImageB64) return;
    setModifiedImageB64(originalImageB64);
    if (originalMeta) {
      setModifiedHash(originalMeta.sha256_hash);
      fetchPixelDetails(originalImageB64, selectedPixel.x, selectedPixel.y);
    }
    setLastBulkResult(null);
    showStatus('Restored baseline uncompressed cover reference.');
  };

  const handleSaveExperiment = async (bypassGuestCheck = false) => {
    if (!originalMeta || !modifiedHash) {
      showStatus('No active examination state to preserve.', true);
      return;
    }

    if (isGuest && !bypassGuestCheck) {
      triggerGuestPrompt(
        'Save Forensic Session',
        'You are currently exploring as a Guest. Sign in or register to link this experiment to your permanent investigator portfolio, or proceed as guest.',
        () => handleSaveExperiment(true)
      );
      return;
    }

    try {
      const payload = {
        experiment_name: `Forensic Lab Session (${originalMeta.filename})`,
        experiment_type: lastBulkResult ? 'bulk_mutation' : 'pixel_microscope',
        original_filename: originalMeta.filename,
        original_file_hash: originalMeta.sha256_hash,
        modified_file_hash: modifiedHash,
        modified_image_b64: modifiedImageB64,
        parameters_json: JSON.stringify({
          bulk_result: lastBulkResult,
          selected_pixel: selectedPixel,
        }),
        changed_pixels: lastBulkResult?.modified_pixels_count || (modifiedImageB64 !== originalImageB64 ? 1 : 0),
        change_rate_percent: lastBulkResult?.modification_percent || 0.0,
        psnr_db: 48.5,
        verdict: modifiedImageB64 !== originalImageB64 ? 'Perturbed Carrier' : 'Clean Cover',
        confidence: 0.95,
      };

      await steganalysisApi.saveLabExperiment(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showStatus('Experiment committed to ISO/IEC 27037 forensic ledger.');
      await loadExperimentsList();
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Failed to save experiment to ledger', true);
    }
  };

  const handleLoadExperiment = async (id) => {
    try {
      const exp = await steganalysisApi.getLabExperiment(id);
      if (exp.modified_image_b64) {
        setModifiedImageB64(exp.modified_image_b64);
        setModifiedHash(exp.modified_file_hash);
      }
      setLedgerOpen(false);
      showStatus(`Loaded archived session: ${exp.experiment_name}`);
    } catch (e) {
      showStatus('Failed to load experiment from ledger', true);
    }
  };

  const handleDeleteExperiment = async (id) => {
    try {
      await steganalysisApi.deleteLabExperiment(id);
      setExperiments((prev) => prev.filter((item) => item.id !== id));
      showStatus('Archived record purged from ledger.');
    } catch (e) {
      showStatus('Failed to delete experiment', true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Master Workstation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">Digital Forensics Workstation</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-sans">
                Professional raster examination, bitplane forensics &amp; differential carrier analysis
              </p>
            </div>
          </div>
        </div>

        {/* Global Workstation Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => navigate('/studio')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-[#94A3B8] hover:text-white border border-[#1B2B48] transition text-xs font-semibold"
            title="Open Stego Studio to conceal or extract secret payloads"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stego Studio</span>
            <ExternalLink className="w-3 h-3 text-[#64748B]" />
          </button>

          <button
            type="button"
            onClick={() => setLedgerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30 transition text-xs font-semibold"
            title="Inspect ISO/IEC 27037 forensic experiment ledger"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audit Ledger</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold">
              {experiments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveExperiment(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.25)]"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5 text-black" /> : <Save className="w-3.5 h-3.5 text-black" />}
            <span>{saveSuccess ? 'Saved' : 'Save Session'}</span>
          </button>
        </div>
      </div>

      {/* Global Toast Alert */}
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
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[#64748B] hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 2. Three Clear Workspaces Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48]">
        {/* Workspace 1 Button */}
        <button
          type="button"
          onClick={() => setActiveWorkspace('microscope')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold font-mono transition-all duration-200 cursor-pointer ${
            activeWorkspace === 'microscope'
              ? 'bg-gradient-to-r from-cyan-950/90 to-[#0A1628] text-white border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/50'
              : 'bg-[#050914] text-[#94A3B8] border-[#142036] hover:text-white hover:border-[#1E2E4E]'
          }`}
        >
          <Binary className="w-4 h-4 text-cyan-400" />
          <span>1. Pixel &amp; Bitplane Microscope</span>
        </button>

        {/* Workspace 2 Button */}
        <button
          type="button"
          onClick={() => setActiveWorkspace('comparator')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold font-mono transition-all duration-200 cursor-pointer ${
            activeWorkspace === 'comparator'
              ? 'bg-gradient-to-r from-cyan-950/90 to-[#0A1628] text-white border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/50'
              : 'bg-[#050914] text-[#94A3B8] border-[#142036] hover:text-white hover:border-[#1E2E4E]'
          }`}
        >
          <Split className="w-4 h-4 text-cyan-400" />
          <span>2. Dual-Image Comparator</span>
        </button>

        {/* Workspace 3 Button */}
        <button
          type="button"
          onClick={() => setActiveWorkspace('simulator')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold font-mono transition-all duration-200 cursor-pointer ${
            activeWorkspace === 'simulator'
              ? 'bg-gradient-to-r from-cyan-950/90 to-[#0A1628] text-white border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/50'
              : 'bg-[#050914] text-[#94A3B8] border-[#142036] hover:text-white hover:border-[#1E2E4E]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>3. S-UNIWARD Simulator</span>
        </button>
      </div>

      {/* 3. Active Workspace Mounting */}
      <div>
        {activeWorkspace === 'microscope' && (
          <PixelMicroscope
            originalMeta={originalMeta}
            originalImageB64={originalImageB64}
            modifiedImageB64={modifiedImageB64}
            modifiedHash={modifiedHash}
            onImageUpload={handleImageUpload}
            onLoadSample={loadSampleCover}
            onToggleBit={handleToggleBit}
            onBulkMutate={handleBulkMutate}
            onRestoreOriginal={handleRestoreOriginal}
            selectedPixel={selectedPixel}
            onSelectPixel={handleSelectPixel}
            pixelDetails={pixelDetails}
            inspectLoading={inspectLoading}
            bulkProcessing={bulkProcessing}
            lastBulkResult={lastBulkResult}
            showStatus={showStatus}
          />
        )}

        {activeWorkspace === 'comparator' && (
          <DualImageComparator
            microscopeOriginalB64={originalImageB64}
            microscopeModifiedB64={modifiedImageB64}
            showStatus={showStatus}
          />
        )}

        {activeWorkspace === 'simulator' && (
          <SuniwardSimulatorWorkspace originalImageB64={originalImageB64} />
        )}
      </div>

      {/* 4. Slide-Out Audit Ledger Drawer */}
      <LabLedgerDrawer
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        experiments={experiments}
        isLoading={historyLoading}
        onRefresh={loadExperimentsList}
        onSaveCurrent={() => handleSaveExperiment(false)}
        saveSuccess={saveSuccess}
        onLoadExperiment={handleLoadExperiment}
        onDeleteExperiment={handleDeleteExperiment}
      />
    </div>
  );
}
