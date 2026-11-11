import React from 'react';
import { Menu, Search, Sparkles, PanelLeft, Activity } from 'lucide-react';
import ThemeSwitcher from '../common/ThemeSwitcher';

export default function TopHeader({
  setMobileOpen,
  onOpenVivaTour,
  onOpenCommandPalette,
  collapsed,
  setCollapsed,
}) {
  return (
    <header
      className={`fixed top-0 right-0 z-40 h-16 bg-[#070C18]/95 backdrop-blur-md border-b border-[#1B2B48] theme-dark-nav flex items-center justify-between px-4 sm:px-6 shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'left-0 md:left-16' : 'left-0 md:left-64'
      }`}
    >
      {/* Left: Mobile Toggle / Collapse Expand + Premium Cyber Branding Section */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-2">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-950/40 border border-[#1B2B48] transition shrink-0"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Desktop Expand Icon (ChatGPT style, shown when sidebar is collapsed) */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="hidden md:flex p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-950/40 border border-[#1B2B48] hover:border-cyan-500/40 transition shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
            title="Open sidebar ( [ )"
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Premium StegoShield AI Cyber Branding Section */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Minimal Teal Waveform / Signal Icon with Cyber Glow */}
          <div
            className="flex items-center justify-center text-cyan-400 shrink-0"
            aria-hidden="true"
          >
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 stroke-[2.2] drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          </div>

          {/* Thin Vertical Teal Divider with Gradient Glow */}
          <div
            className="h-7 sm:h-8 w-[1.5px] bg-gradient-to-b from-cyan-400/90 via-cyan-400 to-cyan-400/20 rounded-full shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            aria-hidden="true"
          />

          {/* Left-Aligned Typography: Heading & Subtitle */}
          <div className="flex flex-col justify-center min-w-0 text-left">
            <span
              className="font-bold tracking-tight text-base sm:text-lg lg:text-[22px] leading-tight truncate text-white"
              style={{ color: '#FFFFFF' }}
            >
              Uncover the Invisible.
            </span>
            <span
              className="text-xs sm:text-[13px] lg:text-[14px] leading-tight font-normal truncate hidden sm:block"
              style={{ color: 'rgba(165, 243, 252, 0.8)' }}
            >
              Advanced Image Steganalysis & Digital Forensics
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions: Command Panel -> Theme Switcher -> View Guide */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
        {/* Quick Search Shortcut Pill (Command Panel) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border border-[#1E2E4E] hover:border-cyan-500/40 text-xs font-mono transition shadow-sm hover:shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          title="Command Palette (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick search...</span>
          <kbd className="text-[10px] bg-[#142340] text-cyan-300 px-1.5 py-0.2 rounded border border-[#233860] font-sans">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher placed directly in between Command Panel and Viva Guide */}
        <ThemeSwitcher />

        {/* Viva Guide Shortcut (View Guide) */}
        <button
          type="button"
          onClick={onOpenVivaTour}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950/70 to-indigo-950/60 hover:from-cyan-900/80 hover:to-indigo-900/70 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400/60 text-xs font-medium transition shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          title="Launch Viva Defense Guided Tour"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Viva Guide</span>
        </button>
      </div>
    </header>
  );
}
