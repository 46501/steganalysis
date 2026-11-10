import React, { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Detector from './pages/Detector';
import History from './pages/History';
import ModelInfo from './pages/ModelInfo';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'detector' && <Detector />}
      {activeTab === 'history' && <History />}
      {activeTab === 'model-info' && <ModelInfo />}
    </AppLayout>
  );
}

