import React, { useState, useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Detector from './pages/Detector';
import ForensicsLab from './pages/ForensicsLab';
import StegoStudio from './pages/StegoStudio';
import History from './pages/History';
import ModelInfo from './pages/ModelInfo';
import VivaTourModal from './components/presentation/VivaTourModal';
import CommandPalette from './components/common/CommandPalette';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [injectedDetectorFile, setInjectedDetectorFile] = useState(null);
  const [isVivaTourOpen, setIsVivaTourOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+K / Cmd+K for Command Palette)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSendToDetector = (file) => {
    setInjectedDetectorFile(file);
    setActiveTab('detector');
  };

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenVivaTour={() => setIsVivaTourOpen(true)}
      onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          setActiveTab={setActiveTab}
          onOpenVivaTour={() => setIsVivaTourOpen(true)}
        />
      )}
      {activeTab === 'detector' && (
        <Detector
          initialFile={injectedDetectorFile}
          onNavigateTab={setActiveTab}
        />
      )}
      {(activeTab === 'lab' || activeTab === 'forensics-lab') && <ForensicsLab />}
      {activeTab === 'stego-studio' && <StegoStudio onSendToDetector={handleSendToDetector} />}
      {activeTab === 'history' && <History />}
      {activeTab === 'model-info' && <ModelInfo />}

      <VivaTourModal
        isOpen={isVivaTourOpen}
        onClose={() => setIsVivaTourOpen(false)}
        onNavigateTab={(tab) => {
          const target = tab === 'forensics-lab' ? 'lab' : tab;
          setActiveTab(target);
          setIsVivaTourOpen(false);
        }}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onOpenVivaTour={() => setIsVivaTourOpen(true)}
      />
    </AppLayout>
  );
}

