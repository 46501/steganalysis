import React, { useState } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { playCyberClick } from '../../utils/cyberSoundEffects';

export default function ForgotPasswordModal() {
  const { authModal, closeAuthModal, openAuthModal } = useAuth();
  const { isOpen, tab, resetToken: initialResetToken } = authModal;

  const [step, setStep] = useState(tab === 'reset' || initialResetToken ? 2 : 1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialResetToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [devToken, setDevToken] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen || (tab !== 'forgot' && tab !== 'reset')) return null;

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);
    playCyberClick();

    try {
      if (!email.trim()) {
        throw new Error('Please enter your account email address.');
      }
      const res = await authApi.forgotPassword(email.trim());
      setStatusMessage(res.message);
      if (res.detail) {
        setDevToken(res.detail);
        setToken(res.detail);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to process request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    playCyberClick();

    try {
      if (!token.trim()) {
        throw new Error('Please provide the cryptographic reset token.');
      }
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long.');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      await authApi.resetPassword({
        token: token.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setIsDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={closeAuthModal} />

      <div className="relative w-full max-w-md bg-[#070D1A] border border-[#1B2B48] rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden z-10 flex flex-col">
        {/* Top Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-cyan-400 to-indigo-500" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#142036]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <KeyRound className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-wide">
                Cryptographic Key Recovery
              </span>
              <p className="text-xs text-[#94A3B8]">
                {step === 1 ? 'Step 1: Request Security Reset Token' : 'Step 2: Establish New Credentials'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#142036] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Success screen */}
        {isDone ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-lg">Password Reset Successfully</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
              Your cryptographic credentials have been updated and all active sessions revoked. Please sign in with your new password.
            </p>
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs tracking-wide transition shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              Sign In to StegoShield AI
            </button>
          </div>
        ) : (
          <div className="p-6">
            {step === 1 ? (
              <form onSubmit={handleRequestToken} className="space-y-4">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Enter your registered forensic account email. We will generate a cryptographic one-time reset token with NIST SP 800-86 compliance.
                </p>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Account Email
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

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="text-xs text-[#94A3B8] hover:text-white transition"
                  >
                    ← Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs tracking-wide transition shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Generating...' : 'Generate Reset Token'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {statusMessage && (
                  <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-xs text-cyan-200">
                    {statusMessage}
                  </div>
                )}

                {devToken && (
                  <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-[11px] text-indigo-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Development Mode Reset Token</span>
                    </div>
                    <p className="font-mono text-[10px] break-all bg-black/40 p-1.5 rounded border border-indigo-900/50">
                      {devToken}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Cryptographic Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter or paste recovery token"
                    className="w-full px-3 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs placeholder-[#475569] font-mono transition outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    New Secure Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs placeholder-[#475569] font-mono transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-cyan-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                    Confirm New Password
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
                      className="w-full pl-9 pr-10 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs placeholder-[#475569] font-mono transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-cyan-300 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-[#94A3B8] hover:text-white transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs tracking-wide transition shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Updating...' : 'Set New Password'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
