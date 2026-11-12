import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { playCyberClick } from '../utils/cyberSoundEffects';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register, continueAsGuest, isGuestSession } = useAuth();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(location.state?.message || null);
  const [recoverySuccess, setRecoverySuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (user) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  // Update notification if location.state changes
  useEffect(() => {
    if (location.state?.message) {
      setNotification(location.state.message);
    }
  }, [location.state]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-gray-600' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, percent: 35, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
    if (score <= 4) return { score, percent: 70, label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-400' };
    return { score, percent: 100, label: 'Strong (Forensic Grade)', color: 'bg-emerald-400', text: 'text-emerald-400' };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotification(null);
    setRecoverySuccess(null);
    setIsSubmitting(true);
    playCyberClick();

    try {
      if (activeTab === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email address and password.');
        }
        await login(email.trim(), password, rememberMe);
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else if (activeTab === 'register') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name or callsign.');
        }
        if (!email.trim()) {
          throw new Error('Please enter a valid email address.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await register(fullName.trim(), email.trim(), password, confirmPassword);
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else if (activeTab === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your registered email address.');
        }
        const res = await authApi.forgotPassword(email.trim());
        setRecoverySuccess(
          res.detail
            ? `Password recovery instructions generated. Dev Token: ${res.detail}`
            : res.message || 'If an account exists with this email address, password reset instructions have been generated.'
        );
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Authentication operation failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueAsGuest = () => {
    playCyberClick();
    continueAsGuest();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans select-none">
      {/* Background Cyber Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Cyber Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #00F0FF 1px, transparent 1px), linear-gradient(to bottom, #00F0FF 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_24px_rgba(0,240,255,0.25)] mb-3 relative group">
            <Shield className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#050914] animate-ping" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-white font-mono">
              Stego<span className="text-cyan-400">Shield</span> AI
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
              OPERATIONS
            </span>
          </div>

          <p className="text-xs text-[#94A3B8] font-mono">
            Digital Image Forensics & Neural Steganalysis Platform
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="rounded-3xl bg-[#070D1A]/95 border border-[#1B2B48] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 sm:p-8 backdrop-blur-xl">
          {/* Notification Banner (e.g. Logout Success or Auth Requirement) */}
          {notification && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] leading-relaxed">
                {notification}
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-emerald-400 hover:text-white text-xs font-bold px-1"
                aria-label="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          {/* Recovery Success Banner */}
          {recoverySuccess && (
            <div className="mb-5 p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-200 flex items-start gap-2.5 animate-fade-in">
              <KeyRound className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] leading-relaxed break-all">
                {recoverySuccess}
              </div>
              <button
                type="button"
                onClick={() => setRecoverySuccess(null)}
                className="text-cyan-400 hover:text-white text-xs font-bold px-1"
                aria-label="Dismiss recovery message"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] leading-relaxed">
                {error}
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-white text-xs font-bold px-1"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          {activeTab !== 'forgot' ? (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#050914] border border-[#142036] mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  playCyberClick();
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  playCyberClick();
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#142036]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Password Recovery
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setRecoverySuccess(null);
                  playCyberClick();
                }}
                className="text-xs text-[#94A3B8] hover:text-cyan-300 flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                  Full Name / Callsign
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sarah Mitchell"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-gray-500 transition font-sans"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@stegoshield.io"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-gray-500 transition font-sans"
                />
              </div>
            </div>

            {activeTab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider">
                    Password
                  </label>
                  {activeTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot');
                        setError(null);
                        setRecoverySuccess(null);
                        playCyberClick();
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-gray-500 transition font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength feedback */}
                {activeTab === 'register' && password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#94A3B8]">Strength:</span>
                      <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#142036] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-mono text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#050914] border border-[#1E2E4E] focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-gray-500 transition font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[11px] text-rose-400 font-mono mt-1">Passwords do not match.</p>
                )}
              </div>
            )}

            {activeTab === 'login' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="login-remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#1E2E4E] bg-[#050914] text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="login-remember-me" className="text-xs text-[#94A3B8] cursor-pointer">
                  Remember me on this workstation (30 days)
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-sm tracking-wide transition shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {activeTab === 'login'
                      ? 'Authenticate Session'
                      : activeTab === 'register'
                      ? 'Initialize Account'
                      : 'Send Recovery Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Optional Guest Mode Access */}
          <div className="mt-6 pt-5 border-t border-[#142036] flex items-center justify-between text-xs font-mono">
            <span className="text-[#94A3B8] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>NIST SP 800-86</span>
            </span>

            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition group"
            >
              <span>Continue as Guest Analyst</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>

        {/* Forensic Standards Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-mono text-gray-500">
          <span>• ISO/IEC 27037 Standard</span>
          <span>• SHA-256 Audit Trail</span>
          <span>• Session Isolation</span>
        </div>
      </div>
    </div>
  );
}
