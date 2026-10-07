import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EthioReLogo } from '../components/EthioReLogo';

interface EmailVerificationViewProps {
  targetEmail?: string | null;
  onBackToLogin?: () => void;
}

export const EmailVerificationView: React.FC<EmailVerificationViewProps> = ({
  targetEmail,
  onBackToLogin,
}) => {
  const {
    unverifiedEmail,
    firebaseUser,
    checkVerificationStatus,
    resendVerificationEmail,
    logout,
  } = useAuth();

  const emailToVerify = targetEmail || unverifiedEmail || firebaseUser?.email || '';

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Rate limiting cooldown timer in seconds
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Handle Refresh & Check Verification Status
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const result = await checkVerificationStatus();
      if (result.isVerified) {
        setStatusMessage({
          type: 'success',
          text: result.message || 'Email verified successfully! Loading your dashboard...',
        });
        // The AuthContext automatically sets currentUser and unverifiedState is cleared,
        // causing RootApp to transition to MainLayout
      } else {
        setStatusMessage({
          type: 'error',
          text:
            result.error ||
            'Your email address has not been verified yet. Please check your email and click the verification link before accessing the system.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to refresh verification status. Please try again.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Handle Resend Verification Email with Rate Limiting Cooldown
  const handleResend = async () => {
    if (cooldownSeconds > 0) return;

    setIsResending(true);
    setStatusMessage(null);

    try {
      const result = await resendVerificationEmail(emailToVerify);
      if (result.success) {
        // Start 60-second rate limiting cooldown
        setCooldownSeconds(60);
        setStatusMessage({
          type: 'success',
          text:
            result.message ||
            'Verification email sent. Please check your inbox, spam folder, or junk folder.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Unable to resend verification email. Please try again later.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error sending verification email.',
      });
    } finally {
      setIsResending(false);
    }
  };

  // Handle Back to Login
  const handleBack = async () => {
    await logout();
    if (onBackToLogin) {
      onBackToLogin();
    }
  };

  return (
    <div
      id="email-verification-screen"
      className="min-h-screen w-full bg-[#001833] bg-gradient-to-br from-[#001833] via-[#002855] to-[#003870] flex flex-col justify-between relative overflow-x-hidden font-sans p-4 sm:p-6"
    >
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto py-3 flex items-center justify-between z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <EthioReLogo size="sm" />
          <div className="hidden sm:block h-5 w-px bg-white/20" />
          <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">
            Ethiopian Reinsurance S.C.
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Verification Gate</span>
        </div>
      </header>

      {/* Main Verification Card */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/40">
          {/* Header Banner */}
          <div className="p-6 bg-[#002855] text-white relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-[#D4AF37]/10 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Access Authorization
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  Email Verification Required
                </h1>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Primary Required Notice text */}
            <div className="space-y-2">
              <p className="text-base font-bold text-slate-900 leading-snug">
                Your email address has not been verified yet.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Please check your email and click the verification link before accessing the system.
              </p>
            </div>

            {/* Email Address Capsule */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Target Corporate Account
              </span>
              <div className="flex items-center gap-2 text-slate-800 font-mono text-xs font-semibold break-all">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{emailToVerify || 'your-account@ethiopianre.com'}</span>
              </div>
            </div>

            {/* Status Messages */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-900'
                    : 'bg-blue-50 border border-blue-200 text-blue-900'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : statusMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div className="font-medium leading-relaxed">{statusMessage.text}</div>
              </div>
            )}

            {/* Action Buttons: Exact Requested Controls */}
            <div className="space-y-3 pt-1">
              {/* 1. Check Verification Status */}
              <button
                id="btn-check-verification-status"
                type="button"
                onClick={handleCheckStatus}
                disabled={isChecking || isResending}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm hover:opacity-95 cursor-pointer transition-all disabled:opacity-50"
                style={{ backgroundColor: '#002855' }}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Checking Verification Status...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
                    <span>Check Verification Status</span>
                  </>
                )}
              </button>

              {/* 2. Resend Verification Email with Cooldown Rate Limiting */}
              <button
                id="btn-resend-verification-email"
                type="button"
                onClick={handleResend}
                disabled={isResending || isChecking || cooldownSeconds > 0}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                    <span>Sending Verification Email...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Resend Available in {cooldownSeconds}s</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-slate-600" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              {/* 3. Back to Login */}
              <button
                id="btn-back-to-login"
                type="button"
                onClick={handleBack}
                disabled={isChecking || isResending}
                className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </div>

            {/* Security Guarantee Notice */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Protected HRMS records and application dashboards are strictly inaccessible until Firebase verifies email ownership.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-white/60 z-10 border-t border-white/10">
        &copy; 2026 Ethiopian Reinsurance S.C. HRMS Enterprise Security Architecture
      </footer>
    </div>
  );
};
