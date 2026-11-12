import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playCyberClick } from '../../utils/cyberSoundEffects';

export default function AuthModal() {
  const { authModal, closeAuthModal, openAuthModal, login, register } = useAuth();
  const { isOpen, tab } = authModal;

  const [activeTab, setActiveTab] = useState(tab || 'login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
      setError(null);
    }
  }, [tab, isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeAuthModal]);

  if (!isOpen) return null;

  // Password strength calculation
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
    setIsSubmitting(true);
    playCyberClick();

    try {
      if (activeTab === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email.trim(), password, rememberMe);
      } else {
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
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={closeAuthModal} />

      {/* Main Cyber Modal Box */}
      <div className="relative w-full max-w-md bg-[#070D1A] border border-[#1B2B48] rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden z-10 flex flex-col">
        {/* Cyber Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#142036]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base tracking-wide">StegoShield AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                  OPERATIONS
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                {activeTab === 'login'
                  ? 'Access your personal forensic investigations'
                  : 'Register verified forensic analyst credentials'}
              </p>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#142036] transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-[#050914] rounded-xl border border-[#17253E]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                playCyberClick();
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-cyan-950 to-indigo-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
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
                  ? 'bg-gradient-to-r from-cyan-950 to-indigo-950 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Full Name / Callsign
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Sarah Mitchell"
                  className="w-full pl-9 pr-3 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-white text-xs placeholder-[#475569] transition outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@stegoshield.io"
                className="w-full pl-9 pr-3 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-white text-xs placeholder-[#475569] transition outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">
                Password
              </label>
              {activeTab === 'login' && (
                <button
                  type="button"
                  onClick={() => openAuthModal('forgot')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-white text-xs placeholder-[#475569] transition outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-cyan-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength feedback during registration */}
            {activeTab === 'register' && password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#64748B]">Password Strength</span>
                  <span className={`font-mono font-medium ${strength.text}`}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#111A2E] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-10 py-2 bg-[#0B1222] border rounded-xl text-white text-xs placeholder-[#475569] transition outline-none font-mono ${
                    confirmPassword && !passwordsMatch
                      ? 'border-rose-500/70 focus:border-rose-400 focus:ring-rose-400'
                      : passwordsMatch
                      ? 'border-emerald-500/70 focus:border-emerald-400 focus:ring-emerald-400'
                      : 'border-[#1E2E4E] focus:border-cyan-400 focus:ring-cyan-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-cyan-300 transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && (
                <p className={`text-[11px] mt-1 flex items-center gap-1 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Remember me toggle for Login */}
          {activeTab === 'login' && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#94A3B8]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0B1222] border-[#1E2E4E] text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0 transition"
                />
                <span>Remember me on this workstation (30 days)</span>
              </label>
            </div>
          )}

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs tracking-wide transition shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Authenticate Session' : 'Create Forensic Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Modal Footer / Guest Mode fallback */}
        <div className="p-4 bg-[#050914] border-t border-[#142036] flex items-center justify-between text-xs text-[#94A3B8]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>NIST SP 800-86 Compliant</span>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
          >
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}
