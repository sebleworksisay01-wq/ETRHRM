import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Edit2,
  Trash2,
  Eye,
  UserX,
  UserCheck,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  X,
  ShieldAlert,
  Clock,
  PlaneTakeoff,
  Award,
  Upload,
  FileText,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import {
  Employee,
  EmploymentStatus,
  EmploymentType,
  EmployeeCategory,
  Gender,
  JOB_TITLE_OPTIONS,
} from '../types/hrms';
import { exportToCSV, printReportDocument } from '../utils/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EthioReLogo } from '../components/EthioReLogo';

export const EmployeeView: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    employees,
    departments,
    attendanceRecords,
    leaveRecords,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeBalance,
    branding,
    companyProfile,
  } = useHRMS();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Grid sorting state
  const [sortField, setSortField] = useState<keyof Employee>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Grid pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    employeeId: true,
    fullName: true,
    gender: true,
    dateOfBirth: true,
    department: true,
    position: true,
    category: false,
    employmentType: true,
    hireDate: true,
    phoneNumber: true,
    email: true,
    status: true,
    actions: true,
  });
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Bulk selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Form inputs state
  const [empIdInput, setEmpIdInput] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('1990-05-15');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+251 91 100 0000');
  const [address, setAddress] = useState('Bole Sub-City, Addis Ababa');
  const [deptId, setDeptId] = useState(departments[0]?.id || '');
  const [position, setPosition] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Permanent');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('Active');
  const [category, setCategory] = useState<EmployeeCategory>('Professional');
  const [dateOfHire, setDateOfHire] = useState('2024-01-01');

  const openAddModal = () => {
    setEditingEmployee(null);
    // Generate next suggested ID
    const nextNum = employees.length + 1;
    const suggestedId = `ER-${String(nextNum).padStart(3, '0')}`;
    setEmpIdInput(suggestedId);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setGender('Male');
    setDateOfBirth('1992-04-10');
    setEmail('');
    setPhone('+251 91 ');
    setAddress('Addis Ababa, Ethiopia');
    setDeptId(departments[0]?.id || '');
    setPosition('');
    setEmploymentType('Permanent');
    setEmploymentStatus('Active');
    setCategory('Professional');
    setDateOfHire(new Date().toISOString().substring(0, 10));
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpIdInput(emp.employeeId || '');
    setFirstName(emp.firstName || '');
    setMiddleName(emp.middleName || '');
    setLastName(emp.lastName || '');
    setGender(emp.gender || 'Male');
    setDateOfBirth(emp.dateOfBirth || '1990-05-15');
    setEmail(emp.email || '');
    setPhone(emp.phoneNumber || emp.phone || '+251 91 ');
    setAddress(emp.address || 'Addis Ababa, Ethiopia');
    const matchedDept = departments.find(
      (d) => d.id === emp.departmentId || d.departmentId === emp.departmentId || d.name === emp.departmentName
    );
    setDeptId(matchedDept?.id || emp.departmentId || departments[0]?.id || '');
    setPosition(emp.position || '');
    setEmploymentType(emp.employmentType || 'Permanent');
    setEmploymentStatus(emp.employmentStatus || 'Active');
    setCategory(emp.category || 'Professional');
    setDateOfHire(emp.hireDate || emp.dateOfHire || new Date().toISOString().substring(0, 10));
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSavingEmployee(true);

    try {
      if (!empIdInput.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
        setFormError('Please fill all required personnel fields.');
        setIsSavingEmployee(false);
        return;
      }

      if (!position.trim()) {
        setFormError('Job Title / Position is required.');
        setIsSavingEmployee(false);
        return;
      }

      const selectedDept = departments.find((d) => d.id === deptId || d.departmentId === deptId);
      if (!selectedDept) {
        setFormError('Please select a valid department.');
        setIsSavingEmployee(false);
        return;
      }

      const cleanFullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');

      if (editingEmployee) {
        const empIdToUpdate = editingEmployee.id || editingEmployee.employeeId;
        const res = await updateEmployee(empIdToUpdate, {
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          fullName: cleanFullName,
          gender,
          dateOfBirth,
          email: email.trim().toLowerCase(),
          phoneNumber: phone.trim(),
          phone: phone.trim(),
          address: address.trim(),
          departmentId: selectedDept.id,
          departmentName: selectedDept.name,
          position: position.trim(),
          employmentType,
          employmentStatus,
          dateOfHire,
          hireDate: dateOfHire,
        });

        if (!res.success) {
          console.error('Failed to update employee record:', res.error);
          setFormError(res.error || 'Failed to update employee record. Please verify permissions and data.');
          setIsSavingEmployee(false);
          return;
        }

        setSuccessMessage('Employee updated successfully.');
        setIsFormModalOpen(false);
        setEditingEmployee(null);
      } else {
        const res = await addEmployee({
          employeeId: empIdInput.trim().toUpperCase(),
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          fullName: cleanFullName,
          gender,
          dateOfBirth,
          email: email.trim().toLowerCase(),
          phoneNumber: phone.trim(),
          phone: phone.trim(),
          address: address.trim(),
          departmentId: selectedDept.id,
          departmentName: selectedDept.name,
          position: position.trim(),
          employmentType,
          employmentStatus,
          category,
          hireDate: dateOfHire,
          dateOfHire: dateOfHire,
        });

        if (!res.success) {
          console.error('Failed to create employee record:', res.error);
          setFormError(res.error || 'Failed to create employee.');
          setIsSavingEmployee(false);
          return;
        }

        setSuccessMessage('Employee registered successfully.');
        setIsFormModalOpen(false);
      }
    } catch (err: any) {
      console.error('Unexpected error in handleSaveEmployee:', err);
      const actualError = err instanceof Error ? err.message : String(err);
      setFormError(actualError || 'An unexpected error occurred while saving employee record.');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleToggleStatus = (emp: Employee) => {
    const newStatus: EmploymentStatus = emp.employmentStatus === 'Active' ? 'Inactive' : 'Active';
    updateEmployee(emp.id, { employmentStatus: newStatus });
  };

  // Sorting handler
  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filtered and Sorted employees
  const processedEmployees = useMemo(() => {
    const list = employees.filter((emp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (emp.fullName || '').toLowerCase().includes(q);
        const matchId = (emp.employeeId || '').toLowerCase().includes(q);
        const matchPos = (emp.position || '').toLowerCase().includes(q);
        const matchEmail = (emp.email || '').toLowerCase().includes(q);
        const matchDept = (emp.departmentName || '').toLowerCase().includes(q);
        const matchPhone = (emp.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPos && !matchEmail && !matchDept && !matchPhone) return false;
      }

      if (selectedDepartment && emp.departmentName !== selectedDepartment) {
        return false;
      }

      if (selectedStatus && emp.employmentStatus !== selectedStatus) {
        return false;
      }

      if (selectedCategory && emp.category !== selectedCategory) {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const valA = (a[sortField] ?? '') as string | number;
      const valB = (b[sortField] ?? '') as string | number;
      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [employees, searchQuery, selectedDepartment, selectedStatus, selectedCategory, sortField, sortDirection]);

  // Keep filteredEmployees alias for export and print count compatibility
  const filteredEmployees = processedEmployees;

  // Pagination calculation
  const totalRecords = processedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedEmployees = useMemo(() => {
    return processedEmployees.slice(startIndex, endIndex);
  }, [processedEmployees, startIndex, endIndex]);

  // Bulk selection helpers
  const isAllPageSelected = paginatedEmployees.length > 0 && paginatedEmployees.every((e) => selectedEmployeeIds.has(e.id));
  const isSomePageSelected = paginatedEmployees.some((e) => selectedEmployeeIds.has(e.id)) && !isAllPageSelected;

  const toggleSelectAllPage = () => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedEmployees.forEach((e) => next.delete(e.id));
      } else {
        paginatedEmployees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkStatusChange = async (newStatus: EmploymentStatus) => {
    for (const id of selectedEmployeeIds) {
      await updateEmployee(id, { employmentStatus: newStatus });
    }
    setSelectedEmployeeIds(new Set());
  };

  const handleBulkExportCSV = () => {
    const selectedList = employees.filter((e) => selectedEmployeeIds.has(e.id));
    const headers = [
      'Employee ID',
      'Full Name',
      'Gender',
      'Date of Birth',
      'Department',
      'Position',
      'Employment Type',
      'Status',
      'Hire Date',
      'Email',
      'Phone',
    ];
    const rows = selectedList.map((e) => [
      e.employeeId,
      e.fullName,
      e.gender,
      e.dateOfBirth,
      e.departmentName,
      e.position,
      e.employmentType,
      e.employmentStatus,
      e.dateOfHire,
      e.email,
      e.phone,
    ]);
    exportToCSV(`Ethio-Re_Selected_Employees_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  // Check if target for deletion has records
  const targetEmployee = employees.find((e) => e.id === deleteTargetId);
  const targetAttendanceCount = targetEmployee
    ? attendanceRecords.filter((a) => a.employeeId === targetEmployee.employeeId).length
    : 0;
  const targetLeaveCount = targetEmployee
    ? leaveRecords.filter((l) => l.employeeId === targetEmployee.employeeId).length
    : 0;

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Full Name',
      'Department',
      'Position',
      'Category',
      'Employment Type',
      'Status',
      'Email',
      'Phone',
      'Hire Date',
    ];

    const rows = filteredEmployees.map((e) => [
      e.employeeId,
      e.fullName,
      e.departmentName,
      e.position,
      e.category,
      e.employmentType,
      e.employmentStatus,
      e.email,
      e.phone,
      e.dateOfHire,
    ]);

    exportToCSV(`Ethio-Re_Employee_Directory_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = [
      'ID',
      'Full Name',
      'Department',
      'Position',
      'Category',
      'Type',
      'Status',
      'Email',
    ];

    const rows = filteredEmployees.map((e) => [
      e.employeeId,
      e.fullName,
      e.departmentName,
      e.position,
      e.category,
      e.employmentType,
      e.employmentStatus,
      e.email,
    ]);

    printReportDocument(
      'Official Employee Directory',
      branding.companyDisplayName || companyProfile.displayName,
      headers,
      rows,
      `Total Employees: ${filteredEmployees.length}${selectedDepartment ? ` | Dept: ${selectedDepartment}` : ''}`,
      companyProfile?.logo || branding.companyLogo || branding.logoUrl
    );
  };

  const handleDownloadSampleCSV = () => {
    const headers = [
      'Employee ID',
      'First Name',
      'Middle Name',
      'Last Name',
      'Gender',
      'Date of Birth',
      'Email',
      'Phone',
      'Department',
      'Position',
      'Employment Type',
      'Employment Status',
      'Date of Hire',
    ];
    const templateRows: string[][] = [];
    exportToCSV('EthioRe_Employee_Import_Template', headers, templateRows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvText(text || '');
    };
    reader.readAsText(file);
  };

  const parseAndExecuteImport = async () => {
    if (!importCsvText.trim()) return;
    setIsImporting(true);
    setImportResult(null);

    const lines = importCsvText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      setImportResult({
        total: 0,
        success: 0,
        skipped: 0,
        errors: ['CSV file is empty or missing data rows.'],
      });
      setIsImporting(false);
      return;
    }

    const headerLine = lines[0].toLowerCase();
    const hasHeader =
      headerLine.includes('id') ||
      headerLine.includes('name') ||
      headerLine.includes('email') ||
      headerLine.includes('first');
    const headerCols = hasHeader
      ? lines[0].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim().toLowerCase())
      : [];
    const posColIdx = headerCols.findIndex(
      (c) => c === 'position' || c === 'job title' || c === 'job title / position' || c.includes('position') || c.includes('job')
    );
    const dataLines = hasHeader ? lines.slice(1) : lines;

    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());

      if (cols.length < 4) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Insufficient data columns.`);
        continue;
      }

      const empId = cols[0] || `ER-${String(employees.length + successCount + 1).padStart(3, '0')}`;
      const fName = cols[1] || '';
      const mName = cols[2] || '';
      const lName = cols[3] || '';
      const genderVal = (cols[4] || 'Male') as Gender;
      const dobVal = cols[5] || '1992-01-01';
      const emailVal = cols[6] || `${fName.toLowerCase()}.${lName.toLowerCase()}@ethiopianre.com`;
      const phoneVal = cols[7] || '+251 91 000 0000';
      const deptVal = cols[8] || departments[0]?.name || 'Underwriting';
      
      let posVal = (posColIdx !== -1 && cols[posColIdx] !== undefined ? cols[posColIdx] : cols[9]) || '';
      posVal = posVal.trim();
      const matchedPos = JOB_TITLE_OPTIONS.find(
        (opt) => opt.toLowerCase() === posVal.toLowerCase()
      );
      if (matchedPos) {
        posVal = matchedPos;
      } else if (!posVal) {
        posVal = 'Officer';
      }

      const catVal: EmployeeCategory = 'Professional';
      const empTypeVal = (cols[10] || cols[11] || 'Permanent') as EmploymentType;
      const empStatusVal = (cols[11] || cols[12] || 'Active') as EmploymentStatus;
      const hireVal = cols[12] || cols[13] || new Date().toISOString().substring(0, 10);

      if (!fName || !lName) {
        skippedCount++;
        errors.push(`Row ${i + 1}: First and last name are required.`);
        continue;
      }

      const exists = employees.some(
        (e) =>
          e.employeeId.toLowerCase() === empId.toLowerCase() ||
          e.email.toLowerCase() === emailVal.toLowerCase()
      );
      if (exists) {
        skippedCount++;
        errors.push(`Row ${i + 1} (${empId}): Employee ID or email already registered.`);
        continue;
      }

      const matchedDept = departments.find(
        (d) =>
          d.name.toLowerCase() === deptVal.toLowerCase() ||
          d.code.toLowerCase() === deptVal.toLowerCase() ||
          deptVal.toLowerCase().includes(d.name.toLowerCase())
      ) || departments[0];

      const fullEmpName = `${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim();

      const newEmp = {
        employeeId: empId,
        firstName: fName,
        middleName: mName,
        lastName: lName,
        gender: genderVal === 'Female' ? 'Female' as Gender : 'Male' as Gender,
        dateOfBirth: dobVal,
        email: emailVal,
        phoneNumber: phoneVal,
        address: 'Addis Ababa, Ethiopia',
        departmentId: matchedDept ? matchedDept.id : 'dept-und',
        departmentName: matchedDept ? matchedDept.name : deptVal,
        position: posVal,
        employmentType: empTypeVal,
        employmentStatus: empStatusVal,
        category: catVal,
        hireDate: hireVal,
      };

      try {
        await addEmployee(newEmp);
        successCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push(`Row ${i + 1} (${empId}): ${err?.message || 'Error saving'}`);
      }
    }

    setImportResult({
      total: dataLines.length,
      success: successCount,
      skipped: skippedCount,
      errors: errors.slice(0, 5),
    });
    setIsImporting(false);
  };

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

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">Employee Management</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900">
              {employees.length} Total Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage comprehensive personnel profiles, departmental assignments, and contract statuses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-import-emp-csv"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportResult(null);
              setImportCsvText('');
              setImportFileName('');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Batch Import Employees via CSV"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import Employees</span>
          </button>

          <button
            id="btn-export-emp-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Directory</span>
          </button>

          <button
            id="btn-print-emp"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            id="btn-add-employee-modal"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, ID, position, email, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Employment Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
              <option value="Resigned">Resigned</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Categories</option>
              <option value="Underwriting">Underwriting</option>
              <option value="Claims">Claims</option>
              <option value="Finance">Finance</option>
              <option value="IT">IT &amp; Systems</option>
              <option value="Administration">Administration &amp; HR</option>
              <option value="Executive">Executive</option>
            </select>
          </div>
        </div>

        {/* Clear Filter Indicator */}
        {(searchQuery || selectedDepartment || selectedStatus || selectedCategory) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Showing <strong>{filteredEmployees.length}</strong> matching employee(s)
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDepartment('');
                setSelectedStatus('');
                setSelectedCategory('');
                setCurrentPage(1);
              }}
              className="text-blue-800 font-semibold hover:underline cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Grid Controls & Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Left: Bulk actions or Selection info */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedEmployeeIds.size > 0 ? (
            <div className="flex items-center gap-2 flex-wrap bg-blue-50 text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold">
              <span>
                <strong>{selectedEmployeeIds.size}</strong> of {processedEmployees.length} selected
              </span>
              <div className="h-4 w-px bg-blue-200 mx-1" />
              <button
                onClick={() => handleBulkStatusChange('Active')}
                className="px-2 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-[11px] cursor-pointer"
              >
                Set Active
              </button>
              <button
                onClick={() => handleBulkStatusChange('Inactive')}
                className="px-2 py-1 rounded bg-slate-600 text-white font-bold hover:bg-slate-700 transition-colors text-[11px] cursor-pointer"
              >
                Set Inactive
              </button>
              <button
                onClick={handleBulkExportCSV}
                className="px-2 py-1 rounded bg-blue-700 text-white font-bold hover:bg-blue-800 transition-colors text-[11px] cursor-pointer"
              >
                Export Selected
              </button>
              <button
                onClick={() => setSelectedEmployeeIds(new Set())}
                className="text-blue-700 hover:underline text-[11px] font-medium ml-1 cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong>{startIndex + 1}–{endIndex}</strong> of <strong>{totalRecords}</strong> employees
            </div>
          )}
        </div>

        {/* Right: Column visibility toggle & Page size */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto relative">
          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              id="btn-column-visibility"
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
            </button>

            {isColumnPickerOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800">Visible Columns</span>
                  <button
                    onClick={() => setIsColumnPickerOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {[
                    { key: 'employeeId', label: 'Employee ID' },
                    { key: 'fullName', label: 'Full Name' },
                    { key: 'gender', label: 'Gender' },
                    { key: 'dateOfBirth', label: 'Date of Birth' },
                    { key: 'department', label: 'Department' },
                    { key: 'position', label: 'Position' },
                    { key: 'employmentType', label: 'Employment Type' },
                    { key: 'category', label: 'Category' },
                    { key: 'hireDate', label: 'Hire Date' },
                    { key: 'phoneNumber', label: 'Phone' },
                    { key: 'email', label: 'Email' },
                    { key: 'status', label: 'Status' },
                    { key: 'actions', label: 'Actions' },
                  ].map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key] ?? true}
                        onChange={(e) => {
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col.key]: e.target.checked,
                          }));
                        }}
                        disabled={col.key === 'fullName'}
                        className="rounded border-slate-300 text-blue-800 focus:ring-blue-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="hidden sm:inline">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white text-xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Employees Data Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                {/* Selection Checkbox Header */}
                <th className="px-3 py-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAllPage}
                    className="cursor-pointer text-slate-500 hover:text-blue-900 flex items-center justify-center mx-auto"
                    title={isAllPageSelected ? 'Deselect page' : 'Select all on page'}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-800" />
                    ) : isSomePageSelected ? (
                      <MinusSquare className="w-4 h-4 text-blue-800" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Employee ID */}
                {visibleColumns.employeeId && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('employeeId')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>ID / Code</span>
                      {sortField === 'employeeId' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Full Name */}
                {visibleColumns.fullName && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[200px]"
                    onClick={() => handleSort('fullName')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Full Name</span>
                      {sortField === 'fullName' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Gender */}
                {visibleColumns.gender && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('gender')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Gender</span>
                      {sortField === 'gender' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Date of Birth */}
                {visibleColumns.dateOfBirth && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('dateOfBirth')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Date of Birth</span>
                      {sortField === 'dateOfBirth' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Department */}
                {visibleColumns.department && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('departmentName')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Department</span>
                      {sortField === 'departmentName' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Position / Job Title */}
                {visibleColumns.position && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('position')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Position / Job Title</span>
                      {sortField === 'position' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Category (Optional) */}
                {visibleColumns.category && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Category</span>
                      {sortField === 'category' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Employment Type */}
                {visibleColumns.employmentType && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('employmentType')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Employment Type</span>
                      {sortField === 'employmentType' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Hire Date */}
                {visibleColumns.hireDate && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('hireDate')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Hire Date</span>
                      {sortField === 'hireDate' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Phone */}
                {visibleColumns.phoneNumber && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('phoneNumber')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Phone</span>
                      {sortField === 'phoneNumber' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Email */}
                {visibleColumns.email && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Email</span>
                      {sortField === 'email' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Status */}
                {visibleColumns.status && (
                  <th
                    className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                    onClick={() => handleSort('employmentStatus')}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700">
                      <span>Status</span>
                      {sortField === 'employmentStatus' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-800" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}

                {/* Actions */}
                {visibleColumns.actions && (
                  <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No employees registered yet</p>
                    <p className="text-xs text-slate-400">Register new personnel or adjust search filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.has(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleSelectOne(emp.id)}
                          className="cursor-pointer text-slate-400 hover:text-blue-900 flex items-center justify-center mx-auto"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-800" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Employee ID */}
                      {visibleColumns.employeeId && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {emp.employeeId}
                          </span>
                        </td>
                      )}

                      {/* Full Name & Avatar */}
                      {visibleColumns.fullName && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                            >
                              {(emp.firstName || emp.fullName || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-400">{emp.position}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Gender */}
                      {visibleColumns.gender && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-slate-700 text-xs">{emp.gender || '—'}</span>
                        </td>
                      )}

                      {/* Date of Birth */}
                      {visibleColumns.dateOfBirth && (
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">
                          {emp.dateOfBirth || '—'}
                        </td>
                      )}

                      {/* Department */}
                      {visibleColumns.department && (
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap font-medium text-xs">
                          {emp.departmentName || '—'}
                        </td>
                      )}

                      {/* Position */}
                      {visibleColumns.position && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-xs">
                          {emp.position || '—'}
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {emp.category || 'General'}
                          </span>
                        </td>
                      )}

                      {/* Employment Type */}
                      {visibleColumns.employmentType && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                            {emp.employmentType || 'Permanent'}
                          </span>
                        </td>
                      )}

                      {/* Hire Date */}
                      {visibleColumns.hireDate && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                          {emp.hireDate || '—'}
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.phoneNumber && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs font-mono">
                          {emp.phoneNumber || '—'}
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.email && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                          {emp.email || '—'}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.employmentStatus === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : emp.employmentStatus === 'Suspended'
                                ? 'bg-amber-100 text-amber-800'
                                : emp.employmentStatus === 'Terminated'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {emp.employmentStatus}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`btn-view-emp-${emp.id}`}
                              onClick={() => setViewingEmployee(emp)}
                              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-blue-900 transition-colors cursor-pointer"
                              title="View Personnel Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-edit-emp-${emp.id}`}
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-status-emp-${emp.id}`}
                              onClick={() => handleToggleStatus(emp)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                emp.employmentStatus === 'Active'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={emp.employmentStatus === 'Active' ? 'Deactivate Personnel' : 'Activate Personnel'}
                            >
                              {emp.employmentStatus === 'Active' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {isAdmin && (
                              <button
                                id={`btn-delete-emp-${emp.id}`}
                                onClick={() => setDeleteTargetId(emp.id)}
                                className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Personnel (Administrator Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Data Grid Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800">{totalRecords > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalRecords}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {validCurrentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingEmployee ? 'Edit Employee Personnel Record' : 'Add New Employee'}
                  </h3>
                  <p className="text-[11px] text-blue-100/80">Official Personnel Profile Registry</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              {/* Employee ID */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingEmployee}
                  value={empIdInput}
                  onChange={(e) => setEmpIdInput(e.target.value)}
                  placeholder="e.g. ER-001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs font-mono disabled:bg-slate-100"
                />
                <span className="text-[10px] text-slate-400">Must be unique across the enterprise</span>
              </div>

              {/* Name Fields: First, Middle, Last */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Middle (Father&apos;s) Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Middle Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last (Grandfather&apos;s) Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Grandfather's Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Gender & DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="job-title-position-select" className="block font-semibold text-slate-700 mb-1">
                    Job Title / Position <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="job-title-position-select"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="" disabled>Select Job Title / Position</option>
                    {position && !JOB_TITLE_OPTIONS.includes(position as any) && (
                      <option value={position}>{position}</option>
                    )}
                    {JOB_TITLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employment Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Probation">Probation</option>
                    <option value="Temporary">Temporary</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@ethiore.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Address & Hire Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Office / Residential Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Sub-City, City, Country"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Hire</label>
                  <input
                    type="date"
                    required
                    value={dateOfHire}
                    onChange={(e) => setDateOfHire(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-employee-record"
                  className="px-5 py-2 rounded-lg text-white font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  {editingEmployee ? 'Save Profile Changes' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detailed Employee Profile Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-base font-bold">
                  {viewingEmployee.firstName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">{viewingEmployee.fullName}</h3>
                  <p className="text-[11px] text-blue-100/80">
                    {viewingEmployee.position} &middot; {viewingEmployee.departmentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingEmployee(null)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Employee ID</span>
                  <strong className="text-slate-900 font-mono text-xs">{viewingEmployee.employeeId}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <strong className="text-emerald-700 font-bold">{viewingEmployee.employmentStatus}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Department</span>
                  <strong className="text-slate-800">{viewingEmployee.departmentName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Job Title / Position</span>
                  <strong className="text-slate-800">{viewingEmployee.position || '—'}</strong>
                </div>
              </div>

              {/* Personal Details */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Contact &amp; Demographics</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><strong>Email:</strong> {viewingEmployee.email}</div>
                  <div><strong>Phone:</strong> {viewingEmployee.phone}</div>
                  <div><strong>Gender:</strong> {viewingEmployee.gender}</div>
                  <div><strong>DOB:</strong> {viewingEmployee.dateOfBirth}</div>
                  <div><strong>Employment Type:</strong> {viewingEmployee.employmentType}</div>
                  <div><strong>Hire Date:</strong> {viewingEmployee.dateOfHire}</div>
                  <div className="col-span-2"><strong>Address:</strong> {viewingEmployee.address}</div>
                </div>
              </div>

              {/* Attendance & Leave Stats */}
              {(() => {
                const attCount = attendanceRecords.filter((a) => a.employeeId === viewingEmployee.employeeId).length;
                const leaveCount = leaveRecords.filter((l) => l.employeeId === viewingEmployee.employeeId).length;
                const balance = getEmployeeBalance(viewingEmployee.employeeId);

                return (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
                    <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">Historical Records</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <div className="font-bold text-slate-900 text-sm">{attCount}</div>
                        <div className="text-[10px] text-slate-500">Attendance Logs</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <div className="font-bold text-slate-900 text-sm">{leaveCount}</div>
                        <div className="text-[10px] text-slate-500">Leave Records</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-100">
                        <div className="font-bold text-emerald-700 text-sm">{balance.remainingDays}d</div>
                        <div className="text-[10px] text-slate-500">Leave Balance</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-300"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Employees Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold">Import Employee Master Data</h3>
                  <p className="text-[11px] text-blue-100/80">
                    Bulk import staff records via CSV file or formatted tabular text
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Template Download Banner */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-blue-700 shrink-0" />
                  <div>
                    <div className="font-bold text-blue-950">Standard HR CSV Template</div>
                    <div className="text-[11px] text-blue-700">
                      Download the official schema with pre-configured headers and example records.
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadSampleCSV}
                  className="px-3 py-1.5 rounded-md bg-white border border-blue-300 text-blue-800 font-semibold text-xs hover:bg-blue-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  Download Template
                </button>
              </div>

              {/* Upload or Paste */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-700">
                  Select CSV File or Drag &amp; Drop
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-5 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="font-semibold text-slate-700 text-xs">
                      {importFileName ? (
                        <span className="text-emerald-700 font-bold">{importFileName}</span>
                      ) : (
                        'Click to browse files or drag .csv file here'
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">Comma-separated values (.csv)</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700">
                      Or Paste CSV Text Directly
                    </label>
                    <span className="text-[10px] text-slate-400">Headers: Employee ID, First Name, Middle Name, Last Name, ...</span>
                  </div>
                  <textarea
                    rows={4}
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    placeholder="ER-010,Tadesse,Bekele,Lemma,Male,1992-06-14,tadesse.b@ethiopianre.com,+251 91 123 4567,Underwriting & Risk Analysis,Treaty Underwriter,Underwriting,Permanent,Active,2024-02-01"
                    className="w-full font-mono text-[11px] p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Import Feedback */}
              {importResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                    importResult.success > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Import Completed: {importResult.success} successfully added</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Total Rows: {importResult.total} &middot; Skipped: {importResult.skipped}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-[10px] text-rose-700 space-y-0.5">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx}>&bull; {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                id="btn-execute-import"
                disabled={isImporting || !importCsvText.trim()}
                onClick={parseAndExecuteImport}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? 'Processing Import...' : 'Import Records'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog with Safeguard */}
      {deleteTargetId && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Employee Record"
          message={
            targetAttendanceCount > 0 || targetLeaveCount > 0
              ? `Warning: This employee currently has ${targetAttendanceCount} attendance logs and ${targetLeaveCount} leave records. Deleting this employee will orphan historical HR logs. Are you sure you wish to proceed as Administrator?`
              : 'Are you sure you want to permanently delete this employee record? This action cannot be undone.'
          }
          confirmText="Yes, Permanently Delete"
          onConfirm={async () => {
            const targetId = deleteTargetId;
            setDeleteTargetId(null);
            if (targetId) {
              const res = await deleteEmployee(targetId);
              if (res && res.success) {
                setSuccessMessage('Employee record deleted successfully.');
              } else if (res && res.error) {
                setFormError(res.error);
              }
            }
          }}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
};
