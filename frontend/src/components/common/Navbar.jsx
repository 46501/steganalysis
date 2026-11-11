import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';

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
    { id: 'stego-studio', label: 'Stego Studio' },
    { id: 'history', label: 'Scan History' },
    { id: 'model-info', label: 'Research' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        {/* Left Branding */}
        <div
          className="flex items-center space-x-2.5 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              StegoShield AI
            </span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50">
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gray-800 text-white font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
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
              className="hidden lg:flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 transition"
              title="Quick Command Palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-mono text-[10px] text-gray-400">⌘K</span>
            </button>
          )}

          {/* Secondary Viva Defense Tour Action */}
          {onOpenVivaTour && (
            <button
              onClick={onOpenVivaTour}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-900/60 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition"
              title="Academic Defense Presentation Guide"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              <span>Viva Guide</span>
            </button>
          )}

          {/* Compact Backend Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-900/80 border border-gray-800/80 text-[11px] font-mono">
            {healthStatus.online ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-gray-300 font-medium">PyTorch CPU</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                <span className="text-rose-400 font-medium">Connecting</span>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-[#0B0F19] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition ${
                  isActive
                    ? 'bg-gray-800 text-white font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
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
              className="w-full text-left px-3 py-2 rounded-md text-xs font-medium text-purple-300 hover:bg-gray-800/50 flex items-center gap-1.5 pt-2 border-t border-gray-800/60"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              <span>Viva Defense Tour</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
