import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  updatePassword as updateFirebasePassword,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { sanitizeForFirestore } from '../utils/firebaseService';
import {
  User,
  UserRole,
  LegacyUserRole,
  ADMINISTRATOR_PERMISSIONS,
  HR_ADMIN_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
} from '../types/hrms';

export const COMPANY_EMAIL_DOMAIN = '@ethiopianre.com';
export const SPECIAL_ADMIN_EMAIL = 'contactesfaye@gmail.com';
export const AUTHORIZED_ADMIN_EMAILS: string[] = [
  'contactesfaye@gmail.com',
  'sebleworksisay01@gmail.com',
  'admin@ethiopianre.com',
  'itofficer@ethiopianre.com',
];

export const AUTHORIZED_ADMIN_UIDS: string[] = [
  'CgUr5SlKO6NZqZK4BPWB3Q4IDIF2',
];

export const isAuthorizedAdmin = (email?: string | null, uid?: string | null): boolean => {
  if (uid && AUTHORIZED_ADMIN_UIDS.includes(uid)) return true;
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    AUTHORIZED_ADMIN_EMAILS.includes(normalized) ||
    normalized === SPECIAL_ADMIN_EMAIL.toLowerCase()
  );
};

export const createDefaultUserProfile = (
  fbUser: FirebaseUser,
  isAdminUser: boolean,
  emailOverride?: string
): User => {
  const email = emailOverride || fbUser.email || '';
  const nowIso = new Date().toISOString();
  const today = nowIso.substring(0, 10);
  const role: UserRole = isAdminUser ? 'Administrator' : 'Employee';

  let displayName = fbUser.displayName;
  if (!displayName) {
    if (isAdminUser) {
      displayName =
        email.toLowerCase() === 'contactesfaye@gmail.com'
          ? 'Esfaye Admin (Lead Systems)'
          : email.toLowerCase() === 'sebleworksisay01@gmail.com'
          ? 'Seblework Sisay (Lead Systems)'
          : email.toLowerCase() === 'itofficer@ethiopianre.com'
          ? 'IT Officer (System Admin)'
          : 'System Administrator';
    } else {
      displayName = email.split('@')[0] || 'Employee';
    }
  }

  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    fullName: displayName,
    email,
    role,
    status: 'Active',
    emailVerified: fbUser.emailVerified || false,
    permissions: isAdminUser ? ADMINISTRATOR_PERMISSIONS : EMPLOYEE_PERMISSIONS,
    createdDate: today,
    createdAt: nowIso,
    updatedDate: today,
    updatedAt: nowIso,
    lastLogin: nowIso.replace('T', ' ').substring(0, 16),
    lastLoginAt: nowIso,
    createdBy: fbUser.uid,
    updatedBy: fbUser.uid,
  };
};

export interface RegistrationResult {
  success: boolean;
  message?: string;
  error?: string;
  registeredUser?: User;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  unverified?: boolean;
  unverifiedEmail?: string;
}

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isVerificationRequired: boolean;
  unverifiedEmail: string | null;
  login: (email: string, password?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  register: (userData: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<RegistrationResult>;
  verifyEmail: (email: string, token?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  checkVerificationStatus: () => Promise<{ success: boolean; isVerified: boolean; message?: string; error?: string }>;
  resendVerificationEmail: (email?: string, password?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  switchRoleForDemo: (role: UserRole) => void;
  updateProfile: (updatedData: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
  isHRAdmin: boolean;
  isEmployee: boolean;
  isHROfficer: boolean;
  canAccessModule: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to translate Firebase Auth errors into friendly user messages
function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid corporate email address.';
    case 'auth/user-disabled':
      return 'This corporate user account has been disabled. Please contact your System Administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please use your registered account.';
    case 'auth/email-already-in-use':
      return 'An account with this corporate email address already exists. Please sign in or reset your password.';
    case 'auth/operation-not-allowed':
      return 'Email and password authentication is not enabled in Firebase. Please notify the Administrator.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to too many failed attempts. Please try again in a few minutes or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection failure. Please check your internet connectivity.';
    case 'permission-denied':
      return 'Permission denied by corporate security rules.';
    default:
      return 'Invalid email or password. Please use your registered account.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isVerificationRequired, setIsVerificationRequired] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Temporary storage for last entered unverified login attempt so resend verification works seamlessly
  const [lastUnverifiedCreds, setLastUnverifiedCreds] = useState<{ email: string; pass: string } | null>(null);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setCurrentUser(null);
        setIsVerificationRequired(false);
        setUnverifiedEmail(null);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const isSpecialAdmin = isAuthorizedAdmin(fbUser.email);

        // Reload user to get freshest emailVerified flag from Firebase Auth
        await fbUser.reload().catch(() => {});

        // MANDATORY SECURITY GATE:
        // No unverified user (including administrators) may access dashboard or protected data
        if (!fbUser.emailVerified) {
          setCurrentUser(null);
          setIsVerificationRequired(true);
          setUnverifiedEmail(fbUser.email || null);
          setIsLoadingAuth(false);
          return;
        }

        // User is verified!
        setIsVerificationRequired(false);
        setUnverifiedEmail(null);

        // Fetch Firestore profile safely
        const userDocRef = doc(db, 'users', fbUser.uid);
        let userDocSnap: any = null;

        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (fetchErr: any) {
          // Gracefully handle missing or insufficient permissions or offline state
          console.warn('Firestore user profile read note (will use session credentials):', fetchErr?.message || fetchErr);
        }

        // Check if a pre-existing profile exists under another ID (e.g. from seedData)
        let priorProfileData: Partial<User> | null = null;
        let duplicatePriorDocId: string | null = null;

        if (!userDocSnap || !userDocSnap.exists()) {
          if (fbUser.email) {
            try {
              const q = query(collection(db, 'users'), where('email', '==', fbUser.email.toLowerCase().trim()));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const matched = qSnap.docs[0];
                priorProfileData = matched.data() as User;
                if (matched.id !== fbUser.uid) {
                  duplicatePriorDocId = matched.id;
                }
              }
            } catch (queryErr) {
              console.warn('Profile search by email note:', queryErr);
            }
          }
        }

        if (userDocSnap && userDocSnap.exists()) {
          const profile = userDocSnap.data() as User;

          // If inactive or suspended (and not a designated primary administrator), block session
          if (!isSpecialAdmin && (profile.status === 'Inactive' || profile.status === 'Suspended')) {
            await signOut(auth).catch(() => {});
            setCurrentUser(null);
            setIsLoadingAuth(false);
            return;
          }

          let resolvedRole: UserRole = 'Employee';
          let resolvedPermissions = EMPLOYEE_PERMISSIONS;

          if (isSpecialAdmin || profile.role === 'Administrator') {
            resolvedRole = 'Administrator';
            resolvedPermissions = profile.permissions && profile.permissions.length > 0 ? profile.permissions : ADMINISTRATOR_PERMISSIONS;
          } else if (profile.role === 'HR Admin' || (profile.role as any) === 'HR Officer') {
            resolvedRole = 'HR Admin';
            resolvedPermissions = profile.permissions && profile.permissions.length > 0 ? profile.permissions : HR_ADMIN_PERMISSIONS;
          } else {
            resolvedRole = 'Employee';
            resolvedPermissions = profile.permissions && profile.permissions.length > 0 ? profile.permissions : EMPLOYEE_PERMISSIONS;
          }
          const nowIso = new Date().toISOString();
          const today = nowIso.substring(0, 10);

          const updatedProfile: User = {
            ...profile,
            id: fbUser.uid,
            uid: fbUser.uid,
            email: fbUser.email || profile.email,
            role: resolvedRole,
            status: 'Active',
            emailVerified: true,
            permissions: resolvedPermissions,
            updatedAt: nowIso,
            updatedDate: today,
          };

          // If administrator, persist role and permissions to Firestore to guarantee database-level authorization
          if (isSpecialAdmin && (profile.role !== 'Administrator' || !profile.permissions || profile.status !== 'Active')) {
            await setDoc(userDocRef, sanitizeForFirestore(updatedProfile), { merge: true }).catch((err) => {
              console.warn('Admin profile Firestore update note:', err);
            });
          }

          setCurrentUser(updatedProfile);
        } else {
          // Document doesn't exist under UID yet
          // Use data from prior profile or construct fully valid authenticated user profile
          const defaultUser = createDefaultUserProfile(fbUser, isSpecialAdmin);
          defaultUser.emailVerified = true;
          defaultUser.status = 'Active';
          if (priorProfileData) {
            if (priorProfileData.fullName) defaultUser.fullName = priorProfileData.fullName;
            if (priorProfileData.phone) defaultUser.phone = priorProfileData.phone;
            if (priorProfileData.department) defaultUser.department = priorProfileData.department;
          }
          if (isSpecialAdmin) {
            defaultUser.role = 'Administrator';
            defaultUser.permissions = ADMINISTRATOR_PERMISSIONS;
          }

          // Sync to Firestore under fbUser.uid so security rules and queries use this primary identity
          await setDoc(userDocRef, sanitizeForFirestore(defaultUser), { merge: true }).catch((syncErr) => {
            console.warn('Initial profile sync note:', syncErr?.message || syncErr);
          });

          // If an old duplicate seed doc exists with different ID, remove it to prevent duplicate user profile
          if (duplicatePriorDocId && duplicatePriorDocId !== fbUser.uid) {
            await deleteDoc(doc(db, 'users', duplicatePriorDocId)).catch(() => {});
          }

          setCurrentUser(defaultUser);
        }
      } catch (err: any) {
        console.warn('Profile hydration handled with fallback session profile:', err?.message || err);
        if (fbUser && fbUser.emailVerified) {
          const isSpecialAdmin = isAuthorizedAdmin(fbUser.email);
          const fallback = createDefaultUserProfile(fbUser, isSpecialAdmin);
          fallback.emailVerified = true;
          setCurrentUser(fallback);
        } else {
          setCurrentUser(null);
        }
      } finally {
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. REGISTRATION METHOD (Firebase Auth + Firestore)
  const register = useCallback(
    async (userData: {
      fullName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }): Promise<RegistrationResult> => {
      const fullName = userData.fullName.trim();
      const normalizedEmail = userData.email.trim().toLowerCase();
      const password = userData.password;
      const confirmPassword = userData.confirmPassword;

      if (!fullName || fullName.length < 2) {
        return { success: false, error: 'Please enter your full legal name.' };
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return { success: false, error: 'Please enter a valid corporate email address.' };
      }

      // Domain check: Only allow @ethiopianre.com with authorized admin exceptions
      const isCompanyDomain = normalizedEmail.endsWith(COMPANY_EMAIL_DOMAIN);
      const isSpecialAdmin = isAuthorizedAdmin(normalizedEmail);

      if (!isCompanyDomain && !isSpecialAdmin) {
        return {
          success: false,
          error: `Company Email Domain Restricted: Only users with an official ${COMPANY_EMAIL_DOMAIN} email address are permitted to register.`,
        };
      }

      // Password verification
      if (!password || password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long.',
        };
      }

      if (password !== confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match. Please verify your password confirmation.',
        };
      }

      try {
        // 1. Create account with Firebase Auth
        const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const fbUser = userCred.user;

        // 2. Set Firebase displayName
        await updateFirebaseProfile(fbUser, { displayName: fullName }).catch(() => {});

        // 3. Send Firebase Email Verification to all new accounts
        await sendEmailVerification(fbUser).catch((err) => {
          console.warn('sendEmailVerification notice:', err);
        });

        // 4. Create Firestore profile document (marked Pending Verification, emailVerified: false)
        const today = new Date().toISOString().substring(0, 10);
        const nowIso = new Date().toISOString();
        const role: UserRole = isSpecialAdmin ? 'Administrator' : 'Employee';

        const userProfile: User = {
          id: fbUser.uid,
          uid: fbUser.uid,
          fullName,
          email: normalizedEmail,
          role,
          status: 'Pending Verification',
          emailVerified: false,
          permissions: isSpecialAdmin ? ADMINISTRATOR_PERMISSIONS : EMPLOYEE_PERMISSIONS,
          createdDate: today,
          createdAt: nowIso,
          updatedDate: today,
          updatedAt: nowIso,
          lastLogin: nowIso.replace('T', ' ').substring(0, 16),
          lastLoginAt: nowIso,
          createdBy: fbUser.uid,
          updatedBy: fbUser.uid,
        };

        await setDoc(doc(db, 'users', fbUser.uid), sanitizeForFirestore(userProfile));

        // 5. Prevent dashboard access until email verification is completed
        setLastUnverifiedCreds({ email: normalizedEmail, pass: password });
        setIsVerificationRequired(true);
        setUnverifiedEmail(normalizedEmail);
        setCurrentUser(null);

        return {
          success: true,
          message: 'Verification email sent. Please check your inbox, spam folder, or junk folder.',
          registeredUser: userProfile,
        };
      } catch (err: any) {
        const message = getFriendlyAuthErrorMessage(err?.code || err?.message || '');
        return { success: false, error: message };
      }
    },
    []
  );

  // 2. LOGIN METHOD (Firebase Auth + Email Verification Gate + Firestore RBAC)
  const login = useCallback(
    async (email: string, password?: string): Promise<LoginResult> => {
      const normalized = email.trim().toLowerCase();

      // Check allowed domain
      const isCompanyDomain = normalized.endsWith(COMPANY_EMAIL_DOMAIN);
      const isSpecialAdmin = isAuthorizedAdmin(normalized);

      if (!isCompanyDomain && !isSpecialAdmin) {
        return {
          success: false,
          error: `Company Email Domain Restricted: Only accounts with an official ${COMPANY_EMAIL_DOMAIN} email or authorized System Administrator can sign in.`,
        };
      }

      if (!password) {
        return { success: false, error: 'Please enter your password.' };
      }

      try {
        // 1. Authenticate with Firebase Auth
        const userCred = await signInWithEmailAndPassword(auth, normalized, password);
        const fbUser = userCred.user;

        // 2. Reload user to obtain freshest verification state from Firebase Auth
        await fbUser.reload().catch(() => {});

        // 3. MANDATORY EMAIL VERIFICATION GATE
        // All roles, including Administrators, must have a verified email before application access
        if (!fbUser.emailVerified) {
          setLastUnverifiedCreds({ email: normalized, pass: password });
          setCurrentUser(null);
          setIsVerificationRequired(true);
          setUnverifiedEmail(normalized);

          return {
            success: false,
            error: 'Your email address has not been verified yet. Please check your email and click the verification link before accessing the system.',
            unverified: true,
            unverifiedEmail: normalized,
          };
        }

        // Email IS verified!
        setIsVerificationRequired(false);
        setUnverifiedEmail(null);

        // 4. Retrieve Firestore profile safely
        const userDocRef = doc(db, 'users', fbUser.uid);
        let userDocSnap: any = null;

        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (fetchErr: any) {
          console.warn('Firestore profile lookup notice during login:', fetchErr?.message || fetchErr);
        }

        let priorProfileData: Partial<User> | null = null;
        let duplicatePriorDocId: string | null = null;

        if (!userDocSnap || !userDocSnap.exists()) {
          try {
            const q = query(collection(db, 'users'), where('email', '==', normalized));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              const matched = qSnap.docs[0];
              priorProfileData = matched.data() as User;
              if (matched.id !== fbUser.uid) {
                duplicatePriorDocId = matched.id;
              }
            }
          } catch (queryErr) {
            console.warn('Profile search by email note during login:', queryErr);
          }
        }

        let userProfile: User;
        const nowFormatted = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const nowIso = new Date().toISOString();
        const today = nowIso.substring(0, 10);

        if (userDocSnap && userDocSnap.exists()) {
          userProfile = userDocSnap.data() as User;
        } else {
          // Provision initial Firestore doc or fallback profile
          userProfile = createDefaultUserProfile(fbUser, isSpecialAdmin, normalized);
          userProfile.emailVerified = true;
          userProfile.status = 'Active';
          if (priorProfileData) {
            if (priorProfileData.fullName) userProfile.fullName = priorProfileData.fullName;
            if (priorProfileData.phone) userProfile.phone = priorProfileData.phone;
            if (priorProfileData.department) userProfile.department = priorProfileData.department;
          }
        }

        if (isSpecialAdmin) {
          userProfile.role = 'Administrator';
          userProfile.permissions = ADMINISTRATOR_PERMISSIONS;
          userProfile.status = 'Active';
          userProfile.emailVerified = true;
        }

        // 5. Account status enforcement (bypass for primary system admin)
        if (!isSpecialAdmin && userProfile.status === 'Inactive') {
          await signOut(auth);
          setCurrentUser(null);
          return {
            success: false,
            error: 'Your account is deactivated. Please contact the Ethiopian Reinsurance System Administrator.',
          };
        }

        if (!isSpecialAdmin && userProfile.status === 'Suspended') {
          await signOut(auth);
          setCurrentUser(null);
          return {
            success: false,
            error: 'Your account has been suspended. Please contact the Ethiopian Reinsurance System Administrator.',
          };
        }

        // If user was Pending Verification in Firestore but is now verified in Auth, activate profile
        if (userProfile.status === 'Pending Verification') {
          userProfile.status = 'Active';
          userProfile.emailVerified = true;
          userProfile.updatedAt = nowIso;
        }

        // 6. Update lastLogin and persist full profile under fbUser.uid
        userProfile.lastLogin = nowFormatted;
        userProfile.lastLoginAt = nowIso;
        userProfile.emailVerified = true;
        userProfile.updatedDate = today;
        userProfile.updatedAt = nowIso;

        await setDoc(userDocRef, sanitizeForFirestore(userProfile), { merge: true }).catch((err) => {
          console.warn('Profile background sync notice during login:', err?.message || err);
        });

        // Clean up duplicate old seed document if it existed
        if (duplicatePriorDocId && duplicatePriorDocId !== fbUser.uid) {
          await deleteDoc(doc(db, 'users', duplicatePriorDocId)).catch(() => {});
        }

        const resolvedRole: UserRole = isSpecialAdmin
          ? 'Administrator'
          : (userProfile.role as any) === 'HR Officer' || userProfile.role === 'HR Admin'
          ? 'HR Admin'
          : (userProfile.role as UserRole) || 'Employee';

        const defaultPerms =
          resolvedRole === 'Administrator'
            ? ADMINISTRATOR_PERMISSIONS
            : resolvedRole === 'HR Admin'
            ? HR_ADMIN_PERMISSIONS
            : EMPLOYEE_PERMISSIONS;

        setCurrentUser({
          ...userProfile,
          id: fbUser.uid,
          uid: fbUser.uid,
          role: resolvedRole,
          permissions: userProfile.permissions || defaultPerms,
        });

        setLastUnverifiedCreds(null);
        return { success: true };
      } catch (err: any) {
        const message = getFriendlyAuthErrorMessage(err?.code || err?.message || '');
        return { success: false, error: message };
      }
    },
    []
  );

  // 3. LOGOUT METHOD
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setCurrentUser(null);
      setFirebaseUser(null);
      setIsVerificationRequired(false);
      setUnverifiedEmail(null);
      setLastUnverifiedCreds(null);

      // Purge local storage and session caches of protected HR/employee data
      try {
        localStorage.removeItem('ethiore_attendance_cache_v2');
        localStorage.removeItem('ethiore_leaves_cache');
        localStorage.removeItem('ethiore_employees_cache');
        localStorage.removeItem('ethiore_departments_cache');
        localStorage.removeItem('ethiore_rbac_roles_cache');
        sessionStorage.clear();
      } catch (_) {}

      // Replace browser URL with login to prevent Back button from navigating into protected views
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/#login');
      }
    }
  }, []);

  // 4. RESEND EMAIL VERIFICATION (Firebase)
  const resendVerificationEmail = useCallback(async (email?: string, password?: string) => {
    const normalized = (email || unverifiedEmail || auth.currentUser?.email || '').trim().toLowerCase();

    try {
      // If auth already has a current user matching this email
      if (auth.currentUser && (!normalized || auth.currentUser.email?.toLowerCase() === normalized)) {
        await sendEmailVerification(auth.currentUser);
        return {
          success: true,
          message: 'Verification email sent. Please check your inbox, spam folder, or junk folder.',
        };
      }

      // If we have saved credentials from a recent unverified login attempt
      const pass = password || (lastUnverifiedCreds?.email === normalized ? lastUnverifiedCreds.pass : undefined);

      if (pass && normalized) {
        const cred = await signInWithEmailAndPassword(auth, normalized, pass);
        await sendEmailVerification(cred.user);
        return {
          success: true,
          message: 'Verification email sent. Please check your inbox, spam folder, or junk folder.',
        };
      }

      return {
        success: false,
        error: 'Unable to dispatch verification email. Please log in with your email and password.',
      };
    } catch (err: any) {
      if (err?.code === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'Too many verification requests sent recently. Please wait a moment before trying again.',
        };
      }
      return {
        success: false,
        error: getFriendlyAuthErrorMessage(err?.code || err?.message || ''),
      };
    }
  }, [lastUnverifiedCreds, unverifiedEmail]);

  // 5. CHECK VERIFICATION STATUS
  const checkVerificationStatus = useCallback(async (): Promise<{
    success: boolean;
    isVerified: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) {
        return {
          success: false,
          isVerified: false,
          error: 'No active session found. Please sign in with your corporate email and password.',
        };
      }

      // 1. Refresh Firebase Authentication user state
      await fbUser.reload();
      const updatedUser = auth.currentUser;

      // 2. Check emailVerified
      if (!updatedUser || !updatedUser.emailVerified) {
        setIsVerificationRequired(true);
        setUnverifiedEmail(updatedUser?.email || null);
        return {
          success: false,
          isVerified: false,
          error: 'Your email address has not been verified yet. Please check your email and click the verification link before accessing the system.',
        };
      }

      // 3. Email IS verified! Proceed to profile loading and authorization
      setIsVerificationRequired(false);
      setUnverifiedEmail(null);

      const isSpecialAdmin = isAuthorizedAdmin(updatedUser.email);
      const userDocRef = doc(db, 'users', updatedUser.uid);
      let userDocSnap: any = null;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (err: any) {
        console.warn('Profile read note during verification check:', err?.message || err);
      }

      let profile: User;
      if (userDocSnap && userDocSnap.exists()) {
        profile = userDocSnap.data() as User;
        const updates: Partial<User> = {
          emailVerified: true,
          status: profile.status === 'Pending Verification' ? 'Active' : profile.status,
          updatedAt: new Date().toISOString(),
          updatedDate: new Date().toISOString().substring(0, 10),
        };
        updateDoc(userDocRef, updates).catch((err) => console.warn('Sync verified update note:', err));
        profile = {
          ...profile,
          ...updates,
          id: updatedUser.uid,
          role: isSpecialAdmin
            ? 'Administrator'
            : (profile.role as any) === 'HR Officer' || profile.role === 'HR Admin'
            ? 'HR Admin'
            : profile.role || 'Employee',
          emailVerified: true,
        };
      } else {
        profile = createDefaultUserProfile(updatedUser, isSpecialAdmin);
        profile.emailVerified = true;
        profile.status = 'Active';
        setDoc(userDocRef, sanitizeForFirestore(profile), { merge: true }).catch((err) => console.warn('Sync profile note:', err));
      }

      setCurrentUser(profile);
      return {
        success: true,
        isVerified: true,
        message: 'Email verification confirmed! Welcome to Ethiopian Reinsurance HRMS.',
      };
    } catch (err: any) {
      return {
        success: false,
        isVerified: false,
        error: err?.message || 'Could not verify status. Please try again.',
      };
    }
  }, []);

  // 6. LEGACY / COMPATIBILITY VERIFY EMAIL WRAPPER
  const verifyEmail = useCallback(async (email: string) => {
    const statusRes = await checkVerificationStatus();
    return {
      success: statusRes.isVerified,
      message: statusRes.message,
      error: statusRes.error,
    };
  }, [checkVerificationStatus]);

  // 7. FORGOT PASSWORD (Firebase Password Reset Email)
  const forgotPassword = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      return { success: false, error: 'Please enter your corporate email address.' };
    }

    try {
      await sendPasswordResetEmail(auth, normalized);
      return {
        success: true,
        message: `A password reset link has been dispatched to ${normalized}. Follow the instructions in the email to set a new password.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: getFriendlyAuthErrorMessage(err?.code || err?.message || ''),
      };
    }
  }, []);

  // 8. RESET PASSWORD (placeholder for compatibility)
  const resetPassword = useCallback(async (email: string) => {
    return forgotPassword(email);
  }, [forgotPassword]);

  // 9. CHANGE PASSWORD
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      return { success: false, error: 'User is not signed in.' };
    }

    try {
      // Re-authenticate user first
      await signInWithEmailAndPassword(auth, auth.currentUser.email, currentPassword);
      await updateFirebasePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: getFriendlyAuthErrorMessage(err?.code || err?.message || ''),
      };
    }
  }, []);

  // 10. UPDATE PROFILE (Personal fields only for non-admin)
  const updateProfile = useCallback(async (updatedData: Partial<User>) => {
    if (!currentUser || !auth.currentUser) return;

    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const updates: any = {
        ...updatedData,
        updatedAt: new Date().toISOString(),
        updatedDate: new Date().toISOString().substring(0, 10),
      };

      // Security: Strip role and permissions escalation from self profile update
      if (!isAuthorizedAdmin(currentUser?.email) && currentUser.role !== 'Administrator') {
        delete updates.role;
        delete updates.permissions;
      }

      await updateDoc(userDocRef, sanitizeForFirestore(updates));

      if (updatedData.fullName) {
        await updateFirebaseProfile(auth.currentUser, { displayName: updatedData.fullName }).catch(() => {});
      }

      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err: any) {
      console.warn('Error updating user profile in Firestore:', err?.message || err);
    }
  }, [currentUser]);

  // 11. SWITCH ROLE (Disabled to enforce immutable server-authenticated roles)
  const switchRoleForDemo = useCallback((_newRole: UserRole) => {
    // Roles are strictly authoritative and cannot be modified by the browser
    console.warn('Role switching is disabled. User roles are strictly authoritative and loaded from trusted credentials.');
  }, []);

  // Role permissions & Verification State
  const isAdmin = currentUser?.role === 'Administrator';
  const isHRAdmin = currentUser?.role === 'HR Admin' || (currentUser?.role as any) === 'HR Officer';
  const isEmployee = currentUser?.role === 'Employee';
  const isHROfficer = isHRAdmin; // Backward-compatible alias

  const canAccessModule = useCallback(
    (moduleName: string): boolean => {
      // STRICT MANDATORY ACCESS CONTROL:
      // If user is not authenticated, not verified, or not active, ZERO protected modules can be accessed
      if (!currentUser || !currentUser.emailVerified || currentUser.status !== 'Active') {
        return false;
      }

      if (isAdmin) return true;

      // HR Admin access rights: Operational HR and self-service only
      if (isHRAdmin) {
        const allowedForHRAdmin = [
          'dashboard',
          'attendance',
          'leave',
          'employees',
          'departments',
          'reports',
          'my-profile',
          'my-attendance',
          'my-leave',
          'my-leave-balance',
          'my-notifications',
          'account-settings',
        ];
        return allowedForHRAdmin.includes(moduleName);
      }

      // Employee access rights: STRICTLY self-service portal only
      if (isEmployee) {
        const allowedForEmployee = [
          'my-profile',
          'my-attendance',
          'my-leave',
          'my-leave-balance',
          'my-notifications',
          'account-settings',
        ];
        return allowedForEmployee.includes(moduleName);
      }

      return false;
    },
    [currentUser, isAdmin, isHRAdmin, isEmployee]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated: !!currentUser && !!currentUser.emailVerified && currentUser.status === 'Active',
        isLoadingAuth,
        isVerificationRequired,
        unverifiedEmail,
        login,
        logout,
        register,
        verifyEmail,
        checkVerificationStatus,
        resendVerificationEmail,
        switchRoleForDemo,
        updateProfile,
        forgotPassword,
        resetPassword,
        changePassword,
        isAdmin,
        isHRAdmin,
        isEmployee,
        isHROfficer,
        canAccessModule,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
