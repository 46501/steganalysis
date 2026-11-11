import React from 'react';
import { Menu, Search, Sparkles, ShieldCheck, Activity } from 'lucide-react';

export default function TopHeader({
  activeTab,
  setMobileOpen,
  onOpenVivaTour,
  onOpenCommandPalette,
}) {
  const getTabTitle = (tab) => {
    switch (tab) {
      case 'dashboard':
        return 'System Overview & Telemetry';
      case 'detector':
        return 'Steganalysis Detection Workspace';
      case 'lab':
        return 'Interactive Forensics Laboratory';
      case 'stego-studio':
        return 'LSB Embedding & Concealment Studio';
      case 'history':
        return 'Digital Evidence Examination Archive';
      case 'model-info':
        return 'Research & Architectural Formulations';
      default:
        return 'Forensics Console';
    }
  };

  const getTabCategory = (tab) => {
    if (tab === 'history') return 'Evidence';
    if (tab === 'model-info') return 'Research';
    return 'Workspace';
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#090909]/95 backdrop-blur-md border-b border-[#292929] theme-dark-nav flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors">
      {/* Left: Mobile Toggle & Active Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#1A1A1A] border border-[#292929] transition"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb & Title */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#666666] hidden sm:inline">
            {getTabCategory(activeTab)}
          </span>
          <span className="text-[#444444] hidden sm:inline">/</span>
          <span className="text-white font-semibold truncate max-w-[220px] sm:max-w-md">
            {getTabTitle(activeTab)}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Shortcut Pill */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] text-[#888888] hover:text-white border border-[#292929] text-xs font-mono transition"
          title="Command Palette (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#B3B3B3]" />
          <span>Quick search...</span>
          <kbd className="text-[10px] bg-[#1F1F1F] text-[#B3B3B3] px-1.5 py-0.2 rounded border border-[#333333] font-sans">
            ⌘K
          </kbd>
        </button>

        {/* Viva Guide Shortcut */}
        <button
          onClick={onOpenVivaTour}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#202020] text-white border border-[#292929] hover:border-[#383838] text-xs font-medium transition shadow-sm"
          title="Launch Viva Defense Guided Tour"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">Viva Guide</span>
        </button>
      </div>
    </header>
  );
}

