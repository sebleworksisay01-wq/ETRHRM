import React, { useState } from 'react';
import {
  X,
  BookOpen,
  HelpCircle,
  CalendarCheck,
  PlaneTakeoff,
  Users,
  Building2,
  Mail,
  Info,
  ChevronRight,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useHRMS } from '../context/HRMSContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { branding, companyProfile } = useHRMS();
  const [activeTopic, setActiveTopic] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const topics = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'registration-guide', label: 'User Registration & Email Verification', icon: CheckCircle2 },
    { id: 'user-guide', label: 'User Roles & Access Control', icon: HelpCircle },
    { id: 'attendance-guide', label: 'Attendance Guide', icon: CalendarCheck },
    { id: 'leave-guide', label: 'Leave Management Guide', icon: PlaneTakeoff },
    { id: 'employee-guide', label: 'Employee Management', icon: Users },
    { id: 'department-guide', label: 'Department Management', icon: Building2 },
    { id: 'faqs', label: 'Frequently Asked Questions', icon: HelpCircle },
    { id: 'contact', label: 'Contact System Administrator', icon: Mail },
    { id: 'about', label: 'About Ethio-Re HRMS', icon: Info },
  ];

  const filteredTopics = searchQuery.trim()
    ? topics.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : topics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
          style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Help Center &amp; Documentation</h2>
              <p className="text-xs text-blue-100/80">
                Official operational guidelines for {branding.companyDisplayName || 'Ethiopian Reinsurance'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-help"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search help topics, operational guides, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content Body with Responsive Left Navigation */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Topics Navigation: horizontal scroll on mobile, vertical sidebar on desktop */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/80 p-2 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1.5 scrollbar-thin">
            {filteredTopics.map((topic) => {
              const Icon = topic.icon;
              const isActive = activeTopic === topic.id;
              return (
                <button
                  key={topic.id}
                  id={`help-topic-${topic.id}`}
                  onClick={() => setActiveTopic(topic.id)}
                  className={`flex items-center justify-between px-3 py-2 md:py-2.5 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer shrink-0 md:shrink whitespace-nowrap md:whitespace-normal ${
                    isActive
                      ? 'bg-blue-50 text-blue-950 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  style={
                    isActive
                      ? {
                          borderLeft: '4px solid var(--accent-color, #C9972E)',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="truncate">{topic.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0 hidden md:inline" />}
                </button>
              );
            })}
          </div>

          {/* Right Topic Details */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto text-sm text-slate-700 space-y-4">
            {activeTopic === 'getting-started' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Welcome to Ethio-Re HRMS</h3>
                <p className="leading-relaxed">
                  The Ethiopian Reinsurance S.C. Human Resource Management System is purpose-built to streamline daily HR operations without bureaucratic approval bottlenecks. All attendance and leave events are directly finalized by authorized HR personnel.
                </p>

                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                  <h4 className="font-semibold text-amber-950 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    Key Architectural Principles
                  </h4>
                  <ul className="list-disc list-inside text-xs text-amber-900/90 space-y-1">
                    <li><strong>Direct Finalization:</strong> HR Officers register attendance and leave directly without pending supervisor queues.</li>
                    <li><strong>Two Fixed Roles:</strong> Only Administrator (full system &amp; user control) and HR Officer (daily operational management).</li>
                    <li><strong>Automated Working Day Validation:</strong> Leave calculations automatically deduct Saturdays, Sundays, and configured Ethiopian public holidays.</li>
                  </ul>
                </div>

                <h4 className="font-bold text-slate-900 pt-2">Quick Navigation Steps</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border border-slate-200 rounded-lg bg-white">
                    <div className="font-bold text-slate-900 mb-1">1. Record Attendance</div>
                    <p className="text-slate-600">Navigate to Attendance &rarr; click &ldquo;Record Attendance&rdquo; &rarr; select employee &rarr; enter check-in time &rarr; save.</p>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-lg bg-white">
                    <div className="font-bold text-slate-900 mb-1">2. Register Leave</div>
                    <p className="text-slate-600">Navigate to Leave &rarr; click &ldquo;Register Leave&rdquo; &rarr; choose dates &rarr; working days &amp; balance are automatically checked &rarr; save.</p>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-lg bg-white">
                    <div className="font-bold text-slate-900 mb-1">3. Manage Employees</div>
                    <p className="text-slate-600">Go to Company Settings &rarr; Employees &rarr; add new hires or update profiles with complete records.</p>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-lg bg-white">
                    <div className="font-bold text-slate-900 mb-1">4. Generate Reports</div>
                    <p className="text-slate-600">Open Reports &rarr; filter by date or department &rarr; print or export directly to CSV/Excel.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTopic === 'registration-guide' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">User Registration &amp; Email Verification</h3>
                <p className="leading-relaxed">
                  Phase 1 establishes enterprise-grade identity onboarding and verification to guarantee that only authorized company personnel access corporate human resource data.
                </p>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <h4 className="font-bold text-blue-950 text-sm">1. Company Email Domain Restriction Policy</h4>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Self-registration is strictly restricted to Ethiopian Reinsurance company email addresses ending with <strong className="font-mono bg-white px-1.5 py-0.5 rounded text-blue-950">@ethiopianre.com</strong>.
                    Public email domains (such as Gmail, Yahoo, Outlook) are unconditionally rejected at the registration gate.
                  </p>
                  <p className="text-xs text-purple-900 font-medium">
                    <strong>Designated Administrator Exception:</strong> The specific account <span className="font-mono font-bold">contactesfaye@gmail.com</span> is granted an explicit policy exception as an authorized Administrator.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <h4 className="font-bold text-amber-950 text-sm">2. Default Role Assignment</h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Every newly self-registered user automatically receives the <strong>HR Officer</strong> role upon registration.
                    Only an active Administrator can elevate an account to the Administrator role via the User Management console.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <h4 className="font-bold text-emerald-950 text-sm">3. Mandatory Corporate Email Verification</h4>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Newly registered accounts start in <strong className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">Pending Verification</strong> status with <span className="font-mono">emailVerified: false</span>.
                    The sign-in gate enforces this check: users cannot log in to access protected HRMS modules until email ownership is confirmed.
                  </p>
                  <ul className="list-disc list-inside text-xs text-emerald-900/90 space-y-1">
                    <li>Users can confirm verification using their dispatched verification token.</li>
                    <li>System Administrators can also manually verify corporate emails directly in the User Management module.</li>
                    <li>If an unverified user attempts to sign in, the system alerts them and provides direct &ldquo;Verify Account&rdquo; and &ldquo;Resend Verification&rdquo; actions.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                  <h4 className="font-bold text-rose-950 text-sm">4. Administrator Account Protection</h4>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    To prevent governance lockouts, the system mathematically forbids deactivating, demoting, or deleting the <strong>last active Administrator</strong> account.
                  </p>
                </div>
              </div>
            )}

            {activeTopic === 'user-guide' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">User Roles &amp; Permissions</h3>
                <p className="leading-relaxed">
                  Ethio-Re HRMS strictly supports exactly two user roles with robust boundary enforcement:
                </p>

                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800">Administrator</span>
                      <span>Full System Rights</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      Has complete control over all modules, application security, user creation, role assignment, data configuration, branding colors, and activity logs.
                    </p>
                    <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                      Permissions: User Management, Roles &amp; Permissions, Data Configuration, Branding, Public Holidays, Employees, Departments, Attendance, Leave, Reports, Activity Logs.
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800">HR Officer</span>
                      <span>HR Operational Rights</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      Authorized to manage everyday personnel tasks. HR Officers cannot create user accounts, change roles, access security logs, or alter company branding.
                    </p>
                    <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                      Permissions: Dashboard, Employee Management, Department Management, Attendance Management, Leave Management, Operational Reports, Help Center, Own Profile.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTopic === 'attendance-guide' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Attendance Management Guide</h3>
                <p className="leading-relaxed">
                  Attendance records track daily employee arrival, departure, late status, and working hours without secondary managerial approval.
                </p>

                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-slate-700">
                  <li><strong>Open Attendance Module:</strong> Click &ldquo;Attendance&rdquo; in the primary navigation sidebar.</li>
                  <li><strong>Click &ldquo;Record Attendance&rdquo;:</strong> A clean entry modal opens.</li>
                  <li><strong>Select Employee:</strong> Choosing an employee automatically populates their unique Employee ID (e.g. ER-1001) and assigned Department.</li>
                  <li><strong>Specify Date &amp; Times:</strong> Enter Attendance Date, Check-In Time, and Check-Out Time. Total working hours and late status (if check-in is after 08:30 AM) calculate automatically.</li>
                  <li><strong>Select Status:</strong> Present, Late, Absent, On Leave, or Half Day.</li>
                  <li><strong>Duplicate Prevention:</strong> The system automatically blocks duplicate attendance entries for the same employee on the same date. If an error occurred, click &ldquo;Edit&rdquo; on the existing record.</li>
                  <li><strong>Export &amp; Print:</strong> Use the Export button to download attendance records in CSV format or generate a printable daily/monthly report.</li>
                </ol>
              </div>
            )}

            {activeTopic === 'leave-guide' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Leave Management Guide</h3>
                <p className="leading-relaxed">
                  Leave requests are finalized directly by the HR Officer. No multi-level approval queues exist.
                </p>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  <strong>Automated Working Days Formula:</strong>
                  <div className="mt-1 font-mono text-[11px] bg-white p-2 rounded border border-blue-100">
                    Remaining Leave = Allocated Leave Days - Used Leave Days
                  </div>
                  <p className="mt-1">
                    Weekends (Saturdays &amp; Sundays) and configured Ethiopian Public Holidays are automatically excluded from the requested leave days duration!
                  </p>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-slate-700">
                  <li><strong>Select &ldquo;Register Leave&rdquo;:</strong> Open Leave Management and click the action button.</li>
                  <li><strong>Select Active Employee:</strong> Inactive or suspended employees are prohibited from leave booking.</li>
                  <li><strong>Choose Leave Type:</strong> Annual Leave, Sick Leave, Maternity Leave, Paternity Leave, Bereavement Leave, Study Leave, or Unpaid Leave.</li>
                  <li><strong>Pick Date Range:</strong> Choose Start Date and End Date. The system instantly counts working days excluding non-working calendar days.</li>
                  <li><strong>Balance Validation:</strong> The system prevents registering leave if the employee has insufficient balance. (Administrators can check an override box if exceptional circumstances warrant).</li>
                  <li><strong>Overlap Check:</strong> The system will stop saving if the employee already has active leave during that timeframe.</li>
                </ol>
              </div>
            )}

            {activeTopic === 'employee-guide' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">Employee Management Guide</h3>
                <p className="text-xs text-slate-600">
                  Maintain the centralized registry of Ethiopian Reinsurance personnel.
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                  <li><strong>Unique Employee ID:</strong> Every employee must have a unique identifier (e.g. ER-1001).</li>
                  <li><strong>Department Assignment:</strong> Departments are loaded directly from the registered active departments.</li>
                  <li><strong>Deactivation vs. Deletion:</strong> Permanent deletion of employees with historical attendance or leave is prohibited. Use &ldquo;Deactivate&rdquo; to preserve historical audit records.</li>
                  <li><strong>Search &amp; Filter:</strong> Find employees by Name, ID, Department, Position, or Status.</li>
                </ul>
              </div>
            )}

            {activeTopic === 'department-guide' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">Department Management Guide</h3>
                <p className="text-xs text-slate-600">
                  Manage organizational divisions such as Underwriting, Claims, Finance, HR, and ICT.
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                  <li><strong>Department Code:</strong> Must be unique (e.g. UND, CLM, FIN, HRD, ICT, ACT, AUD).</li>
                  <li><strong>Referential Integrity:</strong> Departments with assigned employees cannot be deleted until employees are reassigned.</li>
                  <li><strong>Automatic Sync:</strong> Updating a department name automatically reflects in all associated employee records.</li>
                </ul>
              </div>
            )}

            {activeTopic === 'faqs' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
                <div className="space-y-2 text-xs">
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="font-bold text-slate-900 mb-1">Why is there no &ldquo;Pending Approval&rdquo; status for Leave?</div>
                    <p className="text-slate-600">In Ethio-Re HRMS, all operational HR decisions are executed directly by the HR Officer. Approval bottlenecks have been eliminated to ensure instant finalization.</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="font-bold text-slate-900 mb-1">How are Ethiopian Public Holidays updated?</div>
                    <p className="text-slate-600">The Administrator can add, update, or remove holidays in Company Settings &rarr; Public Holidays. These dates are immediately excluded from future leave calculations.</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="font-bold text-slate-900 mb-1">Can an employee register themselves in a self-service portal?</div>
                    <p className="text-slate-600">No. Ethio-Re HRMS is strictly an enterprise administrative system for HR Officers and Administrators. There is no self-service portal.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTopic === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Contact System Administrator</h3>
                <p className="text-xs text-slate-600">
                  For account inquiries, role permission adjustments, or technical assistance, contact the Ethio-Re ICT &amp; HR Systems Administration Desk:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                  <div><strong>Lead Administrator:</strong> Abebe Balcha (Director, Executive &amp; Operations)</div>
                  <div><strong>Email:</strong> admin@ethiore.com</div>
                  <div><strong>Direct Phone:</strong> +251 11 557 5757 / +251 91 123 4567</div>
                  <div><strong>Office Location:</strong> Africa Avenue, Kirkos Real Estate Building, 4th Floor, Addis Ababa, Ethiopia</div>
                </div>
              </div>
            )}

            {activeTopic === 'about' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">About Ethio-Re HRMS</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>{companyProfile.legalName}</strong> &mdash; Human Resource Management System Version 3.4 Enterprise. Designed specifically to uphold high governance standards, precise labor law compliance, and seamless operational flow for the reinsurance sector in Ethiopia.
                </p>
                <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
                  &copy; {new Date().getFullYear()} {companyProfile.displayName}. All rights reserved.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
