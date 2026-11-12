import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestSession, setIsGuestSession] = useState(() => {
    try {
      return sessionStorage.getItem('stego_guest_session') === 'true';
    } catch (e) {
      return false;
    }
  });

  const continueAsGuest = useCallback(() => {
    try {
      sessionStorage.setItem('stego_guest_session', 'true');
    } catch (e) {}
    setIsGuestSession(true);
  }, []);

  // Modal states for unified cyber auth dialogs
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    tab: 'login', // 'login' | 'register' | 'forgot' | 'reset'
    resetToken: null,
  });

  const [guestPrompt, setGuestPrompt] = useState({
    isOpen: false,
    title: '',
    description: '',
    onProceedAsGuest: null,
  });

  const openAuthModal = useCallback((tab = 'login', resetToken = null) => {
    setAuthModal({
      isOpen: true,
      tab,
      resetToken,
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const triggerGuestPrompt = useCallback((title, description, onProceedAsGuest = null) => {
    setGuestPrompt({
      isOpen: true,
      title: title || 'Authentication Recommended',
      description:
        description ||
        'Sign in to link this forensic analysis to your cryptographic audit trail, or continue exploring as guest.',
      onProceedAsGuest,
    });
  }, []);

  const closeGuestPrompt = useCallback(() => {
    setGuestPrompt({
      isOpen: false,
      title: '',
      description: '',
      onProceedAsGuest: null,
    });
  }, []);

  // Silent session restore on app mount via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const res = await authApi.refresh();
        if (isMounted && res.access_token) {
          setAuthToken(res.access_token);
          setUser(res.user);
        }
      } catch (err) {
        // Guest mode - no active session or cookie expired
        if (isMounted) {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    // Listen for global auth expiration events from Axios interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setAuthToken(null);
    };
    window.addEventListener('stego-auth-expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('stego-auth-expired', handleAuthExpired);
    };
  }, []);

  // 15-Minute Workstation Inactivity Lock (ISO/IEC 27037 & NIST SP 800-86 compliance)
  useEffect(() => {
    if (!user) return;

    let lastActivityTime = Date.now();
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    const recordActivity = () => {
      lastActivityTime = Date.now();
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    const timerInterval = setInterval(() => {
      if (Date.now() - lastActivityTime >= INACTIVITY_TIMEOUT_MS) {
        console.warn('[Security] Workstation inactivity timeout exceeded (15 min). Locking forensic session.');
        setAuthToken(null);
        setUser(null);
        try {
          sessionStorage.clear();
        } catch (e) {
          // ignore
        }
        window.location.replace('/login');
      }
    }, 30000); // Check every 30 seconds

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(timerInterval);
    };
  }, [user, openAuthModal]);

  const login = async (email, password, rememberMe = false) => {
    const res = await authApi.login({
      email,
      password,
      remember_me: rememberMe,
    });
    setAuthToken(res.access_token);
    setUser(res.user);
    setIsGuestSession(false);
    try {
      sessionStorage.removeItem('stego_guest_session');
    } catch (e) {}
    closeAuthModal();
    return res.user;
  };

  const register = async (fullName, email, password, confirmPassword) => {
    const res = await authApi.register({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
      password_confirm: confirmPassword,
    });
    setAuthToken(res.access_token);
    setUser(res.user);
    setIsGuestSession(false);
    try {
      sessionStorage.removeItem('stego_guest_session');
    } catch (e) {}
    closeAuthModal();
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Backend logout response warning:', err);
    } finally {
      // Clear all authentication-related in-memory and persistent state
      setAuthToken(null);
      setUser(null);
      setIsGuestSession(false);
      try {
        sessionStorage.removeItem('stego_guest_session');
        sessionStorage.clear();
      } catch (e) {
        // ignore
      }
    }
  };

  const updateProfileState = (updatedUser) => {
    setUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch (err) {
      return null;
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isGuest: Boolean(!user && isGuestSession),
    isGuestSession,
    continueAsGuest,
    hasAccess: Boolean(user || isGuestSession),
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateProfileState,
    authModal,
    openAuthModal,
    closeAuthModal,
    guestPrompt,
    triggerGuestPrompt,
    closeGuestPrompt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
