import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ScanLine,
  FlaskConical,
  FileText,
  Activity,
  ArrowRight,
  LogOut,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import { userApi, authApi, mfaApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { playCyberClick } from '../utils/cyberSoundEffects';
import { useNavigate } from 'react-router-dom';

export default function UserProfile({ setActiveTab }) {
  const navigate = useNavigate();
  const { user, logout, updateProfileState, openAuthModal } = useAuth();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-Factor Authentication (MFA/2FA) state
  const [mfaStatus, setMfaStatus] = useState({ mfa_enabled: false, enrolled_at: null });
  const [isMfaSetupOpen, setIsMfaSetupOpen] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isActivatingMfa, setIsActivatingMfa] = useState(false);
  const [isMfaDisableOpen, setIsMfaDisableOpen] = useState(false);
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [isCopiedKey, setIsCopiedKey] = useState(false);

  // Fetch full user profile telemetry
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [profileData, mfaData] = await Promise.all([
        userApi.getProfile(),
        mfaApi.getStatus().catch(() => ({ mfa_enabled: false })),
      ]);
      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setMfaStatus(mfaData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load user profile telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    try {
      setIsSettingUpMfa(true);
      setError(null);
      const data = await mfaApi.setup();
      setMfaSetupData(data);
      setIsMfaSetupOpen(true);
      setMfaVerifyCode('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate 2FA enrollment.');
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  const handleConfirmMfa = async (e) => {
    e.preventDefault();
    if (!mfaVerifyCode || mfaVerifyCode.length !== 6) {
      setError('Please enter a valid 6-digit TOTP verification code.');
      return;
    }
    try {
      setIsActivatingMfa(true);
      setError(null);
      await mfaApi.enable(mfaVerifyCode);
      setSuccessMessage('Two-Factor Authentication (TOTP) successfully activated!');
      setIsMfaSetupOpen(false);
      setMfaSetupData(null);
      setMfaStatus({ mfa_enabled: true, enrolled_at: new Date().toISOString() });
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification code failed. Please check your device clock.');
    } finally {
      setIsActivatingMfa(false);
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (!mfaDisablePassword) {
      setError('Password is required to disable 2FA.');
      return;
    }
    try {
      setIsDisablingMfa(true);
      setError(null);
      await mfaApi.disable(mfaDisablePassword);
      setSuccessMessage('Two-Factor Authentication has been disabled.');
      setIsMfaDisableOpen(false);
      setMfaDisablePassword('');
      setMfaStatus({ mfa_enabled: false, enrolled_at: null });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to disable 2FA. Incorrect password.');
    } finally {
      setIsDisablingMfa(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        <div className="p-8 rounded-2xl bg-[#070D1A] border border-[#1B2B48] text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Investigator Profile Unavailable</h2>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
            You are currently operating in Guest Mode. Sign in or register to access your personal forensic portfolio and telemetry history.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="py-2.5 px-5 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-white border border-[#1E2E4E] hover:border-cyan-500/40 text-xs font-semibold transition"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-semibold tracking-wide transition shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setError(null);
    setSuccessMessage(null);
    setIsSavingName(true);
    playCyberClick();

    try {
      const updated = await userApi.updateProfile({ full_name: fullName.trim() });
      setProfile((prev) => ({ ...prev, full_name: updated.full_name }));
      updateProfileState(updated);
      setSuccessMessage('Profile name updated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update display name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    playCyberClick();

    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccessMessage(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password. Verify your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmationText !== 'DELETE') {
      setError('Please type DELETE in capital letters to confirm account purge.');
      return;
    }

    setIsDeleting(true);
    playCyberClick();

    try {
      await userApi.deleteAccount({
        password: deletePassword,
        confirm_phrase: 'DELETE',
      });
      await logout();
      navigate('/login', {
        replace: true,
        state: { message: 'Your account and personal forensic data have been permanently deleted.' },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Account deletion failed. Verify your password.');
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    playCyberClick();
    await logout();
    navigate('/login', {
      replace: true,
      state: { message: 'Successfully signed out of session.' },
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in">
      {/* Top Banner & Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#070D1A] via-[#0B1528] to-[#070D1A] border border-[#1B2B48] p-6 sm:p-8 overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.08)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-900/60 to-indigo-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-mono text-xl font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              {profile?.full_name
                ? profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'AG'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  {profile?.full_name || user.full_name}
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  LEVEL 3 INVESTIGATOR
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-1">
                {user.email} • UID: #{String(user.id).padStart(4, '0')}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Member since{' '}
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="self-stretch sm:self-auto px-4 py-2 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-[#94A3B8] hover:text-white border border-[#1E2E4E] hover:border-rose-500/40 text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Live Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-1">
              Total Image Scans
            </span>
            <span className="text-2xl font-bold font-mono text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              {profile?.total_scans ?? 0}
            </span>
            <p className="text-[10px] text-[#64748B] mt-1">Cryptographic analyses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ScanLine className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-1">
              Lab Experiments
            </span>
            <span className="text-2xl font-bold font-mono text-indigo-400">
              {profile?.total_experiments ?? 0}
            </span>
            <p className="text-[10px] text-[#64748B] mt-1">Saved forensic configurations</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-1">
              Certificates / Reports
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {profile?.saved_reports_count ?? (profile?.total_scans ?? 0)}
            </span>
            <p className="text-[10px] text-[#64748B] mt-1">NIST sign-offs generated</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-1">
              Security Protocol
            </span>
            <span className="text-base font-bold font-mono text-white">HS256 + HttpOnly</span>
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Active rotation verified
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B1528] border border-[#1E2E4E] flex items-center justify-center text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Settings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Identity Card */}
        <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#142036]">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Investigator Information
            </h2>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Full Display Name / Callsign
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Official Email Address
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2 bg-[#060A14] border border-[#17253E] rounded-xl text-[#64748B] text-xs font-mono outline-none cursor-not-allowed"
              />
              <p className="text-[10px] text-[#64748B] mt-1">
                Email is tied to your cryptographic signature chain.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingName}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.25)] disabled:opacity-50"
            >
              {isSavingName ? 'Updating Profile...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security & Credentials Card */}
        <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#142036]">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Change Password
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3 pr-10 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs font-mono outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-cyan-300"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                New Password (minimum 8 characters)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3 pr-10 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs font-mono outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-cyan-300"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-white text-xs font-mono outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="py-2 px-4 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-cyan-300 hover:text-white border border-[#1E2E4E] hover:border-cyan-500/40 text-xs font-semibold transition disabled:opacity-50"
            >
              {isChangingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Multi-Factor Authentication (2FA) Security Card */}
      <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#142036]">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Two-Factor Authentication (2FA)
            </h2>
          </div>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold border ${
            mfaStatus?.mfa_enabled
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-[#151515] border-[#292929] text-[#777777]'
          }`}>
            {mfaStatus?.mfa_enabled ? 'ACTIVE (TOTP)' : 'DISABLED'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xl">
              Add hardware-grade two-factor authentication to your investigator identity using standard TOTP authenticator apps (Google Authenticator, Microsoft Authenticator, 1Password).
            </p>
            {mfaStatus?.mfa_enabled && mfaStatus.enrolled_at && (
              <p className="text-[11px] text-[#64748B] font-mono">
                Enrolled: {new Date(mfaStatus.enrolled_at).toLocaleString()}
              </p>
            )}
          </div>

          {mfaStatus?.mfa_enabled ? (
            <button
              onClick={() => setIsMfaDisableOpen(true)}
              className="py-2 px-4 rounded-xl bg-[#0E172A] hover:bg-rose-950/60 text-rose-300 hover:text-white border border-[#1E2E4E] hover:border-rose-500/40 text-xs font-semibold transition shrink-0"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={handleStartMfaSetup}
              disabled={isSettingUpMfa}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0 flex items-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isSettingUpMfa ? 'Generating...' : 'Configure 2FA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-rose-900/40">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
            Danger Zone
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-white">Permanently Delete Account</h3>
            <p className="text-[11px] text-[#94A3B8] max-w-xl mt-0.5">
              Permanently purges your investigator account, cryptographic scan records, and saved lab experiments. This action is irreversible.
            </p>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition shrink-0 flex items-center gap-2 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#070D1A] border border-rose-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] z-10 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Confirm Account Deletion</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                This will permanently delete <span className="text-rose-400 font-mono">{user.email}</span> and all associated scan records.
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Enter Account Password
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-rose-400 rounded-xl text-white text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-rose-400 rounded-xl text-white text-xs font-mono outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-[#0E172A] text-[#94A3B8] hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || deleteConfirmationText !== 'DELETE'}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Setup Enrollment Modal */}
      {isMfaSetupOpen && mfaSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsMfaSetupOpen(false)} />
          <div className="relative w-full max-w-md bg-[#070D1A] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#142036]">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Configure Two-Factor Auth
                </h3>
              </div>
              <button onClick={() => setIsMfaSetupOpen(false)} className="text-[#64748B] hover:text-white text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Scan the QR code with your authenticator app, or enter the secret key manually:
            </p>

            {/* QR Code Container */}
            <div className="flex justify-center p-3 bg-white rounded-xl w-44 h-44 mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mfaSetupData.otpauth_uri)}`}
                alt="Authenticator QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Secret Key Display */}
            <div>
              <label className="block text-[10px] font-mono text-[#64748B] uppercase mb-1">
                Manual Entry Secret Key:
              </label>
              <div className="flex items-center gap-2 bg-[#0B1222] border border-[#1E2E4E] rounded-xl px-3 py-1.5 font-mono text-xs text-cyan-300">
                <span className="truncate select-all">{mfaSetupData.secret}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mfaSetupData.secret);
                    setIsCopiedKey(true);
                    setTimeout(() => setIsCopiedKey(false), 2000);
                  }}
                  className="p-1 hover:text-white text-[#94A3B8] transition shrink-0 ml-auto"
                  title="Copy secret"
                >
                  {isCopiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Code Verification Form */}
            <form onSubmit={handleConfirmMfa} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-white mb-1">
                  Enter 6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={mfaVerifyCode}
                  onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-[#0B1222] border border-[#1E2E4E] focus:border-cyan-400 rounded-xl text-center text-lg font-mono tracking-widest text-white outline-none transition"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMfaSetupOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[#0B1222] hover:bg-[#142036] text-[#94A3B8] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActivatingMfa || mfaVerifyCode.length !== 6}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-semibold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.25)] disabled:opacity-50"
                >
                  {isActivatingMfa ? 'Verifying...' : 'Activate 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Disable Modal */}
      {isMfaDisableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsMfaDisableOpen(false)} />
          <div className="relative w-full max-w-md bg-[#070D1A] border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.2)] z-10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Disable Two-Factor Authentication
            </h3>
            <p className="text-xs text-[#94A3B8]">
              To disable 2FA, please enter your account password to confirm:
            </p>
            <form onSubmit={handleDisableMfa} className="space-y-3">
              <input
                type="password"
                required
                placeholder="Account password"
                value={mfaDisablePassword}
                onChange={(e) => setMfaDisablePassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0B1222] border border-[#1E2E4E] focus:border-rose-400 rounded-xl text-white text-xs outline-none transition"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMfaDisableOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[#0B1222] hover:bg-[#142036] text-[#94A3B8] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisablingMfa}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {isDisablingMfa ? 'Disabling...' : 'Confirm Disable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
