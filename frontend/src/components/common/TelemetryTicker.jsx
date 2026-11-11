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
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#090909]/95 backdrop-blur-md border-t border-[#292929] text-[11px] font-mono select-none theme-dark-nav"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9 text-[#777777]">
        {/* Left Telemetry Group */}
        <div className="flex items-center space-x-3 overflow-x-auto py-1 scrollbar-none">
          <div className="flex items-center space-x-1.5 text-white font-semibold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>PyTorch 2.x Engine Active</span>
          </div>

          <span className="text-[#383838] hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center space-x-1 text-[#B3B3B3] shrink-0">
            <Database className="w-3 h-3 text-white" />
            <span>BOSSbase 1.01: 4k/1k/5k (20,000 PGM)</span>
          </div>

          <span className="text-[#383838] hidden md:inline">|</span>

          <div className="hidden md:flex items-center space-x-1 text-[#B3B3B3] shrink-0">
            <Lock className="w-3 h-3 text-white" />
            <span>S-UNIWARD @ 0.4 bpp</span>
          </div>
        </div>

        {/* Right Telemetry & Quick Action Group */}
        <div className="flex items-center space-x-2.5 shrink-0 ml-2">
          <div className="hidden lg:flex items-center space-x-1 text-[#777777]">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>ISO/IEC 27037 & NIST SP 800-86</span>
          </div>

          <span className="text-[#383838] hidden lg:inline">|</span>

          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="px-2 py-0.5 rounded bg-[#151515] hover:bg-[#242424] text-[#B3B3B3] hover:text-white border border-[#292929] transition flex items-center gap-1 text-[10px]"
              title="Open Spotlight Command Palette (Ctrl+K)"
            >
              <Command className="w-3 h-3 text-white" />
              <span>⌘K</span>
            </button>
          )}

          {onOpenVivaTour && (
            <button
              onClick={onOpenVivaTour}
              className="px-2 py-0.5 rounded bg-[#151515] hover:bg-[#242424] text-[#B3B3B3] hover:text-white border border-[#292929] transition flex items-center gap-1 text-[10px]"
              title="Open Examiner Presentation & Viva Guide"
            >
              <GraduationCap className="w-3 h-3 text-white" />
              <span className="hidden sm:inline">Viva Guide</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
