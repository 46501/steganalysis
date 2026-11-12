import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  BookOpen,
  PanelLeft,
  Activity,
  Volume2,
  VolumeX,
  User,
  ChevronDown,
  LogOut,
  ShieldCheck,
  History,
  FlaskConical,
  Sparkles,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { getSoundEnabled, setSoundEnabled, playCyberClick } from '../../utils/cyberSoundEffects';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopHeader({
  setMobileOpen,
  onOpenVivaTour,
  onOpenCommandPalette,
  collapsed,
  setCollapsed,
  setActiveTab,
}) {
  const navigate = useNavigate();
  const { user, isGuest, logout, openAuthModal } = useAuth();
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleToggle = () => setSoundOn(getSoundEnabled());
    window.addEventListener('stego-sfx-toggled', handleToggle);
    return () => window.removeEventListener('stego-sfx-toggled', handleToggle);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playCyberClick();
  };

  const getUserInitials = () => {
    if (!user || !user.full_name) return 'AG';
    return user.full_name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
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
              className="text-xs sm:text-[13px] lg:text-[14px] leading-tight font-normal truncate hidden sm:block text-cyan-300"
              style={{ color: 'rgba(165, 243, 252, 0.85)' }}
            >
              Advanced Image Steganalysis & Digital Forensics
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions: Command Panel -> View Guide */}
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

        {/* Cyber Procedural SFX Toggle Button */}
        <button
          type="button"
          onClick={toggleSound}
          className={`p-1.5 rounded-lg border transition ${
            soundOn
              ? 'bg-[#0E172A] text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
              : 'bg-[#0A101D] text-[#64748B] border-[#1E2E4E] hover:text-[#94A3B8]'
          }`}
          title={soundOn ? 'Cyber SFX: ON (Web Audio Synthesizer)' : 'Cyber SFX: MUTED (Click to Enable)'}
          aria-label="Toggle Cyber Sound Effects"
        >
          {soundOn ? (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-[#64748B]" />
          )}
        </button>

        {/* User Guide Shortcut */}
        <button
          type="button"
          onClick={onOpenVivaTour}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950/70 to-indigo-950/60 hover:from-cyan-900/80 hover:to-indigo-900/70 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400/60 text-xs font-semibold transition shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          title="Open StegoShield AI User Guide & Examination Walkthrough"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">User Guide</span>
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-[#1B2B48] hidden sm:block" />

        {/* User Account Controls */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((prev) => !prev);
                playCyberClick();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0B1426] hover:bg-[#101D38] border border-[#1E2E4E] hover:border-cyan-500/50 transition group"
              title="Forensic Investigator Account"
            >
              <div className="relative">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-black font-mono font-bold text-[10px] shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                  {getUserInitials()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#070C18] animate-pulse" />
              </div>

              <span className="text-xs font-medium text-white max-w-[120px] truncate hidden md:inline">
                {user.full_name || 'Investigator'}
              </span>

              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-cyan-300 transition" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_40px_rgba(0,0,0,0.8)] py-2 z-50 animate-fade-in font-sans">
                {/* Header info */}
                <div className="px-4 py-3 border-b border-[#142036] bg-[#050914]/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {user.full_name}
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                      LEVEL 3
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] font-mono truncate mt-0.5">
                    {user.email}
                  </p>
                </div>

                {/* Navigation Links */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/profile');
                      setUserMenuOpen(false);
                      playCyberClick();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-[#0E172A] flex items-center gap-2.5 transition"
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>My Profile & Telemetry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate('/history');
                      setUserMenuOpen(false);
                      playCyberClick();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-[#0E172A] flex items-center gap-2.5 transition"
                  >
                    <History className="w-4 h-4 text-cyan-400" />
                    <span>My Scan History</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate('/lab');
                      setUserMenuOpen(false);
                      playCyberClick();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-[#0E172A] flex items-center gap-2.5 transition"
                  >
                    <FlaskConical className="w-4 h-4 text-indigo-400" />
                    <span>My Lab Experiments</span>
                  </button>
                </div>

                {/* Sign Out */}
                <div className="pt-1 border-t border-[#142036]">
                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      playCyberClick();
                      await logout();
                      navigate('/login', {
                        replace: true,
                        state: { message: 'Successfully signed out of session.' },
                      });
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2.5 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Guest Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1222] border border-[#17253E] text-[11px] font-mono text-[#94A3B8]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
              <span>Guest Analyst</span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigate('/login');
                playCyberClick();
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border border-[#1E2E4E] hover:border-cyan-500/40 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openAuthModal('register');
                playCyberClick();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs tracking-wide transition shadow-[0_0_12px_rgba(0,240,255,0.25)]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
