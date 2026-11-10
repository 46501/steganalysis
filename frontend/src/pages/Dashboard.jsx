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
  Sparkles,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';

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
          steganalysisApi.getHistory({ limit: 5, offset: 0 }),
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
          let totalLatency = 0;

          items.forEach((item) => {
            if (item.verdict === 'Stego') stego += 1;
            else cover += 1;
            totalLatency += item.execution_time_ms || 0;
          });

          setStats({
            totalScans: total,
            stegoDetections: stego,
            coverVerified: cover,
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
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-gray-900 via-gray-900 to-cyan-950/40 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Steganalysis Research & Evaluation Center
            </span>
            <span className="text-xs text-gray-400">• BOSSbase 1.01 S-UNIWARD 0.4 bpp</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Digital Image Steganalysis Research Platform
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Academic demonstration platform for digital image steganography (S-UNIWARD @ 0.4 bpp). Features an experimental StegoNet-Lite CPU baseline and full PyTorch SRNet research architecture.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenVivaTour && (
            <button
              onClick={onOpenVivaTour}
              className="flex items-center gap-2 px-4 py-3 bg-purple-950/60 hover:bg-purple-900/70 text-purple-200 border border-purple-500/40 hover:border-purple-300 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-950/30 hover:scale-[1.02]"
              title="Interactive Examiner Viva Presentation & Defense Guide"
            >
              <GraduationCap className="w-4 h-4 text-purple-300" />
              <span>Viva Defense Tour</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('detector')}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-600/25 hover:shadow-cyan-500/35 hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Stego Detector</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="p-5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-gray-700 transition">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Scans</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{stats.totalScans}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-mono">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>{systemHealth?.database?.type || 'Persistent Storage'}</span>
          </div>
        </div>

        {/* Stego Detections */}
        <div className="p-5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-rose-900/40 transition">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Model Flagged (Stego)</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-400 mt-3">{stats.stegoDetections}</div>
          <span className="text-xs text-gray-500 mt-2 block">
            Baseline detections (experimental)
          </span>
        </div>

        {/* Cover Verified */}
        <div className="p-5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-emerald-900/40 transition">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Model Verified (Cover)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-3">{stats.coverVerified}</div>
          <span className="text-xs text-gray-500 mt-2 block">
            Baseline classifications (experimental)
          </span>
        </div>

        {/* Average Latency */}
        <div className="p-5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-purple-900/40 transition">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Inference Speed</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-300 mt-3">
            {stats.avgLatency ? `${stats.avgLatency} ms` : '< 25 ms'}
          </div>
          <span className="text-xs text-gray-500 mt-2 block">
            Real-time CPU execution
          </span>
        </div>
      </div>

      {/* System Infrastructure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Engine Card */}
        <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Active Inference Engine
              </span>
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mt-2">
              {systemHealth?.model?.active_model || 'StegoNet-Lite (Experimental Baseline)'}
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Compact 4-stage residual network engineered for CPU execution and pipeline demonstration. Note: Content-adaptive S-UNIWARD steganography requires deep unpooled architectures (SRNet) for reliable classification.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Model Classification:</span>
              <span className="text-amber-400 font-medium">Experimental Baseline</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Execution Device:</span>
              <span className="text-gray-200 font-mono">PyTorch CPU</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Parameters:</span>
              <span className="text-gray-200 font-mono">~304,220 params</span>
            </div>
          </div>
        </div>

        {/* Dataset Verification Card */}
        <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Validated Dataset
              </span>
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mt-2">
              BOSSbase 1.01 S-UNIWARD
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              10,000 matched cover-stego pairs (20,000 images) fully certified with zero partition leakage and exact ±1 pixel constraints.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Train Partition:</span>
              <span className="text-gray-200 font-mono">4,000 pairs (8,000 imgs)</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Validation Partition:</span>
              <span className="text-gray-200 font-mono">1,000 pairs (2,000 imgs)</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Test Partition:</span>
              <span className="text-gray-200 font-mono">5,000 pairs (10,000 imgs)</span>
            </div>
          </div>
        </div>

        {/* Research Architecture Card */}
        <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Research Architecture
              </span>
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mt-2">
              SRNet (Boroumand et al. 2018)
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Deep 12-layer residual network (39 layers total) published in IEEE TIFS. Features unpooled residual layers (Type 1-2) to preserve subtle ±1 embedding noise. Fully implemented in PyTorch; full GPU cluster training (500k steps, ~360 GPU hrs) is pending.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Architecture Depth:</span>
              <span className="text-purple-300 font-mono">39 Layers (12 Blocks)</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Full GPU Training:</span>
              <span className="text-amber-400 font-mono">500,000 Steps (~360 GPU hrs)</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Implementation Status:</span>
              <span className="text-emerald-400 font-medium">Fully Implemented & Unit-Tested</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Steganalysis Scans</h2>
            <p className="text-xs text-gray-400">Audit trail of recently analyzed images</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentScans.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No scans recorded yet. Upload an image in the Steganalysis Detector to generate live results.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Residual Energy</th>
                  <th className="py-3 px-4">Model Used</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {recentScans.map((scan) => {
                  const isStego = scan.verdict === 'Stego';
                  const dateStr = new Date(scan.created_at).toLocaleTimeString();
                  return (
                    <tr key={scan.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-3 px-4 font-mono text-gray-500">{dateStr}</td>
                      <td className="py-3 px-4 font-medium text-white max-w-[200px] truncate">
                        {scan.filename}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
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
                      <td className="py-3 px-4 font-mono font-semibold">
                        {(scan.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400">
                        {scan.residual_energy ? scan.residual_energy.toFixed(2) : '--'}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {scan.model_name || 'StegoNet-Lite'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-400">
                        {scan.execution_time_ms ? `${scan.execution_time_ms.toFixed(1)} ms` : '--'}
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
