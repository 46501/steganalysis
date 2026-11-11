import React from 'react';
import Navbar from '../common/Navbar';

export default function AppLayout({
  activeTab,
  setActiveTab,
  onOpenVivaTour,
  onOpenCommandPalette,
  children,
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-gray-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVivaTour={onOpenVivaTour}
        onOpenCommandPalette={onOpenCommandPalette}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-gray-800/60 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 font-mono">
          <div>StegoShield AI • Digital Image Steganalysis Research Platform</div>
          <div className="flex items-center space-x-3 text-gray-500">
            <span>BOSSbase 1.01</span>
            <span>•</span>
            <span>PyTorch 2.x</span>
            <span>•</span>
            <span>ISO/IEC 27037</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
