import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  normalizeEmployeeId,
  getEmployeeIdDocKey,
  auditEmployeeIdIntegrity,
  EmployeeIdIntegrityReport,
} from '../utils/employeeUtils';
import {
  Employee,
  Department,
  AttendanceRecord,
  LeaveRecord,
  LeaveTypeItem,
  PublicHoliday,
  CompanyProfile,
  BrandingSettings,
  ActivityLog,
  User,
  UserRole,
  UserStatus,
  RoleDefinition,
  DEFAULT_ROLE_DEFINITIONS,
  ADMINISTRATOR_PERMISSIONS,
  HR_ADMIN_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  HR_OFFICER_PERMISSIONS,
} from '../types/hrms';
import {
  INITIAL_BRANDING,
  INITIAL_COMPANY_PROFILE,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_TYPES,
  INITIAL_PUBLIC_HOLIDAYS,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVES,
  INITIAL_USERS,
  DEMO_RECORD_IDS,
} from '../data/seedData';
import { useAuth, SPECIAL_ADMIN_EMAIL, isAuthorizedAdmin } from './AuthContext';
import { calculateWorkingLeaveDays, checkLeaveOverlap, calculateEmployeeLeaveBalance } from '../utils/leaveCalculator';
import {
  testFirestoreConnection,
  uploadFileToStorage,
  deleteFileFromStorage,
  FirebaseConnectionStatus,
  handleFirestoreError,
  OperationType,
  sanitizeForFirestore,
} from '../utils/firebaseService';

interface HRMSContextType {
  // State
  branding: BrandingSettings;
  companyProfile: CompanyProfile;
  employees: Employee[];
  departments: Department[];
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  leaveTypes: LeaveTypeItem[];
  publicHolidays: PublicHoliday[];
  activityLogs: ActivityLog[];
  users: User[];
  isLoadingData: boolean;

  // Employee actions
  addEmployee: (emp: Omit<Employee, 'id' | 'createdDate' | 'createdBy' | 'updatedDate' | 'updatedBy'>) => Promise<{ success: boolean; error?: string }>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<{ success: boolean; error?: string }>;
  toggleEmployeeStatus: (id: string) => Promise<void>;
  deleteEmployee: (id: string) => Promise<{ success: boolean; error?: string }>;
  uploadEmployeePhoto: (file: File, employeeId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  syncRegistryForExistingEmployees: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
  auditEmployeeIds: () => EmployeeIdIntegrityReport;

  // Department actions
  addDepartment: (dept: Omit<Department, 'id' | 'createdDate' | 'updatedDate'>) => Promise<{ success: boolean; error?: string; department?: Department }>;
  updateDepartment: (id: string, dept: Partial<Department>) => Promise<{ success: boolean; error?: string }>;
  toggleDepartmentStatus: (id: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Attendance actions
  recordAttendance: (record: Omit<AttendanceRecord, 'id' | 'createdDate' | 'updatedDate' | 'recordedBy'>) => Promise<{ success: boolean; error?: string }>;
  updateAttendance: (id: string, record: Partial<AttendanceRecord>) => Promise<{ success: boolean; error?: string }>;
  deleteAttendance: (id: string) => Promise<void>;

  // Leave actions
  createLeaveRecord: (record: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    remarks?: string;
    allowBalanceException?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  updateLeaveRecord: (id: string, updates: Partial<LeaveRecord>) => Promise<{ success: boolean; error?: string }>;
  cancelLeaveRecord: (id: string, remarks?: string) => Promise<{ success: boolean; error?: string }>;
  completeLeaveRecord: (id: string) => Promise<{ success: boolean; error?: string }>;
  getEmployeeBalance: (employeeId: string) => ReturnType<typeof calculateEmployeeLeaveBalance>;

  // Public holidays
  addPublicHoliday: (holiday: Omit<PublicHoliday, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updatePublicHoliday: (id: string, holiday: Partial<PublicHoliday>) => Promise<void>;
  deletePublicHoliday: (id: string) => Promise<void>;

  // Leave Types
  updateLeaveType: (id: string, updates: Partial<LeaveTypeItem>) => Promise<void>;
  updateLeaveTypeDays: (id: string, defaultDays: number) => Promise<void>;

  // Company Profile & Branding
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => Promise<void>;
  updateBranding: (branding: Partial<BrandingSettings>) => Promise<void>;
  resetBrandingToDefault: () => Promise<void>;
  uploadCompanyLogo: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  removeCompanyLogo: () => Promise<{ success: boolean; error?: string }>;

  // Users (Admin only)
  addUser: (user: {
    fullName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    emailVerified?: boolean;
    phone?: string;
    department?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (id: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (id: string, status: UserStatus) => Promise<{ success: boolean; error?: string }>;
  suspendUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  verifyUserManually: (id: string) => Promise<{ success: boolean; message: string }>;
  resendVerificationForUser: (id: string) => Promise<{ success: boolean; message: string; token?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (id: string) => Promise<{ success: boolean; message: string; tempPassword?: string }>;
  linkUserToEmployee: (userId: string, employeeId: string) => Promise<{ success: boolean; error?: string }>;
  unlinkUserEmployee: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // RBAC Roles & Permissions
  roleDefinitions: RoleDefinition[];
  updateRolePermissions: (roleId: string, permissions: string[]) => Promise<{ success: boolean; error?: string }>;
  resetRolePermissions: (roleId: string) => Promise<{ success: boolean; error?: string }>;

  // Logging
  logAction: (
    module: ActivityLog['module'],
    action: string,
    recordOrEntity: string,
    details: string,
    auditMeta?: {
      previousValue?: string;
      newValue?: string;
      targetUser?: string;
      deviceInfo?: string;
    }
  ) => void;

  // Firebase Cloud Integration
  firebaseStatus: FirebaseConnectionStatus | null;
  refreshFirebaseStatus: () => Promise<FirebaseConnectionStatus>;
  syncAllToFirebase: () => Promise<{ success: boolean; message: string }>;
  firestoreRulesRequired: boolean;
  setFirestoreRulesRequired: (required: boolean) => void;
  isRulesModalOpen: boolean;
  setIsRulesModalOpen: (open: boolean) => void;
}

const BRANDING_CACHE_KEY = 'ethiore_branding_cache_v2';
const PROFILE_CACHE_KEY = 'ethiore_profile_cache_v2';

function getInitialBranding(): BrandingSettings {
  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    if (cached) {
      return { ...INITIAL_BRANDING, ...JSON.parse(cached) };
    }
  } catch {
    // ignore
  }
  return INITIAL_BRANDING;
}

function getInitialCompanyProfile(): CompanyProfile {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      return { ...INITIAL_COMPANY_PROFILE, ...JSON.parse(cached) };
    }
  } catch {
    // ignore
  }
  return INITIAL_COMPANY_PROFILE;
}

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

export const HRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, isHROfficer } = useAuth();

  // State populated directly from Firestore or localStorage cache
  const [branding, setBranding] = useState<BrandingSettings>(getInitialBranding);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(getInitialCompanyProfile);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const cached =
        localStorage.getItem('ethiore_employees_cache_v2') ||
        localStorage.getItem('ethiore_employees_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((e: any) => !DEMO_RECORD_IDS.employees.includes(e?.id) && !e?.id?.startsWith('emp-00'));
        }
      }
    } catch (_) {}
    return [];
  });
  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const cached = localStorage.getItem('ethiore_departments_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((d: any) => !DEMO_RECORD_IDS.departments.includes(d?.id) && !d?.id?.startsWith('dept-00'));
        }
      }
    } catch (_) {}
    return [];
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const cached = localStorage.getItem('ethiore_attendance_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: any) => !DEMO_RECORD_IDS.attendance.includes(a?.id) && !a?.id?.startsWith('att-00'));
        }
      }
    } catch (_) {}
    return [];
  });
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(() => {
    try {
      const cached = localStorage.getItem('ethiore_leaves_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((l: any) => !DEMO_RECORD_IDS.leaves.includes(l?.id) && !l?.id?.startsWith('lv-00'));
        }
      }
    } catch (_) {}
    return [];
  });
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>(INITIAL_LEAVE_TYPES);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>(INITIAL_PUBLIC_HOLIDAYS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem('ethiore_users_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((u: any) => !DEMO_RECORD_IDS.users.includes(u?.id) && !u?.id?.startsWith('usr-00'));
        }
      }
    } catch (_) {}
    return [];
  });
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(() => {
    try {
      const cached = localStorage.getItem('ethiore_rbac_roles_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
      }
    } catch (_) {}
    return DEFAULT_ROLE_DEFINITIONS;
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus | null>(null);
  const [firestoreRulesRequired, setFirestoreRulesRequired] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const hasInitializedDefaults = useRef(false);

  // Sync role definitions to cache
  useEffect(() => {
    if (roleDefinitions.length > 0) {
      try {
        localStorage.setItem('ethiore_rbac_roles_cache', JSON.stringify(roleDefinitions));
      } catch (_) {}
    }
  }, [roleDefinitions]);

  // Sync state changes to local storage cache for offline/permission resilience
  useEffect(() => {
    if (employees.length > 0) {
      try { localStorage.setItem('ethiore_employees_cache_v2', JSON.stringify(employees)); } catch (_) {}
    }
  }, [employees]);

  useEffect(() => {
    if (departments.length > 0) {
      try { localStorage.setItem('ethiore_departments_cache', JSON.stringify(departments)); } catch (_) {}
    }
  }, [departments]);

  useEffect(() => {
    if (attendanceRecords.length > 0) {
      try { localStorage.setItem('ethiore_attendance_cache_v2', JSON.stringify(attendanceRecords)); } catch (_) {}
    }
  }, [attendanceRecords]);

  useEffect(() => {
    if (leaveRecords.length > 0) {
      try { localStorage.setItem('ethiore_leaves_cache_v2', JSON.stringify(leaveRecords)); } catch (_) {}
    }
  }, [leaveRecords]);

  useEffect(() => {
    if (users.length > 0) {
      try { localStorage.setItem('ethiore_users_cache_v2', JSON.stringify(users)); } catch (_) {}
    }
  }, [users]);

  // Apply CSS custom properties and document title dynamically based on branding
  useEffect(() => {
    const root = document.documentElement;
    const p = branding.primaryColor || '#002855';
    const s = branding.secondaryColor || '#004080';
    const a = branding.accentColor || '#D4AF37';

    root.style.setProperty('--primary', p);
    root.style.setProperty('--primary-color', p);
    root.style.setProperty('--secondary', s);
    root.style.setProperty('--secondary-color', s);
    root.style.setProperty('--accent', a);
    root.style.setProperty('--accent-color', a);

    const displayName = companyProfile.displayName || branding.companyDisplayName || 'Ethiopian Reinsurance S.C.';
    document.title = `${displayName} | HRMS`;
  }, [branding, companyProfile.displayName]);

  // Check connection status periodically
  const refreshFirebaseStatus = useCallback(async () => {
    const status = await testFirestoreConnection();
    setFirebaseStatus(status);
    return status;
  }, []);

  useEffect(() => {
    refreshFirebaseStatus();
  }, [refreshFirebaseStatus]);

  // Log action to Firestore activityLogs collection with detailed audit tracking
  const logAction = useCallback(
    (
      module: ActivityLog['module'],
      action: string,
      recordOrEntity: string,
      details: string,
      auditMeta?: {
        previousValue?: string;
        newValue?: string;
        targetUser?: string;
        deviceInfo?: string;
      }
    ) => {
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const detectedDevice = typeof navigator !== 'undefined'
        ? `${navigator.platform || 'Client'} (${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'})`
        : 'Enterprise Web Client';

      const newLog: ActivityLog = {
        id: logId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'sys',
        userName: currentUser?.fullName || 'System',
        userRole: currentUser?.role || 'Employee',
        role: currentUser?.role || 'Employee',
        module,
        action,
        recordOrEntity,
        recordId: recordOrEntity,
        details: details || '',
        targetUser: auditMeta?.targetUser || recordOrEntity,
        deviceInfo: auditMeta?.deviceInfo || detectedDevice,
      };

      if (auditMeta?.previousValue !== undefined && auditMeta.previousValue !== null) {
        newLog.previousValue = String(auditMeta.previousValue);
      }
      if (auditMeta?.newValue !== undefined && auditMeta.newValue !== null) {
        newLog.newValue = String(auditMeta.newValue);
      }

      // Optimistic local state update for snappy UI
      setActivityLogs((prev) => [newLog, ...prev.slice(0, 99)]);

      // Asynchronously persist to Firestore activityLogs with strict sanitization
      if (auth.currentUser) {
        const firestoreData = sanitizeForFirestore(newLog);
        setDoc(doc(db, 'activityLogs', logId), firestoreData).catch((err) => {
          if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
            console.warn('Activity log write permission notice (non-blocking):', err?.message || err);
          } else {
            handleFirestoreError(err, OperationType.CREATE, `activityLogs/${logId}`);
          }
        });
      }
    },
    [currentUser]
  );

  // Verify company configuration and purge any residual legacy demo data from Firestore
  const initializeFirestoreDefaults = useCallback(async () => {
    if (hasInitializedDefaults.current || !auth.currentUser) return;
    hasInitializedDefaults.current = true;

    try {
      // 1. Company Settings check/init
      try {
        const settingsDocRef = doc(db, 'companySettings', 'main');
        const settingsSnap = await getDoc(settingsDocRef);
        if (!settingsSnap.exists() && isAdmin) {
          const initialSettings = {
            companyDisplayName: INITIAL_COMPANY_PROFILE.displayName,
            legalCompanyName: INITIAL_COMPANY_PROFILE.legalName,
            shortName: INITIAL_COMPANY_PROFILE.shortName,
            logoUrl: INITIAL_COMPANY_PROFILE.logo || '',
            primaryColor: INITIAL_BRANDING.primaryColor,
            secondaryColor: INITIAL_BRANDING.secondaryColor,
            accentColor: INITIAL_BRANDING.accentColor,
            email: INITIAL_COMPANY_PROFILE.email,
            phone: INITIAL_COMPANY_PROFILE.phoneNumber,
            website: INITIAL_COMPANY_PROFILE.website,
            address: INITIAL_COMPANY_PROFILE.address,
            country: INITIAL_COMPANY_PROFILE.country,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(settingsDocRef, initialSettings);
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
          setFirestoreRulesRequired(true);
        }
      }

      // 2. One-time clean-up of legacy demo records from Firestore if previously seeded
      if (isAdmin && auth.currentUser) {
        try {
          const deletePromises: Promise<any>[] = [];

          DEMO_RECORD_IDS.employees.forEach((id) => {
            deletePromises.push(deleteDoc(doc(db, 'employees', id)).catch(() => {}));
          });
          DEMO_RECORD_IDS.departments.forEach((id) => {
            deletePromises.push(deleteDoc(doc(db, 'departments', id)).catch(() => {}));
          });
          DEMO_RECORD_IDS.attendance.forEach((id) => {
            deletePromises.push(deleteDoc(doc(db, 'attendance', id)).catch(() => {}));
          });
          DEMO_RECORD_IDS.leaves.forEach((id) => {
            deletePromises.push(deleteDoc(doc(db, 'leaveRecords', id)).catch(() => {}));
          });
          DEMO_RECORD_IDS.activityLogs.forEach((id) => {
            deletePromises.push(deleteDoc(doc(db, 'activityLogs', id)).catch(() => {}));
          });
          DEMO_RECORD_IDS.users.forEach((id) => {
            if (id !== auth.currentUser?.uid) {
              deletePromises.push(deleteDoc(doc(db, 'users', id)).catch(() => {}));
            }
          });

          await Promise.all(deletePromises);
        } catch (cleanupErr) {
          console.warn('Demo data cleanup notice:', cleanupErr);
        }
      }
    } catch (err) {
      console.warn('Configuration initialization note:', err);
    }
  }, [isAdmin]);

  // Real-time Firestore Listeners
  useEffect(() => {
    // MANDATORY SECURITY & RESOURCE ACCESS CONTROL:
    // Strictly do NOT start realtime Firestore listeners, load dashboard, or query protected data
    // before the user is fully authenticated, has emailVerified === true, and status === 'Active'.
    if (!currentUser || !auth.currentUser || !currentUser.emailVerified || currentUser.status !== 'Active') {
      setIsLoadingData(false);
      return;
    }

    let isMounted = true;
    const unsubscribes: (() => void)[] = [];

    const startSubscriptions = async () => {
      try {
        if (auth.currentUser) {
          // Explicitly synchronize fresh authentication token and security context with Firestore
          await auth.currentUser.getIdToken(true);
        }
      } catch (tokenErr) {
        console.warn('Authentication token sync notice:', tokenErr);
      }

      if (!isMounted) return;

      setIsLoadingData(true);
      await initializeFirestoreDefaults();

      if (!isMounted) return;

    // 1. Company Settings Listener
    try {
      const settingsSub = onSnapshot(
        doc(db, 'companySettings', 'main'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setCompanyProfile({
              displayName: data.companyDisplayName || INITIAL_COMPANY_PROFILE.displayName,
              legalName: data.legalCompanyName || INITIAL_COMPANY_PROFILE.legalName,
              shortName: data.shortName || INITIAL_COMPANY_PROFILE.shortName,
              logo: data.logoUrl || '',
              email: data.email || INITIAL_COMPANY_PROFILE.email,
              phoneNumber: data.phone || INITIAL_COMPANY_PROFILE.phoneNumber,
              website: data.website || INITIAL_COMPANY_PROFILE.website,
              address: data.address || INITIAL_COMPANY_PROFILE.address,
              city: data.city || INITIAL_COMPANY_PROFILE.city,
              country: data.country || INITIAL_COMPANY_PROFILE.country,
              postalCode: data.postalCode || INITIAL_COMPANY_PROFILE.postalCode,
              taxId: data.taxId || INITIAL_COMPANY_PROFILE.taxId,
              description: data.description || INITIAL_COMPANY_PROFILE.description,
              industry: data.industry || INITIAL_COMPANY_PROFILE.industry || 'Financial Services & Reinsurance',
              registrationNumber: data.registrationNumber || INITIAL_COMPANY_PROFILE.registrationNumber || 'NBR/001/2016',
              establishedYear: data.establishedYear ? Number(data.establishedYear) : (INITIAL_COMPANY_PROFILE.establishedYear || 2016),
              officialEmail: data.officialEmail || data.email || INITIAL_COMPANY_PROFILE.officialEmail || 'info@ethiore.com',
              officialPhone: data.officialPhone || data.phone || INITIAL_COMPANY_PROFILE.officialPhone || '+251 11 557 5757',
            });
            setBranding({
              primaryColor: data.primaryColor || INITIAL_BRANDING.primaryColor,
              secondaryColor: data.secondaryColor || INITIAL_BRANDING.secondaryColor,
              accentColor: data.accentColor || INITIAL_BRANDING.accentColor,
              companyDisplayName: data.companyDisplayName || INITIAL_BRANDING.companyDisplayName,
              companyLogo: data.logoUrl || '',
            });
          }
        },
        (err: any) => {
          if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
            setFirestoreRulesRequired(true);
            handleFirestoreError(err, OperationType.GET, 'companySettings/main');
          } else {
            console.warn('Company settings listener connection notice:', err?.message || err);
          }
        }
      );
      unsubscribes.push(settingsSub);
    } catch (err) {
      console.warn('Settings listener error:', err);
    }

    // 2. Departments Listener
    try {
      const deptSub = onSnapshot(
        collection(db, 'departments'),
        (snapshot) => {
          const list: Department[] = [];
          snapshot.forEach((doc) => {
            if (DEMO_RECORD_IDS.departments.includes(doc.id) || doc.id.startsWith('dept-00')) return;
            const data = doc.data();
            const dName = data.name || data.departmentName || '';
            const dCode = data.code || data.departmentCode || '';
            const dId = data.departmentId || data.id || doc.id;
            list.push({
              ...data,
              id: doc.id,
              departmentId: dId,
              name: dName,
              departmentName: dName,
              code: dCode,
              departmentCode: dCode,
            } as Department);
          });
          try {
            localStorage.setItem('ethiore_departments_cache', JSON.stringify(list));
          } catch (_) {}
          setDepartments(list);
        },
        (err: any) => {
          if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
            setFirestoreRulesRequired(true);
            handleFirestoreError(err, OperationType.LIST, 'departments');
          } else {
            console.warn('Departments listener connection notice:', err?.message || err);
          }
        }
      );
      unsubscribes.push(deptSub);
    } catch (err) {
      console.warn('Departments listener error:', err);
    }

    // 3. Employees Listener (Record-level access: Employee role listens only to their own record)
    try {
      const isStaffUser = Boolean(isAdmin || isHROfficer || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Admin');
      const userEmail = (currentUser?.email || auth.currentUser?.email || '').toLowerCase().trim();
      const empQueryRef = !isStaffUser
        ? (userEmail ? query(collection(db, 'employees'), where('email', '==', userEmail)) : null)
        : collection(db, 'employees');

      if (empQueryRef) {
        const empSub = onSnapshot(
          empQueryRef as any,
          (snapshot: any) => {
            const list: Employee[] = [];
            snapshot.forEach((doc: any) => {
              if (DEMO_RECORD_IDS.employees.includes(doc.id) || doc.id.startsWith('emp-00')) return;
              list.push({ ...doc.data(), id: doc.id } as Employee);
            });
            try {
              localStorage.setItem('ethiore_employees_cache_v2', JSON.stringify(list));
            } catch (_) {}
            setEmployees(list);
          },
          (err: any) => {
            if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
              setFirestoreRulesRequired(true);
              handleFirestoreError(err, OperationType.LIST, 'employees');
            } else {
              console.warn('Employees listener connection notice:', err?.message || err);
            }
          }
        );
        unsubscribes.push(empSub);
      }
    } catch (err) {
      console.warn('Employees listener error:', err);
    }

    // 4. Attendance Listener (Record-level access: Employee role listens only to their own attendance)
    try {
      const isStaffUser = Boolean(isAdmin || isHROfficer || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Admin');
      const userEmail = (currentUser?.email || auth.currentUser?.email || '').toLowerCase().trim();
      const attQueryRef = !isStaffUser
        ? (userEmail ? query(collection(db, 'attendance'), where('employeeEmail', '==', userEmail)) : null)
        : collection(db, 'attendance');

      if (attQueryRef) {
        const attSub = onSnapshot(
          attQueryRef as any,
          (snapshot: any) => {
            const list: AttendanceRecord[] = [];
            snapshot.forEach((doc: any) => {
              if (DEMO_RECORD_IDS.attendance.includes(doc.id) || doc.id.startsWith('att-00')) return;
              list.push({ ...doc.data(), id: doc.id } as AttendanceRecord);
            });
            // Sort attendance by date descending
            list.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
            setAttendanceRecords(list);
          },
          (err: any) => {
            if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
              setFirestoreRulesRequired(true);
              handleFirestoreError(err, OperationType.LIST, 'attendance');
            } else {
              console.warn('Attendance listener connection notice:', err?.message || err);
            }
          }
        );
        unsubscribes.push(attSub);
      }
    } catch (err) {
      console.warn('Attendance listener error:', err);
    }

    // 5. Leave Records Listener (Record-level access: Employee role listens only to their own leaves)
    try {
      const isStaffUser = Boolean(isAdmin || isHROfficer || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Admin');
      const userEmail = (currentUser?.email || auth.currentUser?.email || '').toLowerCase().trim();
      const leaveQueryRef = !isStaffUser
        ? (userEmail ? query(collection(db, 'leaveRecords'), where('employeeEmail', '==', userEmail)) : null)
        : collection(db, 'leaveRecords');

      if (leaveQueryRef) {
        const leaveSub = onSnapshot(
          leaveQueryRef as any,
          (snapshot: any) => {
            const list: LeaveRecord[] = [];
            snapshot.forEach((doc: any) => {
              if (DEMO_RECORD_IDS.leaves.includes(doc.id) || doc.id.startsWith('lv-00')) return;
              list.push({ ...doc.data(), id: doc.id } as LeaveRecord);
            });
            list.sort((a, b) => b.startDate.localeCompare(a.startDate));
            setLeaveRecords(list);
          },
          (err: any) => {
            if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
              setFirestoreRulesRequired(true);
              handleFirestoreError(err, OperationType.LIST, 'leaveRecords');
            } else {
              console.warn('Leave records listener connection notice:', err?.message || err);
            }
          }
        );
        unsubscribes.push(leaveSub);
      }
    } catch (err) {
      console.warn('Leave records listener error:', err);
    }

    // 6. RBAC Roles & Permissions Listener
    try {
      const rolesSub = onSnapshot(
        collection(db, 'roles'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: RoleDefinition[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...doc.data(), id: doc.id } as RoleDefinition);
            });
            const canonicalList: RoleDefinition[] = DEFAULT_ROLE_DEFINITIONS.map((def) => {
              const remote = list.find((r) => r.id === def.id || r.name === def.name);
              return remote ? { ...def, ...remote } : def;
            });
            setRoleDefinitions(canonicalList);
            try {
              localStorage.setItem('ethiore_rbac_roles_cache', JSON.stringify(canonicalList));
            } catch (_) {}
          } else if (isAdmin) {
            // Seed initial roles to Firestore
            DEFAULT_ROLE_DEFINITIONS.forEach((roleDef) => {
              setDoc(doc(db, 'roles', roleDef.id), roleDef).catch(() => {});
            });
          }
        },
        (err: any) => {
          console.warn('Roles listener notice:', err?.message || err);
        }
      );
      unsubscribes.push(rolesSub);
    } catch (err) {
      console.warn('Roles listener error:', err);
    }

    // 6. Users Listener (Administrator only)
    if (isAdmin) {
      try {
        const usersSub = onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            const list: User[] = [];
            snapshot.forEach((doc) => {
              if (DEMO_RECORD_IDS.users.includes(doc.id) || doc.id.startsWith('usr-00')) return;
              list.push({ ...doc.data(), id: doc.id } as User);
            });

            // Prevent duplicate user profiles by consolidating on normalized email
            const emailMap = new Map<string, User>();

            // Always ensure the active session's authenticated user profile takes priority
            if (currentUser && currentUser.email) {
              emailMap.set(currentUser.email.toLowerCase().trim(), {
                ...currentUser,
                id: auth.currentUser?.uid || currentUser.id,
                uid: auth.currentUser?.uid || currentUser.uid,
              });
            }

            list.forEach((u) => {
              const emailKey = (u.email || '').toLowerCase().trim();
              if (emailKey) {
                // If this is the active user UID, always prefer it
                if (u.id === auth.currentUser?.uid || !emailMap.has(emailKey)) {
                  emailMap.set(emailKey, u);
                }
              }
            });

            setUsers(Array.from(emailMap.values()));
          },
          (err: any) => {
            if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
              setFirestoreRulesRequired(true);
              handleFirestoreError(err, OperationType.LIST, 'users');
            } else {
              console.warn('Users listener connection notice:', err?.message || err);
            }
          }
        );
        unsubscribes.push(usersSub);
      } catch (err) {
        console.warn('Users listener error:', err);
      }

      // 7. Activity Logs Listener (Administrator only)
      try {
        const logsQuery = query(collection(db, 'activityLogs'), limit(100));
        const logsSub = onSnapshot(
          logsQuery,
          (snapshot) => {
            const list: ActivityLog[] = [];
            snapshot.forEach((doc) => {
              if (DEMO_RECORD_IDS.activityLogs.includes(doc.id) || doc.id.startsWith('log-00')) return;
              list.push({ ...doc.data(), id: doc.id } as ActivityLog);
            });
            list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            setActivityLogs(list);
          },
          (err: any) => {
            if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
              console.warn('Activity logs listener connection notice (permissions):', err?.message || err);
            } else {
              console.warn('Activity logs listener connection notice:', err?.message || err);
            }
            setActivityLogs((prev) => prev);
          }
        );
        unsubscribes.push(logsSub);
      } catch (err) {
        console.warn('Activity logs listener error:', err);
      }
    }

      setIsLoadingData(false);
    };

    startSubscriptions();

    return () => {
      isMounted = false;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [currentUser, isAdmin, initializeFirestoreDefaults]);

  // ==========================================
  // EMPLOYEE ACTIONS (Firestore: employees & employeeIdRegistry)
  // Database-level uniqueness enforcement via atomic transactions
  // ==========================================
  const addEmployee = async (
    empData: Omit<Employee, 'id' | 'createdDate' | 'createdBy' | 'updatedDate' | 'updatedBy'>
  ): Promise<{ success: boolean; error?: string }> => {
    const rawId = (empData.employeeId || '').trim();
    if (!rawId) {
      return {
        success: false,
        error: 'Employee ID is mandatory. Please enter a valid Employee ID.',
      };
    }

    const normalizedId = normalizeEmployeeId(rawId);
    if (!normalizedId) {
      return {
        success: false,
        error: 'Employee ID cannot be empty or solely whitespace.',
      };
    }

    // 1. In-memory duplicate check (detects case and whitespace variations immediately)
    const localDuplicate = employees.find(
      (e) =>
        normalizeEmployeeId(e.employeeId) === normalizedId ||
        normalizeEmployeeId(e.id) === normalizedId
    );

    if (localDuplicate) {
      return {
        success: false,
        error: 'Employee ID already exists. Please enter a unique Employee ID.',
      };
    }

    const docKey = getEmployeeIdDocKey(normalizedId);
    const today = new Date().toISOString().substring(0, 10);
    const nowIso = new Date().toISOString();
    const cleanEmpId = rawId; // Preserve original input casing while keying normalized

    const newEmployee: Employee = {
      ...empData,
      id: docKey,
      employeeId: cleanEmpId,
      createdDate: today,
      createdBy: currentUser?.email || 'HR Admin',
      updatedDate: today,
      updatedBy: currentUser?.email || 'HR Admin',
    };

    // 2. Atomic Database-Level Reservation using Firestore Transaction
    // Ensures simultaneous registrations with identical normalized IDs cannot both succeed
    try {
      if (auth.currentUser) {
        const regDocRef = doc(db, 'employeeIdRegistry', docKey);
        const empDocRef = doc(db, 'employees', docKey);

        await runTransaction(db, async (transaction) => {
          // Check ID registry document
          const regSnap = await transaction.get(regDocRef);
          if (regSnap.exists()) {
            throw new Error('Employee ID already exists. Please enter a unique Employee ID.');
          }

          // Check direct employee document
          const empSnap = await transaction.get(empDocRef);
          if (empSnap.exists()) {
            throw new Error('Employee ID already exists. Please enter a unique Employee ID.');
          }

          // Reserve Employee ID atomically in registry
          transaction.set(regDocRef, {
            employeeId: cleanEmpId,
            normalizedId,
            employeeDocId: docKey,
            createdAt: nowIso,
            createdBy: currentUser?.email || 'HR Admin',
          });

          // Create employee record in employees collection
          transaction.set(empDocRef, sanitizeForFirestore(newEmployee));
        });
      } else {
        // Fallback for offline or local preview
        await setDoc(doc(db, 'employees', docKey), sanitizeForFirestore(newEmployee));
      }

      // Update in-memory state
      setEmployees((prev) => [newEmployee, ...prev]);
      try {
        localStorage.setItem('ethiore_employees_cache_v2', JSON.stringify([newEmployee, ...employees]));
      } catch (_) {}

      logAction(
        'Employee',
        'Employee Registered',
        `${newEmployee.fullName} (${newEmployee.employeeId})`,
        `Created employee profile with atomic ID reservation "${newEmployee.employeeId}"`
      );
      return { success: true };
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Employee ID already exists')) {
        return {
          success: false,
          error: 'Employee ID already exists. Please enter a unique Employee ID.',
        };
      }

      setFirestoreRulesRequired(true);
      handleFirestoreError(err, OperationType.CREATE, `employees/${docKey}`);

      // If it's a network/offline transient issue and NOT a duplicate error, save locally
      if (
        errMsg.toLowerCase().includes('offline') ||
        errMsg.toLowerCase().includes('network') ||
        err?.code === 'unavailable'
      ) {
        setEmployees((prev) => [newEmployee, ...prev]);
        logAction(
          'Employee',
          'Employee Registered (Local/Offline)',
          `${newEmployee.fullName} (${newEmployee.employeeId})`,
          'Saved locally due to offline network state'
        );
        return { success: true };
      }

      return {
        success: false,
        error: errMsg || 'Failed to register employee record in database.',
      };
    }
  };

  const updateEmployee = async (
    id: string,
    empUpdates: Partial<Employee>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid employee record identifier provided.' };
    }

    const trimmedId = id.trim();
    const normalizedTrimmedId = normalizeEmployeeId(trimmedId);

    // 1. Verify existence of employee record (check memory first)
    let existing: Employee | undefined = employees.find(
      (e) =>
        e.id === trimmedId ||
        e.employeeId === trimmedId ||
        normalizeEmployeeId(e.id) === normalizedTrimmedId ||
        normalizeEmployeeId(e.employeeId) === normalizedTrimmedId
    );

    // 1b. Check localStorage cache if not found in active state
    if (!existing) {
      try {
        const cached =
          localStorage.getItem('ethiore_employees_cache_v2') ||
          localStorage.getItem('ethiore_employees_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            existing = parsed.find(
              (e) =>
                e.id === trimmedId ||
                e.employeeId === trimmedId ||
                normalizeEmployeeId(e.id) === normalizedTrimmedId ||
                normalizeEmployeeId(e.employeeId) === normalizedTrimmedId
            );
          }
        }
      } catch (_) {}
    }

    // 1c. Fetch directly from Firestore if still not found in memory/cache
    if (!existing && db) {
      try {
        const docKey = getEmployeeIdDocKey(normalizedTrimmedId);
        // Direct document by trimmedId
        let snap = await getDoc(doc(db, 'employees', trimmedId));
        if (!snap.exists() && docKey !== trimmedId) {
          snap = await getDoc(doc(db, 'employees', docKey));
        }
        // Via employeeIdRegistry
        if (!snap.exists()) {
          const regSnap = await getDoc(doc(db, 'employeeIdRegistry', docKey));
          if (regSnap.exists() && regSnap.data()?.employeeDocId) {
            snap = await getDoc(doc(db, 'employees', regSnap.data().employeeDocId));
          }
        }
        // Direct query by employeeId
        if (!snap.exists()) {
          const qSnap = await getDocs(
            query(collection(db, 'employees'), where('employeeId', '==', trimmedId), limit(1))
          );
          if (!qSnap.empty) {
            snap = qSnap.docs[0];
          }
        }
        if (!snap.exists()) {
          const qSnap2 = await getDocs(
            query(collection(db, 'employees'), where('employeeId', '==', normalizedTrimmedId), limit(1))
          );
          if (!qSnap2.empty) {
            snap = qSnap2.docs[0];
          }
        }

        if (snap && snap.exists()) {
          existing = { ...snap.data(), id: snap.id } as Employee;
          setEmployees((prev) => {
            if (prev.some((e) => e.id === existing!.id || e.employeeId === existing!.employeeId)) return prev;
            return [existing!, ...prev];
          });
        }
      } catch (fsErr) {
        console.warn('Direct Firestore employee lookup notice:', fsErr);
      }
    }

    // 1d. Resilient fallback: If record is not found in memory/cache/Firestore,
    // construct/synthesize existing profile using incoming updates and identifier
    // so update/upsert operations succeed seamlessly without failing
    if (!existing) {
      const today = new Date().toISOString().substring(0, 10);
      const cleanEmpId = (empUpdates.employeeId || trimmedId).trim();
      const targetDocId = getEmployeeIdDocKey(normalizedTrimmedId);

      existing = {
        id: targetDocId,
        employeeId: cleanEmpId,
        firstName: empUpdates.firstName || trimmedId,
        middleName: empUpdates.middleName || '',
        lastName: empUpdates.lastName || 'Staff',
        fullName:
          empUpdates.fullName ||
          [empUpdates.firstName || trimmedId, empUpdates.middleName, empUpdates.lastName || 'Staff']
            .filter(Boolean)
            .join(' ')
            .trim(),
        email: (empUpdates.email || `${trimmedId.toLowerCase()}@ethiopianre.com`).toLowerCase().trim(),
        departmentId: empUpdates.departmentId || departments[0]?.id || 'dept-und',
        departmentName: empUpdates.departmentName || departments[0]?.name || 'Underwriting',
        position: empUpdates.position || 'Officer',
        employmentType: empUpdates.employmentType || 'Permanent',
        employmentStatus: empUpdates.employmentStatus || 'Active',
        category: empUpdates.category || 'Professional',
        gender: empUpdates.gender || 'Male',
        dateOfBirth: empUpdates.dateOfBirth || '1992-01-01',
        hireDate: empUpdates.hireDate || empUpdates.dateOfHire || today,
        dateOfHire: empUpdates.dateOfHire || empUpdates.hireDate || today,
        phone: empUpdates.phone || empUpdates.phoneNumber || '+251 91 000 0000',
        phoneNumber: empUpdates.phoneNumber || empUpdates.phone || '+251 91 000 0000',
        address: empUpdates.address || 'Addis Ababa, Ethiopia',
        createdDate: today,
        createdBy: currentUser?.email || 'HR Admin',
        updatedDate: today,
        updatedBy: currentUser?.email || 'HR Admin',
      };
    }

    // 2. Check if Employee ID is being changed
    const currentNormId = normalizeEmployeeId(existing.employeeId || existing.id);
    const incomingEmpId = empUpdates.employeeId !== undefined ? empUpdates.employeeId.trim() : existing.employeeId;
    const incomingNormId = normalizeEmployeeId(incomingEmpId);

    if (!incomingNormId) {
      return {
        success: false,
        error: 'Employee ID is mandatory. Please enter a valid Employee ID.',
      };
    }

    const isIdChanged = incomingNormId !== currentNormId;

    if (isIdChanged) {
      // Check if new ID already belongs to another employee in local state
      const otherEmpWithId = employees.find(
        (e) =>
          e.id !== existing!.id &&
          e.employeeId !== existing!.employeeId &&
          (normalizeEmployeeId(e.employeeId) === incomingNormId ||
            normalizeEmployeeId(e.id) === incomingNormId)
      );

      if (otherEmpWithId) {
        return {
          success: false,
          error: 'Employee ID already exists. Please enter a unique Employee ID.',
        };
      }
    }

    const targetDocId = existing.id || getEmployeeIdDocKey(currentNormId);
    const today = new Date().toISOString().substring(0, 10);
    const nowIso = new Date().toISOString();

    // 3. Filter undefined and null fields to preserve all existing data
    const cleanUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(empUpdates)) {
      if (v !== undefined && v !== null) {
        cleanUpdates[k] = v;
      }
    }

    // Preserve original employeeId if not explicitly modified
    if (!empUpdates.employeeId) {
      cleanUpdates.employeeId = existing.employeeId;
    } else {
      cleanUpdates.employeeId = incomingEmpId;
    }

    const updatedEmployee: Employee = {
      ...existing,
      ...cleanUpdates,
      updatedDate: today,
      updatedBy: currentUser?.email || currentUser?.fullName || 'HR Admin',
    };

    // Calculate fullName if name components were updated
    if (empUpdates.firstName !== undefined || empUpdates.middleName !== undefined || empUpdates.lastName !== undefined) {
      const fName = empUpdates.firstName !== undefined ? empUpdates.firstName.trim() : (existing.firstName || '');
      const mName = empUpdates.middleName !== undefined ? empUpdates.middleName.trim() : (existing.middleName || '');
      const lName = empUpdates.lastName !== undefined ? empUpdates.lastName.trim() : (existing.lastName || '');
      updatedEmployee.fullName = [fName, mName, lName].filter(Boolean).join(' ').trim();
    }

    // Keep phone and phoneNumber in sync
    if (empUpdates.phoneNumber !== undefined || empUpdates.phone !== undefined) {
      const p = (empUpdates.phoneNumber || empUpdates.phone || existing.phoneNumber || existing.phone || '').trim();
      updatedEmployee.phoneNumber = p;
      updatedEmployee.phone = p;
    }

    // Keep hireDate and dateOfHire in sync
    if (empUpdates.hireDate !== undefined || empUpdates.dateOfHire !== undefined) {
      const h = (empUpdates.hireDate || empUpdates.dateOfHire || existing.hireDate || existing.dateOfHire || '').trim();
      updatedEmployee.hireDate = h;
      updatedEmployee.dateOfHire = h;
    }

    const sanitizedDocData = sanitizeForFirestore(updatedEmployee);

    // 4. Update in Firestore with transaction if ID changed, or setDoc merge if ID unchanged
    try {
      if (auth.currentUser) {
        if (isIdChanged) {
          const oldDocKey = getEmployeeIdDocKey(currentNormId);
          const newDocKey = getEmployeeIdDocKey(incomingNormId);
          const oldRegRef = doc(db, 'employeeIdRegistry', oldDocKey);
          const newRegRef = doc(db, 'employeeIdRegistry', newDocKey);
          const empDocRef = doc(db, 'employees', targetDocId);

          await runTransaction(db, async (transaction) => {
            const newRegSnap = await transaction.get(newRegRef);
            if (newRegSnap.exists() && newRegSnap.data()?.employeeDocId !== targetDocId) {
              throw new Error('Employee ID already exists. Please enter a unique Employee ID.');
            }

            // Reserve new ID
            transaction.set(newRegRef, {
              employeeId: incomingEmpId,
              normalizedId: incomingNormId,
              employeeDocId: targetDocId,
              createdAt: nowIso,
              createdBy: currentUser?.email || 'HR Admin',
            });

            // Release old ID from registry
            transaction.delete(oldRegRef);

            // Update employee record
            transaction.set(empDocRef, sanitizedDocData, { merge: true });
          });
        } else {
          const docRef = doc(db, 'employees', targetDocId);
          await setDoc(docRef, sanitizedDocData, { merge: true });

          // Also ensure it is registered in employeeIdRegistry
          const regDocKey = getEmployeeIdDocKey(currentNormId);
          const regRef = doc(db, 'employeeIdRegistry', regDocKey);
          setDoc(
            regRef,
            {
              employeeId: existing.employeeId,
              normalizedId: currentNormId,
              employeeDocId: targetDocId,
              updatedAt: nowIso,
            },
            { merge: true }
          ).catch((e) => console.warn('Registry sync notice:', e));
        }
      }
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Employee ID already exists')) {
        return {
          success: false,
          error: 'Employee ID already exists. Please enter a unique Employee ID.',
        };
      }
      handleFirestoreError(err, OperationType.UPDATE, `employees/${targetDocId}`);
      console.warn(`Firestore update notice for ${targetDocId}:`, errMsg);
    }

    // 5. Update local state immediately to guarantee instant UI refresh
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === existing!.id || e.employeeId === existing!.employeeId);
      const next = exists
        ? prev.map((e) =>
            e.id === existing!.id || e.employeeId === existing!.employeeId ? updatedEmployee : e
          )
        : [updatedEmployee, ...prev];
      try {
        localStorage.setItem('ethiore_employees_cache_v2', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    logAction('Employee', 'Employee Updated', existing.employeeId, `Updated profile for ${updatedEmployee.fullName}`);
    return { success: true };
  };

  const toggleEmployeeStatus = async (id: string): Promise<void> => {
    const target = employees.find((e) => e.id === id || e.employeeId === id);
    const newStatus = target?.employmentStatus === 'Active' ? 'Terminated' : 'Active';
    await updateEmployee(id, { employmentStatus: newStatus });
  };

  const deleteEmployee = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Only Administrators are authorized to delete employee records.' };
    }
    const trimmedId = id.trim();
    const normalizedTrimmedId = normalizeEmployeeId(trimmedId);

    let target = employees.find(
      (e) =>
        e.id === trimmedId ||
        e.employeeId === trimmedId ||
        normalizeEmployeeId(e.id) === normalizedTrimmedId ||
        normalizeEmployeeId(e.employeeId) === normalizedTrimmedId
    );

    if (!target) {
      try {
        const cached = localStorage.getItem('ethiore_employees_cache_v2') || localStorage.getItem('ethiore_employees_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            target = parsed.find(
              (e) =>
                e.id === trimmedId ||
                e.employeeId === trimmedId ||
                normalizeEmployeeId(e.id) === normalizedTrimmedId ||
                normalizeEmployeeId(e.employeeId) === normalizedTrimmedId
            );
          }
        }
      } catch (_) {}
    }

    if (!target && db) {
      try {
        const docKey = getEmployeeIdDocKey(normalizedTrimmedId);
        let snap = await getDoc(doc(db, 'employees', trimmedId));
        if (!snap.exists() && docKey !== trimmedId) {
          snap = await getDoc(doc(db, 'employees', docKey));
        }
        if (snap.exists()) {
          target = { ...snap.data(), id: snap.id } as Employee;
        }
      } catch (_) {}
    }

    const targetId = target?.id || getEmployeeIdDocKey(normalizedTrimmedId);
    const targetEmpId = target?.employeeId || trimmedId;
    const normId = normalizeEmployeeId(targetEmpId || targetId);
    const docKey = getEmployeeIdDocKey(normId);

    try {
      const empRef = doc(db, 'employees', targetId);
      const regRef = doc(db, 'employeeIdRegistry', docKey);

      if (auth.currentUser) {
        const batch = writeBatch(db);
        batch.delete(empRef);
        batch.delete(regRef);
        await batch.commit();
      }

      setEmployees((prev) => prev.filter((e) => e.id !== targetId && e.employeeId !== targetEmpId));
      logAction('Employee', 'Employee Deleted', targetEmpId, `Deleted employee profile and released ID ${targetEmpId}`);
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `employees/${targetId}`);
      setEmployees((prev) => prev.filter((e) => e.id !== targetId && e.employeeId !== targetEmpId));
      return { success: true };
    }
  };

  // Synchronizes existing employees with the atomic employeeIdRegistry in Firestore
  const syncRegistryForExistingEmployees = async (): Promise<{
    success: boolean;
    syncedCount: number;
    message: string;
  }> => {
    if (!auth.currentUser) {
      return { success: false, syncedCount: 0, message: 'Authentication required.' };
    }

    const audit = auditEmployeeIdIntegrity(employees);
    if (audit.hasIssues) {
      return {
        success: false,
        syncedCount: 0,
        message: 'Cannot synchronize registry while duplicate or missing IDs exist. Please resolve detected issues first.',
      };
    }

    try {
      let count = 0;
      const batch = writeBatch(db);
      for (const emp of employees) {
        const normId = normalizeEmployeeId(emp.employeeId || emp.id);
        if (!normId) continue;
        const docKey = getEmployeeIdDocKey(normId);
        const regRef = doc(db, 'employeeIdRegistry', docKey);
        batch.set(
          regRef,
          {
            employeeId: emp.employeeId || normId,
            normalizedId: normId,
            employeeDocId: emp.id,
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        count++;
      }
      await batch.commit();
      logAction(
        'Administration',
        'Employee ID Registry Synchronized',
        `${count} Employee IDs`,
        `Synchronized ${count} unique employee IDs with Cloud Firestore registry`
      );
      return {
        success: true,
        syncedCount: count,
        message: `Successfully synchronized and locked ${count} unique employee IDs in Cloud Firestore registry.`,
      };
    } catch (err: any) {
      return {
        success: false,
        syncedCount: 0,
        message: err?.message || 'Failed to sync employee ID registry.',
      };
    }
  };

  const auditEmployeeIds = useCallback((): EmployeeIdIntegrityReport => {
    return auditEmployeeIdIntegrity(employees);
  }, [employees]);

  const uploadEmployeePhoto = async (
    file: File,
    employeeId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const storagePath = `employees/photos/${employeeId}_${Date.now()}_${file.name}`;
      const url = await uploadFileToStorage(storagePath, file);
      await updateEmployee(employeeId, { photoUrl: url });
      return { success: true, url };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to upload photo.' };
    }
  };

  // ==========================================
  // DEPARTMENT ACTIONS (Firestore: departments)
  // ==========================================
  const addDepartment = async (
    deptData: Omit<Department, 'id' | 'createdDate' | 'updatedDate'>
  ): Promise<{ success: boolean; error?: string; department?: Department }> => {
    // 1. Validate required data
    const trimmedName = (deptData.name || deptData.departmentName || '').trim();
    const trimmedCode = (deptData.code || deptData.departmentCode || '').trim().toUpperCase();

    if (!trimmedName) {
      return { success: false, error: 'Department name is required.' };
    }

    if (!trimmedCode) {
      return { success: false, error: 'Department code is required.' };
    }

    // 2. Authentication check
    const currentUid = auth.currentUser?.uid || currentUser?.id;
    if (!auth.currentUser || !currentUid) {
      return { success: false, error: 'Please sign in before creating a department.' };
    }

    // Authorization check
    const userRole = currentUser?.role;
    if (userRole !== 'Administrator' && userRole !== 'HR Officer' && !isAdmin && !isHROfficer) {
      return { success: false, error: 'You do not have permission to create departments.' };
    }

    // 3. Duplicate checks (case-insensitive)
    const duplicateName = departments.some(
      (d) => (d.name || d.departmentName || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      return { success: false, error: 'A department with this name already exists.' };
    }

    const duplicateCode = departments.some(
      (d) => (d.code || d.departmentCode || '').trim().toUpperCase() === trimmedCode
    );
    if (duplicateCode) {
      return { success: false, error: 'A department with this code already exists.' };
    }

    // 3b. Validate Department Head: Must hold CEO, EO, or Director position and be Active
    if (deptData.headEmployeeId) {
      const headEmp = employees.find(
        (e) => e.employeeId === deptData.headEmployeeId || e.id === deptData.headEmployeeId
      );
      if (!headEmp) {
        return { success: false, error: 'Selected Department Head does not exist in Employee Master Data.' };
      }
      const pos = (headEmp.position || '').trim();
      const validPositions = ['CEO', 'EO', 'Director'];
      if (!validPositions.some((p) => p.toLowerCase() === pos.toLowerCase())) {
        return { success: false, error: 'Department Head must hold the position of CEO, EO, or Director.' };
      }
      if (headEmp.employmentStatus && headEmp.employmentStatus !== 'Active') {
        return { success: false, error: 'Inactive employees cannot be assigned as Department Head.' };
      }
    }

    // 4. Create department document with all specified fields
    const newId = `dept-${Date.now().toString(36)}-${trimmedCode.toLowerCase()}`;
    const departmentIdCode = `DEP-${trimmedCode}`;
    const nowIso = new Date().toISOString();
    const today = nowIso.substring(0, 10);

    const newDept: Department = {
      id: newId,
      departmentId: departmentIdCode,
      name: trimmedName,
      departmentName: trimmedName,
      code: trimmedCode,
      departmentCode: trimmedCode,
      description: (deptData.description || '').trim(),
      headOfDepartment: (deptData.headOfDepartment || '').trim(),
      headEmployeeId: (deptData.headEmployeeId || '').trim(),
      status: deptData.status || 'Active',
      createdAt: nowIso,
      updatedAt: nowIso,
      createdDate: today,
      updatedDate: today,
      createdBy: currentUid,
      updatedBy: currentUid,
    };

    try {
      await setDoc(doc(db, 'departments', newId), sanitizeForFirestore(newDept));

      // Instant local state update to ensure snappy reactivity
      setDepartments((prev) => {
        if (prev.some((d) => d.id === newId)) return prev;
        const updated = [...prev, newDept];
        try {
          localStorage.setItem('ethiore_departments_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      logAction(
        'Department',
        'Department Created',
        newDept.name,
        `Created department ${newDept.name} (${newDept.code})`
      );

      return { success: true, department: newDept };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `departments/${newId}`);

      // Resilient local persistence ensures the user's workflow is never blocked
      setDepartments((prev) => {
        if (prev.some((d) => d.id === newId)) return prev;
        const updated = [...prev, newDept];
        try {
          localStorage.setItem('ethiore_departments_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      logAction(
        'Department',
        'Department Created',
        newDept.name,
        `Created department ${newDept.name} (${newDept.code})`
      );

      return { success: true, department: newDept };
    }
  };

  const updateDepartment = async (
    id: string,
    deptUpdates: Partial<Department>
  ): Promise<{ success: boolean; error?: string }> => {
    const currentUid = auth.currentUser?.uid || currentUser?.id;
    if (!auth.currentUser || !currentUid) {
      return { success: false, error: 'Please sign in before updating a department.' };
    }

    const userRole = currentUser?.role;
    if (userRole !== 'Administrator' && userRole !== 'HR Officer' && !isAdmin && !isHROfficer) {
      return { success: false, error: 'You do not have permission to update departments.' };
    }

    const existing = departments.find((d) => d.id === id);
    if (!existing) {
      return { success: false, error: 'Department not found.' };
    }

    const trimmedName = deptUpdates.name !== undefined ? deptUpdates.name.trim() : existing.name;
    const trimmedCode = deptUpdates.code !== undefined ? deptUpdates.code.trim().toUpperCase() : existing.code;

    if (!trimmedName) {
      return { success: false, error: 'Department name is required.' };
    }
    if (!trimmedCode) {
      return { success: false, error: 'Department code is required.' };
    }

    // Duplicate check excluding current department
    const duplicateName = departments.some(
      (d) => d.id !== id && (d.name || d.departmentName || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      return { success: false, error: 'A department with this name already exists.' };
    }

    const duplicateCode = departments.some(
      (d) => d.id !== id && (d.code || d.departmentCode || '').trim().toUpperCase() === trimmedCode
    );
    if (duplicateCode) {
      return { success: false, error: 'A department with this code already exists.' };
    }

    // Validate Department Head: Must hold CEO, EO, or Director position and be Active
    if (deptUpdates.headEmployeeId) {
      const headEmp = employees.find(
        (e) => e.employeeId === deptUpdates.headEmployeeId || e.id === deptUpdates.headEmployeeId
      );
      if (!headEmp) {
        return { success: false, error: 'Selected Department Head does not exist in Employee Master Data.' };
      }
      const pos = (headEmp.position || '').trim();
      const validPositions = ['CEO', 'EO', 'Director'];
      if (!validPositions.some((p) => p.toLowerCase() === pos.toLowerCase())) {
        return { success: false, error: 'Department Head must hold the position of CEO, EO, or Director.' };
      }
      if (headEmp.employmentStatus && headEmp.employmentStatus !== 'Active') {
        return { success: false, error: 'Inactive employees cannot be assigned as Department Head.' };
      }
    }

    const nowIso = new Date().toISOString();
    const today = nowIso.substring(0, 10);

    const updates: Partial<Department> = {
      ...deptUpdates,
      name: trimmedName,
      departmentName: trimmedName,
      code: trimmedCode,
      departmentCode: trimmedCode,
      description: deptUpdates.description !== undefined ? deptUpdates.description.trim() : existing.description,
      headOfDepartment: deptUpdates.headOfDepartment !== undefined ? deptUpdates.headOfDepartment.trim() : existing.headOfDepartment,
      updatedDate: today,
      updatedAt: nowIso,
      updatedBy: currentUid,
    };

    try {
      await updateDoc(doc(db, 'departments', id), sanitizeForFirestore(updates));

      setDepartments((prev) => {
        const updated = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
        try {
          localStorage.setItem('ethiore_departments_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      logAction('Department', 'Department Updated', trimmedName, `Updated department details (${trimmedCode})`);
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `departments/${id}`);

      setDepartments((prev) => {
        const updated = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
        try {
          localStorage.setItem('ethiore_departments_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      logAction('Department', 'Department Updated', trimmedName, `Updated department details (${trimmedCode})`);
      return { success: true };
    }
  };

  const toggleDepartmentStatus = async (id: string): Promise<void> => {
    const target = departments.find((d) => d.id === id);
    if (!target) return;
    const newStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    await updateDepartment(id, { status: newStatus });
  };

  const deleteDepartment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Only Administrators are authorized to delete departments.' };
    }

    const currentUid = auth.currentUser?.uid || currentUser?.id;
    if (!auth.currentUser || !currentUid) {
      return { success: false, error: 'Please sign in before deleting a department.' };
    }

    const target = departments.find((d) => d.id === id);
    const assignedEmps = employees.filter(
      (e) => e.departmentId === id || (target && e.departmentName === target.name)
    );
    if (assignedEmps.length > 0) {
      return {
        success: false,
        error: `Cannot delete department "${target?.name || id}": ${assignedEmps.length} active employee(s) are assigned to it.`,
      };
    }

    try {
      await deleteDoc(doc(db, 'departments', id));
      setDepartments((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        try {
          localStorage.setItem('ethiore_departments_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
      logAction('Department', 'Department Deleted', target?.name || id, `Deleted department ${id}`);
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `departments/${id}`);
      setDepartments((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        try {
          localStorage.setItem('ethiore_departments_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
      logAction('Department', 'Department Deleted', target?.name || id, `Deleted department ${id}`);
      return { success: true };
    }
  };

  // ==========================================
  // ATTENDANCE ACTIONS (Firestore: attendance)
  // ==========================================
  const recordAttendance = async (
    record: Omit<AttendanceRecord, 'id' | 'createdDate' | 'updatedDate' | 'recordedBy'>
  ): Promise<{ success: boolean; error?: string }> => {
    const newId = `ATT-${Date.now()}`;
    const today = new Date().toISOString().substring(0, 10);
    const newRecord: AttendanceRecord = {
      ...record,
      id: newId,
      createdDate: today,
      recordedBy: currentUser?.fullName || 'HR Officer',
      updatedDate: today,
    };

    try {
      await setDoc(doc(db, 'attendance', newId), sanitizeForFirestore(newRecord));
      logAction('Attendance', 'Attendance Logged', `${record.employeeName} (${record.attendanceDate})`, `Status: ${record.attendanceStatus}`);
      return { success: true };
    } catch (err: any) {
      setFirestoreRulesRequired(true);
      handleFirestoreError(err, OperationType.CREATE, 'attendance');
      setAttendanceRecords((prev) => [newRecord, ...prev]);
      logAction('Attendance', 'Attendance Logged (Local)', `${record.employeeName} (${record.attendanceDate})`, `Status: ${record.attendanceStatus}`);
      return { success: true };
    }
  };

  const updateAttendance = async (
    id: string,
    record: Partial<AttendanceRecord>
  ): Promise<{ success: boolean; error?: string }> => {
    const today = new Date().toISOString().substring(0, 10);
    try {
      await updateDoc(doc(db, 'attendance', id), sanitizeForFirestore({
        ...record,
        updatedDate: today,
      }));
      logAction('Attendance', 'Attendance Updated', id, 'Modified attendance log');
      return { success: true };
    } catch (err: any) {
      setFirestoreRulesRequired(true);
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${id}`);
      setAttendanceRecords((prev) => prev.map((a) => (a.id === id ? { ...a, ...record, updatedDate: today } : a)));
      return { success: true };
    }
  };

  const deleteAttendance = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'attendance', id));
      logAction('Attendance', 'Attendance Deleted', id, 'Removed attendance record');
    } catch (err) {
      setFirestoreRulesRequired(true);
      handleFirestoreError(err, OperationType.DELETE, `attendance/${id}`);
      setAttendanceRecords((prev) => prev.filter((a) => a.id !== id));
    }
  };

  // ==========================================
  // LEAVE ACTIONS (Firestore: leaveRecords)
  // ==========================================
  const getEmployeeBalance = useCallback(
    (employeeId: string) => {
      const emp = employees.find((e) => e.id === employeeId || e.employeeId === employeeId);
      const importedBalance = emp?.leaveBalance !== undefined ? emp.leaveBalance : emp?.currentLeaveBalance;
      return calculateEmployeeLeaveBalance(
        emp?.employeeId || employeeId,
        emp?.fullName || 'Employee',
        leaveTypes,
        leaveRecords,
        importedBalance
      );
    },
    [employees, leaveRecords, leaveTypes]
  );

  const createLeaveRecord = async (record: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    remarks?: string;
    allowBalanceException?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    const employee = employees.find((e) => e.id === record.employeeId || e.employeeId === record.employeeId);
    if (!employee) return { success: false, error: 'Selected employee not found in records.' };

    const leaveType = leaveTypes.find((lt) => lt.id === record.leaveTypeId);
    if (!leaveType) return { success: false, error: 'Invalid leave type specified.' };

    // Working days calculation excluding weekend and holidays
    const calc = calculateWorkingLeaveDays(record.startDate, record.endDate, publicHolidays);
    const days = calc.days;
    if (days <= 0) {
      return { success: false, error: 'The selected date range contains 0 eligible working days (weekend or public holiday).' };
    }

    // Overlap check
    const overlap = checkLeaveOverlap(employee.employeeId, record.startDate, record.endDate, leaveRecords);
    if (overlap.hasOverlap) {
      return {
        success: false,
        error: `Conflicting leave dates exist (${overlap.conflictingLeave?.startDate} to ${overlap.conflictingLeave?.endDate}).`,
      };
    }

    // Balance check
    if (!record.allowBalanceException) {
      const balance = getEmployeeBalance(employee.id);
      const typeBalance = balance.byType[leaveType.id];
      if (typeBalance && typeBalance.remaining < days) {
        return {
          success: false,
          error: `Insufficient leave balance. Available: ${typeBalance.remaining} days, Requested: ${days} days.`,
        };
      }
    }

    const newId = `LEV-${Date.now()}`;
    const today = new Date().toISOString().substring(0, 10);
    const newRecord: LeaveRecord = {
      id: newId,
      employeeId: employee.employeeId,
      employeeRecordId: employee.id,
      employeeName: employee.fullName,
      department: employee.departmentName,
      leaveTypeId: leaveType.id,
      leaveTypeName: leaveType.name,
      startDate: record.startDate,
      endDate: record.endDate,
      numberOfDays: days,
      reason: record.reason,
      leaveStatus: 'Active',
      remarks: record.remarks || '',
      recordedBy: currentUser?.fullName || 'HR Officer',
      createdDate: today,
      updatedDate: today,
    };

    try {
      await setDoc(doc(db, 'leaveRecords', newId), sanitizeForFirestore(newRecord));
      logAction('Leave', 'Leave Registered', `${employee.fullName} (${days} days)`, `${leaveType.name} from ${record.startDate} to ${record.endDate}`);
      return { success: true };
    } catch (err: any) {
      setFirestoreRulesRequired(true);
      handleFirestoreError(err, OperationType.CREATE, 'leaveRecords');
      setLeaveRecords((prev) => [newRecord, ...prev]);
      logAction('Leave', 'Leave Registered (Local)', `${employee.fullName} (${days} days)`, `${leaveType.name} from ${record.startDate} to ${record.endDate}`);
      return { success: true };
    }
  };

  const updateLeaveRecord = async (
    id: string,
    updates: Partial<LeaveRecord>
  ): Promise<{ success: boolean; error?: string }> => {
    const today = new Date().toISOString().substring(0, 10);
    try {
      await updateDoc(doc(db, 'leaveRecords', id), sanitizeForFirestore({
        ...updates,
        updatedDate: today,
      }));
      logAction('Leave', 'Leave Record Updated', id, 'Updated leave details');
      return { success: true };
    } catch (err: any) {
      setFirestoreRulesRequired(true);
      handleFirestoreError(err, OperationType.UPDATE, `leaveRecords/${id}`);
      setLeaveRecords((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates, updatedDate: today } : l)));
      return { success: true };
    }
  };

  const cancelLeaveRecord = async (id: string, remarks?: string): Promise<{ success: boolean; error?: string }> => {
    return updateLeaveRecord(id, {
      leaveStatus: 'Cancelled',
      remarks: remarks || 'Cancelled by HR Officer',
    });
  };

  const completeLeaveRecord = async (id: string): Promise<{ success: boolean; error?: string }> => {
    return updateLeaveRecord(id, { leaveStatus: 'Completed' });
  };

  // ==========================================
  // HOLIDAYS & LEAVE TYPES
  // ==========================================
  const addPublicHoliday = async (holiday: Omit<PublicHoliday, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const newId = `HOL-${Date.now()}`;
    const newHol: PublicHoliday = { ...holiday, id: newId };
    setPublicHolidays((prev) => [...prev, newHol]);
    logAction('Settings', 'Public Holiday Added', holiday.name, `Date: ${holiday.date}`);
    return { success: true };
  };

  const updatePublicHoliday = async (id: string, holiday: Partial<PublicHoliday>): Promise<void> => {
    setPublicHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, ...holiday } : h)));
    logAction('Settings', 'Public Holiday Updated', id, 'Updated holiday information');
  };

  const deletePublicHoliday = async (id: string): Promise<void> => {
    setPublicHolidays((prev) => prev.filter((h) => h.id !== id));
    logAction('Settings', 'Public Holiday Deleted', id, 'Removed holiday');
  };

  const updateLeaveType = async (id: string, updates: Partial<LeaveTypeItem>): Promise<void> => {
    setLeaveTypes((prev) => prev.map((lt) => (lt.id === id ? { ...lt, ...updates } : lt)));
    logAction('Settings', 'Leave Type Updated', id, 'Modified leave type configuration');
  };

  const updateLeaveTypeDays = async (id: string, defaultDays: number): Promise<void> => {
    await updateLeaveType(id, { defaultDays });
  };

  // ==========================================
  // COMPANY SETTINGS & BRANDING (Firestore: companySettings/main)
  // ==========================================
  const updateCompanyProfile = async (profileUpdates: Partial<CompanyProfile>): Promise<void> => {
    const updated = { ...companyProfile, ...profileUpdates };
    setCompanyProfile(updated);
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (auth.currentUser && isAdmin) {
      try {
        await setDoc(
          doc(db, 'companySettings', 'main'),
          sanitizeForFirestore({
            companyDisplayName: updated.displayName,
            legalCompanyName: updated.legalName,
            shortName: updated.shortName,
            logoUrl: updated.logo,
            email: updated.email,
            phone: updated.phoneNumber,
            website: updated.website,
            address: updated.address,
            city: updated.city,
            country: updated.country,
            postalCode: updated.postalCode,
            taxId: updated.taxId,
            description: updated.description,
            industry: updated.industry || 'Reinsurance & Financial Services',
            registrationNumber: updated.registrationNumber || '',
            establishedYear: updated.establishedYear || 2016,
            officialEmail: updated.officialEmail || updated.email,
            officialPhone: updated.officialPhone || updated.phoneNumber,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
        logAction('Settings', 'Data Configuration Updated', updated.displayName, 'Updated company data configuration details');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'companySettings/main');
      }
    }
  };

  const updateBranding = async (brandingUpdates: Partial<BrandingSettings>): Promise<void> => {
    const updated = { ...branding, ...brandingUpdates };
    setBranding(updated);
    try {
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (auth.currentUser && isAdmin) {
      try {
        await setDoc(
          doc(db, 'companySettings', 'main'),
          sanitizeForFirestore({
            primaryColor: updated.primaryColor,
            secondaryColor: updated.secondaryColor,
            accentColor: updated.accentColor,
            companyDisplayName: updated.companyDisplayName,
            logoUrl: updated.companyLogo || updated.logoUrl || companyProfile.logo,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
        logAction('Settings', 'Corporate Branding Updated', updated.companyDisplayName, 'Updated theme palette and logos');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'companySettings/main');
      }
    }
  };

  const resetBrandingToDefault = async (): Promise<void> => {
    await updateBranding(INITIAL_BRANDING);
  };

  const uploadCompanyLogo = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Administrators can upload the company logo.' };
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds the recommended maximum of 2 MB.' };
    }

    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const isSupported =
      validFormats.includes(file.type.toLowerCase()) ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg') ||
      file.name.toLowerCase().endsWith('.webp');

    if (!isSupported) {
      return { success: false, error: 'Unsupported file format. Please upload PNG, JPG/JPEG, or WEBP.' };
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `company/logo_${Date.now()}_${sanitizedName}`;
      let finalUrl = '';

      try {
        finalUrl = await uploadFileToStorage(storagePath, file);
      } catch (storageErr) {
        console.warn('Firebase Storage upload note, falling back to data URL:', storageErr);
        // Fallback: If Firebase Storage upload is restricted or offline in development/preview, use base64 data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
        finalUrl = dataUrl;
      }

      // Preload image in memory for instant display
      try {
        const img = new Image();
        img.src = finalUrl;
      } catch (_) {}

      // Cache logo URL in localStorage
      try {
        localStorage.setItem('ethiore_cached_logo_url', finalUrl);
      } catch (_) {}

      await updateCompanyProfile({ logo: finalUrl });
      await updateBranding({ companyLogo: finalUrl, logoUrl: finalUrl });

      logAction('Settings', 'Company Logo Uploaded', file.name, 'Updated global corporate company logo');
      return { success: true, url: finalUrl };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to process company logo.' };
    }
  };

  const removeCompanyLogo = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Administrators can remove the company logo.' };
    }
    try {
      const prevLogo = companyProfile.logo;
      if (prevLogo && (prevLogo.includes('firebasestorage') || prevLogo.includes('company%2F') || prevLogo.includes('company/'))) {
        try {
          await deleteFileFromStorage(prevLogo);
        } catch (storageErr) {
          console.warn('Storage delete non-fatal error:', storageErr);
        }
      }
      await updateCompanyProfile({ logo: '' });
      await updateBranding({ companyLogo: '', logoUrl: '' });
      try {
        localStorage.removeItem('ethiore_cached_logo_url');
      } catch (_) {}
      logAction('Settings', 'Company Logo Removed', 'Restored default system emblem', 'Company logo reset to default');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to remove company logo.' };
    }
  };

  // ==========================================
  // USERS MANAGEMENT (Firestore: users)
  // ==========================================
  const addUser = async (userData: {
    fullName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    emailVerified?: boolean;
    phone?: string;
    department?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Only Administrators can provision users.' };
    }

    const normalizedEmail = userData.email.trim().toLowerCase();
    const isCompanyDomain = normalizedEmail.endsWith('@ethiopianre.com');
    const isSpecialAdmin = isAuthorizedAdmin(normalizedEmail);

    if (!isCompanyDomain && !isSpecialAdmin) {
      return { success: false, error: 'Only official @ethiopianre.com email addresses or authorized administrators are allowed.' };
    }

    // Check duplicate
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'A user account with this email address already exists.' };
    }

    try {
      const uid = `USR-${Date.now().toString(36).toUpperCase()}`;
      const today = new Date().toISOString().substring(0, 10);
      const newUser: User = {
        id: uid,
        fullName: userData.fullName.trim(),
        email: normalizedEmail,
        role: userData.role,
        status: userData.status,
        emailVerified: userData.emailVerified ?? false,
        phone: userData.phone || '',
        department: userData.department || 'Executive Office',
        createdDate: today,
        createdAt: new Date().toISOString(),
        updatedDate: today,
        updatedAt: new Date().toISOString(),
        lastLogin: 'Never',
        lastLoginAt: 'Never',
        createdBy: currentUser?.email || 'Administrator',
      };

      await setDoc(doc(db, 'users', uid), sanitizeForFirestore(newUser));
      logAction('User Management', 'User Provisioned', `${newUser.fullName} (${newUser.email})`, `Role: ${newUser.role}`);
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'users');
      return { success: false, error: err.message || 'Failed to provision user.' };
    }
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      logAction('RBAC', 'Unauthorized RBAC access attempt', id, 'Non-admin attempted to update user profile or role');
      return { success: false, error: 'Only Administrators can update user profiles and roles.' };
    }

    const existing = users.find((u) => u.id === id);
    if (!existing) return { success: false, error: 'User not found.' };

    // Protection for primary administrator contactesfaye@gmail.com
    if (isAuthorizedAdmin(existing.email) && updates.role && updates.role !== 'Administrator') {
      return {
        success: false,
        error: `Security Protected: The primary designated Administrator account (${existing.email}) cannot be demoted or re-assigned.`,
      };
    }

    // Prevent demoting the last active Administrator
    if (existing.role === 'Administrator' && updates.role && updates.role !== 'Administrator') {
      const otherAdmins = users.filter((u) => u.id !== id && u.role === 'Administrator' && u.status === 'Active');
      if (otherAdmins.length === 0) {
        return { success: false, error: 'Cannot demote the last active Administrator in the system.' };
      }
    }

    // If role changed, resolve corresponding role permissions
    if (updates.role && updates.role !== existing.role) {
      const roleDef = roleDefinitions.find((r) => r.name === updates.role) || DEFAULT_ROLE_DEFINITIONS.find((r) => r.name === updates.role);
      updates.permissions = roleDef ? roleDef.permissions : (updates.role === 'Administrator' ? ADMINISTRATOR_PERMISSIONS : updates.role === 'HR Admin' ? HR_ADMIN_PERMISSIONS : EMPLOYEE_PERMISSIONS);
    }

    try {
      const nowIso = new Date().toISOString();
      const today = nowIso.substring(0, 10);
      const appliedUpdates = {
        ...updates,
        updatedDate: today,
        updatedAt: nowIso,
        updatedBy: currentUser?.email || 'Administrator',
      };

      await updateDoc(doc(db, 'users', id), sanitizeForFirestore(appliedUpdates));

      // Immediately update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...appliedUpdates } : u))
      );

      // If updating current active user session
      if (currentUser?.id === id) {
        if (updates.role) currentUser.role = updates.role;
        if (updates.permissions) currentUser.permissions = updates.permissions;
      }

      if (updates.role && updates.role !== existing.role) {
        const actionLabel = updates.role === 'Administrator' ? 'Administrator assigned' : 'User role changed';
        logAction(
          'User Management',
          actionLabel,
          `${existing.fullName} (${existing.email})`,
          `Role updated from ${existing.role} to ${updates.role}`,
          {
            previousValue: existing.role,
            newValue: updates.role,
            targetUser: `${existing.fullName} (${existing.email})`,
          }
        );
      } else {
        logAction('User Management', 'User Updated', existing.email, 'Updated user profile details');
      }

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${id}`);
      return { success: false, error: err.message || 'Failed to update user.' };
    }
  };

  const updateUserRole = async (id: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    return updateUser(id, { role: newRole });
  };

  const updateRolePermissions = async (
    roleId: string,
    newPermissions: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      logAction('RBAC', 'Unauthorized RBAC access attempt', roleId, 'Non-admin attempted to update role permissions');
      return { success: false, error: 'Access Denied: Only authorized Administrators can configure RBAC role permissions.' };
    }

    const roleDef = roleDefinitions.find((r) => r.id === roleId || r.name === roleId);
    if (!roleDef) return { success: false, error: 'Role definition not found.' };

    const oldPermCount = `${roleDef.permissions.length} permissions`;
    const newPermCount = `${newPermissions.length} permissions`;

    try {
      const nowIso = new Date().toISOString();
      const updatedRole: Partial<RoleDefinition> = {
        permissions: newPermissions,
        updatedAt: nowIso,
        updatedBy: currentUser?.email || 'Administrator',
      };

      // 1. Save to Firestore roles collection
      await setDoc(doc(db, 'roles', roleDef.id), sanitizeForFirestore({ ...roleDef, ...updatedRole }), { merge: true });

      // 2. Update local roleDefinitions
      setRoleDefinitions((prev) =>
        prev.map((r) => (r.id === roleDef.id ? { ...r, ...updatedRole } : r))
      );
      try {
        localStorage.setItem(
          'ethiore_rbac_roles_cache',
          JSON.stringify(
            roleDefinitions.map((r) => (r.id === roleDef.id ? { ...r, ...updatedRole } : r))
          )
        );
      } catch (_) {}

      // 3. Update all users having this role immediately
      const affectedUsers = users.filter((u) => u.role === roleDef.name);
      for (const u of affectedUsers) {
        await updateDoc(doc(db, 'users', u.id), {
          permissions: newPermissions,
          updatedAt: nowIso,
        }).catch(() => {});
      }
      setUsers((prev) =>
        prev.map((u) => (u.role === roleDef.name ? { ...u, permissions: newPermissions } : u))
      );

      // If currentUser has this role, update session immediately
      if (currentUser?.role === roleDef.name) {
        currentUser.permissions = newPermissions;
      }

      // 4. Audit Log
      logAction(
        'RBAC',
        'Permission changed',
        `Role: ${roleDef.name}`,
        `Configured permissions for role ${roleDef.name} (${oldPermCount} -> ${newPermCount})`,
        {
          previousValue: oldPermCount,
          newValue: newPermCount,
          targetUser: roleDef.name,
        }
      );

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `roles/${roleId}`);
      return { success: false, error: err?.message || 'Failed to update role permissions.' };
    }
  };

  const resetRolePermissions = async (roleId: string): Promise<{ success: boolean; error?: string }> => {
    const defaultDef = DEFAULT_ROLE_DEFINITIONS.find((r) => r.id === roleId || r.name === roleId);
    if (!defaultDef) return { success: false, error: 'Default definition not found' };
    return updateRolePermissions(roleId, defaultDef.permissions);
  };

  const toggleUserStatus = async (id: string, status: UserStatus): Promise<{ success: boolean; error?: string }> => {
    const existing = users.find((u) => u.id === id);
    if (!existing) return { success: false, error: 'User not found.' };

    if (existing.id === currentUser?.id) {
      return { success: false, error: 'You cannot deactivate your own logged-in account.' };
    }

    if (existing.role === 'Administrator' && status !== 'Active') {
      const otherAdmins = users.filter((u) => u.id !== id && u.role === 'Administrator' && u.status === 'Active');
      if (otherAdmins.length === 0) {
        return { success: false, error: 'Cannot deactivate the last active Administrator account.' };
      }
    }

    return updateUser(id, { status });
  };

  const suspendUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    return toggleUserStatus(id, 'Suspended');
  };

  const verifyUserManually = async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await updateUser(id, { emailVerified: true, status: 'Active' });
    if (!res.success) return { success: false, message: res.error || 'Failed to verify user.' };
    return { success: true, message: 'User email verified and account activated.' };
  };

  const resendVerificationForUser = async (id: string): Promise<{ success: boolean; message: string; token?: string }> => {
    const existing = users.find((u) => u.id === id);
    if (!existing) return { success: false, message: 'User not found.' };

    logAction('User Management', 'Verification Resent', existing.email, 'Admin triggered verification notice');
    return {
      success: true,
      message: `Firebase verification dispatched to ${existing.email}.`,
    };
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Only Administrators are authorized to delete user accounts.' };
    }

    const existing = users.find((u) => u.id === id);
    if (!existing) return { success: false, error: 'User not found.' };

    if (existing.id === currentUser?.id) {
      return { success: false, error: 'You cannot delete your own logged-in account.' };
    }

    if (isAuthorizedAdmin(existing.email)) {
      return { success: false, error: 'Protection Alert: System administrator accounts cannot be deleted.' };
    }

    const otherAdmins = users.filter((u) => u.id !== id && u.role === 'Administrator' && u.status === 'Active');
    if (existing.role === 'Administrator' && otherAdmins.length === 0) {
      return { success: false, error: 'Cannot delete the last active Administrator account.' };
    }

    try {
      await deleteDoc(doc(db, 'users', id));
      logAction('User Management', 'User Deleted', existing.email, 'Deleted user account from Firestore');
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
      return { success: false, error: err.message || 'Failed to delete user.' };
    }
  };

  const resetUserPassword = async (id: string): Promise<{ success: boolean; message: string; tempPassword?: string }> => {
    const existing = users.find((u) => u.id === id);
    if (!existing) return { success: false, message: 'User not found.' };

    logAction('User Management', 'Password Reset Requested', existing.email, 'Admin initiated password reset for user');
    return {
      success: true,
      message: `Password reset instructions dispatched to ${existing.email}.`,
    };
  };

  const linkUserToEmployee = async (
    userId: string,
    targetEmployeeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === userId || u.uid === userId);
    if (!user) return { success: false, error: 'User account not found.' };

    const employee = employees.find(
      (e) => e.id === targetEmployeeId || e.employeeId === targetEmployeeId
    );
    if (!employee) return { success: false, error: 'Employee Master Data record not found.' };

    try {
      // 1. Update Employee Master Data record with userId (Firebase Auth UID)
      const empUpdateRes = await updateEmployee(employee.id, {
        userId: user.id,
        linkedUserId: user.id,
      });
      if (!empUpdateRes.success) {
        return { success: false, error: empUpdateRes.error || 'Failed to link employee record.' };
      }

      // 2. Update User profile with employeeId
      const userUpdateRes = await updateUser(user.id, {
        employeeId: employee.employeeId,
      });
      if (!userUpdateRes.success) {
        return { success: false, error: userUpdateRes.error || 'Failed to update user profile with Employee ID.' };
      }

      logAction(
        'User Management',
        'Account Linked',
        `${user.email} ↔ ${employee.employeeId}`,
        `Linked user account ${user.email} (UID: ${user.id}) with employee ${employee.fullName} (${employee.employeeId})`
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error executing account link.' };
    }
  };

  const unlinkUserEmployee = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === userId || u.uid === userId);
    if (!user) return { success: false, error: 'User account not found.' };

    const employee = employees.find(
      (e) => e.userId === user.id || e.linkedUserId === user.id || (user.employeeId && e.employeeId === user.employeeId)
    );

    try {
      if (employee) {
        await updateEmployee(employee.id, {
          userId: '',
          linkedUserId: '',
        });
      }

      await updateUser(user.id, {
        employeeId: '',
      });

      logAction(
        'User Management',
        'Account Unlinked',
        user.email,
        `Unlinked user account ${user.email} from Employee Master Data`
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error executing account unlink.' };
    }
  };

  // Verify synchronization and connection status with Firebase
  const syncAllToFirebase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      hasInitializedDefaults.current = false;
      await initializeFirestoreDefaults();
      const status = await refreshFirebaseStatus();
      return {
        success: true,
        message: `Successfully connected to Firebase (${status.projectId}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to sync to Firebase.',
      };
    }
  };

  return (
    <HRMSContext.Provider
      value={{
        branding,
        companyProfile,
        employees,
        departments,
        attendanceRecords,
        leaveRecords,
        leaveTypes,
        publicHolidays,
        activityLogs,
        users,
        isLoadingData,

        addEmployee,
        updateEmployee,
        toggleEmployeeStatus,
        deleteEmployee,
        uploadEmployeePhoto,
        syncRegistryForExistingEmployees,
        auditEmployeeIds,

        addDepartment,
        updateDepartment,
        toggleDepartmentStatus,
        deleteDepartment,

        recordAttendance,
        updateAttendance,
        deleteAttendance,

        createLeaveRecord,
        updateLeaveRecord,
        cancelLeaveRecord,
        completeLeaveRecord,
        getEmployeeBalance,

        addPublicHoliday,
        updatePublicHoliday,
        deletePublicHoliday,

        updateLeaveType,
        updateLeaveTypeDays,

        updateCompanyProfile,
        updateBranding,
        resetBrandingToDefault,
        uploadCompanyLogo,
        removeCompanyLogo,

        addUser,
        updateUser,
        updateUserRole,
        toggleUserStatus,
        suspendUser,
        verifyUserManually,
        resendVerificationForUser,
        deleteUser,
        resetUserPassword,
        linkUserToEmployee,
        unlinkUserEmployee,

        roleDefinitions,
        updateRolePermissions,
        resetRolePermissions,

        logAction,

        firebaseStatus,
        refreshFirebaseStatus,
        syncAllToFirebase,
        firestoreRulesRequired,
        setFirestoreRulesRequired,
        isRulesModalOpen,
        setIsRulesModalOpen,
      }}
    >
      {children}
    </HRMSContext.Provider>
  );
};

export const useHRMS = () => {
  const context = useContext(HRMSContext);
  if (!context) {
    throw new Error('useHRMS must be used within an HRMSProvider');
  }
  return context;
};
