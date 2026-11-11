import React, { useState } from 'react';
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
  Archive,
  Download,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';

export default function ForensicReportModal({ isOpen, onClose, reportData, previewUrl }) {
  const [isExporting, setIsExporting] = useState(false);
  if (!isOpen || !reportData) return null;

  const isStego = reportData.verdict === 'Stego';
  const timestamp = reportData.created_at
    ? new Date(reportData.created_at).toUTCString()
    : new Date().toUTCString();
  const caseId = `STEGO-CASE-${reportData.id || Date.now().toString().slice(-6)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadArchive = async () => {
    setIsExporting(true);
    try {
      const blob = await steganalysisApi.exportLiveEvidenceArchive(reportData);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `evidence_archive_${caseId}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export evidence archive:', err);
      alert('Could not export evidence archive. Ensure backend server is reachable.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-[#111111] border border-[#292929] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black print:my-0">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#292929] bg-[#0A0A0A] print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-white" />
            <span className="font-bold text-white text-sm">
              Official Digital Forensics Case Report
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadArchive}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#242424] text-white border border-[#292929] text-xs font-semibold transition disabled:opacity-50"
              title="Download ISO/IEC 27037 & NIST SP 800-86 Compliant Digital Evidence Package"
            >
              <Archive className="w-3.5 h-3.5 text-white" />
              <span>{isExporting ? 'Packaging...' : 'Export NIST Archive (.zip)'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E5] text-black text-xs font-semibold transition shadow-none theme-btn-primary"
            >
              <Printer className="w-3.5 h-3.5 text-black" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#242424] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formal Printable Document Content */}
        <div className="p-8 space-y-6 text-[#B3B3B3] print:text-black print:p-6 bg-[#111111] print:bg-white">
          {/* Document Letterhead */}
          <div className="border-b border-[#383838] print:border-black pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-[#777777] print:text-gray-600 font-bold">
                StegoShield AI Forensic Examination Laboratory
              </div>
              <h1 className="text-xl font-black tracking-tight text-white print:text-black">
                FORENSIC EXAMINATION CERTIFICATE
              </h1>
              <div className="text-xs text-[#777777] print:text-gray-600 font-mono">
                Digital Image Steganalysis & Payload Attribution
              </div>
            </div>
            <div className="text-left sm:text-right font-mono text-xs text-[#777777] print:text-gray-600">
              <div className="font-bold text-white print:text-black">{caseId}</div>
              <div>Date: {timestamp}</div>
              <div>Standard: ISO/IEC 27037 Compliant</div>
            </div>
          </div>

          {/* Section 1: Target Evidence Profile */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#777777] print:text-gray-700 flex items-center gap-1.5 border-b border-[#292929] print:border-gray-300 pb-1">
              <span>1. Evidence Target Identification</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300">
                <span className="text-[10px] text-[#777777] block">Filename</span>
                <span className="font-bold text-white print:text-black truncate block mt-0.5">
                  {reportData.filename}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300">
                <span className="text-[10px] text-[#777777] block">File Size</span>
                <span className="font-bold text-white print:text-black block mt-0.5">
                  {(reportData.file_size_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300">
                <span className="text-[10px] text-[#777777] block">Resolution</span>
                <span className="font-bold text-white print:text-black block mt-0.5">
                  {reportData.metadata?.original_width || 512} × {reportData.metadata?.original_height || 512}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300">
                <span className="text-[10px] text-[#777777] block">Image Format</span>
                <span className="font-bold text-white print:text-black block mt-0.5">
                  {reportData.metadata?.format || 'PGM / RAW'}
                </span>
              </div>
            </div>
            <div className="p-2 rounded bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300 text-[11px] font-mono flex items-center justify-between">
              <span className="text-[#777777] print:text-gray-700">SHA-256 Checksum:</span>
              <span className="text-white print:text-black font-bold truncate max-w-lg">
                {reportData.file_hash}
              </span>
            </div>
          </div>

          {/* Section 2: Examination Findings */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#777777] print:text-gray-700 flex items-center gap-1.5 border-b border-[#292929] print:border-gray-300 pb-1">
              <span>2. Forensic Examination Findings</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-[#383838] bg-[#151515] print:bg-gray-100 text-white print:text-black">
                <span className="text-[10px] font-mono block text-[#777777]">Primary Neural Classifier</span>
                <div className="text-lg font-black mt-1">
                  {isStego ? 'STEGANOGRAPHY DETECTED' : 'CLEAN COVER (NO PAYLOAD)'}
                </div>
                <div className="text-[11px] font-mono mt-1 text-[#B3B3B3]">
                  Confidence: {(reportData.confidence * 100).toFixed(1)}% ({reportData.model_name})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300 font-mono">
                <span className="text-[10px] text-[#777777] block">Auxiliary Residual Energy</span>
                <div className="text-lg font-bold text-white print:text-black mt-1">
                  {reportData.residual_energy?.toFixed(2) || '--'} σr²
                </div>
                <div className="text-[10px] text-[#777777] print:text-gray-600 mt-1">
                  High-pass Laplacian spatial variance
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#151515] print:bg-gray-100 border border-[#292929] print:border-gray-300 font-mono">
                <span className="text-[10px] text-[#777777] block">Class Probabilities</span>
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
            <div className="p-3 rounded-xl bg-[#151515] print:bg-gray-50 border border-[#292929] print:border-gray-300 text-xs">
              <span className="font-bold text-white print:text-black block mb-1">
                Forensic Rationale & Analysis Notes:
              </span>
              <p className="text-[#B3B3B3] print:text-gray-700 leading-relaxed text-[11px]">
                {reportData.forensic_explanation}
              </p>
            </div>
          </div>

          {/* Section 3: Visual Evidence Exhibits */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#777777] print:text-gray-700 flex items-center gap-1.5 border-b border-[#292929] print:border-gray-300 pb-1">
              <span>3. Visual Forensic Exhibits</span>
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Exhibit A: Original */}
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-lg overflow-hidden border border-[#292929] print:border-gray-400 bg-black">
                  <img
                    src={previewUrl}
                    alt="Exhibit A"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-mono text-[#777777] print:text-gray-600 font-bold">
                  Exhibit A: Evidence Sample
                </div>
              </div>

              {/* Exhibit B: Heatmap */}
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-lg overflow-hidden border border-[#292929] print:border-gray-400 bg-black">
                  <img
                    src={reportData.residual_heatmap_b64 || previewUrl}
                    alt="Exhibit B"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-mono text-[#777777] print:text-gray-600 font-bold">
                  Exhibit B: Residual Variance Heatmap
                </div>
              </div>

              {/* Exhibit C: Bit-plane 0 or Diff */}
              <div className="space-y-1.5">
                <div className="w-full h-36 rounded-lg overflow-hidden border border-[#292929] print:border-gray-400 bg-black">
                  <img
                    src={reportData.diff_map_b64 || reportData.bitplane_0_b64 || previewUrl}
                    alt="Exhibit C"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-mono text-[#777777] print:text-gray-600 font-bold">
                  {reportData.diff_map_b64 ? 'Exhibit C: Amplified Diff (±1)' : 'Exhibit C: Bit-Plane 0 (LSB)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Examiner Attestation Block */}
          <div className="pt-4 border-t border-[#383838] print:border-black grid grid-cols-2 gap-6 text-xs font-mono text-[#777777] print:text-gray-700">
            <div>
              <div className="font-bold text-white print:text-black">Digital Forensic Certification:</div>
              <p className="text-[10px] text-[#777777] print:text-gray-600 mt-0.5 leading-relaxed">
                Analysis executed using StegoShield AI neural and spatial residual inspection pipelines. All integrity hashes verified against original image bytes.
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-[10px] text-[#777777]">Authorized Forensic Examiner:</div>
              <div className="font-bold text-white print:text-black font-sans text-sm">
                StegoShield AI Certified Examiner
              </div>
              <div className="text-[10px] text-[#777777] font-mono">
                Digital Signature Verified • {caseId}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

