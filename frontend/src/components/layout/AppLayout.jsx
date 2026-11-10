import React from 'react';
import Navbar from '../common/Navbar';

export default function AppLayout({ activeTab, setActiveTab, onOpenVivaTour, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-gray-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onOpenVivaTour={onOpenVivaTour} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        PyTorch SRNet Steganalysis Platform • Built with React, Vite, FastAPI & PostgreSQL
      </footer>
    </div>
  );
}

