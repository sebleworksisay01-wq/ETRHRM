import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HRMSProvider, useHRMS } from './context/HRMSContext';
import { ActiveTab } from './types/hrms';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { AttendanceView } from './views/AttendanceView';
import { LeaveView } from './views/LeaveView';
import { EmployeeView } from './views/EmployeeView';
import { DepartmentView } from './views/DepartmentView';
import { SettingsView } from './views/SettingsView';
import { UserManagementView } from './views/UserManagementView';
import { RolesPermissionsView } from './views/RolesPermissionsView';
import { ActivityLogsView } from './views/ActivityLogsView';
import { AdminConfigView } from './views/AdminConfigView';
import { EmployeePortalView } from './views/EmployeePortalView';
import { ReportsView } from './views/ReportsView';
import { LoginView } from './views/LoginView';
import { EmailVerificationView } from './views/EmailVerificationView';
import { AccessDenied } from './components/AccessDenied';
import { HelpModal } from './components/HelpModal';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { FirestoreRulesModal } from './components/FirestoreRulesModal';

const MainLayout: React.FC = () => {
  const { canAccessModule, isAdmin, isHRAdmin, isEmployee } = useAuth();
  const {
    companyProfile,
    firebaseStatus,
    firestoreRulesRequired,
    isRulesModalOpen,
    setIsRulesModalOpen,
    logAction,
  } = useHRMS();

  // Initial tab depending on user role
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (isEmployee) return 'my-profile';
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global Modals
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Synchronize initial landing tab when role changes (e.g. testing with switchRoleForDemo)
  useEffect(() => {
    if (isEmployee) {
      const employeeAllowed = [
        'my-profile',
        'my-attendance',
        'my-leave',
        'my-leave-balance',
        'my-notifications',
        'account-settings',
      ];
      if (!employeeAllowed.includes(activeTab)) {
        setActiveTab('my-profile');
      }
    } else if (isHRAdmin && !isAdmin) {
      const hrRestricted = ['users', 'roles', 'settings', 'activity', 'admin-config'];
      if (hrRestricted.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [isEmployee, isHRAdmin, isAdmin]);

  const handleNavigate = (tab: ActiveTab) => {
    // Record unauthorized access attempt if blocked route is requested directly (Requirement 11)
    if (isEmployee) {
      const employeeAllowed = [
        'my-profile',
        'my-attendance',
        'my-leave',
        'my-leave-balance',
        'my-notifications',
        'account-settings',
      ];
      if (!employeeAllowed.includes(tab)) {
        logAction(
          'RBAC',
          'Unauthorized RBAC access attempt',
          `Route: ${tab}`,
          `Employee attempted unauthorized navigation to ${tab}`,
          { previousValue: 'Employee', newValue: tab }
        );
      }
    } else if (!isAdmin && ['users', 'roles', 'settings', 'activity', 'admin-config'].includes(tab)) {
      logAction(
        'RBAC',
        'Unauthorized RBAC access attempt',
        `Route: ${tab}`,
        `HR Admin attempted unauthorized navigation to ${tab}`,
        { previousValue: 'HR Admin', newValue: tab }
      );
    }

    setActiveTab(tab);
  };

  // Check if activeTab is a Self-Service portal section
  const isSelfServiceTab = [
    'my-profile',
    'my-attendance',
    'my-leave',
    'my-leave-balance',
    'my-notifications',
    'account-settings',
  ].includes(activeTab);

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] text-[#111827] font-sans overflow-hidden">
      {/* Sidebar with Geometric Balance Deep Navy & Gold Accents */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onNavigateTo={handleNavigate}
        />

        {/* Firestore Rules Banner when permission issues occur */}
        {firestoreRulesRequired && (
          <div className="bg-amber-500/10 border-b border-amber-300/60 px-4 py-2 sm:px-6 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>
                <strong>Firestore Security Rules Configured:</strong> Your Firebase project requires updated rules for cloud data.
              </span>
            </div>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="ml-3 shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
            >
              View Rules
            </button>
          </div>
        )}

        {/* Dynamic Content View Area - Protected Route Boundaries (Requirement 10) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {/* Self-Service Portal for Employees and direct personal view */}
            {isSelfServiceTab && (
              <EmployeePortalView
                activeSection={activeTab as any}
                onNavigateSection={handleNavigate}
              />
            )}

            {/* HR Operational Views (Accessible by Administrator & HR Admin) */}
            {activeTab === 'dashboard' &&
              (isEmployee ? (
                <AccessDenied
                  moduleName="Executive Dashboard"
                  requiredRole="HR Admin or Administrator"
                  onGoToDashboard={() => setActiveTab('my-profile')}
                />
              ) : (
                <DashboardView
                  onNavigateTo={handleNavigate}
                  onOpenAddEmployee={() => setActiveTab('employees')}
                  onOpenRecordAttendance={() => setActiveTab('attendance')}
                  onOpenRegisterLeave={() => setActiveTab('leave')}
                />
              ))}

            {activeTab === 'attendance' &&
              (isEmployee ? (
                <AccessDenied
                  moduleName="Organization Attendance Management"
                  requiredRole="HR Admin or Administrator"
                  onGoToDashboard={() => setActiveTab('my-attendance')}
                />
              ) : (
                <AttendanceView />
              ))}

            {activeTab === 'leave' &&
              (isEmployee ? (
                <AccessDenied
                  moduleName="Organization Leave Management"
                  requiredRole="HR Admin or Administrator"
                  onGoToDashboard={() => setActiveTab('my-leave')}
                />
              ) : (
                <LeaveView />
              ))}

            {activeTab === 'employees' &&
              (isEmployee ? (
                <AccessDenied
                  moduleName="Employee Master Data"
                  requiredRole="HR Admin or Administrator"
                  onGoToDashboard={() => setActiveTab('my-profile')}
                />
              ) : (
                <EmployeeView />
              ))}

            {activeTab === 'departments' &&
              (isEmployee ? (
                <AccessDenied
                  moduleName="Department Management"
                  requiredRole="HR Admin or Administrator"
                  onGoToDashboard={() => setActiveTab('my-profile')}
                />
              ) : (
                <DepartmentView />
              ))}

            {activeTab === 'reports' &&
              (isEmployee ? (
                <AccessDenied
                  moduleName="HR Analytics & Reports"
                  requiredRole="HR Admin or Administrator"
                  onGoToDashboard={() => setActiveTab('my-profile')}
                />
              ) : (
                <ReportsView />
              ))}

            {/* Protected Administrative Routes: Administrator Only (Requirement 2, 5, 9) */}
            {activeTab === 'admin-config' &&
              (isAdmin ? (
                <AdminConfigView />
              ) : (
                <AccessDenied
                  moduleName="Admin Configuration"
                  requiredRole="Administrator"
                  onGoToDashboard={() => setActiveTab(isEmployee ? 'my-profile' : 'dashboard')}
                />
              ))}

            {activeTab === 'roles' &&
              (isAdmin ? (
                <AdminConfigView initialSubTab="rbac" />
              ) : (
                <AccessDenied
                  moduleName="RBAC Role Management"
                  requiredRole="Administrator"
                  onGoToDashboard={() => setActiveTab(isEmployee ? 'my-profile' : 'dashboard')}
                />
              ))}

            {activeTab === 'users' &&
              (isAdmin ? (
                <AdminConfigView initialSubTab="users" />
              ) : (
                <AccessDenied
                  moduleName="User Management"
                  requiredRole="Administrator"
                  onGoToDashboard={() => setActiveTab(isEmployee ? 'my-profile' : 'dashboard')}
                />
              ))}

            {activeTab === 'activity' &&
              (isAdmin ? (
                <AdminConfigView initialSubTab="audit" />
              ) : (
                <AccessDenied
                  moduleName="System Audit & Activity Logs"
                  requiredRole="Administrator"
                  onGoToDashboard={() => setActiveTab(isEmployee ? 'my-profile' : 'dashboard')}
                />
              ))}

            {activeTab === 'settings' &&
              (isAdmin ? (
                <AdminConfigView initialSubTab="profile" />
              ) : (
                <AccessDenied
                  moduleName="Company Profile & System Settings"
                  requiredRole="Administrator"
                  onGoToDashboard={() => setActiveTab(isEmployee ? 'my-profile' : 'dashboard')}
                />
              ))}
          </div>
        </main>

        {/* Corporate Geometric Balance Footer */}
        <footer className="h-10 bg-white border-t border-gray-200 flex items-center justify-between px-6 sm:px-8 text-[11px] text-gray-400 shrink-0 select-none">
          <p>
            &copy; 2026 {companyProfile?.displayName || 'Ethiopian Reinsurance S.C.'} HRMS. All Rights Reserved.
          </p>
          <div className="flex items-center gap-4 uppercase tracking-tight font-bold text-[10px]">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  firebaseStatus?.connected ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              Firebase: <span className="text-[#002855] font-black">{firebaseStatus?.projectId || 'etrhr-2c642'}</span>
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span>
              RBAC: <span className="text-emerald-600 font-bold">Enforced</span>
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="hidden sm:inline text-gray-500">v2.2.0-RBAC</span>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTo={handleNavigate}
      />
      <FirestoreRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
};

const RootApp: React.FC = () => {
  const {
    isAuthenticated,
    currentUser,
    firebaseUser,
    isVerificationRequired,
    unverifiedEmail,
    isLoadingAuth,
    logout,
  } = useAuth();
  const [isLoginHelpOpen, setIsLoginHelpOpen] = useState(false);

  // Initial loader
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#002855] border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Verifying Authentication &amp; RBAC...</p>
        </div>
      </div>
    );
  }

  // Mandatory Email Verification Gate
  const isUnverifiedState =
    isVerificationRequired ||
    (firebaseUser && !firebaseUser.emailVerified) ||
    (currentUser && !currentUser.emailVerified);

  if (isUnverifiedState) {
    return (
      <EmailVerificationView
        targetEmail={unverifiedEmail || currentUser?.email || firebaseUser?.email || ''}
        onBackToLogin={async () => {
          await logout();
        }}
      />
    );
  }

  // Not authenticated -> Login View
  if (!isAuthenticated || !currentUser || !currentUser.emailVerified) {
    return (
      <>
        <LoginView onOpenHelp={() => setIsLoginHelpOpen(true)} />
        <HelpModal isOpen={isLoginHelpOpen} onClose={() => setIsLoginHelpOpen(false)} />
      </>
    );
  }

  // Only authenticated and verified users mount MainLayout
  return <MainLayout />;
};

export default function App() {
  return (
    <AuthProvider>
      <HRMSProvider>
        <RootApp />
      </HRMSProvider>
    </AuthProvider>
  );
}
