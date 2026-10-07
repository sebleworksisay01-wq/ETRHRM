import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck,
  Building2,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { AttendanceRecord, AttendanceStatus } from '../types/hrms';
import { exportToCSV, printReportDocument } from '../utils/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EthioReLogo } from '../components/EthioReLogo';

export const AttendanceView: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    attendanceRecords,
    employees,
    departments,
    recordAttendance,
    updateAttendance,
    deleteAttendance,
    branding,
    companyProfile,
  } = useHRMS();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Record Form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCheckIn, setFormCheckIn] = useState('08:15');
  const [formCheckOut, setFormCheckOut] = useState('17:00');
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('Present');
  const [formRemarks, setFormRemarks] = useState('');

  // Selected employee data auto-population
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'Active');
  const selectedEmployeeObj = employees.find((e) => e.employeeId === formEmployeeId);

  const calculateHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const inMins = inH * 60 + inM;
    const outMins = outH * 60 + outM;
    if (outMins <= inMins) return 0;
    return Number(((outMins - inMins) / 60).toFixed(1));
  };

  const calculateLate = (checkIn: string): { isLate: boolean; minutes: number } => {
    if (!checkIn) return { isLate: false, minutes: 0 };
    const [h, m] = checkIn.split(':').map(Number);
    const totalMinutes = h * 60 + m;
    const standardStartMinutes = 8 * 60 + 30; // 08:30 AM standard start
    if (totalMinutes > standardStartMinutes) {
      return { isLate: true, minutes: totalMinutes - standardStartMinutes };
    }
    return { isLate: false, minutes: 0 };
  };

  const openNewRecordModal = () => {
    setEditingRecord(null);
    setFormEmployeeId(activeEmployees[0]?.employeeId || '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCheckIn('08:15');
    setFormCheckOut('17:00');
    setFormStatus('Present');
    setFormRemarks('');
    setFormError(null);
    setIsRecordModalOpen(true);
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormEmployeeId(rec.employeeId || '');
    setFormDate(rec.attendanceDate || '');
    setFormCheckIn(rec.checkInTime || '');
    setFormCheckOut(rec.checkOutTime || '');
    setFormStatus(rec.attendanceStatus || 'Present');
    setFormRemarks(rec.remarks || '');
    setFormError(null);
    setIsRecordModalOpen(true);
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formEmployeeId) {
      setFormError('Please select an employee.');
      return;
    }

    const emp = employees.find((e) => e.employeeId === formEmployeeId);
    if (!emp) {
      setFormError('Employee record not found.');
      return;
    }

    const hours = calculateHours(formCheckIn, formCheckOut);
    const late = calculateLate(formCheckIn);
    const isLateStatus = formStatus === 'Late' || late.isLate;

    if (editingRecord) {
      // Update existing record
      const res = updateAttendance(editingRecord.id, {
        checkInTime: formCheckIn,
        checkOutTime: formCheckOut,
        attendanceStatus: formStatus,
        workingHours: hours,
        lateStatus: isLateStatus,
        lateMinutes: late.minutes,
        remarks: formRemarks,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update attendance.');
        return;
      }
    } else {
      // Create new record
      const res = recordAttendance({
        employeeId: emp.employeeId,
        employeeRecordId: emp.id,
        employeeName: emp.fullName,
        department: emp.departmentName,
        attendanceDate: formDate,
        checkInTime: formCheckIn,
        checkOutTime: formCheckOut,
        attendanceStatus: formStatus,
        workingHours: hours,
        lateStatus: isLateStatus,
        lateMinutes: late.minutes,
        remarks: formRemarks,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to record attendance.');
        return;
      }
    }

    setIsRecordModalOpen(false);
  };

  // Filter attendance records
  const filteredRecords = attendanceRecords.filter((rec) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmp = rec.employeeName.toLowerCase().includes(q);
      const matchId = rec.employeeId.toLowerCase().includes(q);
      const matchDept = rec.department.toLowerCase().includes(q);
      if (!matchEmp && !matchId && !matchDept) return false;
    }

    if (selectedDepartment && rec.department !== selectedDepartment) {
      return false;
    }

    if (selectedStatus && rec.attendanceStatus !== selectedStatus) {
      return false;
    }

    if (filterDate && rec.attendanceDate !== filterDate) {
      return false;
    }

    if (startDate && rec.attendanceDate < startDate) {
      return false;
    }

    if (endDate && rec.attendanceDate > endDate) {
      return false;
    }

    return true;
  });

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Record ID',
      'Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Status',
      'Check In',
      'Check Out',
      'Working Hours',
      'Late (Min)',
      'Remarks',
      'Recorded By',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.attendanceDate,
      r.employeeId,
      r.employeeName,
      r.department,
      r.attendanceStatus,
      r.checkInTime || '-',
      r.checkOutTime || '-',
      r.workingHours,
      r.lateStatus ? r.lateMinutes : 0,
      r.remarks || '-',
      r.recordedBy,
    ]);

    exportToCSV(`Ethio-Re_Attendance_Report_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Status',
      'Check In',
      'Check Out',
      'Hours',
      'Late',
      'Remarks',
    ];

    const rows = filteredRecords.map((r) => [
      r.attendanceDate,
      r.employeeId,
      r.employeeName,
      r.department,
      r.attendanceStatus,
      r.checkInTime || '-',
      r.checkOutTime || '-',
      `${r.workingHours}h`,
      r.lateStatus ? `+${r.lateMinutes}m` : 'No',
      r.remarks || '-',
    ]);

    const filterSummary = `Total Records: ${filteredRecords.length}${selectedDepartment ? ` | Dept: ${selectedDepartment}` : ''}${selectedStatus ? ` | Status: ${selectedStatus}` : ''}`;

    printReportDocument(
      'Daily & Periodic Employee Attendance Log',
      branding.companyDisplayName || companyProfile.displayName,
      headers,
      rows,
      filterSummary,
      companyProfile?.logo || branding.companyLogo || branding.logoUrl
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">Attendance Management</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900">
              Direct Finalization
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, correct, and monitor daily employee attendance with zero approval delays.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-att-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-print-att"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            id="btn-record-attendance-modal"
            onClick={openNewRecordModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Attendance</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, ID, dept..."
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

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="Half Day">Half Day</option>
            </select>
          </div>

          {/* Single Date Filter */}
          <div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              title="Filter single specific date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedDepartment || selectedStatus || filterDate || startDate || endDate) && (
            <div className="flex items-center">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDepartment('');
                  setSelectedStatus('');
                  setFilterDate('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full py-2 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold text-xs border border-slate-200 transition-colors cursor-pointer text-center"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Date Range Sub-Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">Date Range Filter:</span>
          <div className="flex items-center gap-1">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFilterDate('');
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFilterDate('');
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
            />
          </div>
          <span className="ml-auto font-medium">
            Showing <strong>{filteredRecords.length}</strong> attendance record(s)
          </span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No attendance records available</p>
                    <p className="text-xs text-slate-400">Record a new employee attendance entry to begin tracking daily presence.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {record.attendanceDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{record.employeeName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{record.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {record.department}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                      {record.checkInTime || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                      {record.checkOutTime || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{record.workingHours}h</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          record.attendanceStatus === 'Present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : record.attendanceStatus === 'Late'
                            ? 'bg-amber-100 text-amber-800'
                            : record.attendanceStatus === 'On Leave'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {record.attendanceStatus}
                        {record.lateStatus && ` (+${record.lateMinutes}m)`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={record.remarks}>
                      {record.remarks || '-'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`btn-edit-att-${record.id}`}
                          onClick={() => openEditModal(record)}
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit or Correct Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            id={`btn-delete-att-${record.id}`}
                            onClick={() => setDeleteTargetId(record.id)}
                            className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Record / Edit Attendance Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingRecord ? 'Edit / Correct Attendance Record' : 'Record Employee Attendance'}
                  </h3>
                  <p className="text-[11px] text-blue-100/80">Direct operational entry &middot; No approval delay</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAttendance} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              {/* Employee Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={!!editingRecord}
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-75 disabled:bg-slate-100"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId}) &mdash; {emp.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Automatically Populated Info Pill */}
              {selectedEmployeeObj && (
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/70 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-500">Auto-Populated ID: </span>
                    <strong className="font-mono text-blue-900">{selectedEmployeeObj.employeeId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Department: </span>
                    <strong className="text-blue-900">{selectedEmployeeObj.departmentName}</strong>
                  </div>
                </div>
              )}

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attendance Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={!!editingRecord}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attendance Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>

              {/* Check-In & Check-Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={formCheckIn ?? ''}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Standard start: 08:30 AM</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={formCheckOut ?? ''}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Standard end: 17:00 PM</span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Justification</label>
                <textarea
                  rows={2}
                  value={formRemarks ?? ''}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Field mission, traffic congestion, medical note, official permission..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-attendance-record"
                  className="px-5 py-2 rounded-lg text-white font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  {editingRecord ? 'Save Attendance Correction' : 'Finalize Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Attendance Record"
        message="Are you sure you want to permanently delete this attendance record? This action will remove the record from attendance history."
        confirmText="Delete Record"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteAttendance(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
