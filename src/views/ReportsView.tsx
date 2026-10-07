import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Users,
  CalendarCheck,
  PlaneTakeoff,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { exportToCSV, printReportDocument } from '../utils/exportUtils';
import { EthioReLogo } from '../components/EthioReLogo';

type ReportCategory = 'attendance' | 'leave' | 'employees' | 'departments';

export const ReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    employees,
    departments,
    attendanceRecords,
    leaveRecords,
    leaveTypes,
    getEmployeeBalance,
    branding,
    companyProfile,
  } = useHRMS();

  const [category, setCategory] = useState<ReportCategory>('attendance');
  const [reportType, setReportType] = useState('daily_attendance');

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Compute table data based on active report
  let reportTitle = 'HRMS Report';
  let headers: string[] = [];
  let rows: (string | number)[][] = [];

  if (category === 'attendance') {
    if (reportType === 'daily_attendance') {
      reportTitle = 'Daily Attendance Summary Report';
      headers = ['Date', 'ID', 'Employee', 'Department', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Late'];
      rows = attendanceRecords
        .filter((a) => {
          if (selectedDept && a.department !== selectedDept) return false;
          if (selectedEmployeeId && a.employeeId !== selectedEmployeeId) return false;
          if (startDate && a.attendanceDate < startDate) return false;
          if (endDate && a.attendanceDate > endDate) return false;
          return true;
        })
        .map((a) => [
          a.attendanceDate,
          a.employeeId,
          a.employeeName,
          a.department,
          a.checkInTime || '-',
          a.checkOutTime || '-',
          `${a.workingHours}h`,
          a.attendanceStatus,
          a.lateStatus ? `+${a.lateMinutes}m` : 'No',
        ]);
    } else if (reportType === 'late_attendance') {
      reportTitle = 'Late Arrivals & Tardy Report';
      headers = ['Date', 'ID', 'Employee', 'Department', 'Check-In', 'Late Minutes', 'Remarks'];
      rows = attendanceRecords
        .filter((a) => a.lateStatus || a.attendanceStatus === 'Late')
        .map((a) => [
          a.attendanceDate,
          a.employeeId,
          a.employeeName,
          a.department,
          a.checkInTime || '-',
          `+${a.lateMinutes} min`,
          a.remarks || '-',
        ]);
    } else if (reportType === 'absence_report') {
      reportTitle = 'Employee Absence Record';
      headers = ['Date', 'ID', 'Employee', 'Department', 'Status', 'Remarks / Reason'];
      rows = attendanceRecords
        .filter((a) => a.attendanceStatus === 'Absent')
        .map((a) => [
          a.attendanceDate,
          a.employeeId,
          a.employeeName,
          a.department,
          a.attendanceStatus,
          a.remarks || 'Unscheduled absence',
        ]);
    }
  } else if (category === 'leave') {
    if (reportType === 'active_leave') {
      reportTitle = 'Current Active Leaves Report';
      headers = ['ID', 'Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason'];
      rows = leaveRecords
        .filter((l) => l.leaveStatus === 'Active')
        .map((l) => [
          l.employeeId,
          l.employeeName,
          l.department,
          l.leaveTypeName,
          l.startDate,
          l.endDate,
          `${l.numberOfDays}d`,
          l.reason,
        ]);
    } else if (reportType === 'leave_balance') {
      reportTitle = 'Employee Leave Balance Summary';
      headers = ['ID', 'Employee Name', 'Department', 'Total Allocated', 'Total Used', 'Remaining Balance'];
      rows = employees
        .filter((e) => e.employmentStatus === 'Active')
        .map((emp) => {
          const bal = getEmployeeBalance(emp.employeeId);
          return [
            emp.employeeId,
            emp.fullName,
            emp.departmentName,
            `${bal.allocatedDays}d`,
            `${bal.usedDays}d`,
            `${bal.remainingDays}d`,
          ];
        });
    } else {
      reportTitle = 'Comprehensive Leave Log';
      headers = ['ID', 'Employee', 'Department', 'Type', 'Dates', 'Days', 'Status', 'Reason'];
      rows = leaveRecords.map((l) => [
        l.employeeId,
        l.employeeName,
        l.department,
        l.leaveTypeName,
        `${l.startDate} ~ ${l.endDate}`,
        l.numberOfDays,
        l.leaveStatus,
        l.reason,
      ]);
    }
  } else if (category === 'employees') {
    reportTitle = 'Official Employee Roster & Directory';
    headers = ['ID', 'Full Name', 'Department', 'Position', 'Category', 'Type', 'Status', 'Email'];
    rows = employees
      .filter((e) => {
        if (selectedDept && e.departmentName !== selectedDept) return false;
        return true;
      })
      .map((e) => [
        e.employeeId,
        e.fullName,
        e.departmentName,
        e.position,
        e.category,
        e.employmentType,
        e.employmentStatus,
        e.email,
      ]);
  } else if (category === 'departments') {
    reportTitle = 'Departmental Structure & Headcount Report';
    headers = ['Code', 'Department Name', 'Department Head', 'Status', 'Headcount'];
    rows = departments.map((d) => {
      const count = employees.filter((e) => e.departmentName === d.name).length;
      return [d.code, d.name, d.headOfDepartment || 'Unassigned', d.status, `${count} Employees`];
    });
  }

  const handlePrintReport = () => {
    printReportDocument(
      reportTitle,
      branding.companyDisplayName || companyProfile.displayName,
      headers,
      rows,
      `Generated on ${new Date().toLocaleString()} by ${currentUser?.fullName} (${currentUser?.role})`,
      companyProfile?.logo || branding.companyLogo || branding.logoUrl
    );
  };

  const handleExportCSV = () => {
    exportToCSV(
      `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">Official Reports &amp; Analytics</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900">
              Audit-Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate printable executive records and export verified attendance and leave statistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-report-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export to CSV/Excel</span>
          </button>
          <button
            id="btn-report-print-pdf"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Document (PDF)</span>
          </button>
        </div>
      </div>

      {/* Module Selector & Specific Report Filter */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
        {/* Module Category Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
          <button
            onClick={() => {
              setCategory('attendance');
              setReportType('daily_attendance');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
              category === 'attendance'
                ? 'bg-blue-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance Reports</span>
          </button>

          <button
            onClick={() => {
              setCategory('leave');
              setReportType('active_leave');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
              category === 'leave'
                ? 'bg-blue-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlaneTakeoff className="w-4 h-4" />
            <span>Leave Reports</span>
          </button>

          <button
            onClick={() => {
              setCategory('employees');
              setReportType('directory');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
              category === 'employees'
                ? 'bg-blue-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employee Reports</span>
          </button>

          <button
            onClick={() => {
              setCategory('departments');
              setReportType('summary');
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
              category === 'departments'
                ? 'bg-blue-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Department Reports</span>
          </button>
        </div>

        {/* Sub-report options & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Specific Report Type Dropdown */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            >
              {category === 'attendance' && (
                <>
                  <option value="daily_attendance">Daily &amp; Periodic Attendance Log</option>
                  <option value="late_attendance">Late Attendance &amp; Tardiness Report</option>
                  <option value="absence_report">Absence &amp; Non-Attendance Log</option>
                </>
              )}
              {category === 'leave' && (
                <>
                  <option value="active_leave">Active Leaves Registry</option>
                  <option value="leave_balance">Employee Leave Balance Summary</option>
                  <option value="all_leave">Complete Historic Leave Log</option>
                </>
              )}
              {category === 'employees' && (
                <>
                  <option value="directory">Complete Personnel Directory</option>
                </>
              )}
              {category === 'departments' && (
                <>
                  <option value="summary">Departmental Headcount &amp; Divisions</option>
                </>
              )}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Filter Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
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

          {/* Date range filters for attendance */}
          {category === 'attendance' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              {reportTitle} &mdash; Preview
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {rows.length} Total Matched Entry(ies)
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm text-slate-600">No data available for the selected period</p>
                    <p className="text-xs text-slate-400 mt-1">There are no records matching the specified report criteria.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
