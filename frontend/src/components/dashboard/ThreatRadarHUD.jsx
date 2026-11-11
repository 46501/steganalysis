import React, { useState, useMemo } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Crosshair,
  Radio,
  Cpu,
  Lock,
  Layers,
  Terminal,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { playRadarPing, playCyberClick } from '../../utils/cyberSoundEffects';

export default function ThreatRadarHUD({ stats = {}, recentScans = [], onNavigate }) {
  const [selectedBlip, setSelectedBlip] = useState(null);
  const [radarFilter, setRadarFilter] = useState('all'); // 'all' | 'stego' | 'cover' | 'inconclusive'

  // Map recent scans to radar coordinates (polar: angle and radius)
  const blips = useMemo(() => {
    if (!recentScans || recentScans.length === 0) {
      // Calibrated baseline benchmark targets if no scans yet
      return [
        {
          id: 'bench-1',
          name: 'benchmark_stego_5001_0.4bpp.pgm',
          type: 'stego',
          confidence: 0.942,
          energy: 853.7,
          angle: 45,
          dist: 78,
          timestamp: 'Live Active',
          model: 'StegoNet-Lite',
        },
        {
          id: 'bench-2',
          name: 'benchmark_cover_5001.pgm',
          type: 'cover',
          confidence: 0.884,
          energy: 851.8,
          angle: 140,
          dist: 35,
          timestamp: 'Live Active',
          model: 'StegoNet-Lite',
        },
        {
          id: 'bench-3',
          name: 'uniform_gray_baseline.png',
          type: 'inconclusive',
          confidence: 0.52,
          energy: 258.0,
          angle: 260,
          dist: 55,
          timestamp: 'Live Active',
          model: 'StegoNet-Lite',
        },
        {
          id: 'bench-4',
          name: 'benchmark_stego_5002_0.4bpp.pgm',
          type: 'stego',
          confidence: 0.915,
          energy: 46.6,
          angle: 315,
          dist: 82,
          timestamp: 'Live Active',
          model: 'StegoNet-Lite',
        },
      ];
    }

    return recentScans.slice(0, 8).map((scan, idx) => {
      const v = (scan.verdict || '').toLowerCase();
      let type = 'cover';
      if (v.includes('inconclusive')) type = 'inconclusive';
      else if (v.includes('stego')) type = 'stego';

      // Distribute evenly around 360 degrees with pseudo-deterministic radius based on energy & confidence
      const angle = (idx * (360 / Math.max(recentScans.length, 6)) + 25) % 360;
      const dist = type === 'stego' ? 65 + (idx % 3) * 8 : type === 'cover' ? 25 + (idx % 3) * 10 : 45 + (idx % 2) * 10;

      return {
        id: scan.id || `scan-${idx}`,
        name: scan.filename || `carrier_${idx + 1}.png`,
        type,
        confidence: scan.confidence || 0.5,
        energy: scan.residual_energy || 0,
        angle,
        dist,
        timestamp: new Date(scan.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: scan.model_name || 'StegoNet-Lite',
      };
    });
  }, [recentScans]);

  const filteredBlips = useMemo(() => {
    if (radarFilter === 'all') return blips;
    return blips.filter((b) => b.type === radarFilter);
  }, [blips, radarFilter]);

  const activeTarget = selectedBlip || filteredBlips[0] || null;

  return (
    <div className="rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] p-5 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-6">
      {/* Top Banner: Cyber Operations Title & Telemetry Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#1B2B48]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-cyan-400">
              TACTICAL SURVEILLANCE &amp; THREAT RADAR
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A1224] text-[#94A3B8] border border-[#1B2B48]">
              SRM-30 SPATIAL FILTER BANK
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Steganographic Activity Radar
          </h2>
          <p className="text-xs text-[#94A3B8] max-w-2xl font-mono">
            Real-time polar projection of incoming image carriers, residual noise energy distribution, and S-UNIWARD payload detection boundaries.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050914] border border-[#1B2B48] text-xs font-mono">
          <button
            onClick={() => {
              playCyberClick();
              setRadarFilter('all');
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              radarFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            All ({blips.length})
          </button>
          <button
            onClick={() => {
              playCyberClick();
              setRadarFilter('stego');
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              radarFilter === 'stego'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Stego ({blips.filter((b) => b.type === 'stego').length})
          </button>
          <button
            onClick={() => {
              playCyberClick();
              setRadarFilter('cover');
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              radarFilter === 'cover'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Cover ({blips.filter((b) => b.type === 'cover').length})
          </button>
        </div>
      </div>

      {/* Main Radar Screen & Cyber Operations Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Interactive Radar Canvas (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[360px] aspect-square rounded-full border-2 border-cyan-500/30 bg-[#030611] p-3 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden select-none">
            {/* Concentric Range Rings */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 m-6 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 m-16 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/25 m-28 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-cyan-500/15 m-38 pointer-events-none"></div>

            {/* Crosshair Axes */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-cyan-500/30 pointer-events-none"></div>
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-cyan-500/30 pointer-events-none"></div>

            {/* Degree Markers */}
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400 font-bold">000°</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400 font-bold">180°</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-cyan-400 font-bold">270°</span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-cyan-400 font-bold">090°</span>

            {/* Continuous Rotating Radar Sweep Vector */}
            <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none"></div>

            {/* Center Core Shield Node */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-[#070D1A] border border-cyan-400/60 shadow-[0_0_16px_#00F0FF] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            {/* Target Blips */}
            {filteredBlips.map((blip) => {
              // Convert polar (angle in deg, dist in %) to cartesian percentages relative to 50% center
              const rad = ((blip.angle - 90) * Math.PI) / 180;
              const radiusPercent = (blip.dist / 100) * 44; // max radius is 44% to stay inside ring
              const leftPercent = 50 + radiusPercent * Math.cos(rad);
              const topPercent = 50 + radiusPercent * Math.sin(rad);

              const isSelected = activeTarget && activeTarget.id === blip.id;
              const isStego = blip.type === 'stego';
              const isInconclusive = blip.type === 'inconclusive';

              return (
                <button
                  key={blip.id}
                  onClick={() => {
                    playRadarPing();
                    setSelectedBlip(blip);
                  }}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute group z-10 transition-transform duration-150 hover:scale-125 focus:outline-none`}
                  title={`${blip.name} (${blip.type.toUpperCase()})`}
                >
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${
                        isStego ? 'bg-rose-500' : isInconclusive ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isStego
                          ? 'bg-rose-500 shadow-[0_0_8px_#F43F5E]'
                          : isInconclusive
                          ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B]'
                          : 'bg-cyan-400 shadow-[0_0_8px_#00F0FF]'
                      } ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#070D1A]' : ''}`}
                    ></span>
                  </span>

                  {/* Tooltip on Hover */}
                  <span className="hidden group-hover:block absolute left-4 -top-3 px-2 py-0.5 rounded bg-[#050914] border border-cyan-500/40 text-[10px] font-mono text-cyan-200 whitespace-nowrap shadow-lg pointer-events-none z-20">
                    {blip.name.slice(0, 16)}... [{blip.type.toUpperCase()}]
                  </span>
                </button>
              );
            })}
          </div>

          {/* Radar Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-[#94A3B8] mt-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
              <span className="text-rose-400 font-semibold">Stego Payload Detected</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]"></span>
              <span className="text-cyan-400 font-semibold">Cover Verified</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
              <span className="text-amber-400 font-semibold">Inconclusive Baseline</span>
            </span>
          </div>
        </div>

        {/* Right Column: Live Telemetry & Security Protocols (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Active Target Locked Card */}
          {activeTarget && (
            <div className="p-4 rounded-xl bg-[#050914] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1B2B48] pb-2">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>TARGET LOCK TELEMETRY</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    activeTarget.type === 'stego'
                      ? 'bg-rose-950/70 border border-rose-500/50 text-rose-300'
                      : activeTarget.type === 'inconclusive'
                      ? 'bg-amber-950/70 border border-amber-500/50 text-amber-300'
                      : 'bg-cyan-950/70 border border-cyan-500/50 text-cyan-300'
                  }`}
                >
                  {activeTarget.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-[#64748B] block">Carrier Identifier:</span>
                  <span className="text-white font-medium truncate block" title={activeTarget.name}>
                    {activeTarget.name}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Timestamp:</span>
                  <span className="text-white font-medium">{activeTarget.timestamp}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Model Probability:</span>
                  <span className="text-cyan-300 font-bold">{(activeTarget.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Residual Energy σr²:</span>
                  <span className="text-cyan-300 font-bold">{activeTarget.energy ? `${activeTarget.energy.toFixed(2)}` : 'Baseline'}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Polar Coordinates:</span>
                  <span className="text-white">{activeTarget.angle}° @ {activeTarget.dist}% Range</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Inference Engine:</span>
                  <span className="text-white">{activeTarget.model}</span>
                </div>
              </div>
            </div>
          )}

          {/* Security Protocols & Verification Matrix */}
          <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[#94A3B8] border-b border-[#1B2B48] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>ACTIVE SECURITY PROTOCOLS</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-200">StegoNet-Lite Engine</span>
                </div>
                <span className="text-cyan-300 font-bold">304K PARAMS / CALIBRATED</span>
              </div>

              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-slate-200">S-UNIWARD Cost Map</span>
                </div>
                <span className="text-rose-300 font-bold">WAVELET DECOMPOSITION</span>
              </div>

              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-200">ISO/IEC 27037 Evidence Audit</span>
                </div>
                <span className="text-emerald-300 font-bold">SHA-256 VERIFIED</span>
              </div>

              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-200">Three-State Scientific Triage</span>
                </div>
                <span className="text-amber-300 font-bold">GUARDRAIL [0.45 - 0.55]</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate && onNavigate('detector')}
                className="p-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <span>Live Detector</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate && onNavigate('lab')}
                className="p-2 rounded-lg bg-[#070D1A] hover:bg-[#0A1224] border border-[#1B2B48] hover:border-cyan-500/40 text-[#94A3B8] hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <span>Forensics Lab</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

