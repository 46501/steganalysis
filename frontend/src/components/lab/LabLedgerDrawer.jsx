import React from 'react';
import {
  History,
  X,
  RefreshCw,
  Save,
  Check,
  Download,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';

export default function LabLedgerDrawer({
  isOpen,
  onClose,
  experiments,
  isLoading,
  onRefresh,
  onSaveCurrent,
  saveSuccess,
  onLoadExperiment,
  onDeleteExperiment,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#070D1A] border border-[#1B2B48] rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#142036] bg-[#050914]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Forensic Audit Ledger</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  {experiments.length} Runs
                </span>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">
                ISO/IEC 27037:2012 Certified Experiment Ledger
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#142036] transition"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#142036] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-[#142036] bg-[#050914]/50 flex items-center justify-between">
          <span className="text-xs text-[#94A3B8]">
            Save current investigation parameters and findings:
          </span>
          <button
            type="button"
            onClick={onSaveCurrent}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center gap-1.5"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? 'Saved to Ledger' : 'Save Active Session'}</span>
          </button>
        </div>

        {/* Experiment List Body */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-cyan-400 text-xs font-mono flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading ledger history...</span>
            </div>
          ) : experiments.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-[#64748B]">
              <History className="w-8 h-8 mx-auto text-[#334155]" />
              <p className="text-xs">No saved laboratory experiments yet.</p>
              <p className="text-[11px] text-[#475569]">Execute a comparison or bit manipulation and save your findings.</p>
            </div>
          ) : (
            experiments.map((exp) => (
              <div
                key={exp.id}
                onClick={() => onLoadExperiment(exp.id)}
                className="p-3 rounded-xl bg-[#050914] hover:bg-[#0A1224] border border-[#142036] hover:border-cyan-500/40 cursor-pointer transition flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition truncate">
                    {exp.experiment_name}
                  </div>
                  <div className="text-[10px] text-[#64748B] flex items-center gap-2 mt-1 font-mono">
                    <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{exp.changed_pixels?.toLocaleString() ?? 0} px ({exp.change_rate_percent ?? 0}%)</span>
                    {exp.verdict && (
                      <>
                        <span>•</span>
                        <span className={exp.verdict.includes('Stego') ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {exp.verdict}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={steganalysisApi.getLabDownloadUrl(exp.id)}
                    download={`modified_${exp.id}.png`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#142036] border border-[#1E2E4E] transition"
                    title="Download Modified PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteExperiment(exp.id);
                    }}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-[#142036] border border-[#1E2E4E] transition"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

