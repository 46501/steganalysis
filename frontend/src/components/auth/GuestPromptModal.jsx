import React from 'react';
import { ShieldCheck, UserCheck, ArrowRight, X, Sparkles, FolderLock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playCyberClick } from '../../utils/cyberSoundEffects';

export default function GuestPromptModal() {
  const { guestPrompt, closeGuestPrompt, openAuthModal } = useAuth();
  const { isOpen, title, description, onProceedAsGuest } = guestPrompt;

  if (!isOpen) return null;

  const handleProceed = () => {
    closeGuestPrompt();
    if (onProceedAsGuest) {
      onProceedAsGuest();
    }
  };

  const handleSignIn = () => {
    closeGuestPrompt();
    openAuthModal('login');
  };

  const handleRegister = () => {
    closeGuestPrompt();
    openAuthModal('register');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={closeGuestPrompt} />

      <div className="relative w-full max-w-md bg-[#070D1A] border border-[#1B2B48] rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden z-10 flex flex-col">
        {/* Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#142036]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <FolderLock className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-wide">
                {title || 'Investigator Authentication'}
              </span>
              <p className="text-xs text-[#94A3B8]">Cryptographic Portfolio Storage</p>
            </div>
          </div>
          <button
            onClick={closeGuestPrompt}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#142036] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {description ||
              'You are currently exploring StegoShield AI as a Guest Analyst. Creating a verified account gives you an isolated forensic workspace with persistent history, saved lab experiments, and sign-off certificates.'}
          </p>

          <div className="p-3.5 rounded-xl bg-[#0B1324] border border-[#1C2C4A] space-y-2">
            <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Analyst Account Privileges</span>
            </div>
            <ul className="text-xs text-[#94A3B8] space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Isolated scan history across sessions</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Save and download customized lab experiments</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>NIST SP 800-86 cryptographic examiner credentials</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleSignIn}
              className="py-2.5 px-4 rounded-xl bg-[#0E172A] hover:bg-[#162444] text-white border border-[#1E2E4E] hover:border-cyan-500/40 text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Sign In</span>
            </button>
            <button
              onClick={handleRegister}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black text-xs font-semibold tracking-wide transition shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center gap-1.5"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#050914] border-t border-[#142036] flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="text-[11px] text-[#64748B]">Guest Mode Active</span>
          <button
            onClick={handleProceed}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
          >
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}
