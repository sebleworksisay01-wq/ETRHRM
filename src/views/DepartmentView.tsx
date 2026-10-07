import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  PowerOff,
  Power,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Briefcase,
  Layers,
  Network,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { Department, DepartmentStatus } from '../types/hrms';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EthioReLogo } from '../components/EthioReLogo';

export const DepartmentView: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    departments,
    employees,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  } = useHRMS();

  const [currentSubTab, setCurrentSubTab] = useState<'departments' | 'positions' | 'orgstructure'>('departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Sorting & pagination state
  const [deptSortField, setDeptSortField] = useState<'code' | 'name' | 'headOfDepartment' | 'status' | 'assignedCount'>('name');
  const [deptSortDirection, setDeptSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deptCurrentPage, setDeptCurrentPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(10);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [selectedDeptForEmployees, setSelectedDeptForEmployees] = useState<Department | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [headOfDepartment, setHeadOfDepartment] = useState('');
  const [headEmployeeId, setHeadEmployeeId] = useState('');
  const [status, setStatus] = useState<DepartmentStatus>('Active');

  // Eligible department heads populated dynamically from Employee Master Data
  // Strictly restricted to active employees whose Job Title / Position is CEO, EO, or Director
  const eligibleHeads = useMemo(() => {
    return employees.filter((emp) => {
      // Inactive employees should not appear as selectable Department Heads
      const isActive = !emp.employmentStatus || emp.employmentStatus === 'Active';
      if (!isActive) return false;

      const pos = (emp.position || '').trim();
      return (
        pos === 'CEO' ||
        pos === 'EO' ||
        pos === 'Director' ||
        pos.toLowerCase() === 'ceo' ||
        pos.toLowerCase() === 'eo' ||
        pos.toLowerCase() === 'director'
      );
    });
  }, [employees]);

  const openAddModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setDescription('');
    setHeadOfDepartment('');
    setHeadEmployeeId('');
    setStatus('Active');
    setFormError(null);
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name || dept.departmentName || '');
    setCode(dept.code || dept.departmentCode || '');
    setDescription(dept.description || '');

    // Resolve matching employee by unique ID or reference
    const matchedEmployee = employees.find(
      (e) => (dept.headEmployeeId && (e.employeeId === dept.headEmployeeId || e.id === dept.headEmployeeId)) ||
             (dept.headOfDepartment && e.fullName.toLowerCase() === dept.headOfDepartment.toLowerCase())
    );

    if (matchedEmployee) {
      setHeadEmployeeId(matchedEmployee.employeeId);
      setHeadOfDepartment(matchedEmployee.fullName);
    } else {
      setHeadEmployeeId(dept.headEmployeeId || '');
      setHeadOfDepartment(dept.headOfDepartment || '');
    }

    setStatus(dept.status);
    setFormError(null);
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // 1. Validate required data
    if (!trimmedName) {
      setFormError('Department name is required and cannot be empty.');
      return;
    }

    if (!trimmedCode) {
      setFormError('Department code is required and cannot be empty.');
      return;
    }

    // 2. Client-side duplicate check before submission
    const duplicateName = departments.some(
      (d) =>
        (!editingDept || d.id !== editingDept.id) &&
        (d.name || d.departmentName || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      setFormError('A department with this name already exists.');
      return;
    }

    const duplicateCode = departments.some(
      (d) =>
        (!editingDept || d.id !== editingDept.id) &&
        (d.code || d.departmentCode || '').trim().toUpperCase() === trimmedCode
    );
    if (duplicateCode) {
      setFormError('A department with this code already exists.');
      return;
    }

    // Validate Department Head: must hold CEO, EO, or Director and be Active
    if (headEmployeeId) {
      const selectedEmp = employees.find(
        (emp) => emp.employeeId === headEmployeeId || emp.id === headEmployeeId
      );
      if (!selectedEmp) {
        setFormError('Selected Department Head does not exist in Employee Master Data.');
        return;
      }
      const pos = (selectedEmp.position || '').trim();
      const validPositions = ['CEO', 'EO', 'Director'];
      if (!validPositions.some((p) => p.toLowerCase() === pos.toLowerCase())) {
        setFormError('Department Head must hold the position of CEO, EO, or Director.');
        return;
      }
      if (selectedEmp.employmentStatus && selectedEmp.employmentStatus !== 'Active') {
        setFormError('Inactive employees cannot be appointed as Department Head.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const selectedEmp = employees.find(
        (emp) => emp.employeeId === headEmployeeId || emp.id === headEmployeeId
      );
      const finalHeadName = selectedEmp ? selectedEmp.fullName : (headOfDepartment.trim() || '');
      const finalHeadId = headEmployeeId.trim();

      if (editingDept) {
        const res = await updateDepartment(editingDept.id, {
          name: trimmedName,
          code: trimmedCode,
          description: description.trim(),
          headOfDepartment: finalHeadName,
          headEmployeeId: finalHeadId,
          status,
        });

        if (!res.success) {
          // Do not reset form or close modal if Firestore write fails
          setFormError(res.error || 'Failed to update department.');
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage(`Department "${trimmedName}" updated successfully.`);
      } else {
        const res = await addDepartment({
          name: trimmedName,
          code: trimmedCode,
          description: description.trim(),
          headOfDepartment: finalHeadName,
          headEmployeeId: finalHeadId,
          status,
        });

        if (!res.success) {
          // Do not reset form or close modal if Firestore write fails
          setFormError(res.error || 'Failed to create department.');
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage(`Department "${trimmedName}" created successfully.`);
      }

      // Reset form and close modal only upon confirmed success
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setHeadOfDepartment('');
      setHeadEmployeeId('');
      setStatus('Active');
      setEditingDept(null);
      setFormError(null);
    } catch (err: any) {
      console.error('Unexpected error in department submit handler:', err);
      setFormError(err?.message || 'An unexpected error occurred while saving the department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    const newStatus: DepartmentStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    const res = await updateDepartment(dept.id, { status: newStatus });
    if (!res.success) {
      setGeneralError(res.error || 'Failed to update department status.');
    } else {
      setSuccessMessage(`Department "${dept.name}" marked as ${newStatus}.`);
    }
  };

  const handleDeptSort = (field: 'code' | 'name' | 'headOfDepartment' | 'status' | 'assignedCount') => {
    if (deptSortField === field) {
      setDeptSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDeptSortField(field);
      setDeptSortDirection('asc');
    }
    setDeptCurrentPage(1);
  };

  // Calculate assigned employees
  const getAssignedEmployees = (deptName: string) => {
    return employees.filter((e) => e.departmentName === deptName);
  };

  // Processed and sorted departments
  const processedDepartments = useMemo(() => {
    const list = departments.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (d.name || '').toLowerCase().includes(q);
        const matchCode = (d.code || '').toLowerCase().includes(q);
        const matchHead = (d.headOfDepartment || '').toLowerCase().includes(q);
        const matchDesc = (d.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchHead && !matchDesc) return false;
      }

      if (selectedStatus && d.status !== selectedStatus) {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (deptSortField === 'assignedCount') {
        valA = employees.filter((e) => e.departmentName === a.name).length;
        valB = employees.filter((e) => e.departmentName === b.name).length;
      } else {
        valA = (a[deptSortField] ?? '') as string;
        valB = (b[deptSortField] ?? '') as string;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return deptSortDirection === 'asc' ? cmp : -cmp;
      }
      if (valA < valB) return deptSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return deptSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [departments, searchQuery, selectedStatus, deptSortField, deptSortDirection, employees]);

  const filteredDepartments = processedDepartments;

  const totalDeptRecords = processedDepartments.length;
  const totalDeptPages = Math.max(1, Math.ceil(totalDeptRecords / deptPageSize));
  const validDeptPage = Math.min(Math.max(1, deptCurrentPage), totalDeptPages);
  const startDeptIndex = (validDeptPage - 1) * deptPageSize;
  const endDeptIndex = Math.min(startDeptIndex + deptPageSize, totalDeptRecords);
  const paginatedDepartments = useMemo(() => {
    return processedDepartments.slice(startDeptIndex, endDeptIndex);
  }, [processedDepartments, startDeptIndex, endDeptIndex]);

  const targetDept = departments.find((d) => d.id === deleteTargetId);
  const targetAssignedCount = targetDept ? getAssignedEmployees(targetDept.name).length : 0;

  // Derived positions data
  const positionsMap = new Map<
    string,
    {
      title: string;
      departments: Set<string>;
      categories: Set<string>;
      employees: typeof employees;
    }
  >();

  employees.forEach((emp) => {
    const pos = emp.position || 'Specialist';
    if (!positionsMap.has(pos)) {
      positionsMap.set(pos, {
        title: pos,
        departments: new Set(),
        categories: new Set(),
        employees: [],
      });
    }
    const item = positionsMap.get(pos)!;
    item.departments.add(emp.departmentName);
    item.categories.add(emp.category);
    item.employees.push(emp);
  });

  const positionsList = Array.from(positionsMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <div className="space-y-5">
      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 rounded-md text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{generalError}</span>
          </div>
          <button
            onClick={() => setGeneralError(null)}
            className="p-1 rounded-md text-rose-600 hover:text-rose-900 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">Departments &amp; Structure</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-900">
              {departments.length} Operational Units &middot; {positionsList.length} Job Roles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize reinsurance business divisions, underwriters, positions, and corporate hierarchy.
          </p>
        </div>

        {currentSubTab === 'departments' && (
          <button
            id="btn-add-department"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-95 transition-opacity cursor-pointer self-start sm:self-auto"
            style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Sub-Tabs: Departments / Positions / Organizational Structure */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setCurrentSubTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            currentSubTab === 'departments'
              ? 'bg-[#0B2A5E] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setCurrentSubTab('positions')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            currentSubTab === 'positions'
              ? 'bg-[#0B2A5E] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Positions Directory ({positionsList.length})</span>
        </button>

        <button
          onClick={() => setCurrentSubTab('orgstructure')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            currentSubTab === 'orgstructure'
              ? 'bg-[#0B2A5E] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Organizational Structure</span>
        </button>
      </div>

      {/* TAB 1: DEPARTMENTS DIRECTORY */}
      {currentSubTab === 'departments' && (
        <>
      {/* Filter Toolbar & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search department name, code, manager, description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDeptCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setDeptCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
          <span>Rows:</span>
          <select
            value={deptPageSize}
            onChange={(e) => {
              setDeptPageSize(Number(e.target.value));
              setDeptCurrentPage(1);
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white text-xs cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Department Data Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                {/* Code */}
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleDeptSort('code')}
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    <span>Code</span>
                    {deptSortField === 'code' ? (
                      deptSortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Name */}
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[180px]"
                  onClick={() => handleDeptSort('name')}
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    <span>Department Name</span>
                    {deptSortField === 'name' ? (
                      deptSortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Description */}
                <th className="px-4 py-3 whitespace-nowrap min-w-[200px]">Description</th>

                {/* Department Head */}
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleDeptSort('headOfDepartment')}
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    <span>Department Head</span>
                    {deptSortField === 'headOfDepartment' ? (
                      deptSortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Personnel Count */}
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleDeptSort('assignedCount')}
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    <span>Staff Assigned</span>
                    {deptSortField === 'assignedCount' ? (
                      deptSortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Status */}
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleDeptSort('status')}
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    <span>Status</span>
                    {deptSortField === 'status' ? (
                      deptSortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Actions */}
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDepartments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No departments registered yet</p>
                    <p className="text-xs text-slate-400">Add a new operational department or clear search filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedDepartments.map((dept) => {
                  const assignedEmps = getAssignedEmployees(dept.name);
                  return (
                    <tr key={dept.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-900 border border-blue-100">
                          {dept.code}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900 text-xs">
                        {dept.name}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                        {dept.description || 'Corporate reinsurance division.'}
                      </td>

                      {/* Head */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                        {(() => {
                          const headEmp = employees.find(
                            (e) => (dept.headEmployeeId && (e.employeeId === dept.headEmployeeId || e.id === dept.headEmployeeId)) ||
                                   (dept.headOfDepartment && e.fullName.toLowerCase() === dept.headOfDepartment.toLowerCase())
                          );
                          if (headEmp) {
                            return (
                              <div>
                                <span className="text-slate-900 font-semibold">{headEmp.fullName}</span>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <span className="font-medium text-blue-700">{headEmp.position}</span>
                                  <span>&bull;</span>
                                  <span className="font-mono">{headEmp.employeeId}</span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <span className="text-slate-500 italic">
                              {dept.headOfDepartment || 'To be assigned'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Staff Assigned */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDeptForEmployees(dept)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-700" />
                          <span>{assignedEmps.length} Employees</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            dept.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {dept.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDeptForEmployees(dept)}
                            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-blue-900 transition-colors cursor-pointer"
                            title="View Department Team"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-edit-dept-${dept.id}`}
                            onClick={() => openEditModal(dept)}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-toggle-dept-${dept.id}`}
                            onClick={() => handleToggleStatus(dept)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              dept.status === 'Active'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={dept.status === 'Active' ? 'Deactivate Department' : 'Activate Department'}
                          >
                            {dept.status === 'Active' ? (
                              <PowerOff className="w-3.5 h-3.5" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isAdmin && (
                            <button
                              id={`btn-delete-dept-${dept.id}`}
                              onClick={() => setDeleteTargetId(dept.id)}
                              className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Department (Admin Only)"
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

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800">{totalDeptRecords > 0 ? startDeptIndex + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{endDeptIndex}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalDeptRecords}</span> departments
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDeptCurrentPage(1)}
              disabled={validDeptPage <= 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeptCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validDeptPage <= 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {validDeptPage} of {totalDeptPages}
            </span>

            <button
              onClick={() => setDeptCurrentPage((p) => Math.min(totalDeptPages, p + 1))}
              disabled={validDeptPage >= totalDeptPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeptCurrentPage(totalDeptPages)}
              disabled={validDeptPage >= totalDeptPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )}

      {/* TAB 2: POSITIONS & JOB ROLES DIRECTORY */}
      {currentSubTab === 'positions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Job Positions &amp; Staff Headcount</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive listing of distinct job titles, allocated departments, and incumbent personnel.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                {positionsList.length} Active Positions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {positionsList.map((pos, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B2A5E] flex items-center justify-center font-bold text-xs">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{pos.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {Array.from(pos.departments).join(', ') || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 shrink-0">
                      {pos.employees.length} staff
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-1">
                    {pos.employees.map((e) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium"
                      >
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        {e.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATIONAL STRUCTURE HIERARCHY */}
      {currentSubTab === 'orgstructure' && (
        <div className="space-y-6">
          {/* Executive Leadership Tier */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs text-center">
            <div className="inline-flex flex-col items-center p-4 rounded-xl border-2 border-blue-900 bg-gradient-to-b from-blue-50 to-white shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#0B2A5E] text-white flex items-center justify-center font-bold mb-2 shadow-xs">
                <Building2 className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Executive Office &amp; Directorate</h3>
              <p className="text-[11px] font-semibold text-blue-900">Chief Executive Officer / Managing Director</p>
              <p className="text-[10px] text-slate-500 mt-1">Ethiopian Reinsurance Share Company</p>
            </div>

            <div className="w-0.5 h-6 bg-blue-900 mx-auto" />
            <div className="h-0.5 w-3/4 max-w-2xl bg-blue-900 mx-auto" />
          </div>

          {/* Departmental Units Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const staff = getAssignedEmployees(dept.name);
              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
                >
                  <div
                    className="px-4 py-3 text-white flex items-center justify-between"
                    style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
                        {dept.code}
                      </span>
                      <h4 className="font-bold text-xs">{dept.name}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                      {staff.length} Members
                    </span>
                  </div>

                  <div className="p-4 flex-1 space-y-3 text-xs">
                    {/* Head of Department */}
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-amber-800 block">Department Head</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {dept.headOfDepartment || 'To Be Appointed'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                        Lead
                      </span>
                    </div>

                    {/* Department Staff Members */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Reporting Personnel ({staff.length})
                      </span>
                      {staff.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No assigned staff</p>
                      ) : (
                        staff.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100 text-[11px]"
                          >
                            <span className="font-medium text-slate-800">{emp.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{emp.position}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
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
                  <span className="font-medium leading-relaxed">{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Life & Non-Life Underwriting"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. UND"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs font-mono uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    disabled={isSubmitting}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DepartmentStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="dept-head-select" className="block font-semibold text-slate-700 mb-1">
                  Department Head
                </label>
                <select
                  id="dept-head-select"
                  name="departmentHead"
                  disabled={isSubmitting}
                  value={headEmployeeId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setHeadEmployeeId(selectedId);
                    const selectedEmp = employees.find(
                      (emp) => emp.employeeId === selectedId || emp.id === selectedId
                    );
                    setHeadOfDepartment(selectedEmp ? selectedEmp.fullName : '');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Select Department Head</option>
                  {eligibleHeads.map((emp) => (
                    <option key={emp.employeeId || emp.id} value={emp.employeeId}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
                {eligibleHeads.length === 0 ? (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active employees with position CEO, EO, or Director found. Only active employees with CEO, EO, or Director position can be appointed as Department Head.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dynamically populated from Employee Master Data (Active CEO, EO, or Director only)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief mandate of this departmental unit..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-dept"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-bold shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isSubmitting
                      ? editingDept
                        ? 'Saving Changes...'
                        : 'Creating Department...'
                      : editingDept
                      ? 'Save Changes'
                      : 'Create Department'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employees in Department Modal */}
      {selectedDeptForEmployees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div>
                <h3 className="text-base font-bold">{selectedDeptForEmployees.name} Team</h3>
                <p className="text-[11px] text-blue-100/80">
                  Department Code: {selectedDeptForEmployees.code} &middot; Head:{' '}
                  {selectedDeptForEmployees.headOfDepartment || 'None'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeptForEmployees(null)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {(() => {
                const emps = getAssignedEmployees(selectedDeptForEmployees.name);
                if (emps.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No employees are currently assigned to this department.
                    </div>
                  );
                }
                return (
                  <div className="space-y-2 text-xs">
                    {emps.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {emp.employeeId} &middot; {emp.position}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            emp.employmentStatus === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {emp.employmentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDeptForEmployees(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Safeguard Confirmation */}
      {deleteTargetId && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Department"
          message={
            targetAssignedCount > 0
              ? `Cannot directly delete "${targetDept?.name}" because ${targetAssignedCount} active employees are currently assigned to this department. Please reassign the employees before deleting.`
              : `Are you sure you want to permanently delete "${targetDept?.name}"? This action cannot be undone.`
          }
          confirmText={targetAssignedCount > 0 ? 'Understood' : 'Yes, Delete Department'}
          cancelText={targetAssignedCount > 0 ? 'Close' : 'Cancel'}
          onConfirm={async () => {
            if (targetAssignedCount > 0) {
              setDeleteTargetId(null);
            } else if (deleteTargetId) {
              const res = await deleteDepartment(deleteTargetId);
              if (!res.success) {
                setGeneralError(res.error || 'Failed to delete department.');
              } else {
                setSuccessMessage('Department deleted successfully.');
              }
              setDeleteTargetId(null);
            }
          }}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
};
