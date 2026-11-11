import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

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

  useEffect(() => {
    try {
      localStorage.setItem('stego_sidebar_collapsed', collapsed ? 'true' : 'false');
    } catch (e) {
      // ignore localStorage quota/disabled
    }
  }, [collapsed]);

  // Shortcut key `[` to toggle sidebar collapse
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
    <div className="min-h-screen flex bg-[#000000] text-white overflow-x-hidden">
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
      />

      {/* Main Content Area Offset by Sidebar Width */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        {/* Top Context & Action Bar */}
        <TopHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onOpenVivaTour={onOpenVivaTour}
          onOpenCommandPalette={onOpenCommandPalette}
        />

        {/* Dynamic Workspace Route View */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
