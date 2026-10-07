export type UserRole = 'Administrator' | 'HR Admin' | 'Employee';
export type LegacyUserRole = UserRole | 'HR Officer';

export type UserStatus = 'Pending Verification' | 'Active' | 'Inactive' | 'Suspended';

export interface RoleDefinition {
  id: string; // 'Administrator' | 'HR Admin' | 'Employee'
  name: UserRole;
  description: string;
  status: 'Active' | 'Inactive';
  isSystem: boolean;
  permissions: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
  action: 'View' | 'Create' | 'Edit' | 'Delete' | 'Export' | 'Manage';
}

export interface PermissionModuleCategory {
  module: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
}

export const RBAC_MODULE_PERMISSIONS: PermissionModuleCategory[] = [
  {
    module: 'Administration',
    label: 'Administration & System Governance',
    description: 'System-wide configuration, access control, user directories, and audit trails.',
    permissions: [
      { key: 'admin:company_config:view', label: 'Company Configuration (View)', description: 'View legal entity profile and company information', action: 'View' },
      { key: 'admin:company_config:edit', label: 'Company Configuration (Edit)', description: 'Update corporate credentials, TIN, and branding', action: 'Edit' },
      { key: 'admin:users:view', label: 'User Management (View)', description: 'View registered user identity records and statuses', action: 'View' },
      { key: 'admin:users:create', label: 'User Management (Create)', description: 'Provision new user access accounts', action: 'Create' },
      { key: 'admin:users:edit', label: 'User Management (Edit/Role Assign)', description: 'Change roles, permissions, and account activation states', action: 'Edit' },
      { key: 'admin:users:delete', label: 'User Management (Delete)', description: 'Permanently remove user credentials from the system', action: 'Delete' },
      { key: 'admin:rbac:view', label: 'RBAC (View)', description: 'Inspect role matrix and privilege definitions', action: 'View' },
      { key: 'admin:rbac:manage', label: 'RBAC (Manage)', description: 'Configure granular permissions assigned to each standard role', action: 'Manage' },
      { key: 'admin:system:view', label: 'System Configuration (View)', description: 'View statutory holiday dates and engine parameters', action: 'View' },
      { key: 'admin:system:manage', label: 'System Configuration (Manage)', description: 'Modify statutory holiday schedules and cloud database sync', action: 'Manage' },
      { key: 'admin:audit:view', label: 'Audit Logs (View)', description: 'Inspect security and operational audit logs', action: 'View' },
      { key: 'admin:audit:export', label: 'Audit Logs (Export)', description: 'Download CSV audit reports', action: 'Export' },
    ],
  },
  {
    module: 'Employee Management',
    label: 'Employee Master Data & Personnel',
    description: 'Authoritative personnel records, registration, organizational units, and profiles.',
    permissions: [
      { key: 'employee:master:view', label: 'Employee Master Data (View)', description: 'View full staff directory and personnel details', action: 'View' },
      { key: 'employee:master:create', label: 'Employee Master Data (Create)', description: 'Register new personnel into master data', action: 'Create' },
      { key: 'employee:master:edit', label: 'Employee Master Data (Edit)', description: 'Modify staff demographics, titles, and assignments', action: 'Edit' },
      { key: 'employee:master:delete', label: 'Employee Master Data (Delete)', description: 'Remove employee records from the active directory', action: 'Delete' },
      { key: 'employee:master:export', label: 'Employee Master Data (Export)', description: 'Export employee data to official CSV or PDF', action: 'Export' },
      { key: 'employee:register:view', label: 'Employee Registration (View)', description: 'View self-registration queue and unlinked records', action: 'View' },
      { key: 'employee:register:create', label: 'Employee Registration (Create)', description: 'Create verified employee accounts', action: 'Create' },
      { key: 'employee:profile:view', label: 'Employee Profile (View)', description: 'Inspect full employee operational profile', action: 'View' },
      { key: 'employee:profile:edit', label: 'Employee Profile (Edit)', description: 'Update department and position assignments', action: 'Edit' },
      { key: 'employee:import:create', label: 'Employee Import (Create)', description: 'Perform bulk staff import from CSV datasets', action: 'Create' },
      { key: 'department:view', label: 'Department Management (View)', description: 'View organizational departments and headcounts', action: 'View' },
      { key: 'department:create', label: 'Department Management (Create)', description: 'Establish new corporate operational departments', action: 'Create' },
      { key: 'department:edit', label: 'Department Management (Edit)', description: 'Edit department titles and status', action: 'Edit' },
      { key: 'department:delete', label: 'Department Management (Delete)', description: 'Remove vacant operational departments', action: 'Delete' },
    ],
  },
  {
    module: 'Attendance',
    label: 'Daily Attendance & Time Tracking',
    description: 'Check-in, check-out, working hours calculation, tardiness tracking, and reports.',
    permissions: [
      { key: 'attendance:view', label: 'View Attendance', description: 'View organization-wide daily attendance transactions', action: 'View' },
      { key: 'attendance:create', label: 'Record Attendance', description: 'Log staff check-in and check-out transactions directly', action: 'Create' },
      { key: 'attendance:edit', label: 'Edit Attendance', description: 'Correct recorded times, statuses, and remarks', action: 'Edit' },
      { key: 'attendance:delete', label: 'Delete Attendance', description: 'Remove invalid or duplicate attendance entries', action: 'Delete' },
      { key: 'attendance:export', label: 'Attendance Reports (Export)', description: 'Export attendance summaries and tardy sheets to CSV/PDF', action: 'Export' },
    ],
  },
  {
    module: 'Leave Management',
    label: 'Statutory Leave & Entitlements',
    description: 'Annual vacation, sick leave, maternity, paternity, and statutory balances.',
    permissions: [
      { key: 'leave:view', label: 'View Leave', description: 'Inspect organization-wide active leave registry', action: 'View' },
      { key: 'leave:create', label: 'Register Leave', description: 'Submit and finalize employee leave authorizations directly', action: 'Create' },
      { key: 'leave:edit', label: 'Edit Leave', description: 'Cancel, adjust, or mark authorized leaves completed', action: 'Edit' },
      { key: 'leave:delete', label: 'Delete Leave', description: 'Purge void leave transaction records', action: 'Delete' },
      { key: 'leave:types:manage', label: 'Manage Leave Types', description: 'Configure statutory leave policies and default days', action: 'Manage' },
      { key: 'leave:balance:view', label: 'View Leave Balance', description: 'Inspect staff accrued and consumed leave allowances', action: 'View' },
      { key: 'leave:balance:edit', label: 'Manage Leave Balance', description: 'Adjust opening balances or manual entitlement overrides', action: 'Edit' },
      { key: 'leave:export', label: 'Leave Reports (Export)', description: 'Export leave transaction registries to CSV/Print', action: 'Export' },
    ],
  },
  {
    module: 'Reports',
    label: 'HR Analytics & Reports',
    description: 'Attendance analytics, leave consumption, staff rosters, and audit reports.',
    permissions: [
      { key: 'reports:attendance:view', label: 'Attendance Reports (View)', description: 'Analyze attendance summaries, absences, and late arrivals', action: 'View' },
      { key: 'reports:attendance:export', label: 'Attendance Reports (Export)', description: 'Download CSV and print attendance documents', action: 'Export' },
      { key: 'reports:leave:view', label: 'Leave Reports (View)', description: 'Analyze annual and departmental leave usage', action: 'View' },
      { key: 'reports:leave:export', label: 'Leave Reports (Export)', description: 'Export leave analytics and rosters', action: 'Export' },
      { key: 'reports:employee:view', label: 'Employee Reports (View)', description: 'Analyze staff headcount, categories, and tenure', action: 'View' },
      { key: 'reports:employee:export', label: 'Employee Reports (Export)', description: 'Export complete employee lists and department summaries', action: 'Export' },
      { key: 'reports:audit:view', label: 'Audit Reports (View)', description: 'Inspect detailed system transaction history', action: 'View' },
      { key: 'reports:audit:export', label: 'Audit Reports (Export)', description: 'Export compliance audit trails', action: 'Export' },
    ],
  },
  {
    module: 'Employee Self-Service',
    label: 'Employee Self-Service (Own Records)',
    description: 'Personal profile, self attendance, self leave records, and account settings.',
    permissions: [
      { key: 'self:profile:view', label: 'View Own Profile', description: 'Inspect personal employee profile record', action: 'View' },
      { key: 'self:profile:edit', label: 'Update Permitted Personal Info', description: 'Update permitted personal contact and address details', action: 'Edit' },
      { key: 'self:attendance:view', label: 'View Own Attendance', description: 'View personal check-ins and attendance history', action: 'View' },
      { key: 'self:leave:view', label: 'View Own Leave Records', description: 'View personal leave history and current approvals', action: 'View' },
      { key: 'self:balance:view', label: 'View Own Leave Balance', description: 'View personal available and consumed statutory leave balances', action: 'View' },
      { key: 'self:notifications:view', label: 'View Own Notifications', description: 'Receive alerts regarding personal leave and holidays', action: 'View' },
      { key: 'self:settings:manage', label: 'Manage Account Settings', description: 'Change personal password and session preferences', action: 'Manage' },
    ],
  },
];

// All permission keys flat array
export const ALL_PERMISSION_KEYS: string[] = RBAC_MODULE_PERMISSIONS.flatMap((m) =>
  m.permissions.map((p) => p.key)
);

// 1. Administrator Default Permissions: FULL access to all modules
export const ADMINISTRATOR_PERMISSIONS: string[] = [
  'all',
  'admin:full_access',
  ...ALL_PERMISSION_KEYS,
];

// 2. HR Admin Default Permissions: Operational HR capabilities without RBAC or system root controls
export const HR_ADMIN_PERMISSIONS: string[] = [
  'dashboard:view',
  'employee:master:view',
  'employee:master:create',
  'employee:master:edit',
  'employee:master:export',
  'employee:register:view',
  'employee:register:create',
  'employee:profile:view',
  'employee:profile:edit',
  'employee:import:create',
  'department:view',
  'department:create',
  'department:edit',
  'attendance:view',
  'attendance:create',
  'attendance:edit',
  'attendance:export',
  'leave:view',
  'leave:create',
  'leave:edit',
  'leave:balance:view',
  'leave:balance:edit',
  'leave:export',
  'reports:attendance:view',
  'reports:attendance:export',
  'reports:leave:view',
  'reports:leave:export',
  'reports:employee:view',
  'reports:employee:export',
  'admin:company_config:view',
  'self:profile:view',
  'self:profile:edit',
  'self:attendance:view',
  'self:leave:view',
  'self:balance:view',
  'self:notifications:view',
  'self:settings:manage',
];

// Backward-compatible alias for existing imports
export const HR_OFFICER_PERMISSIONS: string[] = HR_ADMIN_PERMISSIONS;

// 3. Employee Default Permissions: STRICTLY self-service access only
export const EMPLOYEE_PERMISSIONS: string[] = [
  'self:profile:view',
  'self:profile:edit',
  'self:attendance:view',
  'self:leave:view',
  'self:balance:view',
  'self:notifications:view',
  'self:settings:manage',
];

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'Administrator',
    name: 'Administrator',
    description: 'Full system access & governance. Manages users, RBAC security, corporate configurations, and audit logs.',
    status: 'Active',
    isSystem: true,
    permissions: ADMINISTRATOR_PERMISSIONS,
  },
  {
    id: 'HR Admin',
    name: 'HR Admin',
    description: 'HR operational access. Manages employee master data, attendance logging, leave approvals, and reports.',
    status: 'Active',
    isSystem: true,
    permissions: HR_ADMIN_PERMISSIONS,
  },
  {
    id: 'Employee',
    name: 'Employee',
    description: 'Restricted employee self-service access. View own profile, attendance, leave balance, and personal settings.',
    status: 'Active',
    isSystem: true,
    permissions: EMPLOYEE_PERMISSIONS,
  },
];

export interface User {
  id: string;
  uid?: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  employeeId?: string; // Linked Employee Master Data ID (e.g. EMP-001 or ER-1001)
  permissions?: string[];
  verificationToken?: string;
  createdDate: string;
  createdAt?: string;
  updatedDate?: string;
  updatedAt?: string;
  lastLogin: string;
  lastLoginAt?: string;
  phone?: string;
  department?: string;
  password?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface AppNotification {
  id: string;
  recipientUserId: string; // Firebase Authentication UID
  recipientEmployeeId?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  type: 'leave' | 'attendance' | 'employee' | 'system';
  read: boolean;
  createdAt: string;
  relatedRecordId?: string;
}

export const JOB_TITLE_OPTIONS = [
  'Senior',
  'Junior',
  'Officer',
  'Manager',
  'CEO',
  'EO',
  'Director',
] as const;

export type JobTitleOption = typeof JOB_TITLE_OPTIONS[number];

export type EmploymentStatus = 'Active' | 'Inactive' | 'On Leave' | 'Probation' | 'Terminated';
export type EmploymentType = 'Permanent' | 'Contract' | 'Trainee' | 'Temporary';
export type EmployeeCategory = 'Executive' | 'Supervisory' | 'Professional' | 'Technical' | 'Support';

export type Gender = 'Male' | 'Female' | 'Other';

export interface Employee {
  id: string;
  employeeId: string; // e.g. "EMP-001" or "ER-1001"
  employeeCode?: string; // e.g. "E001" or "EMP-001"
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  phone?: string;
  altPhoneNumber?: string;
  address: string;
  departmentId: string;
  departmentName: string;
  position: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  category?: EmployeeCategory;
  hireDate: string;
  dateOfHire?: string;
  leaveBalance?: number; // Current statutory annual leave balance in days
  currentLeaveBalance?: number; // Synonymous / imported current balance
  createdDate: string;
  createdBy: string;
  updatedDate: string;
  updatedBy: string;
  photoUrl?: string;
  userId?: string; // Firebase Authentication UID of the linked account
  linkedUserId?: string; // Synonymous Firebase UID
  userEmail?: string;
}

export type DepartmentStatus = 'Active' | 'Inactive';

export interface Department {
  id: string;
  departmentId: string; // e.g. "DEP-01"
  name: string;
  departmentName?: string;
  code: string; // e.g. "UND", "FIN"
  departmentCode?: string;
  description: string;
  headOfDepartment?: string;
  headEmployeeId?: string;
  status: DepartmentStatus;
  createdDate: string;
  updatedDate: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Half Day';

export interface AttendanceRecord {
  id: string;
  employeeId: string; // ER-XXXX
  employeeRecordId: string; // UUID
  employeeName: string;
  department: string;
  attendanceDate: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm
  checkOutTime: string; // HH:mm
  attendanceStatus: AttendanceStatus;
  workingHours: number;
  lateStatus: boolean;
  lateMinutes: number;
  remarks: string;
  recordedBy: string;
  createdDate: string;
  updatedDate: string;
}

export type LeaveStatus = 'Active' | 'Completed' | 'Cancelled';

export interface LeaveTypeItem {
  id: string;
  name: string;
  code: string;
  defaultDays: number;
  isPaid: boolean;
  description: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string; // ER-XXXX
  employeeRecordId: string; // UUID
  employeeName: string;
  department: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  numberOfDays: number;
  reason: string;
  leaveStatus: LeaveStatus;
  remarks: string;
  recordedBy: string;
  createdDate: string;
  updatedDate: string;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  byType: Record<string, { allocated: number; used: number; remaining: number }>;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface CompanyProfile {
  displayName: string;
  legalName: string;
  shortName: string;
  logo: string;
  email: string;
  phoneNumber: string;
  website: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  taxId: string;
  description: string;
  industry?: string;
  registrationNumber?: string;
  establishedYear?: number;
  officialEmail?: string;
  officialPhone?: string;
}

export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  companyDisplayName: string;
  companyLogo: string;
  logoUrl?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  role?: string;
  userRole?: string;
  module:
    | 'Authentication'
    | 'User Management'
    | 'RBAC'
    | 'Administration'
    | 'Employee Management'
    | 'Department Management'
    | 'Attendance'
    | 'Leave Management'
    | 'Company Profile'
    | 'Data Configuration'
    | 'Branding'
    | 'Holidays'
    | 'Settings';
  action: string;
  previousValue?: string;
  newValue?: string;
  targetUser?: string;
  deviceInfo?: string;
  recordOrEntity?: string;
  recordId?: string;
  details: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'attendance'
  | 'leave'
  | 'employees'
  | 'departments'
  | 'settings'
  | 'admin-config'
  | 'users'
  | 'roles'
  | 'activity'
  | 'reports'
  | 'my-profile'
  | 'my-attendance'
  | 'my-leave'
  | 'my-leave-balance'
  | 'my-notifications'
  | 'account-settings';
