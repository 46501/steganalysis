import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = async (email, password, rememberMe = false) => {
    const res = await authApi.login({
      email,
      password,
      remember_me: rememberMe,
    });
    setAuthToken(res.access_token);
    setUser(res.user);
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
    closeAuthModal();
    return res.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setAuthToken(null);
      setUser(null);
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
    isGuest: !user,
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
