import React, { useState } from 'react';
import {
  Shield,
  Briefcase,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  Send,
  BadgeCheck,
  Clock,
} from 'lucide-react';
import { useAuth, COMPANY_EMAIL_DOMAIN, SPECIAL_ADMIN_EMAIL, isAuthorizedAdmin } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { EthioReLogo } from '../components/EthioReLogo';

interface LoginViewProps {
  onOpenHelp?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenHelp }) => {
  const { login, register, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } =
    useAuth();
  const { logAction, companyProfile } = useHRMS();

  // Mode: 'login' | 'register' | 'verify-email' | 'forgot' | 'reset-success'
  const [mode, setMode] = useState<'login' | 'register' | 'verify-email' | 'forgot' | 'reset-success'>('login');

  // Login Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Blocked unverified state from login attempt
  const [unverifiedLoginEmail, setUnverifiedLoginEmail] = useState<string | null>(null);

  // Registration Form states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Verification Form states
  const [verifyTargetEmail, setVerifyTargetEmail] = useState('');

  // Forgot password form states
  const [forgotEmail, setForgotEmail] = useState('');

  // 1. SUBMIT LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setUnverifiedLoginEmail(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Please enter your corporate email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(normalizedEmail, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
        if (result.unverified && result.unverifiedEmail) {
          setUnverifiedLoginEmail(result.unverifiedEmail);
        }
        logAction('Authentication', 'Login Failed', normalizedEmail, result.error || 'Invalid credentials');
      } else {
        logAction('Authentication', 'Login Succeeded', normalizedEmail, 'User authenticated to HRMS session');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SUBMIT REGISTRATION
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const fullName = regFullName.trim();
    const normalizedEmail = regEmail.trim().toLowerCase();

    if (!fullName) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }

    const isCompanyDomain = normalizedEmail.endsWith(COMPANY_EMAIL_DOMAIN);
    const isSpecialAdmin = isAuthorizedAdmin(normalizedEmail);

    if (!isCompanyDomain && !isSpecialAdmin) {
      setErrorMessage(
        `Company Email Domain Restricted: Only users with an official ${COMPANY_EMAIL_DOMAIN} email address are permitted to register.`
      );
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        fullName,
        email: normalizedEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed. Please check your entries.');
        logAction('User Management', 'Registration Rejected', normalizedEmail, result.error || 'Invalid data');
      } else {
        logAction(
          'User Management',
          'Self Registration',
          normalizedEmail,
          'User submitted self-registration (Default Role: Employee, Status: Pending Verification)'
        );
        setVerifyTargetEmail(normalizedEmail);
        setSuccessNotice(
          result.message ||
            `Registration submitted! A verification email has been dispatched by Firebase to ${normalizedEmail}. Please verify your email before logging in.`
        );
        setMode('verify-email');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. SUBMIT EMAIL VERIFICATION CHECK
  const handleVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const target = (verifyTargetEmail || email).trim().toLowerCase();

    if (!target) {
      setErrorMessage('Please provide the corporate email to verify.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyEmail(target);
      if (!res.success) {
        setErrorMessage(res.error || 'Email has not been verified yet in Firebase. Please check your inbox and click the verification link.');
      } else {
        logAction('User Management', 'Email Verified', target, 'Corporate email verified via Firebase');
        setSuccessNotice('Email successfully verified! Your account is now Active. You may now sign in.');
        setEmail(target);
        setPassword(regPassword || '');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification check failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. RESEND VERIFICATION EMAIL
  const handleResendVerification = async (targetEmailToResend?: string) => {
    const target = (targetEmailToResend || verifyTargetEmail || email).trim().toLowerCase();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!target) {
      setErrorMessage('Please specify your registered corporate email.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resendVerificationEmail(target, regPassword || password);
      if (!res.success) {
        setErrorMessage(res.error || 'Could not resend verification email.');
      } else {
        setVerifyTargetEmail(target);
        setSuccessNotice(res.message || `Verification link resent to ${target}. Please check your inbox.`);
        if (mode !== 'verify-email') {
          setMode('verify-email');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. FORGOT PASSWORD FLOW
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered corporate email.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await forgotPassword(forgotEmail.trim());
      if (!res.success) {
        setErrorMessage(res.error || 'Could not initiate password reset.');
        logAction('Authentication', 'Password Reset Failed', forgotEmail.trim(), res.error || 'User not found');
      } else {
        logAction('Authentication', 'Password Reset Initiated', forgotEmail.trim(), 'Dispatched Firebase password reset email');
        setSuccessNotice(res.message || 'A password reset link has been dispatched to your corporate email address.');
        setMode('reset-success');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch password reset email.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#001833] bg-gradient-to-br from-[#001833] via-[#002855] to-[#003870] flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Top Bar with Header */}
      <header className="w-full px-6 sm:px-12 py-4 flex items-center justify-between z-10 border-b border-white/10 bg-black/10 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <EthioReLogo size="sm" />
          <div className="hidden sm:block h-5 w-px bg-white/20" />
          <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">
            {companyProfile?.displayName || 'Ethiopian Reinsurance S.C.'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/80">
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Help &amp; Guide</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/40">
          {/* Left Column: Brand & Security Guarantee */}
          <div
            className="lg:col-span-5 p-8 text-white flex flex-col justify-between relative overflow-hidden"
            style={{ backgroundColor: '#002855' }}
          >
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-[#D4AF37]/10 pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-[#D4AF37]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Enterprise Identity &amp; RBAC</span>
                </div>
              </div>

              <div>
                <div className="mb-3 p-2 bg-white/10 rounded-xl inline-block border border-white/15 backdrop-blur-xs">
                  <EthioReLogo size="md" showText={false} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
                  Human Resource Management System
                </h1>
                <p className="text-xs text-blue-200/90 mt-2 leading-relaxed">
                  Pioneer National Reinsurer of Ethiopia. Enterprise identity governance with strict corporate email domain verification and two-tier role-based access.
                </p>
              </div>

              {/* Security & Feature Pillars */}
              <div className="space-y-2.5 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Enterprise HRMS Capabilities
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-white">Centralized Personnel Directory</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 pl-6">
                    Authoritative employee master data linking, statutory tracking, and organizational structures.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Self-Service &amp; Time Tracking</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 pl-6">
                    Direct staff attendance check-ins, statutory leave requests, and operational notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Compliance Tag */}
            <div className="relative z-10 pt-6 border-t border-white/10 text-[11px] text-blue-200/70 flex items-center justify-between">
              <span>Proclamation No. 1156/2019</span>
              <span className="font-mono text-[10px]">TLS 256-Bit</span>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
            {/* 1. LOGIN FORM */}
            {mode === 'login' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Sign In to Your Account</h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase bg-blue-50 text-[#002855] border border-blue-200">
                      Corporate Gateway
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your authorized corporate credentials to access your workspace.
                  </p>
                </div>

                {/* Success Notice */}
                {successNotice && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="font-medium">{successNotice}</div>
                  </div>
                )}

                {/* Error Banner with Unverified Action Trigger */}
                {errorMessage && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="font-medium">{errorMessage}</div>
                    </div>

                    {unverifiedLoginEmail && (
                      <div className="pt-2 border-t border-rose-200/60 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyTargetEmail(unverifiedLoginEmail);
                            setMode('verify-email');
                            setErrorMessage(null);
                          }}
                          className="px-3 py-1 bg-rose-700 text-white rounded font-bold text-[11px] hover:bg-rose-800 cursor-pointer"
                        >
                          Verify Account Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResendVerification(unverifiedLoginEmail)}
                          className="px-3 py-1 bg-white text-rose-700 border border-rose-300 rounded font-bold text-[11px] hover:bg-rose-50 cursor-pointer"
                        >
                          Resend Verification Link
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="input-login-email" className="block font-semibold text-slate-700 mb-1.5">
                      Corporate Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. user@ethiopianre.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] focus:border-[#002855]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="input-login-password" className="font-semibold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setForgotEmail(email);
                          setErrorMessage(null);
                          setSuccessNotice(null);
                        }}
                        className="text-xs text-[#002855] hover:text-[#004080] font-semibold hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] focus:border-[#002855]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                      />
                      <span className="text-slate-600 text-xs">Keep me signed in on this device</span>
                    </label>
                  </div>

                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer transition-all disabled:opacity-50"
                    style={{ backgroundColor: '#002855' }}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to HRMS</span>
                        <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                      </>
                    )}
                  </button>
                </form>

                {/* Sign Up / Registration Link */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">New Employee / HR Officer?</div>
                    <div className="text-[11px] text-slate-500">Register with your @ethiopianre.com address</div>
                  </div>
                  <button
                    id="btn-goto-register"
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                      setSuccessNotice(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#002855] text-white font-bold text-xs hover:bg-[#003870] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. REGISTRATION FORM */}
            {mode === 'register' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                      <h2 className="text-xl font-bold text-slate-900">Create Corporate Account</h2>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Sign Up
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Register with your Ethiopian Reinsurance company email to gain HRMS portal access.
                  </p>
                </div>

                {/* Domain Policy Callout */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-[#002855] text-xs flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#002855] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Domain Restriction: </span>
                    <span>Only addresses ending in </span>
                    <span className="font-mono font-bold">@ethiopianre.com</span>
                    <span> are authorized for self-registration.</span>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-medium">{errorMessage}</div>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                  <div>
                    <label htmlFor="reg-fullname" className="block font-semibold text-slate-700 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Almaz Bekele"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block font-semibold text-slate-700 mb-1">
                      Company Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="yourname@ethiopianre.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Must use official <strong className="text-slate-700">@ethiopianre.com</strong> domain
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-pass" className="block font-semibold text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-pass"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-confirm-pass" className="block font-semibold text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="reg-confirm-pass"
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showRegConfirmPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                      }}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>

                    <button
                      id="btn-register-submit"
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 px-4 rounded-lg text-white font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer transition-all disabled:opacity-50"
                      style={{ backgroundColor: '#002855' }}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Register &amp; Request Verification</span>
                          <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="text-center text-xs text-slate-500 pt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#002855] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {/* 3. EMAIL VERIFICATION VIEW */}
            {mode === 'verify-email' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      <h2 className="text-xl font-bold text-slate-900">Email Verification Required</h2>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      Pending Verification
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    To safeguard corporate data, newly registered accounts must verify company email ownership prior to entering protected HRMS modules.
                  </p>
                </div>

                {successNotice && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="font-medium">{successNotice}</div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-medium">{errorMessage}</div>
                  </div>
                )}

                {/* Firebase Verification Notification Box */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#002855]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#002855]" />
                      <span>Firebase Email Verification</span>
                    </div>
                    <span className="text-[10px] text-blue-800 font-mono">
                      Target: {verifyTargetEmail || 'user@ethiopianre.com'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    A confirmation link was dispatched to{' '}
                    <strong className="text-slate-900">{verifyTargetEmail || 'your email'}</strong>. Please check your inbox and click the verification link to activate your Ethiopian Reinsurance account.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleVerifySubmit()}
                    disabled={isLoading}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Checking Verification Status...</span>
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="w-4 h-4" />
                        <span>I Have Verified My Email — Check Status</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleResendVerification(verifyTargetEmail)}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-[#002855]" />
                    <span>Resend Verification Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold cursor-pointer ml-auto text-center"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* 4. FORGOT PASSWORD FLOW */}
            {mode === 'forgot' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#002855] font-semibold mb-1">
                    <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                    <span>Security Recovery</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Forgot Your Password?</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your registered Ethiopian Reinsurance corporate email address. A password reset link will be securely dispatched to your inbox by Firebase Authentication.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-medium">{errorMessage}</div>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="input-forgot-email" className="block font-semibold text-slate-700 mb-1.5">
                      Registered Corporate Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-forgot-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. hrofficer@ethiopianre.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Must be an official @ethiopianre.com corporate email account.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                      }}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 px-4 rounded-lg text-white font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: '#002855' }}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                          <span>Dispatching Reset Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Password Reset Link</span>
                          <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. RESET SUCCESS */}
            {mode === 'reset-success' && (
              <div className="space-y-6 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">Password Reset Successful</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Your password has been updated. You can now sign in with your new credentials.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-sm mx-auto text-xs text-left">
                  <div className="text-slate-500 font-semibold">Account:</div>
                  <div className="font-bold text-slate-900 font-mono">{email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="px-6 py-2.5 rounded-lg text-white font-bold text-xs shadow-sm hover:opacity-95 cursor-pointer inline-flex items-center gap-2"
                  style={{ backgroundColor: '#002855' }}
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                </button>
              </div>
            )}

            {/* Support Notice */}
            <div className="pt-6 mt-6 border-t border-slate-100 text-center text-xs text-slate-400">
              <span>Need administrative assistance? Contact IT Helpdesk at </span>
              <span className="font-semibold text-slate-700">support@ethiopianre.com</span>
              <span className="mx-1.5">&middot;</span>
              <span>Ext. 5757</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-3 text-center text-xs text-white/50 border-t border-white/5 bg-black/20">
        &copy; 2026 {companyProfile?.displayName || 'Ethiopian Reinsurance S.C.'} All Rights Reserved. Compliant with Ethiopian Labour Law Proclamation No. 1156/2019.
      </footer>
    </div>
  );
};
