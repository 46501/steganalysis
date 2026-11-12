import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route guard that ensures the user is authenticated.
 * If unauthenticated, immediately redirects to /login with replace: true.
 */
export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-cyan-400 font-mono text-xs">
        <div className="flex items-center gap-3 p-6 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_30px_rgba(0,240,255,0.15)]">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="tracking-widest">VERIFYING FORENSIC INVESTIGATOR CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: 'Authentication required. Please sign in to access your forensic investigator workspace.',
        }}
      />
    );
  }

  return children;
}

