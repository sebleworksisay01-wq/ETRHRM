import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessDeniedProps {
  onGoToDashboard?: () => void;
  attemptedModule?: string;
  moduleName?: string;
  requiredRole?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  onGoToDashboard,
  attemptedModule,
  moduleName,
  requiredRole = 'Administrator',
}) => {
  const { currentUser } = useAuth();
  const targetModule = moduleName || attemptedModule || 'Administration';

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
        Access Denied &middot; Security Boundary
      </span>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Restricted Module Access</h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-6">
        Your current active role as <strong className="text-slate-900">{currentUser?.role}</strong> does not
        have authorization to access the <strong className="text-slate-900">{targetModule}</strong> module.
        Under the Ethio-Re two-tier RBAC policy, this module is strictly restricted to <strong className="text-[#002855]">{requiredRole}</strong> accounts.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onGoToDashboard && (
          <button
            id="btn-access-denied-return"
            onClick={onGoToDashboard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: '#002855' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>
    </div>
  );
};
