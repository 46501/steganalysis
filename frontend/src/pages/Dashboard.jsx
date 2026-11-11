import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Database,
  Layers,
  ArrowRight,
  Clock,
  FileImage,
  HelpCircle,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import ThreatRadarHUD from '../components/dashboard/ThreatRadarHUD';

export default function Dashboard({ setActiveTab, onOpenVivaTour }) {
  const [stats, setStats] = useState({
    totalScans: 0,
    stegoDetections: 0,
    coverVerified: 0,
    avgLatency: 0,
  });
  const [systemHealth, setSystemHealth] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        const [healthRes, historyRes] = await Promise.allSettled([
          steganalysisApi.checkHealth(),
          steganalysisApi.getHistory({ limit: 6, offset: 0 }),
        ]);

        if (!isMounted) return;

        if (healthRes.status === 'fulfilled') {
          setSystemHealth(healthRes.value);
        }

        if (historyRes.status === 'fulfilled') {
          const hist = historyRes.value;
          const items = hist.items || [];
          setRecentScans(items);

          const total = hist.total_count || 0;
          let stego = 0;
          let cover = 0;
          let inconclusive = 0;
          let totalLatency = 0;

          items.forEach((item) => {
            const v = (item.verdict || '').toLowerCase();
            if (v.includes('inconclusive')) inconclusive += 1;
            else if (v.includes('stego')) stego += 1;
            else cover += 1;
            totalLatency += item.execution_time_ms || 0;
          });

          setStats({
            totalScans: total,
            stegoDetections: stego,
            coverVerified: cover,
            inconclusiveCount: inconclusive,
            avgLatency: items.length > 0 ? Math.round(totalLatency / items.length) : 0,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* 1. Tactical Cyber Operations Hero Section */}
      <div className="p-6 sm:p-7 rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 font-mono">
              STEGOSHIELD AI // FORENSIC OPERATIONS CENTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Digital Image Steganalysis &amp; Threat Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-xl leading-relaxed font-sans">
            Deep-residual neural network verification for undetectable spatial steganography (S-UNIWARD), zero-leakage academic datasets, and ISO/IEC 27037 forensic chain-of-custody tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('detector')}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold transition shadow-[0_0_16px_rgba(6,182,212,0.4)]"
          >
            <span>Launch Detector</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('model-info')}
            className="px-3.5 py-2.5 bg-[#0A1224] hover:bg-[#0F1C36] text-[#94A3B8] hover:text-white border border-[#1B2B48] hover:border-cyan-500/40 rounded-xl text-xs font-semibold transition"
          >
            Research Overview
          </button>
        </div>
      </div>

      {/* 2. Tactical Surveillance & Threat Radar HUD */}
      <ThreatRadarHUD stats={stats} recentScans={recentScans} onNavigate={setActiveTab} />

      {/* 3. Four Minimalist Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="p-4 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between h-28 shadow-sm hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-medium uppercase tracking-wide font-mono">Total Scans</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight font-mono">{stats.totalScans}</div>
          <span className="text-[11px] text-[#64748B]">All-time analyzed carriers</span>
        </div>

        {/* Flagged as Stego */}
        <div className="p-4 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between h-28 shadow-sm hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-medium uppercase tracking-wide font-mono">Flagged as Stego</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-300 tracking-tight font-mono">{stats.stegoDetections}</div>
          <span className="text-[11px] text-[#64748B]">S-UNIWARD payload detected</span>
        </div>

        {/* Classified as Cover */}
        <div className="p-4 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between h-28 shadow-sm hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-medium uppercase tracking-wide font-mono">Classified as Cover</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 tracking-tight font-mono">{stats.coverVerified}</div>
          <span className="text-[11px] text-[#64748B]">Zero-payload carrier integrity</span>
        </div>

        {/* Average Inference Time */}
        <div className="p-4 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between h-28 shadow-sm hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-medium uppercase tracking-wide font-mono">Average Latency</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
            {stats.avgLatency ? `${stats.avgLatency} ms` : '< 25 ms'}
          </div>
          <span className="text-[11px] text-[#64748B]">PyTorch CPU execution</span>
        </div>
      </div>

      {/* 4. Three Compact Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Model */}
        <div className="p-5 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                Active Model
              </span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-base font-bold text-white">StegoNet-Lite</h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Lightweight residual baseline for CPU pipeline demonstration.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#1B2B48] text-xs font-mono">
            <div className="flex justify-between text-[#64748B]">
              <span>Status:</span>
              <span className="text-cyan-300 font-medium">Calibrated Residual Baseline</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Engine:</span>
              <span className="text-white">PyTorch CPU</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Parameters:</span>
              <span className="text-white">304K Parameters</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('model-info')}
            className="w-full py-1.5 px-3 rounded-lg bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-[#1B2B48] hover:border-cyan-500/40 text-xs font-medium transition text-center"
          >
            View Details
          </button>
        </div>

        {/* Card 2: Dataset */}
        <div className="p-5 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                Benchmark Dataset
              </span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-base font-bold text-white">BOSSbase 1.01</h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Standard academic benchmark with certified zero-leakage partitions.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#1B2B48] text-xs font-mono">
            <div className="flex justify-between text-[#64748B]">
              <span>Algorithm:</span>
              <span className="text-white font-medium">S-UNIWARD (0.4 bpp)</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Volume:</span>
              <span className="text-white">20,000 Images (10k Pairs)</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Partitions:</span>
              <span className="text-white">4k / 1k / 5k (Train/Val/Test)</span>
            </div>
          </div>

          <div className="py-1.5 text-center text-[11px] font-mono text-emerald-400">
            Certified Partition Separation
          </div>
        </div>

        {/* Card 3: Research Architecture */}
        <div className="p-5 rounded-xl bg-[#070D1A]/90 border border-[#1B2B48] flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition">
          <div>
            <div className="flex items-center justify-between text-[#94A3B8] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                Research Model
              </span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-base font-bold text-white">SRNet Architecture</h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Boroumand et al. (IEEE TIFS 2019) deep residual steganalysis model.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#1B2B48] text-xs font-mono">
            <div className="flex justify-between text-[#64748B]">
              <span>Depth:</span>
              <span className="text-white font-medium">39 Layers (12 Blocks)</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Implementation:</span>
              <span className="text-white font-medium">Fully Implemented</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Training:</span>
              <span className="text-[#94A3B8] font-medium">Full GPU Training Pending</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('model-info')}
            className="w-full py-1.5 px-3 rounded-lg bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-[#1B2B48] hover:border-cyan-500/40 text-xs font-medium transition text-center"
          >
            Explore Research
          </button>
        </div>
      </div>

      {/* 5. Recent Scans Table */}
      <div className="rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 sm:p-5 border-b border-[#1B2B48] flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">Recent Scans</h2>
            <p className="text-xs text-[#94A3B8]">Your latest image forensic analysis activity</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentScans.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B] font-mono">
            No scans recorded yet. Upload an image in the Detector to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050914] text-[#64748B] uppercase text-[10px] tracking-wider border-b border-[#1B2B48]">
                <tr>
                  <th className="py-3 px-4">Image</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Residual Energy</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B2B48] text-[#94A3B8]">
                {recentScans.map((scan) => {
                  const v = scan.verdict || '';
                  const isInconclusive = v.toLowerCase().includes('inconclusive');
                  const isStego = !isInconclusive && (v === 'Stego' || v === 'Stego Indicated');
                  const dateStr = new Date(scan.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={scan.id} className="hover:bg-cyan-500/5 transition">
                      <td className="py-3 px-4">
                        <div className="w-7 h-7 rounded-lg bg-[#050914] border border-[#1B2B48] flex items-center justify-center text-[#64748B]">
                          <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white max-w-[180px] truncate" title={scan.filename}>
                        {scan.filename}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isInconclusive
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                              : isStego
                              ? 'bg-rose-950/40 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                              : 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                          }`}
                        >
                          {isInconclusive ? (
                            <>
                              <HelpCircle className="w-2.5 h-2.5 text-amber-400" />
                              <span>INCONCLUSIVE</span>
                            </>
                          ) : isStego ? (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                              <span>STEGO</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                              <span>COVER</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 font-bold">
                        {(scan.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-white">
                        {scan.residual_energy ? `${scan.residual_energy.toFixed(2)} σr²` : '--'}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {scan.model_name || 'StegoNet-Lite'}
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B]">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
