import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  FlaskConical,
  Layers,
  History,
  GraduationCap,
  PanelLeft,
  X,
  User,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onOpenVivaTour,
  onOpenCommandPalette,
  healthStatus: propHealthStatus,
}) {
  const [internalHealth, setInternalHealth] = useState({ online: false, model: '', db: '' });

  useEffect(() => {
    if (propHealthStatus) return;
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await steganalysisApi.checkHealth();
        if (isMounted) {
          setInternalHealth({
            online: data.status === 'healthy',
            model: data.model?.active_model || 'StegoNet-Lite',
            db: data.database?.type || 'SQLite',
          });
        }
      } catch (err) {
        if (isMounted) {
          setInternalHealth({ online: false, model: '', db: '' });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [propHealthStatus]);

  const healthStatus = propHealthStatus || internalHealth;

  const navGroups = [
    {
      group: 'WORKSPACES',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'detector', label: 'Detector', icon: ScanLine },
        { id: 'lab', label: 'Forensics Lab', icon: FlaskConical },
        { id: 'stego-studio', label: 'LSB Concealment', icon: Layers },
      ],
    },
    {
      group: 'EVIDENCE',
      items: [
        { id: 'history', label: 'Scan History', icon: History },
      ],
    },
    {
      group: 'RESEARCH',
      items: [
        { id: 'model-info', label: 'Research', icon: GraduationCap },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'Profile & Telemetry', icon: User },
      ],
    },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  const statusTooltip = healthStatus.online
    ? 'Backend: Online • Engine: PyTorch CPU'
    : 'Backend: Offline';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#070C18] border-r border-[#1B2B48] theme-dark-nav transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header / Branding & Collapse Toggle */}
        <div className="h-16 border-b border-[#1B2B48] flex items-center justify-between px-3.5 shrink-0">
          {collapsed ? (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-lg text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition group"
                title="Open sidebar ( [ )"
                aria-label="Open sidebar"
              >
                <PanelLeft className="w-4 h-4 transition-transform group-hover:scale-110" />
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => handleNavClick('dashboard')}
                className="flex items-center gap-2.5 cursor-pointer group select-none overflow-hidden"
                title="StegoShield AI Dashboard"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-cyan-500/30 bg-[#0A1224] flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  <img src="/logo.png" alt="StegoShield AI Logo" className="w-full h-full object-cover" />
                </div>

                <div className="flex items-center gap-2 overflow-hidden transition-opacity duration-200">
                  <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap group-hover:text-cyan-300 transition-colors">
                    StegoShield AI
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* ChatGPT-style sidebar collapse button */}
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="hidden md:flex p-1.5 rounded-lg text-[#777777] hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition"
                  title="Close sidebar ( [ )"
                  aria-label="Close sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>

                {/* Mobile close icon */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="md:hidden p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#1A1A1A] transition"
                  title="Close menu"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <div className="px-2 pb-1 text-[10px] font-mono font-semibold text-cyan-500/70 tracking-wider uppercase">
                  {group.group}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center rounded-lg transition-all text-xs font-medium ${
                      collapsed
                        ? 'h-10 justify-center p-0'
                        : 'h-9 px-2.5 gap-2.5'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950/70 via-cyan-900/30 to-transparent text-cyan-200 font-semibold border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.18)]'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#0F1A30] hover:border-cyan-500/20'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]' : 'text-[#64748B]'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom System Telemetry Tray (Cyber status) */}
        <div className="p-3 border-t border-[#1B2B48] bg-[#060A14] shrink-0">
          <div
            className={`flex items-center rounded-lg bg-[#0B1222] border border-[#1C2C4A] text-[11px] font-mono ${
              collapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'
            }`}
            title={statusTooltip}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  healthStatus.online
                    ? 'bg-cyan-400 shadow-[0_0_8px_#00F0FF] animate-pulse'
                    : 'bg-[#555555]'
                }`}
              />
              {!collapsed && (
                <span className="text-[#94A3B8] truncate">
                  PyTorch CPU
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                {healthStatus.online ? 'LIVE' : 'OFFLINE'}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
