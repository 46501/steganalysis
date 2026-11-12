import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Detector from './pages/Detector';
import ForensicsLab from './pages/ForensicsLab';
import StegoStudio from './pages/StegoStudio';
import History from './pages/History';
import ModelInfo from './pages/ModelInfo';
import UserProfile from './pages/UserProfile';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import VivaTourModal from './components/presentation/VivaTourModal';
import CommandPalette from './components/common/CommandPalette';
import AuthModal from './components/auth/AuthModal';
import ForgotPasswordModal from './components/auth/ForgotPasswordModal';
import GuestPromptModal from './components/auth/GuestPromptModal';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const [injectedDetectorFile, setInjectedDetectorFile] = useState(null);
  const [isVivaTourOpen, setIsVivaTourOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Derive active tab from current URL pathname
  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';
  const activeTab = currentPath === 'forensics-lab' ? 'lab' : currentPath;

  const setActiveTab = (tab) => {
    const target = tab === 'dashboard' ? '/' : `/${tab}`;
    navigate(target);
  };

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
    navigate('/detector');
  };

  return (
    <>
      <Routes>
        {/* Dedicated Login & Authentication Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Workstation Application Shell */}
        <Route
          path="/*"
          element={
            <AppLayout
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenVivaTour={() => setIsVivaTourOpen(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      setActiveTab={setActiveTab}
                      onOpenVivaTour={() => setIsVivaTourOpen(true)}
                    />
                  }
                />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route
                  path="/detector"
                  element={
                    <Detector
                      initialFile={injectedDetectorFile}
                      onNavigateTab={setActiveTab}
                    />
                  }
                />
                <Route path="/lab" element={<ForensicsLab />} />
                <Route path="/forensics-lab" element={<Navigate to="/lab" replace />} />
                <Route
                  path="/stego-studio"
                  element={<StegoStudio onSendToDetector={handleSendToDetector} />}
                />
                <Route path="/history" element={<History />} />
                <Route path="/model-info" element={<ModelInfo />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfile setActiveTab={setActiveTab} />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>

      {/* Global Interactive Modals */}
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

      {/* Global Cyber Authentication Modals */}
      <AuthModal />
      <ForgotPasswordModal />
      <GuestPromptModal />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
