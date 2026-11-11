import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Eye,
  CheckCircle2,
  RefreshCw,
  Zap,
  Terminal,
} from 'lucide-react';

export default function ForensicScanningHUD({ filename, modelChoice }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const steps = [
    {
      label: 'Spatial 3×3 Laplacian Residual Kernel',
      detail: 'Extracting directional high-pass noise variance σr²',
      icon: Activity,
    },
    {
      label: '2nd-Order SPAM Markov Transitions',
      detail: 'Evaluating horizontal & vertical transition probability matrix',
      icon: Eye,
    },
    {
      label: '2D FFT Power Spectrum Decomposition',
      detail: 'Computing radial high-frequency energy ratio and entropy delta',
      icon: Zap,
    },
    {
      label: 'Deep Residual Network Tensor Forward Pass',
      detail: `Evaluating logits via ${modelChoice === 'srnet' ? 'SRNet (GPU Architecture)' : 'StegoNet-Lite (Calibrated Baseline)'}`,
      icon: Cpu,
    },
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 40);

    const stepTimer1 = setTimeout(() => setCurrentStep(1), 320);
    const stepTimer2 = setTimeout(() => setCurrentStep(2), 680);
    const stepTimer3 = setTimeout(() => setCurrentStep(3), 1050);

    return () => {
      clearInterval(interval);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    };
  }, []);

  return (
    <div className="py-6 px-4 space-y-6 animate-fadeIn">
      {/* Top Cyber Radar & Execution Timer */}
      <div className="text-center space-y-3">
        <div className="relative w-16 h-16 mx-auto">
          {/* Pulsing cyber ring */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping"></div>
          {/* Rotating cyan radar line */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-950 border-t-cyan-400 animate-spin shadow-[0_0_12px_rgba(6,182,212,0.4)]"></div>
          <div className="absolute inset-2 rounded-full border border-[#1B2B48] bg-[#070C18] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Forensic Neural Sequencer Active</span>
          </h4>
          <p className="text-[11px] font-mono text-cyan-400/90 mt-1">
            PyTorch Forward Pass: <span className="font-bold text-white">{elapsedMs} ms</span>
          </p>
        </div>
      </div>

      {/* Sequencer Pipeline Steps */}
      <div className="space-y-2.5 max-w-sm mx-auto">
        {steps.map((st, idx) => {
          const isDone = currentStep > idx;
          const isCurrent = currentStep === idx;
          const Icon = st.icon;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-xs transition-all duration-300 flex items-center gap-3 ${
                isDone
                  ? 'bg-[#0B1528] border-cyan-500/30 text-cyan-200'
                  : isCurrent
                  ? 'bg-gradient-to-r from-cyan-950/80 to-cyan-900/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] scale-[1.01]'
                  : 'bg-[#070D1A] border-[#1B2B48] text-[#64748B] opacity-60'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]" />
                ) : isCurrent ? (
                  <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#1B2B48] flex items-center justify-center text-[9px] font-mono text-[#64748B]">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate text-[11px] text-white">{st.label}</div>
                <div className="text-[10px] truncate font-mono text-cyan-300/80">{st.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Carrier Monospace Telemetry Box */}
      <div className="p-3 rounded-xl bg-[#070D1A] border border-[#1B2B48] text-[10px] font-mono text-[#94A3B8] space-y-1 max-w-sm mx-auto">
        <div className="flex items-center justify-between text-cyan-400/90 font-semibold border-b border-[#1B2B48] pb-1">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            <span>STREAM LOGS</span>
          </span>
          <span>512×512 TENSOR</span>
        </div>
        <div className="truncate text-cyan-200">
          Carrier: {filename || 'Target Image Buffer'}
        </div>
        <div className="text-[#64748B] flex items-center justify-between">
          <span>Decision Logic: 3-State Calibrated</span>
          <span className="text-cyan-400">σr² Evaluator: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
