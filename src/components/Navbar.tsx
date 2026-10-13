import React, { useState } from 'react';
import {
  Menu,
  Bell,
  HelpCircle,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Shield,
  Briefcase,
  UserCheck,
  ArrowRightLeft,
  BookOpen,
  FileText,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { EthioReLogo } from './EthioReLogo';
import { ConfirmDialog } from './ConfirmDialog';
import { ActiveTab, UserRole } from '../types/hrms';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onNavigateTo: (tab: ActiveTab) => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenHelp,
  onOpenProfile,
  onOpenNotifications,
  onNavigateTo,
  isSidebarCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const { attendanceRecords, leaveRecords, companyProfile, firestoreRulesRequired, setIsRulesModalOpen } = useHRMS();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOutConfirm = async () => {
    setShowSignOutConfirm(false);
    setShowUserMenu(false);
    await logout();
  };

  // Count alerts for badge
  const todayStr = new Date().toISOString().split('T')[0];
  const alertCount =
    attendanceRecords.filter((a) => a.attendanceDate === todayStr && (a.lateStatus || a.attendanceStatus === 'Absent')).length +
    leaveRecords.filter((l) => l.leaveStatus === 'Active' && todayStr >= l.startDate && todayStr <= l.endDate).length;

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-xs"
    >
      {/* Left: Mobile menu toggle / Desktop collapse toggle + Logo + Entity Title with Geometric Divider */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          aria-label="Open navigation drawer"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:text-[#002855] hover:bg-gray-100 md:hidden cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tablet / Desktop Collapse Trigger */}
        {onToggleCollapse && (
          <button
            id="btn-desktop-toggle-sidebar"
            onClick={onToggleCollapse}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 min-h-[40px] min-w-[40px] hidden md:flex items-center justify-center rounded-lg text-gray-500 hover:text-[#002855] hover:bg-gray-100 cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Expand navigation panel' : 'Collapse navigation panel'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="shrink-0">
          <EthioReLogo size="md" />
        </div>

        <div className="hidden lg:block h-6 w-[1px] bg-gray-200 mx-1 shrink-0"></div>
        <span className="hidden lg:inline-block text-xs font-semibold text-gray-500 tracking-tight truncate max-w-xs">
          {companyProfile?.displayName || 'Ethiopian Reinsurance S.C.'}
        </span>
      </div>

      {/* Right: Quick Role Switcher + Notifications + Help + User Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Verified Assigned Corporate Role Badge (Responsive: hidden on narrow mobile, visible sm+) */}
        <div
          id="badge-user-role"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold shadow-2xs select-none"
          style={{
            borderColor: isAdmin ? '#002855' : currentUser?.role === 'HR Admin' ? '#D4AF37' : '#10B981',
            backgroundColor: isAdmin
              ? 'rgba(0, 40, 85, 0.05)'
              : currentUser?.role === 'HR Admin'
              ? 'rgba(212, 175, 55, 0.1)'
              : 'rgba(16, 185, 129, 0.08)',
            color: isAdmin ? '#002855' : currentUser?.role === 'HR Admin' ? '#855d0a' : '#047857',
          }}
          title={`Verified corporate role: ${currentUser?.role || 'Employee'}`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] font-medium text-gray-500 uppercase tracking-wider">Role:</span>
          <span className="font-bold">{currentUser?.role || 'Employee'}</span>
        </div>

        {/* Firestore Rules Badge / Alert */}
        {firestoreRulesRequired && (
          <button
            id="btn-rules-alert-nav"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            title="Firestore Security Rules Setup Required"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Firebase Rules</span>
          </button>
        )}

        {/* Notifications Button */}
        <button
          id="btn-top-notifications"
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="relative text-gray-500 hover:text-[#D4AF37] min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4AF37] text-[#002855] text-[9px] font-black flex items-center justify-center ring-2 ring-white">
              {alertCount}
            </span>
          )}
        </button>

        {/* Help Menu Dropdown in Top Navigation */}
        <div className="relative">
          <button
            id="btn-top-help"
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            aria-label="Open help menu"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center gap-1 text-gray-500 hover:text-[#002855] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Help & Support Menu"
          >
            <HelpCircle className="w-5 h-5 text-gray-500 hover:text-[#002855]" />
            <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" />
          </button>

          {showHelpMenu && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#002855] text-xs">Help &amp; Documentation</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#002855] font-semibold">
                    v2.1
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Guidance &amp; Ethiopian Labour Law Compliance
                </p>
              </div>

              <div className="py-1">
                <button
                  id="btn-help-menu-guide"
                  onClick={() => {
                    setShowHelpMenu(false);
                    onOpenHelp();
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2.5 cursor-pointer text-gray-700 hover:text-[#002855]"
                >
                  <BookOpen className="w-4 h-4 text-[#002855] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">HRMS User Manual</div>
                    <div className="text-[11px] text-gray-500">Comprehensive module guides &amp; FAQs</div>
                  </div>
                </button>

                <button
                  id="btn-help-menu-roles"
                  onClick={() => {
                    setShowHelpMenu(false);
                    onNavigateTo('roles');
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2.5 cursor-pointer text-gray-700 hover:text-[#002855]"
                >
                  <Shield className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Role &amp; Permissions Matrix</div>
                    <div className="text-[11px] text-gray-500">Administrator vs HR Officer permissions</div>
                  </div>
                </button>

                <button
                  id="btn-help-menu-law"
                  onClick={() => {
                    setShowHelpMenu(false);
                    onOpenHelp();
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2.5 cursor-pointer text-gray-700 hover:text-[#002855]"
                >
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Labour Law Proclamation</div>
                    <div className="text-[11px] text-gray-500">Proclamation No. 1156/2019 rules</div>
                  </div>
                </button>

                <button
                  id="btn-help-menu-rules"
                  onClick={() => {
                    setShowHelpMenu(false);
                    setIsRulesModalOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2.5 cursor-pointer text-gray-700 hover:text-[#002855]"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Firestore Security Rules</span>
                      {firestoreRulesRequired && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">Action needed</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">View &amp; publish Firebase security rules</div>
                  </div>
                </button>

                <button
                  id="btn-help-menu-contact"
                  onClick={() => {
                    setShowHelpMenu(false);
                    onOpenHelp();
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-start gap-2.5 cursor-pointer text-gray-700 hover:text-[#002855]"
                >
                  <PhoneCall className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">IT Support &amp; Administrator</div>
                    <div className="text-[11px] text-gray-500">support@ethiore.com &middot; Ext. 5757</div>
                  </div>
                </button>
              </div>

              <div className="px-4 py-2 border-t border-gray-100 bg-slate-50 flex items-center justify-between text-[11px]">
                <span className="text-gray-500 font-medium">Need immediate help?</span>
                <button
                  onClick={() => {
                    setShowHelpMenu(false);
                    onOpenHelp();
                  }}
                  className="font-bold text-[#002855] hover:underline cursor-pointer"
                >
                  Open Full Guide &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area */}
        <div className="relative">
          <div
            id="btn-top-user-profile"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#002855] group-hover:text-[#004080]">
                {currentUser?.fullName}
              </p>
              <p className="text-[10px] text-gray-500 font-medium">{currentUser?.role}</p>
            </div>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 border-2 border-[#D4AF37] flex items-center justify-center font-bold text-[#002855] text-sm shadow-xs">
              {currentUser?.fullName.charAt(0) || 'U'}
            </div>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-24px)] bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-[#002855]">{currentUser?.fullName}</p>
                <p className="text-[11px] text-gray-500 truncate">{currentUser?.email}</p>
                <span
                  className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: isAdmin ? 'rgba(0, 40, 85, 0.08)' : 'rgba(212, 175, 55, 0.15)',
                    color: isAdmin ? '#002855' : '#855d0a',
                  }}
                >
                  {currentUser?.role}
                </span>
              </div>

              <button
                id="btn-profile-edit"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenProfile();
                }}
                className="w-full px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>My Profile &amp; Password</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                id="btn-logout"
                onClick={() => {
                  setShowUserMenu(false);
                  setShowSignOutConfirm(true);
                }}
                className="w-full px-4 py-2.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Top-Right Corner Sign Out Button (Requirement: Far top-right corner of authenticated application header) */}
        <div className="h-6 w-[1px] bg-gray-200 hidden sm:block"></div>

        <button
          id="btn-top-right-signout"
          onClick={() => setShowSignOutConfirm(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[40px] rounded-lg border border-slate-200 sm:border-rose-200 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs group"
          title="Sign out of HRMS"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600 transition-colors" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </header>
  );
};
