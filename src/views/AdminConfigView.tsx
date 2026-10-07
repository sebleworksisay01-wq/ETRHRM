import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  Sliders,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AccessDenied } from '../components/AccessDenied';
import { EthioReLogo } from '../components/EthioReLogo';
import { SettingsView } from './SettingsView';
import { UserManagementView } from './UserManagementView';
import { RolesPermissionsView } from './RolesPermissionsView';
import { ActivityLogsView } from './ActivityLogsView';

export type AdminConfigSubTab = 'profile' | 'users' | 'rbac' | 'system' | 'audit';

interface AdminConfigViewProps {
  initialSubTab?: AdminConfigSubTab;
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({ initialSubTab = 'rbac' }) => {
  const { isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<AdminConfigSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  if (!isAdmin) {
    return (
      <AccessDenied
        moduleName="Admin Configuration"
        requiredRole="Administrator"
      />
    );
  }

  const tabs: { id: AdminConfigSubTab; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    {
      id: 'rbac',
      label: 'RBAC',
      icon: Shield,
      description: 'Role-Based Access Control and permissions matrix',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      description: 'Identity accounts and role assignment',
    },
    {
      id: 'profile',
      label: 'Company Profile',
      icon: Building2,
      description: 'Corporate credentials, logo, and legal entity',
    },
    {
      id: 'system',
      label: 'System Settings',
      icon: Sliders,
      description: 'Statutory policies, holidays, and database',
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: Activity,
      description: 'System-wide compliance and security activity trail',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <EthioReLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Administration</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <h1 className="text-lg font-bold text-slate-900">Admin Configuration</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized administration panel for enterprise security, users, RBAC roles, corporate settings, and audit logs.
              </p>
            </div>
          </div>
          <span className="self-start md:self-auto text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#002855]/10 text-[#002855] border border-[#002855]/20">
            Administrator Console
          </span>
        </div>

        {/* Suggested Admin Configuration Tabs (Requirement 9) */}
        <div className="flex items-center gap-1 px-4 overflow-x-auto bg-slate-50/70 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#002855] text-[#002855] bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#002855]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-Module View */}
      <div className="min-h-[500px]">
        {activeSubTab === 'rbac' && <RolesPermissionsView />}
        {activeSubTab === 'users' && <UserManagementView />}
        {activeSubTab === 'profile' && <SettingsView initialTab="profile" />}
        {activeSubTab === 'system' && <SettingsView initialTab="holidays" />}
        {activeSubTab === 'audit' && <ActivityLogsView />}
      </div>
    </div>
  );
};
