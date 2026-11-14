import React from 'react';
import { Sparkles, Info, ShieldAlert, Cpu } from 'lucide-react';
import SUniwardStressSimulator from '../analysis/SUniwardStressSimulator';

export default function SuniwardSimulatorWorkspace({ originalImageB64 }) {
  const imgSrc = originalImageB64 || '/samples/sample_cover.png';

  return (
    <div className="space-y-4">
      {/* Informative Workspace Header */}
      <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Adaptive Evasion & Wavelet Distortion Simulator
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
            Content-adaptive steganography (S-UNIWARD) places modifications preferentially in complex, noisy textures where wavelet directional filter costs are minimized. Use this simulator to benchmark detection probabilities and residual noise energy across varying payload capacities (bpp).
          </p>
        </div>

        <div className="shrink-0 p-2.5 rounded-xl bg-[#050914] border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
          <span className="text-[#64748B] block text-[9px] uppercase">Calibration Baseline</span>
          <strong>BOSSbase 1.01 Spatial Standard</strong>
        </div>
      </div>

      {/* Embedded S-UNIWARD Simulator */}
      <div className="rounded-2xl overflow-hidden">
        <SUniwardStressSimulator originalImageSrc={imgSrc} />
      </div>
    </div>
  );
}

