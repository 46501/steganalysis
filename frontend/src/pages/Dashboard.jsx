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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Compact Monochrome Hero Section */}
      <div className="p-6 sm:p-7 rounded-xl bg-[#090909] border border-[#292929] flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] font-mono">
            Image Forensics Platform
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Digital Image Steganalysis
          </h1>
          <p className="text-xs sm:text-sm text-[#B3B3B3] max-w-xl leading-relaxed">
            Analyze digital images for hidden steganographic content using experimental deep learning and forensic analysis tools.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('detector')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#E5E5E5] text-black rounded-lg text-xs font-semibold transition theme-btn-primary"
          >
            <span>Launch Detector</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('model-info')}
            className="px-3.5 py-2.5 bg-transparent hover:bg-[#151515] text-[#B3B3B3] hover:text-white border border-[#292929] hover:border-[#383838] rounded-lg text-xs font-medium transition"
          >
            Research Overview
          </button>
        </div>
      </div>

      {/* 2. Four Minimalist Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="p-4 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between h-28">
          <div className="flex items-center justify-between text-[#777777]">
            <span className="text-xs font-medium uppercase tracking-wide">Total Scans</span>
            <Activity className="w-4 h-4 text-[#B3B3B3]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.totalScans}</div>
          <span className="text-[11px] text-[#555555]">All-time analyzed carriers</span>
        </div>

        {/* Flagged as Stego */}
        <div className="p-4 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between h-28">
          <div className="flex items-center justify-between text-[#777777]">
            <span className="text-xs font-medium uppercase tracking-wide">Flagged as Stego</span>
            <AlertTriangle className="w-4 h-4 text-[#B3B3B3]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.stegoDetections}</div>
          <span className="text-[11px] text-[#555555]">Experimental model classification</span>
        </div>

        {/* Classified as Cover */}
        <div className="p-4 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between h-28">
          <div className="flex items-center justify-between text-[#777777]">
            <span className="text-xs font-medium uppercase tracking-wide">Classified as Cover</span>
            <ShieldCheck className="w-4 h-4 text-[#B3B3B3]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.coverVerified}</div>
          <span className="text-[11px] text-[#555555]">Experimental model classification</span>
        </div>

        {/* Average Inference Time */}
        <div className="p-4 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between h-28">
          <div className="flex items-center justify-between text-[#777777]">
            <span className="text-xs font-medium uppercase tracking-wide">Average Inference Time</span>
            <Clock className="w-4 h-4 text-[#B3B3B3]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {stats.avgLatency ? `${stats.avgLatency} ms` : '< 25 ms'}
          </div>
          <span className="text-[11px] text-[#555555]">PyTorch CPU execution</span>
        </div>
      </div>

      {/* 3. Three Compact Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Model */}
        <div className="p-5 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-[#777777] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B3B3B3] font-mono">
                Active Model
              </span>
              <Cpu className="w-4 h-4 text-[#777777]" />
            </div>
            <h2 className="text-base font-bold text-white">StegoNet-Lite</h2>
            <p className="text-xs text-[#777777] mt-1">
              Lightweight residual baseline for CPU pipeline demonstration.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#292929] text-xs font-mono">
            <div className="flex justify-between text-[#777777]">
              <span>Status:</span>
              <span className="text-[#B3B3B3] font-medium">Experimental Baseline</span>
            </div>
            <div className="flex justify-between text-[#777777]">
              <span>Engine:</span>
              <span className="text-white">PyTorch CPU</span>
            </div>
            <div className="flex justify-between text-[#777777]">
              <span>Parameters:</span>
              <span className="text-white">304K Parameters</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('model-info')}
            className="w-full py-1.5 px-3 rounded-lg bg-[#151515] hover:bg-[#242424] text-white border border-[#292929] hover:border-[#383838] text-xs font-medium transition text-center"
          >
            View Details
          </button>
        </div>

        {/* Card 2: Dataset */}
        <div className="p-5 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-[#777777] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B3B3B3] font-mono">
                Benchmark Dataset
              </span>
              <Database className="w-4 h-4 text-[#777777]" />
            </div>
            <h2 className="text-base font-bold text-white">BOSSbase 1.01</h2>
            <p className="text-xs text-[#777777] mt-1">
              Standard academic benchmark with certified zero-leakage partitions.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#292929] text-xs font-mono">
            <div className="flex justify-between text-[#777777]">
              <span>Algorithm:</span>
              <span className="text-white font-medium">S-UNIWARD (0.4 bpp)</span>
            </div>
            <div className="flex justify-between text-[#777777]">
              <span>Volume:</span>
              <span className="text-white">20,000 Images (10k Pairs)</span>
            </div>
            <div className="flex justify-between text-[#777777]">
              <span>Partitions:</span>
              <span className="text-white">4k / 1k / 5k (Train/Val/Test)</span>
            </div>
          </div>

          <div className="py-1.5 text-center text-[11px] font-mono text-[#555555]">
            Certified Partition Separation
          </div>
        </div>

        {/* Card 3: Research Architecture */}
        <div className="p-5 rounded-xl bg-[#090909] border border-[#292929] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-[#777777] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B3B3B3] font-mono">
                Research Model
              </span>
              <Layers className="w-4 h-4 text-[#777777]" />
            </div>
            <h2 className="text-base font-bold text-white">SRNet Architecture</h2>
            <p className="text-xs text-[#777777] mt-1">
              Boroumand et al. (IEEE TIFS 2019) deep residual steganalysis model.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#292929] text-xs font-mono">
            <div className="flex justify-between text-[#777777]">
              <span>Depth:</span>
              <span className="text-white font-medium">39 Layers (12 Blocks)</span>
            </div>
            <div className="flex justify-between text-[#777777]">
              <span>Implementation:</span>
              <span className="text-white font-medium">Fully Implemented</span>
            </div>
            <div className="flex justify-between text-[#777777]">
              <span>Training:</span>
              <span className="text-[#B3B3B3] font-medium">Full GPU Training Pending</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('model-info')}
            className="w-full py-1.5 px-3 rounded-lg bg-[#151515] hover:bg-[#242424] text-white border border-[#292929] hover:border-[#383838] text-xs font-medium transition text-center"
          >
            Explore Research
          </button>
        </div>
      </div>

      {/* 4. Recent Scans Table */}
      <div className="rounded-xl bg-[#090909] border border-[#292929] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#292929] flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Recent Scans</h2>
            <p className="text-xs text-[#777777]">Your latest image analysis activity</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs text-white hover:text-[#B3B3B3] flex items-center gap-1 font-medium transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentScans.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#555555] font-mono">
            No scans recorded yet. Upload an image in the Detector to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111111] text-[#777777] uppercase text-[10px] tracking-wider border-b border-[#292929]">
                <tr>
                  <th className="py-2.5 px-4">Image</th>
                  <th className="py-2.5 px-4">Filename</th>
                  <th className="py-2.5 px-4">Verdict</th>
                  <th className="py-2.5 px-4">Confidence</th>
                  <th className="py-2.5 px-4">Residual Energy</th>
                  <th className="py-2.5 px-4">Model</th>
                  <th className="py-2.5 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929] text-[#B3B3B3]">
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
                    <tr key={scan.id} className="hover:bg-[#151515] transition">
                      <td className="py-2.5 px-4">
                        <div className="w-7 h-7 rounded bg-[#1C1C1C] border border-[#292929] flex items-center justify-center text-[#777777]">
                          <FileImage className="w-3.5 h-3.5" />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-white max-w-[180px] truncate" title={scan.filename}>
                        {scan.filename}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            isInconclusive
                              ? 'bg-[#1C1C1C] text-[#B3B3B3] border border-[#333333]'
                              : isStego
                              ? 'bg-[#242424] text-white border border-[#383838]'
                              : 'bg-[#151515] text-[#B3B3B3] border border-[#292929]'
                          }`}
                        >
                          {isInconclusive ? (
                            <>
                              <HelpCircle className="w-2.5 h-2.5 text-[#777777]" />
                              <span>INCONCLUSIVE</span>
                            </>
                          ) : isStego ? (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5 text-white" />
                              <span>STEGO</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-2.5 h-2.5 text-[#B3B3B3]" />
                              <span>COVER</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-white">
                        {(scan.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 font-mono text-white">
                        {scan.residual_energy ? `${scan.residual_energy.toFixed(2)} σr²` : '--'}
                      </td>
                      <td className="py-2.5 px-4 text-[#777777]">
                        {scan.model_name || 'StegoNet-Lite'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#777777]">
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
