import React, { useEffect, useState } from 'react';
import {
  History as HistoryIcon,
  Download,
  Trash2,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  Hash,
  Clock,
  Layers,
  FileText,
  Archive,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';

export default function History() {
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState(''); // '' | 'Cover' | 'Stego'
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = { limit: 100, offset: 0 };
      if (verdictFilter) params.verdict = verdictFilter;
      const data = await steganalysisApi.getHistory(params);
      setRecords(data.items || []);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [verdictFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scan record permanently?')) return;
    try {
      await steganalysisApi.deleteHistoryItem(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (selectedRecord?.id === id) setSelectedRecord(null);
    } catch (err) {
      alert('Failed to delete scan record');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) return;
    try {
      await steganalysisApi.clearAllHistory();
      setRecords([]);
      setTotalCount(0);
      setSelectedRecord(null);
    } catch (err) {
      alert('Failed to clear scan history');
    }
  };

  const handleDownloadArchive = async (recordId) => {
    try {
      const blob = await steganalysisApi.downloadEvidenceArchive(recordId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `evidence_archive_CASE_${recordId}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download digital evidence archive');
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'ID',
      'Timestamp',
      'Filename',
      'SHA256_Hash',
      'Verdict',
      'Cover_Probability',
      'Stego_Probability',
      'Confidence',
      'Residual_Energy',
      'Model_Name',
      'Execution_Time_MS',
      'Device',
    ];

    const rows = records.map((r) => [
      r.id,
      r.created_at,
      `"${r.filename}"`,
      r.file_hash,
      r.verdict,
      r.cover_probability,
      r.stego_probability,
      r.confidence,
      r.residual_energy || 0,
      `"${r.model_name || 'StegoNet-Lite'}"`,
      r.execution_time_ms,
      r.device_used,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stegoshield_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.filename.toLowerCase().includes(q) ||
      (r.file_hash && r.file_hash.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#292929] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
              Audit Logs
            </span>
            <span className="text-xs text-[#777777]">• Forensic Persistence</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Scan Archive & Reports
          </h1>
          <p className="text-sm text-[#777777] mt-1">
            Historical audit log of processed digital images with forensic hash verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl bg-[#151515] hover:bg-[#222222] text-[#B3B3B3] hover:text-white border border-[#292929] transition"
            title="Refresh Scan List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-white' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              records.length === 0
                ? 'bg-[#111111] text-[#555555] border-[#222222] cursor-not-allowed'
                : 'bg-[#1C1C1C] hover:bg-[#242424] text-white border border-[#292929]'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={records.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              records.length === 0
                ? 'bg-[#111111] text-[#555555] border-[#222222] cursor-not-allowed'
                : 'bg-transparent hover:bg-[#1A1A1A] text-[#777777] hover:text-white border border-[#292929]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#111111] border border-[#292929]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or SHA-256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#292929] rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#777777] focus:outline-none focus:border-[#555555]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#777777] flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filter:
          </span>
          {['', 'Cover', 'Stego'].map((type) => (
            <button
              key={type}
              onClick={() => setVerdictFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                verdictFilter === type
                  ? 'bg-[#242424] text-white border border-[#383838]'
                  : 'bg-[#151515] text-[#777777] hover:text-white border border-[#292929]'
              }`}
            >
              {type === '' ? 'All Scans' : type === 'Cover' ? 'Covers Clean' : 'Stego Payloads'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="border border-[#292929] rounded-2xl overflow-hidden bg-[#111111] shadow-xl">
        {filteredRecords.length === 0 ? (
          <div className="p-16 text-center text-sm text-[#777777]">
            <HistoryIcon className="w-12 h-12 text-[#555555] mx-auto mb-3 opacity-60" />
            <p className="font-medium text-white">No scan records found</p>
            <p className="text-xs text-[#777777] mt-1">
              Upload images in the Steganalysis Detector to generate persistent audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A0A0A] text-[#777777] uppercase tracking-wider font-semibold border-b border-[#292929]">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Image Filename</th>
                  <th className="py-3.5 px-4">Verdict</th>
                  <th className="py-3.5 px-4">Stego Prob</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4">Residual Energy</th>
                  <th className="py-3.5 px-4">Model</th>
                  <th className="py-3.5 px-4">Latency</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#B3B3B3]">
                {filteredRecords.map((r) => {
                  const isStego = r.verdict === 'Stego';
                  const dateStr = new Date(r.created_at).toLocaleString();
                  return (
                    <tr key={r.id} className="hover:bg-[#1A1A1A] transition">
                      <td className="py-3 px-4 font-mono text-[#777777] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-[220px] truncate" title={r.filename}>
                        {r.filename}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            isStego
                              ? 'bg-[#242424] text-white border border-[#383838]'
                              : 'bg-[#151515] text-[#B3B3B3] border border-[#292929]'
                          }`}
                        >
                          {isStego ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-white" />
                              <span>STEGO</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3 text-[#B3B3B3]" />
                              <span>COVER</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#B3B3B3]">
                        {(r.stego_probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-white font-bold">
                        {r.residual_energy ? r.residual_energy.toFixed(2) : '--'}
                      </td>
                      <td className="py-3 px-4 text-[#777777] whitespace-nowrap">
                        {r.model_name || 'StegoNet-Lite'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#777777] whitespace-nowrap">
                        {r.execution_time_ms ? `${r.execution_time_ms.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadArchive(r.id)}
                            className="p-1.5 rounded-lg bg-[#151515] hover:bg-[#222222] text-[#B3B3B3] hover:text-white border border-[#292929] transition"
                            title="Download NIST/ISO-27037 Evidence Package (.zip)"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="p-1.5 rounded-lg bg-[#151515] hover:bg-[#222222] text-[#B3B3B3] hover:text-white border border-[#292929] transition"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg bg-[#151515] hover:bg-[#222222] text-[#777777] hover:text-white border border-[#292929] transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#292929] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">Scan Forensic Report</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-[#242424] text-[#777777] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Verdict Banner */}
              <div className="p-4 rounded-xl text-center border border-[#383838] bg-[#151515] text-white">
                <div className="text-xl font-bold">
                  {selectedRecord.verdict === 'Stego' ? 'STEGANOGRAPHY DETECTED' : 'CLEAN COVER IMAGE'}
                </div>
                <div className="text-xs mt-1 font-mono text-[#B3B3B3]">
                  Confidence: {(selectedRecord.confidence * 100).toFixed(1)}%
                </div>
              </div>

              {/* Data Table */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                  <span className="text-[#777777] block text-[10px] uppercase">Filename</span>
                  <span className="text-white truncate block">{selectedRecord.filename}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                  <span className="text-[#777777] block text-[10px] uppercase">Residual Energy (σr²)</span>
                  <span className="text-white block font-bold">
                    {selectedRecord.residual_energy ? selectedRecord.residual_energy.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                  <span className="text-[#777777] block text-[10px] uppercase">Cover Probability</span>
                  <span className="text-white block">
                    {(selectedRecord.cover_probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
                  <span className="text-[#777777] block text-[10px] uppercase">Stego Probability</span>
                  <span className="text-[#B3B3B3] block">
                    {(selectedRecord.stego_probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Forensic Rationale */}
              {selectedRecord.forensic_explanation && (
                <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] space-y-1">
                  <span className="text-[#777777] font-semibold text-[10px] uppercase block">
                    Forensic Explanation
                  </span>
                  <p className="text-[#B3B3B3] leading-relaxed text-[11px]">
                    {selectedRecord.forensic_explanation}
                  </p>
                </div>
              )}

              {/* SHA-256 Hash */}
              <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929] font-mono text-[11px] text-[#777777] break-all">
                <span className="text-[#B3B3B3] font-semibold block mb-0.5">SHA-256 Chain of Custody:</span>
                {selectedRecord.file_hash}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => handleDownloadArchive(selectedRecord.id)}
                className="flex-1 py-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-[#292929]"
              >
                <Archive className="w-3.5 h-3.5 text-white" />
                <span>Export NIST Archive (.zip)</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
