import React, { useState, useRef } from 'react';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Filter,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';

export default function BatchTriageWorkstation({ onSelectImageForInspection }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchData, setBatchData] = useState(null);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'stego' | 'cover'
  const [copiedHash, setCopiedHash] = useState(null);

  const folderInputRef = useRef(null);

  const handleFiles = async (filesList) => {
    const validFiles = Array.from(filesList).filter((f) =>
      /\.(png|pgm|jpg|jpeg|bmp|webp)$/i.test(f.name)
    );

    if (validFiles.length === 0) {
      setError('Please select valid image files (.png, .pgm, .jpg, .bmp, .webp).');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const data = await steganalysisApi.analyzeBatch(validFiles);
      setBatchData(data);
    } catch (err) {
      console.error('Batch triage failed:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to process batch images. Ensure backend server is reachable.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBenchmarkRun = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await steganalysisApi.analyzeBenchmarkBatch(5); // 5 cover + 5 stego = 10 test images
      setBatchData(data);
    } catch (err) {
      console.error('Benchmark batch triage failed:', err);
      setError('Failed to execute benchmark triage. Ensure dataset partitions exist.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Export CSV Audit Log
  const exportCSV = () => {
    if (!batchData || !batchData.results) return;

    const headers = [
      'Record_ID',
      'Filename',
      'SHA256_Hash',
      'Verdict',
      'Confidence_Pct',
      'Cover_Probability',
      'Stego_Probability',
      'Residual_Energy_Sigma_R2',
      'Execution_Time_MS',
      'Device',
      'Model_Name',
      'Timestamp',
    ];

    const rows = batchData.results.map((r, idx) => [
      r.id || idx + 1,
      `"${r.filename}"`,
      r.file_hash,
      r.verdict,
      (r.confidence * 100).toFixed(2),
      (r.cover_probability * 100).toFixed(4),
      (r.stego_probability * 100).toFixed(4),
      r.residual_energy ? r.residual_energy.toFixed(4) : 'N/A',
      r.execution_time_ms,
      r.device,
      `"${r.model_name}"`,
      r.created_at || new Date().toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stegoshield_batch_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export JSON Audit Log
  const exportJSON = () => {
    if (!batchData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(batchData, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.setAttribute('download', `stegoshield_batch_audit_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const results = batchData?.results || [];
  const filteredResults = results.filter((item) => {
    if (filterMode === 'stego') return item.verdict === 'Stego';
    if (filterMode === 'cover') return item.verdict === 'Cover';
    return true;
  });

  const total = batchData?.total_processed || 0;
  const stegoPct = total > 0 ? ((batchData.stego_count / total) * 100).toFixed(1) : 0;
  const coverPct = total > 0 ? ((batchData.cover_count / total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#151515] text-[#B3B3B3] border border-[#292929]">
              High-Throughput Digital Evidence Triage
            </span>
            <span className="text-xs text-[#777777] font-mono">• Parallel Verification Engine</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
            Batch Evidence Triage & Automated Folder Scanner
          </h2>
          <p className="text-xs text-[#777777] mt-1 max-w-2xl">
            Rapidly scan and triage multi-carrier digital evidence portfolios (10–50 images). Performs high-throughput residual noise variance calculation, neural activation inference, and generates RFC 4180 audit logs.
          </p>
        </div>

        <button
          onClick={handleBenchmarkRun}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-black text-xs font-semibold transition shadow-md disabled:opacity-50 cursor-pointer theme-btn-primary"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>Triage 10-Image Test Benchmark</span>
        </button>
      </div>

      {/* Upload & Dropzone Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => folderInputRef.current?.click()}
        className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-white bg-[#1A1A1A] scale-[1.005]'
            : 'border-[#292929] hover:border-[#383838] bg-[#111111]'
        }`}
      >
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-[#151515] border border-[#292929] flex items-center justify-center mx-auto mb-3 text-white">
          <FolderArchive className="w-7 h-7" />
        </div>

        <h3 className="text-sm font-bold text-white">
          Drop a folder or select multiple image files
        </h3>
        <p className="text-xs text-[#777777] mt-1 max-w-md mx-auto">
          Supports multi-selection of PNG, PGM, JPEG, BMP, or WEBP evidence files.
        </p>

        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-[#777777] font-mono">
          <span>• Parallel Execution</span>
          <span>• Cryptographic SHA-256</span>
          <span>• Real-Time Threat Ratio</span>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="p-8 rounded-2xl bg-[#111111] border border-[#292929] text-center space-y-3 animate-fadeIn">
          <div className="relative w-10 h-10 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-[#383838] border-t-white animate-spin"></div>
          </div>
          <p className="text-sm font-semibold text-white">
            Running High-Throughput Forensic Triage...
          </p>
          <p className="text-xs text-[#777777] font-mono">
            Evaluating Laplacian residuals and deep neural logits across evidence batch
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-[#151515] border border-[#383838] text-white text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-white mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Batch Summary & Triage Dashboard */}
      {batchData && !isProcessing && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl bg-[#151515] border border-[#292929]">
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">
                Total Triaged
              </span>
              <span className="text-2xl font-bold text-white mt-1 block">
                {batchData.total_processed}
              </span>
              <span className="text-[10px] text-[#777777] mt-0.5 block">
                {batchData.total_execution_time_ms} ms total ({Math.round(batchData.total_execution_time_ms / (batchData.total_processed || 1))} ms/img)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#151515] border border-[#292929]">
              <span className="text-[#B3B3B3] block text-[10px] uppercase font-semibold">
                Stego Detected
              </span>
              <span className="text-2xl font-bold text-white mt-1 block">
                {batchData.stego_count}
              </span>
              <span className="text-[10px] text-[#777777] mt-0.5 block">
                {stegoPct}% Threat Density
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#151515] border border-[#292929]">
              <span className="text-[#B3B3B3] block text-[10px] uppercase font-semibold">
                Cover (Clean)
              </span>
              <span className="text-2xl font-bold text-white mt-1 block">
                {batchData.cover_count}
              </span>
              <span className="text-[10px] text-[#777777] mt-0.5 block">
                {coverPct}% Verified Clean
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#151515] border border-[#292929] flex flex-col justify-between">
              <div>
                <span className="text-[#777777] block text-[10px] uppercase font-semibold">
                  Evidence Audit Logs
                </span>
                <span className="text-xs text-[#B3B3B3] mt-1 block">
                  Export NIST Package
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={exportCSV}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#1C1C1C] hover:bg-[#242424] border border-[#292929] text-white text-[11px] font-semibold transition flex items-center justify-center gap-1"
                  title="Export RFC 4180 CSV Audit Log"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={exportJSON}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#1C1C1C] hover:bg-[#242424] border border-[#292929] text-white text-[11px] font-semibold transition flex items-center justify-center gap-1"
                  title="Export Structured JSON Evidence Log"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Threat Ratio Segmented Bar */}
          <div className="p-4 rounded-xl bg-[#151515] border border-[#292929] space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-white" />
                <span>Batch Threat Distribution Spectrum</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-white">Clean: {coverPct}%</span>
                <span className="text-[#B3B3B3]">Stego: {stegoPct}%</span>
              </div>
            </div>
            <div className="h-3 w-full rounded-full bg-[#222222] border border-[#292929] overflow-hidden flex p-0.5">
              <div
                style={{ width: `${coverPct}%` }}
                className="h-full bg-white rounded-l-full transition-all duration-500"
              ></div>
              <div
                style={{ width: `${stegoPct}%` }}
                className="h-full bg-[#555555] rounded-r-full transition-all duration-500"
              ></div>
            </div>
          </div>

          {/* Filter Pills & Table */}
          <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-white" />
                <h4 className="text-sm font-bold text-white">Triaged Evidence Registry</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] text-[#777777] border border-[#292929]">
                  {filteredResults.length} / {results.length} shown
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterMode === 'all'
                      ? 'bg-[#242424] text-white border border-[#383838]'
                      : 'text-[#777777] hover:text-white'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setFilterMode('stego')}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterMode === 'stego'
                      ? 'bg-[#242424] text-white border border-[#383838]'
                      : 'text-[#777777] hover:text-white'
                  }`}
                >
                  Stego ({batchData.stego_count})
                </button>
                <button
                  onClick={() => setFilterMode('cover')}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterMode === 'cover'
                      ? 'bg-[#242424] text-white border border-[#383838]'
                      : 'text-[#777777] hover:text-white'
                  }`}
                >
                  Cover ({batchData.cover_count})
                </button>
              </div>
            </div>

            {/* Evidence Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#292929] text-[#777777] uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">SHA-256 Digest</th>
                    <th className="py-2.5 px-3">Verdict</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Residual σr²</th>
                    <th className="py-2.5 px-3">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {filteredResults.map((item, idx) => {
                    const isStego = item.verdict === 'Stego';
                    const isCopied = copiedHash === item.file_hash;

                    return (
                      <tr key={idx} className="hover:bg-[#1A1A1A] transition">
                        <td className="py-3 px-3 text-[#777777]">{idx + 1}</td>
                        <td className="py-3 px-3 text-white font-semibold truncate max-w-[180px]">
                          {item.filename}
                        </td>
                        <td className="py-3 px-3 text-[#B3B3B3]">
                          <button
                            onClick={() => copyToClipboard(item.file_hash, item.file_hash)}
                            className="flex items-center gap-1.5 hover:text-white transition text-[11px]"
                            title="Copy SHA-256 Hash"
                          >
                            <span className="truncate max-w-[120px]">
                              {item.file_hash?.substring(0, 14)}...
                            </span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#777777]" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isStego
                                ? 'bg-[#242424] text-white border border-[#383838]'
                                : 'bg-[#151515] text-[#B3B3B3] border border-[#292929]'
                            }`}
                          >
                            {isStego ? (
                              <AlertTriangle className="w-3 h-3 text-white" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-[#B3B3B3]" />
                            )}
                            <span>{item.verdict}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#B3B3B3]">
                          {(item.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-white font-bold">
                          {item.residual_energy ? item.residual_energy.toFixed(2) : '--'}
                        </td>
                        <td className="py-3 px-3 text-[#777777]">
                          {item.execution_time_ms} ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

