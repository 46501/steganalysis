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
  HelpCircle,
  RefreshCw,
  X,
  Hash,
  Clock,
  Layers,
  FileText,
  Archive,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ForensicReportModal from '../components/analysis/ForensicReportModal';

export default function History() {
  const { user, isGuest, openAuthModal } = useAuth();
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
  }, [verdictFilter, user]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1B2B48] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#0A1224] text-cyan-300 border border-cyan-500/30">
              AUDIT TRAIL
            </span>
            <span className="text-xs text-cyan-400 font-mono">• ISO/IEC 27037 Forensic Evidence Persistence</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Scan Archive &amp; Forensic Reports
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 font-sans">
            Historical audit log of examined digital carriers with cryptographic SHA-256 integrity verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            className="p-2.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-[#94A3B8] hover:text-white border border-[#1B2B48] transition"
            title="Refresh Scan List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition ${
              records.length === 0
                ? 'bg-[#050914] text-[#64748B] border-[#1B2B48] cursor-not-allowed'
                : 'bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={records.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
              records.length === 0
                ? 'bg-[#050914] text-[#64748B] border-[#1B2B48] cursor-not-allowed'
                : 'bg-transparent hover:bg-rose-950/30 text-[#64748B] hover:text-rose-300 border border-[#1B2B48] hover:border-rose-500/40'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* User Workspace Isolation Status Banner */}
      {isGuest ? (
        <div className="p-3.5 rounded-xl bg-[#091020] border border-[#17253E] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <span>
              Browsing in <strong className="text-white">Guest Mode</strong>. Scan records are temporary and not linked to an authenticated investigator.
            </span>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 shrink-0 self-start sm:self-auto"
          >
            Sign In to Isolate Portfolio →
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Forensic evidence archive isolated for <strong className="text-white">{user.full_name}</strong> ({user.email}).
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40">
            CRYPTOGRAPHIC AUDIT TRAIL
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or SHA-256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050914] border border-[#1B2B48] rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-white placeholder-[#64748B] focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-[#64748B] flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            Filter:
          </span>
          {[
            { key: '', label: 'All Scans' },
            { key: 'Inconclusive', label: 'Inconclusive' },
            { key: 'Cover', label: 'Cover Indicated' },
            { key: 'Stego', label: 'Stego Indicated' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setVerdictFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition ${
                verdictFilter === key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                  : 'bg-[#0A1224] text-[#94A3B8] hover:text-white border border-[#1B2B48]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="border border-[#1B2B48] rounded-2xl overflow-hidden bg-[#070D1A]/95 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        {filteredRecords.length === 0 ? (
          <div className="p-16 text-center text-sm text-[#64748B]">
            <HistoryIcon className="w-12 h-12 text-[#1B2B48] mx-auto mb-3" />
            <p className="font-bold text-white text-base">No scan records found</p>
            <p className="text-xs text-[#94A3B8] mt-1 font-mono">
              Upload images in the Steganalysis Detector to generate persistent audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050914] text-[#64748B] uppercase tracking-wider font-semibold border-b border-[#1B2B48]">
                <tr>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
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
              <tbody className="divide-y divide-[#1B2B48] text-[#94A3B8]">
                {filteredRecords.map((r) => {
                  const v = r.verdict || '';
                  const isInconclusive = v.toLowerCase().includes('inconclusive');
                  const isStego = !isInconclusive && (v === 'Stego' || v === 'Stego Indicated');
                  const isCover = !isInconclusive && (v === 'Cover' || v === 'Cover Indicated');
                  const dateStr = new Date(r.created_at).toLocaleString();
                  return (
                    <tr key={r.id} className="hover:bg-cyan-500/5 transition">
                      <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white max-w-[220px] truncate" title={r.filename}>
                        {r.filename}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isInconclusive
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                              : isStego
                              ? 'bg-rose-950/40 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                              : 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                          }`}
                        >
                          {isInconclusive ? (
                            <>
                              <HelpCircle className="w-3 h-3 text-amber-400" />
                              <span>INCONCLUSIVE</span>
                            </>
                          ) : isStego ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>STEGO</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3 text-cyan-400" />
                              <span>COVER</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#94A3B8]">
                        {(r.stego_probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-white font-bold">
                        {r.residual_energy ? `${r.residual_energy.toFixed(2)} σr²` : '--'}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        {r.model_name || 'StegoNet-Lite'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                        {r.execution_time_ms ? `${r.execution_time_ms.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadArchive(r.id)}
                            className="p-1.5 rounded-lg bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 hover:text-white border border-[#1B2B48] hover:border-cyan-500/40 transition"
                            title="Download NIST/ISO-27037 Evidence Package (.zip)"
                          >
                            <Archive className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="p-1.5 rounded-lg bg-[#0A1224] hover:bg-[#0F1C36] text-[#94A3B8] hover:text-white border border-[#1B2B48] hover:border-cyan-500/40 transition"
                            title="Inspect ISO/IEC 27037 Certificate"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg bg-[#0A1224] hover:bg-rose-950/40 text-[#64748B] hover:text-rose-400 border border-[#1B2B48] hover:border-rose-500/40 transition"
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

      {/* Official ISO/IEC 27037 & NIST SP 800-86 Forensic Certificate Modal */}
      {selectedRecord && (
        <ForensicReportModal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          reportData={selectedRecord}
          previewUrl={selectedRecord.image_preview_b64 || selectedRecord.diff_map_b64 || '/samples/sample_cover.png'}
        />
      )}
    </div>
  );
}
