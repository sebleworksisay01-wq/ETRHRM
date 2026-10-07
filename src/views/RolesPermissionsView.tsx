import React, { useState } from 'react';
import {
  Shield,
  Briefcase,
  UserCheck,
  Check,
  X,
  Lock,
  Edit2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Users,
  CheckCircle2,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Save,
  Eye,
} from 'lucide-react';
import { useAuth, SPECIAL_ADMIN_EMAIL } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import {
  RoleDefinition,
  UserRole,
  RBAC_MODULE_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  ADMINISTRATOR_PERMISSIONS,
  HR_ADMIN_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  DEFAULT_ROLE_DEFINITIONS,
} from '../types/hrms';
import { AccessDenied } from '../components/AccessDenied';
import { EthioReLogo } from '../components/EthioReLogo';

export const RolesPermissionsView: React.FC = () => {
  const { isAdmin, currentUser } = useAuth();
  const {
    users,
    roleDefinitions,
    updateRolePermissions,
    resetRolePermissions,
    logAction,
  } = useHRMS();

  if (!isAdmin) {
    return (
      <AccessDenied
        moduleName="Role-Based Access Control (RBAC)"
        requiredRole="Administrator"
      />
    );
  }

  // Active Role being inspected or edited
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedFilterAction, setSelectedFilterAction] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Dynamic user count calculation from actual user records
  const getUserCountForRole = (roleName: UserRole): number => {
    return users.filter((u) => {
      if (roleName === 'HR Admin') {
        return u.role === 'HR Admin' || (u.role as any) === 'HR Officer';
      }
      return u.role === roleName;
    }).length;
  };

  const openPermissionEditor = (role: RoleDefinition) => {
    setEditingRole(role);
    setSelectedPermissions([...(role.permissions || [])]);
    setPermissionSearch('');
    setSelectedFilterAction('all');
    setActionNotice(null);
  };

  const handleTogglePermission = (permKey: string) => {
    if (!editingRole) return;
    if (editingRole.name === 'Administrator') {
      // Administrator always retains full access
      return;
    }
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  const handleToggleModuleAll = (modulePerms: string[]) => {
    if (!editingRole || editingRole.name === 'Administrator') return;
    const allSelected = modulePerms.every((k) => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !modulePerms.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modulePerms])));
    }
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;
    setIsSaving(true);
    setActionNotice(null);

    const res = await updateRolePermissions(editingRole.id, selectedPermissions);
    setIsSaving(false);

    if (!res.success) {
      setActionNotice({
        type: 'error',
        message: res.error || 'Failed to save permissions to Firebase.',
      });
    } else {
      setActionNotice({
        type: 'success',
        message: `RBAC permissions successfully saved to Firebase for "${editingRole.name}". Active user access updated immediately.`,
      });
      // Refresh current role definition state in modal
      setEditingRole((prev) => (prev ? { ...prev, permissions: selectedPermissions } : null));
    }
  };

  const handleResetToDefaults = async () => {
    if (!editingRole) return;
    const defaultDef = DEFAULT_ROLE_DEFINITIONS.find((r) => r.id === editingRole.id || r.name === editingRole.name);
    if (!defaultDef) return;

    setSelectedPermissions([...defaultDef.permissions]);
    const res = await resetRolePermissions(editingRole.id);
    if (res.success) {
      setActionNotice({
        type: 'info',
        message: `Permissions for "${editingRole.name}" restored to standard default configuration.`,
      });
    }
  };

  // Canonical role items list ensuring exactly 3 roles
  const canonicalRoles: RoleDefinition[] = ['Administrator', 'HR Admin', 'Employee'].map((roleName) => {
    const found = roleDefinitions.find((r) => r.name === roleName || r.id === roleName);
    if (found) return found;
    return (
      DEFAULT_ROLE_DEFINITIONS.find((r) => r.name === roleName) || {
        id: roleName,
        name: roleName as UserRole,
        description:
          roleName === 'Administrator'
            ? 'Full system access & governance'
            : roleName === 'HR Admin'
            ? 'HR management access'
            : 'Employee self-service access',
        status: 'Active',
        isSystem: true,
        permissions:
          roleName === 'Administrator'
            ? ADMINISTRATOR_PERMISSIONS
            : roleName === 'HR Admin'
            ? HR_ADMIN_PERMISSIONS
            : EMPLOYEE_PERMISSIONS,
      }
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">
              Role-Based Access Control (RBAC) Management
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-[#002855]/10 text-[#002855] border border-[#002855]/20">
              3 Standard Roles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage and audit permissions for <strong>Administrator</strong>, <strong>HR Admin</strong>, and <strong>Employee</strong>.
            Enforced simultaneously in application UI routing and cloud Firestore security rules.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
            <span className="font-semibold text-slate-800">Primary Administrator: </span>
            <span className="font-mono text-[#002855] font-bold">{SPECIAL_ADMIN_EMAIL}</span>
          </div>
        </div>
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
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
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

      {/* Role List Table (Requirement 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#002855]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              System Roles Matrix &amp; Assignment Overview
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Dynamic user counts calculated from active identity records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Users</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {canonicalRoles.map((role) => {
                const count = getUserCountForRole(role.name);
                const isSelected = editingRole?.id === role.id;

                return (
                  <tr
                    key={role.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Role Column */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                            role.name === 'Administrator'
                              ? 'bg-[#002855] text-[#D4AF37]'
                              : role.name === 'HR Admin'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {role.name === 'Administrator' ? (
                            <Shield className="w-4 h-4" />
                          ) : role.name === 'HR Admin' ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{role.name}</span>
                            {role.name === 'Administrator' && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#002855] text-white">
                                Full Access
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {role.permissions?.length || 0} permissions assigned
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Description Column */}
                    <td className="px-5 py-4 text-slate-600 max-w-md leading-relaxed">
                      {role.name === 'Administrator'
                        ? 'Full system access & governance. Unrestricted control over users, RBAC matrix, organizational master data, and compliance audit logs.'
                        : role.name === 'HR Admin'
                        ? 'HR management access. Manages employee master data, attendance logging, leave approvals, and operational HR reports. RBAC management restricted.'
                        : 'Employee self-service access. Restricted strictly to personal profile, own daily attendance, own leave bookings, and account credentials.'}
                    </td>

                    {/* Status Column */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    </td>

                    {/* Users Dynamic Count Column (Requirement 3) */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 font-mono font-bold text-slate-800">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{count}</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          {count === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        id={`btn-view-role-${role.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => openPermissionEditor(role)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#002855] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>View / Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Management Panel (Requirement 4 & 5) */}
      {editingRole && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in duration-200">
          {/* Header of Permission Editor */}
          <div
            className="p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ backgroundColor: 'var(--primary-color, #002855)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-[#D4AF37]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Configuring Permissions: {editingRole.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/20 text-white uppercase">
                    {editingRole.name === 'Administrator' ? 'Full Access' : 'Configurable'}
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">
                  {editingRole.name === 'Administrator'
                    ? 'The Administrator role has full unconditional system access to all modules and functions by system design.'
                    : `Customize granular permissions for "${editingRole.name}". Changes take effect immediately upon saving.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              {editingRole.name !== 'Administrator' && (
                <button
                  onClick={handleResetToDefaults}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer border border-white/20"
                  title="Reset to recommended standard permissions"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              )}

              {editingRole.name !== 'Administrator' ? (
                <button
                  id="btn-save-role-permissions"
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#c49f2b] text-[#002855] text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Saving to Firebase...' : 'Save Permissions'}</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>All Permissions Active</span>
                </div>
              )}

              <button
                onClick={() => setEditingRole(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer ml-1"
                title="Close Editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search permissions by name, key, or module..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Filter Action:</span>
              <div className="flex flex-wrap gap-1">
                {['all', 'View', 'Create', 'Edit', 'Delete', 'Export', 'Manage'].map((act) => (
                  <button
                    key={act}
                    onClick={() => setSelectedFilterAction(act)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      selectedFilterAction === act
                        ? 'bg-[#002855] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Module-by-Module Permission Grid (Requirement 4) */}
          <div className="p-6 space-y-6">
            {RBAC_MODULE_PERMISSIONS.map((cat) => {
              const categoryPermKeys = cat.permissions.map((p) => p.key);
              const filteredPerms = cat.permissions.filter((p) => {
                if (selectedFilterAction !== 'all' && p.action !== selectedFilterAction) return false;
                if (permissionSearch.trim()) {
                  const q = permissionSearch.toLowerCase();
                  return (
                    p.label.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q) ||
                    p.key.toLowerCase().includes(q) ||
                    cat.module.toLowerCase().includes(q)
                  );
                }
                return true;
              });

              if (filteredPerms.length === 0) return null;

              const allModuleSelected = categoryPermKeys.every((k) =>
                editingRole.name === 'Administrator' ? true : selectedPermissions.includes(k)
              );
              const someModuleSelected = categoryPermKeys.some((k) =>
                editingRole.name === 'Administrator' ? true : selectedPermissions.includes(k)
              );

              return (
                <div
                  key={cat.module}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          {cat.label}
                        </h4>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700">
                          {cat.module}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                    </div>

                    {editingRole.name !== 'Administrator' && (
                      <button
                        onClick={() => handleToggleModuleAll(categoryPermKeys)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        {allModuleSelected ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-blue-700" />
                            <span>Deselect Category</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            <span>Select All in Category</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredPerms.map((perm) => {
                      const isGranted =
                        editingRole.name === 'Administrator'
                          ? true
                          : selectedPermissions.includes(perm.key);

                      const isSelfDisabled =
                        editingRole.name === 'Administrator';

                      return (
                        <div
                          key={perm.key}
                          onClick={() => !isSelfDisabled && handleTogglePermission(perm.key)}
                          className={`p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                            isGranted
                              ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                              : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50'
                          } ${isSelfDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="pt-0.5">
                            {isGranted ? (
                              <CheckSquare className="w-4 h-4 text-blue-700 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-bold truncate text-slate-800">
                                {perm.label}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase shrink-0 ${
                                  perm.action === 'Delete'
                                    ? 'bg-rose-100 text-rose-800'
                                    : perm.action === 'Manage'
                                    ? 'bg-purple-100 text-purple-800'
                                    : perm.action === 'Create'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : perm.action === 'Edit'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {perm.action}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {perm.description}
                            </p>
                            <code className="text-[9px] text-slate-400 font-mono mt-1 block truncate">
                              {perm.key}
                            </code>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer of Permission Editor */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {editingRole.name === 'Administrator'
                ? 'All permissions permanently active'
                : `${selectedPermissions.length} of ${ALL_PERMISSION_KEYS.length} operational capabilities authorized`}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Close
              </button>
              {editingRole.name !== 'Administrator' && (
                <button
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-[#002855] text-white font-bold hover:bg-[#003366] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Apply & Save Permissions'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
