import React from 'react';
import Navbar from '../common/Navbar';
import TelemetryTicker from '../common/TelemetryTicker';

export default function AppLayout({ activeTab, setActiveTab, onOpenVivaTour, onOpenCommandPalette, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-gray-100 relative">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVivaTour={onOpenVivaTour}
        onOpenCommandPalette={onOpenCommandPalette}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {children}
      </main>
      <footer className="border-t border-gray-800/80 py-4 pb-14 text-center text-xs text-gray-500 font-mono">
        PyTorch SRNet Steganalysis Platform • Built with React, Vite, FastAPI & PostgreSQL
      </footer>
      <TelemetryTicker
        onOpenVivaTour={onOpenVivaTour}
        onOpenCommandPalette={onOpenCommandPalette}
      />
    </div>
  );
}

