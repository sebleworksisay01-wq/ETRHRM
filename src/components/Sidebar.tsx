import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  PlaneTakeoff,
  Building2,
  Users,
  Shield,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  UserCog,
  Activity,
  X,
  Lock,
  User,
  Scale,
  Bell,
  Key,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { ActiveTab } from '../types/hrms';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { isAdmin, isHRAdmin, isEmployee, currentUser } = useAuth();
  const { branding, companyProfile } = useHRMS();
  const [adminConfigExpanded, setAdminConfigExpanded] = useState(true);
  const [sidebarLogoErr, setSidebarLogoErr] = useState(false);

  const handleNavClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    onClose();
  };

  const logoSrc = companyProfile?.logo || branding.companyLogo || branding.logoUrl;

  useEffect(() => {
    setSidebarLogoErr(false);
  }, [logoSrc]);

  const hasValidSidebarLogo = Boolean(logoSrc && !sidebarLogoErr);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 text-white flex flex-col shrink-0 border-r border-[#ffffff1a] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--primary-color, #002855)' }}
      >
        {/* Sidebar Header with Dynamic Logo */}
        <div className="p-5 flex items-center justify-between border-b border-[#ffffff1a]">
          <div className="flex items-center gap-3 min-w-0">
            {hasValidSidebarLogo ? (
              <img
                src={logoSrc}
                alt={companyProfile?.displayName || 'Company Logo'}
                onError={() => setSidebarLogoErr(true)}
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-white/20 shrink-0 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-xs border border-white/20"
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)`,
                }}
              >
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  className="w-4/5 h-4/5"
                  style={{ color: 'var(--accent-color, #D4AF37)' }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 3L36 12V24L20 37L4 24V12L20 3Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  <path d="M20 9L29 15V23L20 31L11 23V15L20 9Z" fill="rgba(255, 255, 255, 0.18)" stroke="white" strokeWidth="1.6" />
                  <circle cx="20" cy="20" r="3.5" fill="currentColor" />
                  <path d="M14 20H26M20 14V26" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight tracking-tight text-white truncate max-w-[130px]">
                {companyProfile?.shortName || companyProfile?.displayName || 'ETHIO-RE'}
              </h1>
              <p className="text-[10px] text-white/70 uppercase tracking-wider font-semibold truncate">
                HR Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/60 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Navigation Items (Requirement 10: Administrator vs HR Admin vs Employee) */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* CASE 1: EMPLOYEE ROLE NAVIGATION (Requirement 10) */}
          {/* Show only: My Profile, My Attendance, My Leave, My Leave Balance, My Notifications, Account Settings */}
          {isEmployee && (
            <div className="space-y-1">
              <div className="px-6 mb-2 text-[11px] uppercase tracking-widest text-[#ffffff60] font-semibold">
                Self-Service Portal
              </div>

              {/* My Profile */}
              <div
                id="nav-my-profile"
                onClick={() => handleNavClick('my-profile')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'my-profile' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <User className="w-5 h-5 opacity-80" />
                <span>My Profile</span>
              </div>

              {/* My Attendance */}
              <div
                id="nav-my-attendance"
                onClick={() => handleNavClick('my-attendance')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'my-attendance' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <CalendarCheck className="w-5 h-5 opacity-80" />
                <span>My Attendance</span>
              </div>

              {/* My Leave */}
              <div
                id="nav-my-leave"
                onClick={() => handleNavClick('my-leave')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'my-leave' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <PlaneTakeoff className="w-5 h-5 opacity-80" />
                <span>My Leave</span>
              </div>

              {/* My Leave Balance */}
              <div
                id="nav-my-leave-balance"
                onClick={() => handleNavClick('my-leave-balance')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'my-leave-balance' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <Scale className="w-5 h-5 opacity-80" />
                <span>My Leave Balance</span>
              </div>

              {/* My Notifications */}
              <div
                id="nav-my-notifications"
                onClick={() => handleNavClick('my-notifications')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'my-notifications' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <Bell className="w-5 h-5 opacity-80" />
                <span>My Notifications</span>
              </div>

              {/* Account Settings */}
              <div
                id="nav-account-settings"
                onClick={() => handleNavClick('account-settings')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'account-settings' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <Key className="w-5 h-5 opacity-80" />
                <span>Account Settings</span>
              </div>
            </div>
          )}

          {/* CASE 2 & 3: HR ADMIN & ADMINISTRATOR NAVIGATION (Requirement 10) */}
          {!isEmployee && (
            <>
              <div className="px-6 mb-2 text-[11px] uppercase tracking-widest text-[#ffffff60] font-semibold">
                HR Modules
              </div>

              {/* Dashboard */}
              <div
                id="nav-dashboard"
                onClick={() => handleNavClick('dashboard')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'dashboard' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 opacity-80" />
                <span>Dashboard</span>
              </div>

              {/* Attendance */}
              <div
                id="nav-attendance"
                onClick={() => handleNavClick('attendance')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'attendance' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <CalendarCheck className="w-5 h-5 opacity-80" />
                <span>Attendance</span>
              </div>

              {/* Leave Management */}
              <div
                id="nav-leave"
                onClick={() => handleNavClick('leave')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'leave' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <PlaneTakeoff className="w-5 h-5 opacity-80" />
                <span>Leave Management</span>
              </div>

              {/* Employee Master Data */}
              <div
                id="nav-employees"
                onClick={() => handleNavClick('employees')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'employees' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <Users className="w-5 h-5 opacity-80" />
                <span>Employees</span>
              </div>

              {/* Departments */}
              <div
                id="nav-departments"
                onClick={() => handleNavClick('departments')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'departments' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <Building2 className="w-5 h-5 opacity-80" />
                <span>Departments</span>
              </div>

              {/* Reports */}
              <div
                id="nav-reports"
                onClick={() => handleNavClick('reports')}
                className={`sidebar-item px-6 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium ${
                  activeTab === 'reports' ? 'active' : 'text-[#ffffffcc]'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 opacity-80" />
                <span>Reports</span>
              </div>

              {/* CASE 3: ADMINISTRATOR ONLY: Admin Configuration (Requirement 2 & 9) */}
              {/* Standalone Role menu REMOVED; RBAC accessible via Admin Configuration -> RBAC */}
              {isAdmin && (
                <div>
                  <div className="px-6 mt-6 mb-2 text-[11px] uppercase tracking-widest text-[#ffffff60] font-semibold">
                    System Administration
                  </div>

                  <div
                    onClick={() => setAdminConfigExpanded(!adminConfigExpanded)}
                    className="px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-[#ffffffb3] hover:bg-[#003366] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-medium">Admin Configuration</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${
                        adminConfigExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {adminConfigExpanded && (
                    <div className="space-y-0.5">
                      {/* 1. RBAC (Requirement 2 & 3) */}
                      <div
                        id="nav-rbac"
                        onClick={() => handleNavClick('roles')}
                        className={`sidebar-item pl-11 pr-6 py-2.5 flex items-center gap-2.5 cursor-pointer text-xs ${
                          activeTab === 'roles' ? 'active' : 'text-[#ffffffb3]'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-[#D4AF37] opacity-80" />
                        <span className="font-medium">RBAC</span>
                      </div>

                      {/* 2. User Management (Requirement 6) */}
                      <div
                        id="nav-users"
                        onClick={() => handleNavClick('users')}
                        className={`sidebar-item pl-11 pr-6 py-2.5 flex items-center gap-2.5 cursor-pointer text-xs ${
                          activeTab === 'users' ? 'active' : 'text-[#ffffffb3]'
                        }`}
                      >
                        <UserCog className="w-4 h-4 opacity-75" />
                        <span className="font-medium">User Management</span>
                      </div>

                      {/* 3. Company Profile */}
                      <div
                        id="nav-company-profile"
                        onClick={() => handleNavClick('settings')}
                        className={`sidebar-item pl-11 pr-6 py-2.5 flex items-center gap-2.5 cursor-pointer text-xs ${
                          activeTab === 'settings' ? 'active' : 'text-[#ffffffb3]'
                        }`}
                      >
                        <Building2 className="w-4 h-4 opacity-75" />
                        <span className="font-medium">Company Profile</span>
                      </div>

                      {/* 4. Audit Logs */}
                      <div
                        id="nav-activity"
                        onClick={() => handleNavClick('activity')}
                        className={`sidebar-item pl-11 pr-6 py-2.5 flex items-center gap-2.5 cursor-pointer text-xs ${
                          activeTab === 'activity' ? 'active' : 'text-[#ffffffb3]'
                        }`}
                      >
                        <Activity className="w-4 h-4 opacity-75" />
                        <span className="font-medium">Audit Logs</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Restricted notice for HR Admin */}
              {isHRAdmin && !isAdmin && (
                <div
                  className="mx-4 mt-6 p-3 rounded-lg bg-black/20 text-[11px] text-[#ffffffcc]"
                  style={{ borderLeft: '3px solid var(--accent-color, #D4AF37)' }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                    <Lock className="w-3 h-3" style={{ color: 'var(--accent-color, #D4AF37)' }} />
                    <span>HR Operational Role</span>
                  </div>
                  <p className="text-[10px] text-[#ffffff99] leading-snug">
                    Access to employee records, attendance, and leave. System governance and RBAC matrix are restricted to Administrators.
                  </p>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Sidebar Footer: Logged in User Card */}
        <div className="p-4 mt-auto border-t border-[#ffffff1a]">
          <div className="bg-black/20 rounded-lg p-3 text-center border border-white/10">
            <p className="text-[10px] text-[#ffffff80] uppercase mb-0.5 tracking-widest font-semibold">
              Logged in as
            </p>
            <div className="inline-flex items-center gap-1">
              <span
                className={`text-xs font-bold ${
                  isAdmin
                    ? 'text-[#D4AF37]'
                    : isHRAdmin
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {currentUser?.role === 'HR Officer' ? 'HR Admin' : currentUser?.role || 'Employee'}
              </span>
            </div>
            <p
              className="text-[11px] font-medium mt-0.5 truncate text-white"
            >
              {currentUser?.fullName}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
