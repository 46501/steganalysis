import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  ScanLine,
  FlaskConical,
  Layers,
  History,
  GraduationCap,
  Sparkles,
  PanelLeft,
  X,
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#090909] border-r border-[#292929] theme-dark-nav transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header / Branding & Collapse Toggle */}
        <div className="h-14 border-b border-[#292929] flex items-center justify-between px-3.5 shrink-0">
          {collapsed ? (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-lg text-[#888888] hover:text-white hover:bg-[#1A1A1A] border border-transparent hover:border-[#292929] transition group"
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
                <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>

                <div className="flex items-center gap-2 overflow-hidden transition-opacity duration-200">
                  <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                    StegoShield AI
                  </span>
                  <span className="text-[10px] font-mono text-[#777777] bg-[#151515] px-1.5 py-0.5 rounded border border-[#292929]">
                    v1.0
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* ChatGPT-style sidebar collapse button */}
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="hidden md:flex p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#1A1A1A] border border-transparent hover:border-[#292929] transition"
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
                <div className="px-2 pb-1 text-[10px] font-mono font-semibold text-[#555555] tracking-wider uppercase">
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
                        ? 'bg-[#242424] text-white font-semibold border border-[#383838] shadow-sm'
                        : 'text-[#888888] hover:text-white hover:bg-[#141414]'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#888888]'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Interactive Viva Tour Action */}
          <div className="pt-2 border-t border-[#222222]">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-mono font-semibold text-[#555555] tracking-wider uppercase">
                EXAMINATION
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                onOpenVivaTour();
                if (mobileOpen) setMobileOpen(false);
              }}
              className={`w-full flex items-center rounded-lg transition-all text-xs font-medium text-[#B3B3B3] hover:text-white hover:bg-[#1C1C1C] border border-transparent hover:border-[#292929] ${
                collapsed
                  ? 'h-10 justify-center p-0'
                  : 'h-9 px-2.5 gap-2.5'
              }`}
              title="Viva Defense Guided Examination"
            >
              <Sparkles className="w-4 h-4 text-[#B3B3B3] shrink-0" />
              {!collapsed && <span className="truncate font-semibold">Viva Defense Tour</span>}
            </button>
          </div>
        </div>

        {/* Bottom System Telemetry Tray (Clean minimal status only) */}
        <div className="p-3 border-t border-[#292929] bg-[#0A0A0A] shrink-0">
          <div
            className={`flex items-center rounded-lg bg-[#141414] border border-[#242424] text-[11px] font-mono ${
              collapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'
            }`}
            title={statusTooltip}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  healthStatus.online ? 'bg-white animate-pulse' : 'bg-[#555555]'
                }`}
              />
              {!collapsed && (
                <span className="text-[#B3B3B3] truncate">
                  PyTorch CPU
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="text-[10px] text-[#777777]">
                {healthStatus.online ? 'LIVE' : 'OFFLINE'}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
