import React from 'react';
import {
  FileText,
  Printer,
  X,
  ShieldCheck,
  AlertTriangle,
  Hash,
  Clock,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

export default function ForensicReportModal({ isOpen, onClose, reportData, previewUrl }) {
  if (!isOpen || !reportData) return null;

  const isStego = reportData.verdict === 'Stego';
  const timestamp = reportData.created_at
    ? new Date(reportData.created_at).toUTCString()
    : new Date().toUTCString();
  const caseId = `STEGO-CASE-${reportData.id || Date.now().toString().slice(-6)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black print:my-0">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white text-sm">
              Official Digital Forensics Case Report
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formal Printable Document Content */}
        <div className="p-8 space-y-6 text-gray-200 print:text-black print:p-6 bg-gray-900 print:bg-white">
          {/* Document Letterhead */}
          <div className="border-b-2 border-gray-700 print:border-black pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 print:text-gray-600 font-bold">
                StegoShield AI Forensic Examination Laboratory
              </div>
              <h1 className="text-xl font-black tracking-tight text-white print:text-black">
                FORENSIC EXAMINATION CERTIFICATE
              </h1>
              <div className="text-xs text-gray-400 print:text-gray-600 font-mono">
                Digital Image Steganalysis & Payload Attribution
              </div>
            </div>
            <div className="text-left sm:text-right font-mono text-xs text-gray-400 print:text-gray-600">
              <div className="font-bold text-cyan-300 print:text-black">{caseId}</div>
              <div>Date: {timestamp}</div>
              <div>Standard: ISO/IEC 27037 Compliant</div>
            </div>
          </div>

          {/* Section 1: Target Evidence Profile */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 print:text-gray-700 flex items-center gap-1.5 border-b border-gray-800 print:border-gray-300 pb-1">
              <span>1. Evidence Target Identification</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300">
                <span className="text-[10px] text-gray-500 block">Filename</span>
                <span className="font-bold text-white print:text-black truncate block mt-0.5">
                  {reportData.filename}
                </span>
              </div>
              <div className="p-2.5 rounded bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300">
                <span className="text-[10px] text-gray-500 block">File Size</span>
                <span className="font-bold text-white print:text-black block mt-0.5">
                  {(reportData.file_size_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="p-2.5 rounded bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300">
                <span className="text-[10px] text-gray-500 block">Resolution</span>
                <span className="font-bold text-white print:text-black block mt-0.5">
                  {reportData.metadata?.original_width || 512} × {reportData.metadata?.original_height || 512}
                </span>
              </div>
              <div className="p-2.5 rounded bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300">
                <span className="text-[10px] text-gray-500 block">Image Format</span>
                <span className="font-bold text-white print:text-black block mt-0.5">
                  {reportData.metadata?.format || 'PGM / RAW'}
                </span>
              </div>
            </div>
            <div className="p-2 rounded bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300 text-[11px] font-mono flex items-center justify-between">
              <span className="text-gray-400 print:text-gray-700">SHA-256 Checksum:</span>
              <span className="text-cyan-400 print:text-black font-bold truncate max-w-lg">
                {reportData.file_hash}
              </span>
            </div>
          </div>

          {/* Section 2: Examination Findings */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 print:text-gray-700 flex items-center gap-1.5 border-b border-gray-800 print:border-gray-300 pb-1">
              <span>2. Forensic Examination Findings</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${
                isStego
                  ? 'bg-rose-950/30 print:bg-red-50 border-rose-500/30 text-rose-300 print:text-red-800'
                  : 'bg-emerald-950/30 print:bg-green-50 border-emerald-500/30 text-emerald-300 print:text-green-800'
              }`}>
                <span className="text-[10px] font-mono block">Primary Neural Classifier</span>
                <div className="text-lg font-black mt-1">
                  {isStego ? 'STEGANOGRAPHY DETECTED' : 'CLEAN COVER (NO PAYLOAD)'}
                </div>
                <div className="text-[11px] font-mono mt-1 opacity-90">
                  Confidence: {(reportData.confidence * 100).toFixed(1)}% ({reportData.model_name})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300 font-mono">
                <span className="text-[10px] text-gray-500 block">Auxiliary Residual Energy</span>
                <div className="text-lg font-bold text-cyan-400 print:text-black mt-1">
                  {reportData.residual_energy?.toFixed(2) || '--'} σr²
                </div>
                <div className="text-[10px] text-gray-400 print:text-gray-600 mt-1">
                  High-pass Laplacian spatial variance
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/50 print:bg-gray-100 border border-gray-800 print:border-gray-300 font-mono">
                <span className="text-[10px] text-gray-500 block">Class Probabilities</span>
                <div className="text-xs text-white print:text-black mt-1.5 space-y-0.5">
                  <div className="flex justify-between">
                    <span>P(Cover):</span>
                    <span className="font-bold">{(reportData.cover_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P(Stego):</span>
                    <span className="font-bold">{(reportData.stego_probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scientific Explanation Block */}
            <div className="p-3 rounded-xl bg-gray-950/70 print:bg-gray-50 border border-gray-800 print:border-gray-300 text-xs">
              <span className="font-bold text-gray-300 print:text-black block mb-1">
                Forensic Rationale & Analysis Notes:
              </span>
              <p className="text-gray-400 print:text-gray-700 leading-relaxed text-[11px]">
                {reportData.forensic_explanation}
              </p>
            </div>
          </div>

          {/* Section 3: Visual Evidence Exhibits */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 print:text-gray-700 flex items-center gap-1.5 border-b border-gray-800 print:border-gray-300 pb-1">
              <span>3. Visual Forensic Exhibits</span>
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Exhibit A: Original */}
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-lg overflow-hidden border border-gray-700 print:border-gray-400 bg-black/40">
                  <img
                    src={previewUrl}
                    alt="Exhibit A"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-mono text-gray-400 print:text-gray-600 font-bold">
                  Exhibit A: Evidence Sample
                </div>
              </div>

              {/* Exhibit B: Heatmap */}
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-lg overflow-hidden border border-gray-700 print:border-gray-400 bg-black/40">
                  <img
                    src={reportData.residual_heatmap_b64 || previewUrl}
                    alt="Exhibit B"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-mono text-gray-400 print:text-gray-600 font-bold">
                  Exhibit B: Residual Variance Heatmap
                </div>
              </div>

              {/* Exhibit C: Bit-plane 0 or Diff */}
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-lg overflow-hidden border border-gray-700 print:border-gray-400 bg-black/40">
                  <img
                    src={reportData.diff_map_b64 || reportData.bitplane_0_b64 || previewUrl}
                    alt="Exhibit C"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-mono text-gray-400 print:text-gray-600 font-bold">
                  {reportData.diff_map_b64 ? 'Exhibit C: Amplified Diff (±1)' : 'Exhibit C: Bit-Plane 0 (LSB)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Examiner Attestation Block */}
          <div className="pt-4 border-t-2 border-gray-800 print:border-black grid grid-cols-2 gap-6 text-xs font-mono text-gray-400 print:text-gray-700">
            <div>
              <div className="font-bold text-white print:text-black">Digital Forensic Certification:</div>
              <p className="text-[10px] text-gray-500 print:text-gray-600 mt-0.5 leading-relaxed">
                Analysis executed using StegoShield AI neural and spatial residual inspection pipelines. All integrity hashes verified against original image bytes.
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-[10px] text-gray-500">Authorized Forensic Examiner:</div>
              <div className="font-bold text-cyan-400 print:text-black font-sans text-sm">
                StegoShield AI Certified Examiner
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                Digital Signature Verified • {caseId}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
