import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HRMSProvider, useHRMS } from './context/HRMSContext';
import { ActiveTab, UserRole } from './types/hrms';
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

export const PROTECTED_TABS: ActiveTab[] = [
  'dashboard',
  'attendance',
  'leave',
  'employees',
  'departments',
  'reports',
  'admin-config',
  'roles',
  'users',
  'activity',
  'settings',
  'my-profile',
  'my-attendance',
  'my-leave',
  'my-leave-balance',
  'my-notifications',
  'account-settings',
];

export const EMPLOYEE_ALLOWED_TABS: ActiveTab[] = [
  'my-profile',
  'my-attendance',
  'my-leave',
  'my-leave-balance',
  'my-notifications',
  'account-settings',
];

export const ADMIN_ONLY_TABS: ActiveTab[] = [
  'admin-config',
  'roles',
  'users',
  'activity',
  'settings',
];

export const getRequestedTabFromUrl = (): ActiveTab | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (hash) {
    const matched = PROTECTED_TABS.find((t) => t.toLowerCase() === hash);
    if (matched) return matched;
  }
  const path = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
  if (path) {
    const matched = PROTECTED_TABS.find((t) => t.toLowerCase() === path);
    if (matched) return matched;
  }
  return null;
};

export const resolveAuthorizedTab = (role: UserRole, preferredTab?: ActiveTab | null): ActiveTab => {
  if (role === 'Employee') {
    if (preferredTab && EMPLOYEE_ALLOWED_TABS.includes(preferredTab)) {
      return preferredTab;
    }
    return 'my-profile';
  }
  if (role === 'HR Admin') {
    if (preferredTab && !ADMIN_ONLY_TABS.includes(preferredTab)) {
      return preferredTab;
    }
    return 'dashboard';
  }
  // Administrator
  if (preferredTab && PROTECTED_TABS.includes(preferredTab)) {
    return preferredTab;
  }
  return 'dashboard';
};

/**
 * Reusable authentication & authorization route guard for every protected route.
 * Strictly verifies authenticated user exists, email verification is valid,
 * loads trusted authorized role, checks permissions, and redirects unauthorized attempts.
 */
interface ProtectedRouteGuardProps {
  moduleName: string;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  onNavigateTo: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const ProtectedRouteGuard: React.FC<ProtectedRouteGuardProps> = ({
  moduleName,
  allowedRoles,
  requiredPermission,
  onNavigateTo,
  children,
}) => {
  const { currentUser, canAccessModule, isEmployee } = useAuth();

  if (!currentUser || !currentUser.emailVerified) {
    return <UnauthenticatedRouteHandler />;
  }

  const role = currentUser.role;
  const isRoleAllowed = !allowedRoles || allowedRoles.includes(role);
  const isPermAllowed = !requiredPermission || canAccessModule(requiredPermission);

  if (!isRoleAllowed || !isPermAllowed) {
    const fallback: ActiveTab = isEmployee ? 'my-profile' : 'dashboard';
    return (
      <AccessDenied
        moduleName={moduleName}
        requiredRole={allowedRoles ? allowedRoles.join(' or ') : 'Authorized Role'}
        onGoToDashboard={() => onNavigateTo(fallback)}
      />
    );
  }

  return <>{children}</>;
};

const MainLayout: React.FC = () => {
  const { isAdmin, isHRAdmin, isEmployee, currentUser } = useAuth();
  const {
    companyProfile,
    firebaseStatus,
    firestoreRulesRequired,
    isRulesModalOpen,
    setIsRulesModalOpen,
    logAction,
  } = useHRMS();

  const userRole = (currentUser?.role || (isEmployee ? 'Employee' : isAdmin ? 'Administrator' : 'HR Admin')) as UserRole;

  // Initial tab depending on user role and URL request
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const fromUrl = getRequestedTabFromUrl();
    return resolveAuthorizedTab(userRole, fromUrl);
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Sync browser URL hash with activeTab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/#${activeTab}`);
    }
  }, [activeTab]);

  // Synchronize browser history and hash changes for authenticated users
  useEffect(() => {
    const handleUrlChange = () => {
      const fromUrl = getRequestedTabFromUrl();
      const resolved = resolveAuthorizedTab(userRole, fromUrl);
      if (fromUrl && fromUrl !== resolved) {
        logAction(
          'RBAC',
          'Unauthorized RBAC route attempt',
          `Route: ${fromUrl}`,
          `${userRole} attempted unauthorized access to: ${fromUrl}`
        );
      }
      setActiveTab(resolved);
      window.history.replaceState(null, '', `/#${resolved}`);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [userRole, logAction]);

  // Synchronize initial landing tab when role changes (e.g. testing with switchRoleForDemo)
  useEffect(() => {
    const resolved = resolveAuthorizedTab(userRole, activeTab);
    if (resolved !== activeTab) {
      setActiveTab(resolved);
    }
  }, [userRole]);

  const handleNavigate = (tab: ActiveTab) => {
    const resolved = resolveAuthorizedTab(userRole, tab);
    if (resolved !== tab) {
      logAction(
        'RBAC',
        'Unauthorized RBAC access attempt',
        `Route: ${tab}`,
        `${userRole} attempted unauthorized navigation to ${tab}`,
        { previousValue: userRole, newValue: tab }
      );
    }

    setActiveTab(resolved);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/#${resolved}`);
    }
  };

  // Check if activeTab is a Self-Service portal section
  const isSelfServiceTab = EMPLOYEE_ALLOWED_TABS.includes(activeTab);

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

        {/* Dynamic Content View Area - Protected Route Boundaries */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {/* Self-Service Portal for Employees and staff self-service */}
            {isSelfServiceTab && (
              <ProtectedRouteGuard
                moduleName="Staff Self-Service Portal"
                allowedRoles={['Employee', 'HR Admin', 'Administrator']}
                onNavigateTo={handleNavigate}
              >
                <EmployeePortalView
                  activeSection={activeTab as any}
                  onNavigateSection={handleNavigate}
                />
              </ProtectedRouteGuard>
            )}

            {/* HR Operational Views (Accessible by Administrator & HR Admin) */}
            {activeTab === 'dashboard' && (
              <ProtectedRouteGuard
                moduleName="Executive Dashboard"
                allowedRoles={['Administrator', 'HR Admin']}
                onNavigateTo={handleNavigate}
              >
                <DashboardView
                  onNavigateTo={handleNavigate}
                  onOpenAddEmployee={() => handleNavigate('employees')}
                  onOpenRecordAttendance={() => handleNavigate('attendance')}
                  onOpenRegisterLeave={() => handleNavigate('leave')}
                />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'attendance' && (
              <ProtectedRouteGuard
                moduleName="Organization Attendance Management"
                allowedRoles={['Administrator', 'HR Admin']}
                requiredPermission="attendance:view"
                onNavigateTo={handleNavigate}
              >
                <AttendanceView />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'leave' && (
              <ProtectedRouteGuard
                moduleName="Organization Leave Management"
                allowedRoles={['Administrator', 'HR Admin']}
                requiredPermission="leave:view"
                onNavigateTo={handleNavigate}
              >
                <LeaveView />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'employees' && (
              <ProtectedRouteGuard
                moduleName="Employee Master Data"
                allowedRoles={['Administrator', 'HR Admin']}
                requiredPermission="employee:master:view"
                onNavigateTo={handleNavigate}
              >
                <EmployeeView />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'departments' && (
              <ProtectedRouteGuard
                moduleName="Department Management"
                allowedRoles={['Administrator', 'HR Admin']}
                onNavigateTo={handleNavigate}
              >
                <DepartmentView />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'reports' && (
              <ProtectedRouteGuard
                moduleName="HR Analytics & Reports"
                allowedRoles={['Administrator', 'HR Admin']}
                requiredPermission="reports:view"
                onNavigateTo={handleNavigate}
              >
                <ReportsView />
              </ProtectedRouteGuard>
            )}

            {/* Protected Administrative Routes: Administrator Only */}
            {activeTab === 'admin-config' && (
              <ProtectedRouteGuard
                moduleName="Admin Configuration"
                allowedRoles={['Administrator']}
                requiredPermission="admin:company_config:view"
                onNavigateTo={handleNavigate}
              >
                <AdminConfigView />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'roles' && (
              <ProtectedRouteGuard
                moduleName="RBAC Role Management"
                allowedRoles={['Administrator']}
                requiredPermission="admin:rbac:view"
                onNavigateTo={handleNavigate}
              >
                <AdminConfigView initialSubTab="rbac" />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'users' && (
              <ProtectedRouteGuard
                moduleName="User Management"
                allowedRoles={['Administrator']}
                requiredPermission="admin:users:view"
                onNavigateTo={handleNavigate}
              >
                <AdminConfigView initialSubTab="users" />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'activity' && (
              <ProtectedRouteGuard
                moduleName="System Audit & Activity Logs"
                allowedRoles={['Administrator']}
                requiredPermission="admin:audit:view"
                onNavigateTo={handleNavigate}
              >
                <AdminConfigView initialSubTab="audit" />
              </ProtectedRouteGuard>
            )}

            {activeTab === 'settings' && (
              <ProtectedRouteGuard
                moduleName="Company Profile & System Settings"
                allowedRoles={['Administrator']}
                requiredPermission="admin:company_config:view"
                onNavigateTo={handleNavigate}
              >
                <AdminConfigView initialSubTab="profile" />
              </ProtectedRouteGuard>
            )}
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

/**
 * UnauthenticatedRouteHandler:
 * Centralized guard for all unauthenticated visitors.
 * Enforces that the Login page is the default landing page for the site.
 * Redirects any manual attempts to enter protected URLs or hashes to /#login.
 * Prevents browser Back button from navigating into protected content.
 */
const UnauthenticatedRouteHandler: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash;
      const currentPath = window.location.pathname;

      // Sanitize URL: if visitor opened /dashboard, /#employees, etc., redirect to login
      if (currentHash && currentHash !== '#/' && currentHash !== '#/login') {
        window.history.replaceState(null, '', '/#login');
      } else if (currentPath && currentPath !== '/') {
        window.history.replaceState(null, '', '/#login');
      }

      // Trap history Back/Forward navigation while unauthenticated
      const blockHistoryNavigation = () => {
        window.history.replaceState(null, '', '/#login');
      };

      window.addEventListener('popstate', blockHistoryNavigation);
      window.addEventListener('hashchange', blockHistoryNavigation);
      return () => {
        window.removeEventListener('popstate', blockHistoryNavigation);
        window.removeEventListener('hashchange', blockHistoryNavigation);
      };
    }
  }, []);

  return <LoginView />;
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

  // 1. Centralized Authentication Loading Guard
  // Displays clean corporate loading indicator while Firebase Auth initializes.
  // Strictly prevents any protected content from flashing or rendering before auth check completes.
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#002855] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">Verifying Authentication &amp; RBAC...</p>
        </div>
      </div>
    );
  }

  // 2. Mandatory Email Verification Gate
  // Require verified email addresses before granting access to the HRMS.
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

  // 3. Centralized Authentication Guard:
  // If user is not authenticated or not verified, enforce the Login page as landing page.
  // Redirect any protected module URL entered by unauthenticated visitors to login.
  if (!isAuthenticated || !currentUser || !currentUser.emailVerified) {
    return <UnauthenticatedRouteHandler />;
  }

  // 4. Fully Authenticated and Verified User: Render Protected Main Layout
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
