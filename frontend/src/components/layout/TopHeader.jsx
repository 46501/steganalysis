import React from 'react';
import { Menu, Search, Sparkles, PanelLeft } from 'lucide-react';
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
      className={`fixed top-0 right-0 z-40 h-14 bg-[#090909]/95 backdrop-blur-md border-b border-[#292929] theme-dark-nav flex items-center justify-between px-4 sm:px-6 shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'left-0 md:left-16' : 'left-0 md:left-64'
      }`}
    >
      {/* Left: Mobile Hamburger / Desktop Expand Toggle (when sidebar collapsed) */}
      <div className="flex items-center gap-2.5">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#1A1A1A] border border-[#292929] transition"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Desktop Expand Icon (ChatGPT style, shown when sidebar is collapsed) */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="hidden md:flex p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#141414] border border-[#242424] hover:border-[#383838] transition"
            title="Open sidebar ( [ )"
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right Actions: Command Panel -> Theme Switcher -> View Guide */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Shortcut Pill (Command Panel) */}
        <button
          type="button"
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

        {/* Theme Switcher placed directly in between Command Panel and Viva Guide */}
        <ThemeSwitcher />

        {/* Viva Guide Shortcut (View Guide) */}
        <button
          type="button"
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
