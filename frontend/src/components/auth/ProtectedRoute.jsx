import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route guard enforcing Authentication-First architecture:
 * - If user is authenticated, grants access.
 * - If user explicitly selected guest mode, grants access to general workspaces (unless requireUser is true).
 * - If unauthenticated and no explicit guest session, redirects to /login immediately with replace: true.
 */
export default function ProtectedRoute({ children, requireUser = false }) {
  const { user, isGuestSession, isLoading } = useAuth();
  const location = useLocation();

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

  // Strict User Account requirement (e.g. for /profile)
  if (requireUser && !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: 'Registered investigator account required to access profile telemetry.',
        }}
      />
    );
  }

  // If neither authenticated nor in an explicit guest session, redirect to /login
  if (!user && !isGuestSession) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: 'Authentication required. Please sign in or initialize a session.',
        }}
      />
    );
  }

  return children;
}
