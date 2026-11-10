import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
  Zap,
  GraduationCap,
  Command,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export default function TelemetryTicker({ onOpenVivaTour, onOpenCommandPalette }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      aria-label="System Telemetry Ticker"
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-md border-t border-gray-800 text-[11px] font-mono select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9 text-gray-400">
        {/* Left Telemetry Group */}
        <div className="flex items-center space-x-3 overflow-x-auto py-1 scrollbar-none">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>PyTorch 2.x Engine Active</span>
          </div>

          <span className="text-gray-700 hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center space-x-1 text-gray-300 shrink-0">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>BOSSbase 1.01: 4k/1k/5k (20,000 PGM)</span>
          </div>

          <span className="text-gray-700 hidden md:inline">|</span>

          <div className="hidden md:flex items-center space-x-1 text-gray-300 shrink-0">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>S-UNIWARD @ 0.4 bpp</span>
          </div>
        </div>

        {/* Right Telemetry & Quick Action Group */}
        <div className="flex items-center space-x-2.5 shrink-0 ml-2">
          <div className="hidden lg:flex items-center space-x-1 text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>ISO/IEC 27037 & NIST SP 800-86</span>
          </div>

          <span className="text-gray-700 hidden lg:inline">|</span>

          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 transition flex items-center gap-1 text-[10px]"
              title="Open Spotlight Command Palette (Ctrl+K)"
            >
              <Command className="w-3 h-3 text-cyan-400" />
              <span>⌘K</span>
            </button>
          )}

          {onOpenVivaTour && (
            <button
              onClick={onOpenVivaTour}
              className="px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/80 hover:border-purple-600 transition flex items-center gap-1 text-[10px]"
              title="Open Examiner Presentation & Viva Guide"
            >
              <GraduationCap className="w-3 h-3 text-purple-300" />
              <span className="hidden sm:inline">Viva Guide</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

