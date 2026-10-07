import React, { useState } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Shield,
  Briefcase,
  UserCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  PowerOff,
  Power,
  Copy,
  Check,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
  Ban,
  ArrowRight,
  User as UserIcon,
  Link,
  Unlink,
} from 'lucide-react';
import { useAuth, SPECIAL_ADMIN_EMAIL, isAuthorizedAdmin } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { User, UserRole, UserStatus } from '../types/hrms';
import { AccessDenied } from '../components/AccessDenied';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EthioReLogo } from '../components/EthioReLogo';

export const UserManagementView: React.FC = () => {
  const { isAdmin, currentUser } = useAuth();
  const {
    users,
    employees,
    departments,
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
  } = useHRMS();

  if (!isAdmin) {
    return (
      <AccessDenied
        moduleName="System User Management"
        requiredRole="Administrator"
      />
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Dedicated Role Assignment State & Confirmation (Requirement 6)
  const [roleAssignTargetUser, setRoleAssignTargetUser] = useState<User | null>(null);
  const [pendingRoleSelection, setPendingRoleSelection] = useState<UserRole>('Employee');
  const [isConfirmRoleModalOpen, setIsConfirmRoleModalOpen] = useState(false);

  // Dedicated Account Linking State (Requirement: Admin Account-Linking Interface)
  const [linkTargetUser, setLinkTargetUser] = useState<User | null>(null);
  const [selectedEmployeeForLink, setSelectedEmployeeForLink] = useState<string>('');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toggleTargetUser, setToggleTargetUser] = useState<User | null>(null);
  const [suspendTargetUser, setSuspendTargetUser] = useState<User | null>(null);
  const [resetPasswordInfo, setResetPasswordInfo] = useState<{ email: string; tempPass: string } | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [emailVerified, setEmailVerified] = useState(true);
  const [phone, setPhone] = useState('+251 91 ');
  const [department, setDepartment] = useState('');
  const [initialPassword, setInitialPassword] = useState('');

  const openAddModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setRole('Employee'); // Default role Employee
    setStatus('Pending Verification');
    setEmailVerified(false);
    setPhone('+251 91 ');
    setDepartment(departments[0]?.name || 'Executive Office');
    setInitialPassword('emp123');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setRole((user.role as any) === 'HR Officer' ? 'HR Admin' : user.role || 'Employee');
    setStatus(user.status || 'Active');
    setEmailVerified(user.emailVerified ?? true);
    setPhone(user.phone || '');
    setDepartment(user.department || departments[0]?.name || 'Executive Office');
    setInitialPassword('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openAssignRoleModal = (user: User) => {
    setRoleAssignTargetUser(user);
    const initialRole: UserRole = (user.role as any) === 'HR Officer' ? 'HR Admin' : user.role || 'Employee';
    setPendingRoleSelection(initialRole);
    setIsConfirmRoleModalOpen(false);
  };

  const handleTriggerRoleChangeConfirm = () => {
    if (!roleAssignTargetUser) return;
    if (roleAssignTargetUser.role === pendingRoleSelection) {
      setRoleAssignTargetUser(null);
      return;
    }

    // Protection check for primary administrator
    if (isAuthorizedAdmin(roleAssignTargetUser.email) && pendingRoleSelection !== 'Administrator') {
      setActionNotice({
        type: 'error',
        message: `Security Protected: The primary designated Administrator account (${roleAssignTargetUser.email}) cannot be demoted or changed.`,
      });
      setRoleAssignTargetUser(null);
      return;
    }

    setIsConfirmRoleModalOpen(true);
  };

  const handleExecuteRoleChange = async () => {
    if (!roleAssignTargetUser) return;
    setIsConfirmRoleModalOpen(false);

    const targetUser = roleAssignTargetUser;
    setRoleAssignTargetUser(null);

    const res = await updateUserRole(targetUser.id, pendingRoleSelection);
    if (!res.success) {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to update user role.',
      });
    } else {
      setActionNotice({
        type: 'success',
        message: `Role for ${targetUser.fullName} successfully updated to "${pendingRoleSelection}". Permissions synchronized in Firebase and audit log recorded.`,
      });
    }
  };

  const openLinkModal = (user: User) => {
    setLinkTargetUser(user);
    // Auto-select candidate employee matching user email or current user.employeeId
    const matched = employees.find(
      (e) =>
        (user.employeeId && (e.employeeId === user.employeeId || e.id === user.employeeId)) ||
        (e.email && user.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
        e.userId === user.id ||
        e.linkedUserId === user.id
    );
    setSelectedEmployeeForLink(matched ? matched.employeeId : '');
    setIsLinkModalOpen(true);
  };

  const handleExecuteLink = async () => {
    if (!linkTargetUser || !selectedEmployeeForLink) return;
    setIsLinkingLoading(true);
    setActionNotice(null);

    const res = await linkUserToEmployee(linkTargetUser.id, selectedEmployeeForLink);
    setIsLinkingLoading(false);

    if (!res.success) {
      setActionNotice({ type: 'error', message: res.error || 'Failed to link user to employee.' });
    } else {
      const emp = employees.find((e) => e.employeeId === selectedEmployeeForLink || e.id === selectedEmployeeForLink);
      setActionNotice({
        type: 'success',
        message: `Successfully linked ${linkTargetUser.email} (UID: ${linkTargetUser.id}) to Employee ${emp?.fullName || selectedEmployeeForLink} (${selectedEmployeeForLink}).`,
      });
      setIsLinkModalOpen(false);
      setLinkTargetUser(null);
    }
  };

  const handleExecuteUnlink = async (user: User) => {
    setIsLinkingLoading(true);
    setActionNotice(null);

    const res = await unlinkUserEmployee(user.id);
    setIsLinkingLoading(false);

    if (!res.success) {
      setActionNotice({ type: 'error', message: res.error || 'Failed to unlink employee.' });
    } else {
      setActionNotice({
        type: 'success',
        message: `Successfully removed link for ${user.email}.`,
      });
      setIsLinkModalOpen(false);
      setLinkTargetUser(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionNotice(null);

    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail) {
      setFormError('Full name and email are required.');
      return;
    }

    if (editingUser) {
      const res = await updateUser(editingUser.id, {
        fullName: trimmedName,
        email: normalizedEmail,
        role,
        status,
        emailVerified,
        phone: phone.trim(),
        department: department.trim(),
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update user.');
        return;
      }
      setActionNotice({ type: 'success', message: `User account for ${trimmedName} successfully updated in Firebase.` });
    } else {
      const res = await addUser({
        fullName: trimmedName,
        email: normalizedEmail,
        role,
        status,
        emailVerified,
        phone: phone.trim(),
        department: department.trim(),
        password: initialPassword || 'emp123',
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create user.');
        return;
      }
      setActionNotice({ type: 'success', message: `User ${trimmedName} provisioned with role "${role}".` });
    }

    setIsModalOpen(false);
  };

  const handleManualVerify = async (user: User) => {
    const res = await verifyUserManually(user.id);
    if (res.success) {
      setActionNotice({ type: 'success', message: `Email verified and account activated for ${user.fullName}.` });
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  };

  const handleResendVerification = async (user: User) => {
    const res = await resendVerificationForUser(user.id);
    if (res.success) {
      setActionNotice({ type: 'info', message: res.message });
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTargetUser) return;
    const newStatus: UserStatus = toggleTargetUser.status === 'Active' ? 'Inactive' : 'Active';
    const res = await toggleUserStatus(toggleTargetUser.id, newStatus);
    setToggleTargetUser(null);
    if (!res.success) {
      setActionNotice({ type: 'error', message: res.error || 'Failed to update user status.' });
    } else {
      setActionNotice({ type: 'success', message: `User account status changed to ${newStatus}.` });
    }
  };

  const handleSuspend = async () => {
    if (!suspendTargetUser) return;
    const res = await suspendUser(suspendTargetUser.id);
    setSuspendTargetUser(null);
    if (!res.success) {
      setActionNotice({ type: 'error', message: res.error || 'Failed to suspend user account.' });
    } else {
      setActionNotice({ type: 'info', message: `Account suspended for ${suspendTargetUser.fullName}.` });
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const res = await deleteUser(deleteTargetId);
    setDeleteTargetId(null);
    if (!res.success) {
      setActionNotice({ type: 'error', message: res.error || 'Failed to delete user.' });
    } else {
      setActionNotice({ type: 'info', message: 'User account removed from database.' });
    }
  };

  const handleResetPassword = async (user: User) => {
    const res = await resetUserPassword(user.id);
    if (res.success) {
      setResetPasswordInfo({
        email: user.email,
        tempPass: res.tempPassword || 'emp123',
      });
      setHasCopiedPassword(false);
    } else {
      setActionNotice({ type: 'error', message: res.message });
    }
  };

  const handleCopyPassword = () => {
    if (resetPasswordInfo?.tempPass) {
      navigator.clipboard.writeText(resetPasswordInfo.tempPass);
      setHasCopiedPassword(true);
      setTimeout(() => setHasCopiedPassword(false), 2000);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.fullName?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDept) return false;
    }

    if (selectedRole) {
      if (selectedRole === 'HR Admin') {
        if (u.role !== 'HR Admin' && (u.role as any) !== 'HR Officer') return false;
      } else if (u.role !== selectedRole) {
        return false;
      }
    }

    if (selectedStatus && u.status !== selectedStatus) return false;

    if (selectedVerification) {
      if (selectedVerification === 'verified' && !u.emailVerified) return false;
      if (selectedVerification === 'unverified' && u.emailVerified) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">User Identity &amp; Role Management</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#002855]/10 text-[#002855] border border-[#002855]/20">
              RBAC Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative user directory with role assignment (Administrator, HR Admin, Employee), linked employee mapping, and audit logging.
          </p>
        </div>

        <button
          id="btn-add-user"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer self-start sm:self-auto"
          style={{ backgroundColor: 'var(--primary-color, #002855)' }}
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>Provision User</span>
        </button>
      </div>

      {actionNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : actionNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : actionNotice.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{actionNotice.message}</div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, corporate email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
          >
            <option value="">All Roles</option>
            <option value="Administrator">Administrator</option>
            <option value="HR Admin">HR Admin</option>
            <option value="Employee">Employee</option>
          </select>
        </div>

        <div className="w-full sm:w-44">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div className="w-full sm:w-44">
          <select
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
      </div>

      {/* Users Table (Requirement 6: User Name | Email | Employee | Current Role | Status | Actions) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3.5">User Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Current Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No users found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Provision a user or adjust the search and filter filters above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.email === currentUser?.email;
                  const isSpecialAdmin = isAuthorizedAdmin(u.email);

                  // Linked Employee lookup (by email or explicit userId / linkedUserId)
                  const linkedEmployee = employees.find(
                    (e) =>
                      (e.email && e.email.toLowerCase() === u.email.toLowerCase()) ||
                      e.userId === u.id ||
                      e.linkedUserId === u.id
                  );

                  const displayRole: UserRole =
                    u.role === 'HR Officer' ? 'HR Admin' : u.role || 'Employee';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. User Name */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                            style={{ backgroundColor: 'var(--primary-color, #002855)' }}
                          >
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold">
                                  You
                                </span>
                              )}
                              {isSpecialAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold border border-purple-200 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                  <span>Primary Admin</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.department || 'Department Unassigned'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>{u.email}</span>
                          {u.emailVerified ? (
                            <span
                              className="text-emerald-600"
                              title="Corporate Email Verified via Firebase"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 inline" />
                            </span>
                          ) : (
                            <span
                              className="text-amber-500"
                              title="Email verification pending"
                            >
                              <Clock className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Employee */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {linkedEmployee ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              <UserCheck className="w-3 h-3 text-slate-600" />
                              <span>{linkedEmployee.fullName}</span>
                              <span className="font-mono text-slate-500 font-normal">
                                ({linkedEmployee.employeeId})
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200/60">
                            <span>Not Linked</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Current Role */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs ${
                            displayRole === 'Administrator'
                              ? 'bg-[#002855] text-[#D4AF37] border border-[#002855]'
                              : displayRole === 'HR Admin'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {displayRole === 'Administrator' ? (
                            <Shield className="w-3 h-3" />
                          ) : displayRole === 'HR Admin' ? (
                            <Briefcase className="w-3 h-3" />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                          <span>{displayRole}</span>
                        </span>
                      </td>

                      {/* 5. Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.status === 'Pending Verification'
                              ? 'bg-amber-100 text-amber-800'
                              : u.status === 'Suspended'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* 6. Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Account Linking Action Button */}
                          <button
                            id={`btn-link-user-${u.id}`}
                            onClick={() => openLinkModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer transition-colors"
                            title={linkedEmployee ? 'Manage Employee Linking' : 'Link to Employee Master Data'}
                          >
                            <Link className="w-3 h-3 text-blue-600" />
                            <span>{linkedEmployee ? 'Linked' : 'Link Emp'}</span>
                          </button>

                          {/* Role Assignment Action Button (Requirement 6) */}
                          <button
                            id={`btn-assign-role-${u.id}`}
                            onClick={() => openAssignRoleModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#002855]/10 hover:bg-[#002855]/20 text-[#002855] border border-[#002855]/30 cursor-pointer transition-colors"
                            title="Assign Role (Administrator, HR Admin, Employee)"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Assign Role</span>
                          </button>

                          {/* Edit User Button */}
                          <button
                            id={`btn-edit-user-${u.id}`}
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Inactive */}
                          {!isSpecialAdmin && !isCurrent && (
                            <button
                              onClick={() => setToggleTargetUser(u)}
                              className={`p-1.5 rounded-md cursor-pointer ${
                                u.status === 'Active'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {u.status === 'Active' ? (
                                <PowerOff className="w-3.5 h-3.5" />
                              ) : (
                                <Power className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Password Reset */}
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                            title="Generate Temporary Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          {!isSpecialAdmin && !isCurrent && (
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => setDeleteTargetId(u.id)}
                              className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal (Requirement 6: Assign Administrator, HR Admin, Employee with Confirmation) */}
      {roleAssignTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 text-white"
              style={{ backgroundColor: 'var(--primary-color, #002855)' }}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-sm font-bold">Assign System Role</h3>
                  <p className="text-[10px] text-white/80">Configure access level &amp; permissions</p>
                </div>
              </div>
              <button
                onClick={() => setRoleAssignTargetUser(null)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* User Identity Card */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: 'var(--primary-color, #002855)' }}
                >
                  {roleAssignTargetUser.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {roleAssignTargetUser.fullName}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px] truncate">
                    {roleAssignTargetUser.email}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Current Role: <span className="font-bold text-slate-700">{roleAssignTargetUser.role}</span>
                  </div>
                </div>
              </div>

              {/* 3 Standard Role Options Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  Select New Authorized Role:
                </label>
                <div className="space-y-2">
                  {/* 1. Administrator */}
                  <div
                    onClick={() => setPendingRoleSelection('Administrator')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      pendingRoleSelection === 'Administrator'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5">
                      <input
                        type="radio"
                        name="assignRole"
                        checked={pendingRoleSelection === 'Administrator'}
                        onChange={() => setPendingRoleSelection('Administrator')}
                        className="text-[#002855] focus:ring-[#002855]"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#002855]" />
                        <span>Administrator</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Full system access &amp; governance. Manages RBAC, users, departments, and compliance audit trail.
                      </p>
                    </div>
                  </div>

                  {/* 2. HR Admin */}
                  <div
                    onClick={() => setPendingRoleSelection('HR Admin')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      pendingRoleSelection === 'HR Admin'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5">
                      <input
                        type="radio"
                        name="assignRole"
                        checked={pendingRoleSelection === 'HR Admin'}
                        onChange={() => setPendingRoleSelection('HR Admin')}
                        className="text-amber-600 focus:ring-amber-600"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                        <span>HR Admin</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Operational HR access. Manages employee master data, daily attendance, leave authorizations, and HR reports.
                      </p>
                    </div>
                  </div>

                  {/* 3. Employee */}
                  <div
                    onClick={() => setPendingRoleSelection('Employee')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      pendingRoleSelection === 'Employee'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5">
                      <input
                        type="radio"
                        name="assignRole"
                        checked={pendingRoleSelection === 'Employee'}
                        onChange={() => setPendingRoleSelection('Employee')}
                        className="text-emerald-600 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Employee</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Self-service access only. Restricted to personal profile, own attendance history, own leave records, and account settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning notice */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>Audit Notice:</strong> Changing this user's role will immediately update their Firestore access rules, revoke unauthorized routes, and record an immutable entry in the system audit trail.
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleAssignTargetUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerRoleChangeConfirm}
                  className="px-4 py-2 rounded-lg bg-[#002855] text-white font-bold hover:bg-[#003366] transition-colors shadow-xs cursor-pointer"
                >
                  Continue to Confirmation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Role Change (Requirement 6 step 1) */}
      {isConfirmRoleModalOpen && roleAssignTargetUser && (
        <ConfirmDialog
          isOpen={isConfirmRoleModalOpen}
          title="Confirm Role Change"
          message={`Are you sure you want to change the system role for "${roleAssignTargetUser.fullName}" from "${roleAssignTargetUser.role}" to "${pendingRoleSelection}"? This will immediately apply the new RBAC permissions in Firebase.`}
          confirmLabel="Confirm & Apply Role"
          cancelLabel="Go Back"
          onConfirm={handleExecuteRoleChange}
          onCancel={() => setIsConfirmRoleModalOpen(false)}
        />
      )}

      {/* Provision / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #002855)' }}
            >
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-bold">
                  {editingUser ? 'Edit User Credentials & Profile' : 'Provision System User Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Almaz Bekele"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address (Sign-In Username)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ethiopianre.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
                />
                <span className="text-[10px] text-slate-400">
                  Must end with @ethiopianre.com (or designated admin account)
                </span>
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="e.g. emp123 or hr123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400">
                    Default: {role === 'Administrator' ? 'admin123' : role === 'HR Admin' ? 'hr123' : 'emp123'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setRole(newRole);
                      if (!editingUser) {
                        setInitialPassword(
                          newRole === 'Administrator' ? 'admin123' : newRole === 'HR Admin' ? 'hr123' : 'emp123'
                        );
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs font-semibold"
                  >
                    <option value="Administrator">Administrator (Full Access)</option>
                    <option value="HR Admin">HR Admin (Operational HR)</option>
                    <option value="Employee">Employee (Self-Service)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as UserStatus;
                      setStatus(nextStatus);
                      if (nextStatus === 'Active') {
                        setEmailVerified(true);
                      } else if (nextStatus === 'Pending Verification') {
                        setEmailVerified(false);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Email Verification Checkbox */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Corporate Email Verified</div>
                  <div className="text-[10px] text-slate-500">
                    Bypasses verification gate if checked
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={(e) => setEmailVerified(e.target.checked)}
                  className="rounded border-slate-300 text-[#002855] focus:ring-[#002855] h-4 w-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-user"
                  className="px-5 py-2 rounded-lg text-white font-bold shadow-xs hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #002855)' }}
                >
                  {editingUser ? 'Save User' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Password Modal */}
      {resetPasswordInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Temporary Password Generated</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              A temporary password has been initialized for <strong>{resetPasswordInfo.email}</strong>.
              Provide this key to the user for initial account entry:
            </p>
            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-200 mb-4">
              <span className="flex-1 font-mono text-center font-bold text-base text-blue-900 select-all">
                {resetPasswordInfo.tempPass}
              </span>
              <button
                onClick={handleCopyPassword}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer shrink-0"
              >
                {hasCopiedPassword ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => setResetPasswordInfo(null)}
              className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete User Account"
        message="Are you sure you want to permanently delete this user account from the system? The user will immediately lose system access."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Toggle Status Confirm */}
      <ConfirmDialog
        isOpen={!!toggleTargetUser}
        title={toggleTargetUser?.status === 'Active' ? 'Deactivate User Account' : 'Activate User Account'}
        message={`Are you sure you want to change the status of ${toggleTargetUser?.fullName} to ${
          toggleTargetUser?.status === 'Active' ? 'Inactive' : 'Active'
        }?`}
        confirmLabel={toggleTargetUser?.status === 'Active' ? 'Deactivate' : 'Activate'}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleTargetUser(null)}
      />

      {/* Suspend Confirm */}
      <ConfirmDialog
        isOpen={!!suspendTargetUser}
        title="Suspend User Account"
        message={`Are you sure you want to suspend ${suspendTargetUser?.fullName}? The user will be blocked from logging in until reinstated.`}
        confirmLabel="Suspend Account"
        onConfirm={handleSuspend}
        onCancel={() => setSuspendTargetUser(null)}
      />

      {/* Account Linking Modal (Admin Account-Linking Interface) */}
      {isLinkModalOpen && linkTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#002855] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-bold text-sm">Employee Account Linking</h3>
                  <p className="text-[11px] text-blue-200">
                    Establish two-way relationship between Firebase User and Employee Master Data
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkTargetUser(null);
                }}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* User Account Info */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Firebase Authenticated Account
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{linkTargetUser.fullName}</span>
                  <span className="text-slate-600 font-mono text-[11px]">{linkTargetUser.email}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <span>Firebase UID:</span>
                  <strong className="text-slate-800">{linkTargetUser.id}</strong>
                </div>
              </div>

              {/* Current Linked Status */}
              {(() => {
                const currentLinkedEmp = employees.find(
                  (e) =>
                    (linkTargetUser.employeeId && (e.employeeId === linkTargetUser.employeeId || e.id === linkTargetUser.employeeId)) ||
                    e.userId === linkTargetUser.id ||
                    e.linkedUserId === linkTargetUser.id
                );
                return (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Target Employee Master Data Record
                    </label>
                    <select
                      value={selectedEmployeeForLink}
                      onChange={(e) => setSelectedEmployeeForLink(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                    >
                      <option value="">-- Select Employee Master Record --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.employeeId}>
                          {emp.fullName} ({emp.employeeId}) &mdash; {emp.departmentName} &middot; {emp.email}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Linking assigns <code>userId = {linkTargetUser.id}</code> to Employee Master Data and <code>employeeId</code> to User profile.
                    </p>

                    {currentLinkedEmp && (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-[11px]">Currently Linked Record</div>
                            <div className="text-[10px] text-emerald-800 font-mono">
                              {currentLinkedEmp.fullName} ({currentLinkedEmp.employeeId})
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExecuteUnlink(linkTargetUser)}
                          disabled={isLinkingLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-300 text-[10px] font-bold hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                        >
                          <Unlink className="w-3 h-3 text-rose-600" />
                          <span>Unlink</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>Permanent Relationship:</strong> Once linked, subsequent authorization uses the Firebase UID ↔ Employee ID relationship for self-service portal, leave balance calculation, and attendance tracking.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkTargetUser(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-link-employee"
                disabled={!selectedEmployeeForLink || isLinkingLoading}
                onClick={handleExecuteLink}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--primary-color, #002855)' }}
              >
                <Link className="w-3.5 h-3.5" />
                <span>{isLinkingLoading ? 'Linking...' : 'Save Employee Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
