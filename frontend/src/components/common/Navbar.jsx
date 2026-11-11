import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenVivaTour,
  onOpenCommandPalette,
}) {
  const [healthStatus, setHealthStatus] = useState({ online: false, model: '', db: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await steganalysisApi.checkHealth();
        if (isMounted) {
          setHealthStatus({
            online: data.status === 'healthy',
            model: data.model?.active_model || 'StegoNet-Lite',
            db: data.database?.type || 'SQLite',
          });
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ online: false, model: '', db: '' });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'detector', label: 'Detector' },
    { id: 'lab', label: 'Forensics Lab' },
    { id: 'stego-studio', label: 'Stego Studio' },
    { id: 'history', label: 'Scan History' },
    { id: 'model-info', label: 'Research' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090909]/95 backdrop-blur-md border-b border-[#292929] theme-dark-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        {/* Left Branding */}
        <div
          className="flex items-center space-x-2.5 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center transition-transform group-hover:scale-105">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white">
              StegoShield AI
            </span>
            <span className="text-[10px] font-mono text-[#777777] bg-[#151515] px-1.5 py-0.5 rounded border border-[#292929]">
              v1.0
            </span>
          </div>
        </div>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  isActive
                    ? 'bg-[#242424] text-white font-semibold border border-[#383838]'
                    : 'text-[#777777] hover:text-white hover:bg-[#151515]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions & Status */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Spotlight Command Palette Shortcut */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="hidden lg:flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs bg-[#151515] hover:bg-[#242424] text-[#B3B3B3] hover:text-white border border-[#292929] transition"
              title="Quick Command Palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-[#777777]" />
              <span className="font-mono text-[10px] text-[#777777]">⌘K</span>
            </button>
          )}

          {/* Secondary Viva Defense Tour Action */}
          {onOpenVivaTour && (
            <button
              onClick={onOpenVivaTour}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#151515] hover:bg-[#242424] text-[#B3B3B3] hover:text-white border border-[#292929] transition"
              title="Academic Defense Presentation Guide"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#B3B3B3]" />
              <span>Viva Guide</span>
            </button>
          )}

          {/* Compact Backend Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151515] border border-[#292929] text-[11px] font-mono text-[#B3B3B3]">
            {healthStatus.online ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                <span>PyTorch CPU</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#555555]"></span>
                <span className="text-[#777777]">Connecting</span>
              </>
            )}
          </div>

          {/* Theme Switcher (Light / Dark Mode) */}
          <ThemeSwitcher />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-md text-[#777777] hover:text-white hover:bg-[#151515] transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#292929] bg-[#090909] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#242424] text-white font-semibold border border-[#383838]'
                    : 'text-[#777777] hover:text-white hover:bg-[#151515]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {onOpenVivaTour && (
            <button
              onClick={() => {
                onOpenVivaTour();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-xs font-medium text-[#B3B3B3] hover:bg-[#151515] flex items-center gap-1.5 pt-2 border-t border-[#292929]"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#B3B3B3]" />
              <span>Viva Defense Tour</span>
            </button>
          )}

          {/* Mobile Theme Switcher */}
          <div className="pt-2 border-t border-[#292929] flex items-center justify-between px-3 py-1">
            <span className="text-xs text-[#777777] font-mono">Theme Mode</span>
            <ThemeSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
