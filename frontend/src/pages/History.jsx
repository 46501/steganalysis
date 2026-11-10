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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Audit Logs
            </span>
            <span className="text-xs text-gray-400">• Forensic Persistence</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Scan Archive & Reports
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Historical audit log of processed digital images with forensic hash verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            title="Refresh Scan List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              records.length === 0
                ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={records.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              records.length === 0
                ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                : 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border-rose-800/40'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gray-900/70 border border-gray-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or SHA-256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950/80 border border-gray-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filter:
          </span>
          {['', 'Cover', 'Stego'].map((type) => (
            <button
              key={type}
              onClick={() => setVerdictFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                verdictFilter === type
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-gray-800/60 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {type === '' ? 'All Scans' : type === 'Cover' ? 'Covers Clean' : 'Stego Payloads'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/40 shadow-xl">
        {filteredRecords.length === 0 ? (
          <div className="p-16 text-center text-sm text-gray-500">
            <HistoryIcon className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-60" />
            <p className="font-medium text-gray-400">No scan records found</p>
            <p className="text-xs text-gray-500 mt-1">
              Upload images in the Steganalysis Detector to generate persistent audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/70 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
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
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {filteredRecords.map((r) => {
                  const isStego = r.verdict === 'Stego';
                  const dateStr = new Date(r.created_at).toLocaleString();
                  return (
                    <tr key={r.id} className="hover:bg-gray-800/30 transition">
                      <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-[220px] truncate" title={r.filename}>
                        {r.filename}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            isStego
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isStego ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>STEGO</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>COVER</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {(r.stego_probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400">
                        {r.residual_energy ? r.residual_energy.toFixed(2) : '--'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {r.model_name || 'StegoNet-Lite'}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                        {r.execution_time_ms ? `${r.execution_time_ms.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadArchive(r.id)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition"
                            title="Download NIST/ISO-27037 Evidence Package (.zip)"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Scan Forensic Report</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-xl text-center border ${
                  selectedRecord.verdict === 'Stego'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <div className="text-xl font-bold">
                  {selectedRecord.verdict === 'Stego' ? 'STEGANOGRAPHY DETECTED' : 'CLEAN COVER IMAGE'}
                </div>
                <div className="text-xs mt-1 font-mono">
                  Confidence: {(selectedRecord.confidence * 100).toFixed(1)}%
                </div>
              </div>

              {/* Data Table */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                  <span className="text-gray-500 block text-[10px] uppercase">Filename</span>
                  <span className="text-white truncate block">{selectedRecord.filename}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                  <span className="text-gray-500 block text-[10px] uppercase">Residual Energy (σr²)</span>
                  <span className="text-cyan-400 block font-bold">
                    {selectedRecord.residual_energy ? selectedRecord.residual_energy.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                  <span className="text-gray-500 block text-[10px] uppercase">Cover Probability</span>
                  <span className="text-emerald-400 block">
                    {(selectedRecord.cover_probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                  <span className="text-gray-500 block text-[10px] uppercase">Stego Probability</span>
                  <span className="text-rose-400 block">
                    {(selectedRecord.stego_probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Forensic Rationale */}
              {selectedRecord.forensic_explanation && (
                <div className="p-3.5 rounded-xl bg-gray-950/80 border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-semibold text-[10px] uppercase block">
                    Forensic Explanation
                  </span>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    {selectedRecord.forensic_explanation}
                  </p>
                </div>
              )}

              {/* SHA-256 Hash */}
              <div className="p-2.5 rounded-lg bg-gray-950/50 border border-gray-800 font-mono text-[11px] text-gray-500 break-all">
                <span className="text-gray-400 font-semibold block mb-0.5">SHA-256 Chain of Custody:</span>
                {selectedRecord.file_hash}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => handleDownloadArchive(selectedRecord.id)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Export NIST Archive (.zip)</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-xs transition"
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
