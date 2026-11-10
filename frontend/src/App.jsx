import React, { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Detector from './pages/Detector';
import StegoStudio from './pages/StegoStudio';
import History from './pages/History';
import ModelInfo from './pages/ModelInfo';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [injectedDetectorFile, setInjectedDetectorFile] = useState(null);

  const handleSendToDetector = (file) => {
    setInjectedDetectorFile(file);
    setActiveTab('detector');
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'detector' && <Detector initialFile={injectedDetectorFile} />}
      {activeTab === 'stego-studio' && <StegoStudio onSendToDetector={handleSendToDetector} />}
      {activeTab === 'history' && <History />}
      {activeTab === 'model-info' && <ModelInfo />}
    </AppLayout>
  );
}

