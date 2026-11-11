import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Eye,
  CheckCircle2,
  RefreshCw,
  Zap,
  ShieldAlert,
  Hash,
} from 'lucide-react';

export default function ForensicScanningHUD({ filename, modelChoice }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const steps = [
    {
      label: 'Spatial 3×3 Laplacian Residual Kernel',
      detail: 'Extracting directional noise variance σr²',
      icon: Activity,
    },
    {
      label: '2nd-Order SPAM Markov Transitions',
      detail: 'Evaluating horizontal/vertical transition probability matrix',
      icon: Eye,
    },
    {
      label: '2D FFT Power Spectrum Decomposition',
      detail: 'Computing radial high-frequency energy ratio and entropy',
      icon: Zap,
    },
    {
      label: 'Deep Residual Network Tensor Forward Pass',
      detail: `Evaluating logits via ${modelChoice === 'srnet' ? 'SRNet (GPU Architecture)' : 'StegoNet-Lite (Experimental Baseline)'}`,
      icon: Cpu,
    },
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);

    const stepTimer1 = setTimeout(() => setCurrentStep(1), 350);
    const stepTimer2 = setTimeout(() => setCurrentStep(2), 750);
    const stepTimer3 = setTimeout(() => setCurrentStep(3), 1150);

    return () => {
      clearInterval(interval);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    };
  }, []);

  return (
    <div className="py-6 px-4 space-y-6 animate-fadeIn">
      {/* Top Radar & Timer */}
      <div className="text-center space-y-3">
        <div className="relative w-16 h-16 mx-auto">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border border-white/20 animate-ping"></div>
          {/* Rotating radar line */}
          <div className="absolute inset-0 rounded-full border-2 border-[#383838] border-t-white animate-spin"></div>
          <div className="absolute inset-2 rounded-full border border-[#292929] bg-[#111111] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            Forensic Inspection Sequencer Active
          </h4>
          <p className="text-[11px] font-mono text-[#B3B3B3] mt-0.5">
            PyTorch Execution Timer: {elapsedMs} ms
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
                  ? 'bg-[#151515] border-[#383838] text-white'
                  : isCurrent
                  ? 'bg-[#242424] border-white/80 text-white shadow-md scale-[1.01]'
                  : 'bg-[#111111] border-[#222222] text-[#777777] opacity-60'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[#383838] flex items-center justify-center text-[9px] font-mono text-[#777777]">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate text-[11px]">{st.label}</div>
                <div className="text-[10px] opacity-75 truncate font-mono text-[#B3B3B3]">{st.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Carrier Telemetry Pill */}
      {filename && (
        <div className="p-2.5 rounded-xl bg-[#111111] border border-[#292929] text-[10px] font-mono text-[#777777] flex items-center justify-between">
          <span className="truncate max-w-[200px]">Carrier: {filename}</span>
          <span className="text-white">Target Size: 512×512</span>
        </div>
      )}
    </div>
  );
}

