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
    <div className="min-h-screen flex flex-col bg-[#000000] text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVivaTour={onOpenVivaTour}
        onOpenCommandPalette={onOpenCommandPalette}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-[#292929] py-4 mt-auto bg-[#090909]">
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
  );
}
