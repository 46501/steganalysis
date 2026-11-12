import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  const { user, isGuestSession, isLoading } = useAuth();

  const [injectedDetectorFile, setInjectedDetectorFile] = useState(null);
  const [isVivaTourOpen, setIsVivaTourOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Derive active tab from current URL pathname
  const rawPath = location.pathname.replace(/^\//, '') || 'dashboard';
  const activeTab = rawPath === 'forensics-lab' ? 'lab' : rawPath;

  const setActiveTab = (tab) => {
    navigate(`/${tab}`);
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

  // If restoring an existing session on initial load, display cyber splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-cyan-400 font-mono text-xs select-none">
        <div className="flex items-center gap-3 p-6 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_30px_rgba(0,240,255,0.15)]">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="tracking-widest">VALIDATING FORENSIC SESSION...</span>
        </div>
      </div>
    );
  }

  const hasAccess = Boolean(user || isGuestSession);

  return (
    <>
      <Routes>
        {/* Default Entry Route: If authenticated -> Dashboard; Otherwise -> LoginPage */}
        <Route
          path="/"
          element={
            hasAccess ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />

        {/* Dedicated Login / Register Route */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />

        {/* Protected Forensic Application Shell */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenVivaTour={() => setIsVivaTourOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              >
                <Routes>
                  <Route
                    path="/dashboard"
                    element={
                      <Dashboard
                        setActiveTab={setActiveTab}
                        onOpenVivaTour={() => setIsVivaTourOpen(true)}
                      />
                    }
                  />
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
                      <ProtectedRoute requireUser={true}>
                        <UserProfile setActiveTab={setActiveTab} />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
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
