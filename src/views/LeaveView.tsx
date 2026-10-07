import React, { useState } from 'react';
import {
  PlaneTakeoff,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  UserCheck,
  Eye,
  Info,
  Clock,
  ShieldAlert,
  Ban,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { LeaveRecord, LeaveStatus } from '../types/hrms';
import { calculateWorkingLeaveDays, checkLeaveOverlap } from '../utils/leaveCalculator';
import { exportToCSV, printReportDocument } from '../utils/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EthioReLogo } from '../components/EthioReLogo';

export const LeaveView: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    leaveRecords,
    leaveTypes,
    employees,
    departments,
    publicHolidays,
    createLeaveRecord,
    updateLeaveRecord,
    cancelLeaveRecord,
    completeLeaveRecord,
    getEmployeeBalance,
    branding,
    companyProfile,
  } = useHRMS();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState<LeaveRecord | null>(null);
  const [cancellingLeaveId, setCancellingLeaveId] = useState<string | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [selectedBalanceEmpId, setSelectedBalanceEmpId] = useState<string | null>(null);

  // Leave Form state
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'Active');
  const [formEmployeeId, setFormEmployeeId] = useState(activeEmployees[0]?.employeeId || '');
  const [formLeaveTypeId, setFormLeaveTypeId] = useState(leaveTypes[0]?.id || 'lt-annual');
  const [formStartDate, setFormStartDate] = useState('2026-09-08');
  const [formEndDate, setFormEndDate] = useState('2026-09-12');
  const [formReason, setFormReason] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formAllowException, setFormAllowException] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-populated employee info
  const selectedEmp = employees.find((e) => e.employeeId === formEmployeeId);
  const selectedType = leaveTypes.find((lt) => lt.id === formLeaveTypeId);

  // Live working days calculation
  const liveCalculation = calculateWorkingLeaveDays(formStartDate, formEndDate, publicHolidays);

  // Live balance check
  const empBalance = formEmployeeId ? getEmployeeBalance(formEmployeeId) : null;
  const currentTypeBalance = empBalance?.byType[formLeaveTypeId];

  // Overlap test
  const liveOverlap = formEmployeeId && formStartDate && formEndDate
    ? checkLeaveOverlap(formEmployeeId, formStartDate, formEndDate, leaveRecords)
    : { hasOverlap: false };

  const openNewLeaveModal = () => {
    setFormEmployeeId(activeEmployees[0]?.employeeId || '');
    setFormLeaveTypeId(leaveTypes[0]?.id || 'lt-annual');
    setFormStartDate('2026-09-08');
    setFormEndDate('2026-09-12');
    setFormReason('');
    setFormRemarks('');
    setFormAllowException(false);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formReason.trim()) {
      setFormError('Please specify the official reason for this leave request.');
      return;
    }

    const result = createLeaveRecord({
      employeeId: formEmployeeId,
      leaveTypeId: formLeaveTypeId,
      startDate: formStartDate,
      endDate: formEndDate,
      reason: formReason.trim(),
      remarks: formRemarks.trim(),
      allowBalanceException: formAllowException,
    });

    if (!result.success) {
      setFormError(result.error || 'Failed to finalize leave.');
      return;
    }

    setIsCreateModalOpen(false);
  };

  const handleConfirmCancel = () => {
    if (cancellingLeaveId) {
      cancelLeaveRecord(cancellingLeaveId, cancelRemarks);
      setCancellingLeaveId(null);
      setCancelRemarks('');
    }
  };

  // Filtered records
  const filteredLeaves = leaveRecords.filter((rec) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmp = rec.employeeName.toLowerCase().includes(q);
      const matchId = rec.employeeId.toLowerCase().includes(q);
      const matchDept = rec.department.toLowerCase().includes(q);
      const matchReason = rec.reason.toLowerCase().includes(q);
      if (!matchEmp && !matchId && !matchDept && !matchReason) return false;
    }

    if (selectedDepartment && rec.department !== selectedDepartment) {
      return false;
    }

    if (selectedLeaveType && rec.leaveTypeId !== selectedLeaveType) {
      return false;
    }

    if (selectedStatus && rec.leaveStatus !== selectedStatus) {
      return false;
    }

    if (filterEmployeeId && rec.employeeId !== filterEmployeeId) {
      return false;
    }

    return true;
  });

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Leave ID',
      'Employee ID',
      'Employee Name',
      'Department',
      'Leave Type',
      'Start Date',
      'End Date',
      'Working Days',
      'Status',
      'Reason',
      'Remarks',
      'Finalized By',
    ];

    const rows = filteredLeaves.map((l) => [
      l.id,
      l.employeeId,
      l.employeeName,
      l.department,
      l.leaveTypeName,
      l.startDate,
      l.endDate,
      l.numberOfDays,
      l.leaveStatus,
      l.reason,
      l.remarks || '-',
      l.recordedBy,
    ]);

    exportToCSV(`Ethio-Re_Leave_Registry_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Leave Type',
      'Duration (Days)',
      'Dates',
      'Status',
      'Reason',
    ];

    const rows = filteredLeaves.map((l) => [
      l.employeeId,
      l.employeeName,
      l.department,
      l.leaveTypeName,
      `${l.numberOfDays} days`,
      `${l.startDate} to ${l.endDate}`,
      l.leaveStatus,
      l.reason,
    ]);

    printReportDocument(
      'Official Employee Leave Registry',
      branding.companyDisplayName || companyProfile.displayName,
      headers,
      rows,
      `Total Records: ${filteredLeaves.length}${selectedDepartment ? ` | Dept: ${selectedDepartment}` : ''}`,
      companyProfile?.logo || branding.companyLogo || branding.logoUrl
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">Leave Management</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
              Direct Finalization &middot; Zero Approval Queues
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic deduction excluding weekends and Ethiopian public holidays with real-time balance checks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-leave-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-print-leave"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            id="btn-register-leave-modal"
            onClick={openNewLeaveModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Register Leave</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
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

          {/* Leave Type Filter */}
          <div>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || selectedDepartment || selectedLeaveType || selectedStatus || filterEmployeeId) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Filtered to <strong>{filteredLeaves.length}</strong> leave record(s)
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDepartment('');
                setSelectedLeaveType('');
                setSelectedStatus('');
                setFilterEmployeeId('');
              }}
              className="text-blue-800 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Leave Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Working Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <PlaneTakeoff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No leave records available</p>
                    <p className="text-xs text-slate-400">Register an active leave record or adjust search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{record.employeeName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{record.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {record.department}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{record.leaveTypeName}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {record.startDate}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {record.endDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-blue-900 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                        {record.numberOfDays} days
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          record.leaveStatus === 'Active'
                            ? 'bg-blue-100 text-blue-800'
                            : record.leaveStatus === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {record.leaveStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={record.reason}>
                      {record.reason}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-view-leave-${record.id}`}
                          onClick={() => setViewingLeave(record)}
                          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Leave Record Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-balance-leave-${record.id}`}
                          onClick={() => setSelectedBalanceEmpId(record.employeeId)}
                          className="p-1.5 rounded-md text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer font-semibold text-[11px]"
                          title="View Employee Leave Balance Breakdown"
                        >
                          Balance
                        </button>
                        {record.leaveStatus === 'Active' && (
                          <>
                            <button
                              id={`btn-complete-leave-${record.id}`}
                              onClick={() => completeLeaveRecord(record.id)}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px] transition-colors cursor-pointer"
                              title="Mark Leave as Completed"
                            >
                              Complete
                            </button>
                            <button
                              id={`btn-cancel-leave-${record.id}`}
                              onClick={() => setCancellingLeaveId(record.id)}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[10px] transition-colors cursor-pointer"
                              title="Cancel Leave"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Leave Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <PlaneTakeoff className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Register &amp; Finalize Employee Leave</h3>
                  <p className="text-[11px] text-blue-100/80">Direct finalization &middot; Status will be Active immediately</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateLeave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              {/* Employee Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Active Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId}) &mdash; {emp.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated details & Available Balance */}
              {selectedEmp && currentTypeBalance && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Department:</span>
                    <strong className="text-slate-800">{selectedEmp.departmentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Available {selectedType?.name} Balance:</span>
                    <strong
                      className={`text-xs ${
                        currentTypeBalance.remaining > 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {currentTypeBalance.remaining} days remaining
                    </strong>
                    <span className="text-slate-400 text-[10px] block">
                      (Allocated: {currentTypeBalance.allocated} | Used: {currentTypeBalance.used})
                    </span>
                  </div>
                </div>
              )}

              {/* Leave Type Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Leave Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formLeaveTypeId}
                  onChange={(e) => setFormLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.defaultDays} statutory days standard)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Automated Working Days Calculation Result Banner */}
              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Automated Working Days Calculation:
                  </span>
                  <span className="text-sm font-extrabold text-blue-900 px-2 py-0.5 rounded bg-white border border-blue-200 shadow-2xs">
                    {liveCalculation.days} Working Days
                  </span>
                </div>
                <div className="text-[11px] text-blue-900/80 leading-relaxed">
                  Excluded <strong>{liveCalculation.excludedWeekends}</strong> weekend days (Sat/Sun) and{' '}
                  <strong>{liveCalculation.excludedHolidays}</strong> configured public holidays
                  {liveCalculation.holidayNames.length > 0 && ` (${liveCalculation.holidayNames.join(', ')})`}.
                </div>

                {liveOverlap.hasOverlap && liveOverlap.conflictingLeave && (
                  <div className="mt-2 p-2 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>
                      Conflict: Overlaps with {liveOverlap.conflictingLeave.leaveTypeName} (
                      {liveOverlap.conflictingLeave.startDate} to {liveOverlap.conflictingLeave.endDate})
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Annual vacation, medical examination, family bereavement..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Additional Remarks / Handover</label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Handover of reinsurance treaty accounts to team member..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Administrator Balance Exception Override */}
              {isAdmin && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-[11px] text-amber-900">
                  <input
                    type="checkbox"
                    id="chk-balance-override"
                    checked={formAllowException}
                    onChange={(e) => setFormAllowException(e.target.checked)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="chk-balance-override" className="cursor-pointer">
                    <strong>Administrator Exception Override:</strong> Authorize this leave record even if it exceeds the employee&apos;s allocated balance.
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-leave-record"
                  className="px-5 py-2 rounded-lg text-white font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  Save &amp; Finalize Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Leave Record Details Modal */}
      {viewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Leave Record: {viewingLeave.id}</h3>
              </div>
              <button
                onClick={() => setViewingLeave(null)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Employee Name:</span>
                <span className="font-bold text-slate-900">{viewingLeave.employeeName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Employee ID:</span>
                <span className="font-mono text-slate-800">{viewingLeave.employeeId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Department:</span>
                <span className="text-slate-800">{viewingLeave.department}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Leave Type:</span>
                <span className="font-semibold text-slate-800">{viewingLeave.leaveTypeName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Dates:</span>
                <span className="font-mono text-slate-800">
                  {viewingLeave.startDate} to {viewingLeave.endDate}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Working Days:</span>
                <span className="font-bold text-blue-900">{viewingLeave.numberOfDays} days</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-800">{viewingLeave.leaveStatus}</span>
              </div>
              <div className="border-b pb-2">
                <span className="text-slate-500 block mb-0.5">Reason:</span>
                <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                  {viewingLeave.reason}
                </p>
              </div>
              {viewingLeave.remarks && (
                <div>
                  <span className="text-slate-500 block mb-0.5">Remarks / Audit Note:</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                    {viewingLeave.remarks}
                  </p>
                </div>
              )}
              <div className="text-[10px] text-slate-400 pt-2 flex justify-between">
                <span>Finalized By: {viewingLeave.recordedBy}</span>
                <span>Logged: {viewingLeave.createdDate}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingLeave(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Leave Balance Overview Modal */}
      {selectedBalanceEmpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold">
                  Leave Balance &middot; {selectedBalanceEmpId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBalanceEmpId(null)}
                className="p-1 rounded-md text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const balance = getEmployeeBalance(selectedBalanceEmpId);
              return (
                <div className="p-6 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{balance.employeeName}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{balance.employeeId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-700">
                        {balance.remainingDays} days
                      </div>
                      <span className="text-[10px] text-slate-400">Total Net Balance</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-3">Leave Type</th>
                          <th className="py-2 px-3 text-center">Allocated</th>
                          <th className="py-2 px-3 text-center">Used</th>
                          <th className="py-2 px-3 text-right">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leaveTypes.map((lt) => {
                          const typeData = balance.byType[lt.id] || { allocated: lt.defaultDays, used: 0, remaining: lt.defaultDays };
                          return (
                            <tr key={lt.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-medium text-slate-800">{lt.name}</td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600">{typeData.allocated}d</td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600">{typeData.used}d</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {typeData.remaining}d
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                    <strong>Statutory Rule:</strong> Remaining = Allocated &minus; Used. Weekends and configured Ethiopian public holidays are exempt from deductions.
                  </div>
                </div>
              );
            })()}

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBalanceEmpId(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Leave Confirmation Modal */}
      {cancellingLeaveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm mb-2">
              <Ban className="w-5 h-5" />
              <span>Cancel Authorized Leave Record</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Cancelling this leave record will restore the employee&apos;s allocated leave days balance. Please record the justification:
            </p>
            <input
              type="text"
              required
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="e.g. Employee recalled due to urgent audit, trip postponed..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs mb-4 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingLeaveId(null);
                  setCancelRemarks('');
                }}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs hover:bg-rose-700 cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
