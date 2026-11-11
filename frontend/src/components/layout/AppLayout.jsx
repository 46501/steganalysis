import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { steganalysisApi } from '../../services/api';

export default function AppLayout({
  activeTab,
  setActiveTab,
  onOpenVivaTour,
  onOpenCommandPalette,
  children,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('stego_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ online: false, model: '', db: '' });

  useEffect(() => {
    try {
      localStorage.setItem('stego_sidebar_collapsed', collapsed ? 'true' : 'false');
    } catch (e) {
      // ignore localStorage quota/disabled
    }
  }, [collapsed]);

  // Centralized backend telemetry polling
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

  // Shortcut key `[` to toggle sidebar collapse (matching ChatGPT / Linear pattern)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (e.key === '[' && !['input', 'textarea'].includes(tag) && !e.target.isContentEditable) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex bg-[#000000] text-white">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenVivaTour={onOpenVivaTour}
        onOpenCommandPalette={onOpenCommandPalette}
        healthStatus={healthStatus}
      />

      {/* Main Content Area Offset by Sidebar Width */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        {/* Top Context & Action Bar (Fixed & Sticky) */}
        <TopHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onOpenVivaTour={onOpenVivaTour}
          onOpenCommandPalette={onOpenCommandPalette}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          healthStatus={healthStatus}
        />

        {/* Dynamic Workspace Route View (with top padding to account for fixed 56px navbar) */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-18 sm:pt-20 pb-8 sm:pb-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#292929] py-4 bg-[#090909] shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#777777] font-mono">
            <div className="text-[#B3B3B3]">StegoShield AI • Digital Image Steganalysis Research Platform</div>
            <div className="flex items-center space-x-3 text-[#777777]">
              <span>BOSSbase 1.01</span>
              <span>•</span>
              <span>PyTorch 2.x</span>
              <span>•</span>
              <span>ISO/IEC 27037</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
