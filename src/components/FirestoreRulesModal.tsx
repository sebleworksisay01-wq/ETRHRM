import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  X,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { firebaseConfig } from '../firebase';
import { testFirestoreConnection } from '../utils/firebaseService';

interface FirestoreRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

export const FIRESTORE_RULES_CONTENT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isSuperAdmin() {
      return isSignedIn() && (
        request.auth.uid == 'CgUr5SlKO6NZqZK4BPWB3Q4IDIF2' ||
        (
          request.auth.token.email != null && (
            request.auth.token.email.lower() in [
              'contactesfaye@gmail.com',
              'admin@ethiopianre.com',
              'sebleworksisay01@gmail.com'
            ]
          )
        )
      );
    }

    function isAdmin() {
      return isSignedIn() && (
        isSuperAdmin() ||
        (
          exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
          'role' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['Administrator', 'Admin']
        )
      );
    }

    match /system/{testId} {
      allow read, write: if isSignedIn();
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    match /employees/{employeeId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if isAdmin();
    }

    match /departments/{departmentId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /attendance/{attendanceId} {
      allow read, create, update: if isSignedIn();
      allow delete: if isAdmin();
    }

    match /leaveRecords/{leaveId} {
      allow read, create, update: if isSignedIn();
      allow delete: if isAdmin();
    }

    match /leave/{leaveId} {
      allow read, create, update: if isSignedIn();
      allow delete: if isAdmin();
    }

    match /companySettings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /activityLogs/{logId} {
      allow read, create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /activity_logs/{logId} {
      allow read, create: if isSignedIn();
      allow update, delete: if isAdmin();
    }
  }
}`;

export const FirestoreRulesModal: React.FC<FirestoreRulesModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const status = await testFirestoreConnection();
      if (status.connected && !status.message.includes('permission-denied')) {
        setVerificationResult({
          success: true,
          message: `Connected successfully to ${firebaseConfig.projectId}. Database rules are active!`,
        });
        if (onConnectionSuccess) onConnectionSuccess();
      } else {
        setVerificationResult({
          success: false,
          message: status.message || 'Permissions still pending publication in Firebase Console.',
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err?.message || 'Verification check failed. Please ensure rules are published.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const consoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`;

  return (
    <div
      id="firestore-rules-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#002855] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/20 text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Firebase Firestore Security Rules
              </h2>
              <p className="text-xs text-blue-200">
                Project:{' '}
                <span className="font-mono font-bold text-amber-300">
                  {firebaseConfig.projectId}
                </span>{' '}
                &bull; Cloud Synchronization Setup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Informative Callout */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-950">
                Firestore Access Authorization Notice
              </p>
              <p className="text-amber-800 leading-relaxed">
                Your Firebase project is currently blocking direct reads and writes. To enable real-time cloud data persistence across all devices, the Firestore security rules below must be published in your Firebase Console.
              </p>
              <p className="text-amber-700 font-medium">
                The application is running safely with full local storage persistence in the meantime.
              </p>
            </div>
          </div>

          {/* Step-by-Step Guide */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              3 Quick Steps to Publish Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                <div className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[10px]">
                  1
                </div>
                <div className="font-bold text-gray-900">Copy Rules</div>
                <p className="text-gray-500 text-[11px]">
                  Click the button below to copy the complete security ruleset to your clipboard.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                <div className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[10px]">
                  2
                </div>
                <div className="font-bold text-gray-900">Open Console</div>
                <p className="text-gray-500 text-[11px]">
                  Visit the Firestore Rules editor tab in your Firebase Console for{' '}
                  <span className="font-mono font-semibold">{firebaseConfig.projectId}</span>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                <div className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[10px]">
                  3
                </div>
                <div className="font-bold text-gray-900">Paste &amp; Publish</div>
                <p className="text-gray-500 text-[11px]">
                  Replace existing rules and click the blue <strong>Publish</strong> button.
                </p>
              </div>
            </div>
          </div>

          {/* Direct Link Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
            <div className="flex items-center gap-2 text-xs text-blue-950 font-medium">
              <Database className="w-4 h-4 text-[#002855]" />
              <span>Firebase Console Rules URL:</span>
              <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-blue-200">
                {firebaseConfig.projectId}/firestore/rules
              </code>
            </div>
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#002855] text-white text-xs font-semibold hover:bg-[#001f44] transition-colors cursor-pointer"
            >
              <span>Open Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Rules Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Security Rules Definition (firestore.rules)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Security Rules</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-gray-300 bg-[#0F172A] text-slate-100 font-mono text-[11px] leading-relaxed">
              <div className="max-h-60 overflow-y-auto p-4">
                <pre className="whitespace-pre">{FIRESTORE_RULES_CONTENT}</pre>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          {verificationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                verificationResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {verificationResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{verificationResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[40px] rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Checking Status...' : 'Verify Published Rules'}</span>
          </button>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[40px] rounded-lg bg-[#002855] hover:bg-[#001f44] text-white text-xs font-semibold cursor-pointer transition-colors text-center"
            >
              Continue in Local Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
