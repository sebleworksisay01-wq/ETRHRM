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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { ActiveTab } from '../types/hrms';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
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

  const renderNavItem = (
    tabKey: ActiveTab,
    label: string,
    IconComponent: React.FC<{ className?: string }>,
    elementId?: string
  ) => {
    const isActive = activeTab === tabKey;
    return (
      <div
        id={elementId}
        key={tabKey}
        onClick={() => handleNavClick(tabKey)}
        title={label}
        className={`sidebar-item flex items-center min-h-[44px] cursor-pointer text-sm font-medium transition-colors ${
          isCollapsed ? 'px-6 md:px-0 md:justify-center py-3' : 'px-6 py-3 gap-3'
        } ${isActive ? 'active' : 'text-[#ffffffcc]'}`}
      >
        <IconComponent className="w-5 h-5 opacity-80 shrink-0" />
        <span className={isCollapsed ? 'md:hidden truncate' : 'truncate'}>{label}</span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop with smooth touch dismissal */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:static top-0 bottom-0 left-0 z-40 text-white flex flex-col shrink-0 border-r border-[#ffffff1a] transition-all duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'w-72 md:w-20' : 'w-72 md:w-64'
        }`}
        style={{ backgroundColor: 'var(--primary-color, #002855)' }}
      >
        {/* Sidebar Header with Dynamic Logo */}
        <div className={`p-4 sm:p-5 flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-between'} border-b border-[#ffffff1a]`}>
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
            <div className={`min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
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
            aria-label="Close navigation menu"
            className="p-2 rounded-md text-white/70 hover:text-white md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {/* CASE 1: EMPLOYEE ROLE NAVIGATION */}
          {isEmployee && (
            <div className="space-y-0.5">
              <div className={`px-6 mb-2 text-[11px] uppercase tracking-widest text-[#ffffff60] font-semibold ${isCollapsed ? 'md:hidden' : ''}`}>
                Self-Service Portal
              </div>
              {renderNavItem('my-profile', 'My Profile', User, 'nav-my-profile')}
              {renderNavItem('my-attendance', 'My Attendance', CalendarCheck, 'nav-my-attendance')}
              {renderNavItem('my-leave', 'My Leave', PlaneTakeoff, 'nav-my-leave')}
              {renderNavItem('my-leave-balance', 'My Leave Balance', Scale, 'nav-my-leave-balance')}
              {renderNavItem('my-notifications', 'My Notifications', Bell, 'nav-my-notifications')}
              {renderNavItem('account-settings', 'Account Settings', Key, 'nav-account-settings')}
            </div>
          )}

          {/* CASE 2 & 3: HR ADMIN & ADMINISTRATOR NAVIGATION */}
          {!isEmployee && (
            <>
              <div className={`px-6 mb-2 text-[11px] uppercase tracking-widest text-[#ffffff60] font-semibold ${isCollapsed ? 'md:hidden' : ''}`}>
                HR Modules
              </div>
              {renderNavItem('dashboard', 'Dashboard', LayoutDashboard, 'nav-dashboard')}
              {renderNavItem('attendance', 'Attendance', CalendarCheck, 'nav-attendance')}
              {renderNavItem('leave', 'Leave Management', PlaneTakeoff, 'nav-leave')}
              {renderNavItem('employees', 'Employees', Users, 'nav-employees')}
              {renderNavItem('departments', 'Departments', Building2, 'nav-departments')}
              {renderNavItem('reports', 'Reports', FileSpreadsheet, 'nav-reports')}

              {/* ADMINISTRATOR ONLY: Admin Configuration */}
              {isAdmin && (
                <div className="pt-2">
                  <div className={`px-6 mt-4 mb-2 text-[11px] uppercase tracking-widest text-[#ffffff60] font-semibold ${isCollapsed ? 'md:hidden' : ''}`}>
                    System Administration
                  </div>

                  <div
                    onClick={() => {
                      if (isCollapsed && onToggleCollapse) {
                        onToggleCollapse();
                      }
                      setAdminConfigExpanded(!adminConfigExpanded);
                    }}
                    title="Admin Configuration"
                    className={`sidebar-item flex items-center min-h-[44px] cursor-pointer text-xs font-semibold text-[#ffffffb3] hover:bg-[#003366] transition-colors ${
                      isCollapsed ? 'px-6 md:px-0 md:justify-center py-2.5' : 'px-6 py-2.5 justify-between'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span className={`text-sm font-medium ${isCollapsed ? 'md:hidden' : ''}`}>
                        Admin Configuration
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${isCollapsed ? 'md:hidden' : ''} ${
                        adminConfigExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {adminConfigExpanded && (
                    <div className="space-y-0.5">
                      <div
                        id="nav-rbac"
                        onClick={() => handleNavClick('roles')}
                        title="RBAC"
                        className={`sidebar-item flex items-center min-h-[40px] cursor-pointer text-xs ${
                          isCollapsed ? 'pl-6 md:pl-0 md:justify-center py-2' : 'pl-11 pr-6 py-2 gap-2.5'
                        } ${activeTab === 'roles' ? 'active' : 'text-[#ffffffb3]'}`}
                      >
                        <Shield className="w-4 h-4 text-[#D4AF37] opacity-80 shrink-0" />
                        <span className={isCollapsed ? 'md:hidden font-medium' : 'font-medium'}>RBAC</span>
                      </div>

                      <div
                        id="nav-users"
                        onClick={() => handleNavClick('users')}
                        title="User Management"
                        className={`sidebar-item flex items-center min-h-[40px] cursor-pointer text-xs ${
                          isCollapsed ? 'pl-6 md:pl-0 md:justify-center py-2' : 'pl-11 pr-6 py-2 gap-2.5'
                        } ${activeTab === 'users' ? 'active' : 'text-[#ffffffb3]'}`}
                      >
                        <UserCog className="w-4 h-4 opacity-75 shrink-0" />
                        <span className={isCollapsed ? 'md:hidden font-medium' : 'font-medium'}>User Management</span>
                      </div>

                      <div
                        id="nav-company-profile"
                        onClick={() => handleNavClick('settings')}
                        title="Company Profile"
                        className={`sidebar-item flex items-center min-h-[40px] cursor-pointer text-xs ${
                          isCollapsed ? 'pl-6 md:pl-0 md:justify-center py-2' : 'pl-11 pr-6 py-2 gap-2.5'
                        } ${activeTab === 'settings' ? 'active' : 'text-[#ffffffb3]'}`}
                      >
                        <Building2 className="w-4 h-4 opacity-75 shrink-0" />
                        <span className={isCollapsed ? 'md:hidden font-medium' : 'font-medium'}>Company Profile</span>
                      </div>

                      <div
                        id="nav-activity"
                        onClick={() => handleNavClick('activity')}
                        title="Audit Logs"
                        className={`sidebar-item flex items-center min-h-[40px] cursor-pointer text-xs ${
                          isCollapsed ? 'pl-6 md:pl-0 md:justify-center py-2' : 'pl-11 pr-6 py-2 gap-2.5'
                        } ${activeTab === 'activity' ? 'active' : 'text-[#ffffffb3]'}`}
                      >
                        <Activity className="w-4 h-4 opacity-75 shrink-0" />
                        <span className={isCollapsed ? 'md:hidden font-medium' : 'font-medium'}>Audit Logs</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Restricted notice for HR Admin */}
              {isHRAdmin && !isAdmin && !isCollapsed && (
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

        {/* Tablet / Desktop Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <div className="px-3 py-2 border-t border-[#ffffff1a] hidden md:flex items-center justify-center">
            <button
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand navigation panel' : 'Collapse navigation panel'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
                  <span>Collapse Menu</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Sidebar Footer: Logged in User Card */}
        <div className="p-3 sm:p-4 mt-auto border-t border-[#ffffff1a]">
          <div className={`bg-black/20 rounded-lg p-2.5 text-center border border-white/10 ${isCollapsed ? 'md:p-2' : ''}`}>
            {isCollapsed ? (
              <div
                className="hidden md:flex w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] items-center justify-center font-bold text-[#D4AF37] text-xs mx-auto"
                title={`${currentUser?.fullName || 'User'} (${currentUser?.role})`}
              >
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
            ) : null}

            <div className={isCollapsed ? 'md:hidden' : ''}>
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
              <p className="text-[11px] font-medium mt-0.5 truncate text-white">
                {currentUser?.fullName}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
