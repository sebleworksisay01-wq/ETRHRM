import React from 'react';
import {
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  PlaneTakeoff,
  UserPlus,
  CalendarCheck,
  FileSpreadsheet,
  Activity,
  ArrowUpRight,
  Shield,
  Clock,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { ActiveTab } from '../types/hrms';
import { EthioReLogo } from '../components/EthioReLogo';

interface DashboardViewProps {
  onNavigateTo: (tab: ActiveTab) => void;
  onOpenAddEmployee: () => void;
  onOpenRecordAttendance: () => void;
  onOpenRegisterLeave: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTo,
  onOpenAddEmployee,
  onOpenRecordAttendance,
  onOpenRegisterLeave,
}) => {
  const { isAdmin, currentUser } = useAuth();
  const {
    employees,
    departments,
    attendanceRecords,
    leaveRecords,
    users,
    activityLogs,
    branding,
  } = useHRMS();

  const todayStr = new Date().toISOString().split('T')[0];

  // Metrics
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'Active');
  const activeDepartments = departments.filter((d) => d.status === 'Active');

  const todayAttendance = attendanceRecords.filter((a) => a.attendanceDate === todayStr);
  const presentToday = todayAttendance.filter(
    (a) => a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late' || a.attendanceStatus === 'Half Day'
  );
  const lateToday = todayAttendance.filter((a) => a.lateStatus || a.attendanceStatus === 'Late');
  const absentToday = todayAttendance.filter((a) => a.attendanceStatus === 'Absent');
  const onLeaveToday = leaveRecords.filter(
    (l) => l.leaveStatus === 'Active' && todayStr >= l.startDate && todayStr <= l.endDate
  );

  return (
    <div className="space-y-8 flex flex-col">
      {/* Top Section / Executive Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-[#002855] tracking-tight">System Dashboard</h1>
            <div className="h-5 w-[1px] bg-gray-300"></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {branding.companyDisplayName || 'Ethiopian Reinsurance S.C.'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Welcome back, <strong className="text-[#002855]">{currentUser?.fullName}</strong> &middot; Direct Operational Finalization without approval delays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="dash-quick-attendance-btn"
            onClick={onOpenRecordAttendance}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#002855] text-white font-bold text-xs shadow-xs hover:bg-[#004080] transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>Record Attendance</span>
          </button>
          <button
            id="dash-quick-leave-btn"
            onClick={onOpenRegisterLeave}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#D4AF37] text-[#002855] font-bold text-xs shadow-xs hover:bg-[#c49f2e] transition-colors cursor-pointer"
          >
            <PlaneTakeoff className="w-4 h-4" />
            <span>Register Leave</span>
          </button>
        </div>
      </div>

      {/* STATS GRID - Signature Geometric Balance with gold border-top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {/* Active Employees */}
        <div
          onClick={() => onNavigateTo('employees')}
          className="stat-card bg-white p-5 shadow-xs rounded-lg border border-gray-200 flex flex-col cursor-pointer hover:border-gray-300 transition-all"
        >
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Active Employees
          </span>
          <span className="text-3xl font-black text-[#002855]">{activeEmployees.length}</span>
          <div className="mt-2 text-[11px] text-green-600 font-medium flex items-center justify-between">
            <span>+{employees.length - activeEmployees.length > 0 ? `${employees.length} registered total` : 'Active Staff'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Departments */}
        <div
          onClick={() => onNavigateTo('departments')}
          className="stat-card bg-white p-5 shadow-xs rounded-lg border border-gray-200 flex flex-col cursor-pointer hover:border-gray-300 transition-all"
        >
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Departments
          </span>
          <span className="text-3xl font-black text-[#002855]">{activeDepartments.length}</span>
          <div className="mt-2 text-[11px] text-gray-500 font-medium flex items-center justify-between">
            <span>Organization Wide Units</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Present Today */}
        <div
          onClick={() => onNavigateTo('attendance')}
          className="stat-card bg-white p-5 shadow-xs rounded-lg border border-gray-200 flex flex-col cursor-pointer hover:border-gray-300 transition-all"
        >
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Present Today
          </span>
          <span className="text-3xl font-black text-[#002855]">{presentToday.length}</span>
          <div className="mt-2 text-[11px] text-orange-600 font-medium flex items-center justify-between">
            <span>{lateToday.length} Late Arrivals</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* On Leave */}
        <div
          onClick={() => onNavigateTo('leave')}
          className="stat-card bg-white p-5 shadow-xs rounded-lg border border-gray-200 flex flex-col cursor-pointer hover:border-gray-300 transition-all"
        >
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            On Leave
          </span>
          <span className="text-3xl font-black text-[#002855]">{onLeaveToday.length}</span>
          <div className="mt-2 text-[11px] text-blue-600 font-medium flex items-center justify-between">
            <span>Authorized Active Leaves</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: TWO COLUMNS (Geometric Balance Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
        {/* RECENT ATTENDANCE (Takes 2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-xs border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#002855] text-sm">Recent Attendance Records</h3>
            <button
              onClick={() => onNavigateTo('attendance')}
              className="text-xs font-bold text-[#D4AF37] hover:underline uppercase tracking-tight cursor-pointer"
            >
              View All Records &rarr;
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="px-6 py-3 text-[11px] uppercase text-gray-500 font-bold">Employee</th>
                  <th className="px-6 py-3 text-[11px] uppercase text-gray-500 font-bold">Department</th>
                  <th className="px-6 py-3 text-[11px] uppercase text-gray-500 font-bold">Time In</th>
                  <th className="px-6 py-3 text-[11px] uppercase text-gray-500 font-bold">Status</th>
                  <th className="px-6 py-3 text-[11px] uppercase text-gray-500 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400">
                      No attendance records available for today. Click &quot;Record Attendance&quot; to log entries.
                    </td>
                  </tr>
                ) : (
                  todayAttendance.slice(0, 6).map((att) => (
                    <tr key={att.id} className="text-sm hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-3 font-medium text-[#002855]">
                        <div>{att.employeeName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{att.employeeId}</div>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-600 truncate max-w-[140px]">
                        {att.department}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-600 font-mono">
                        {att.checkInTime || '--:--'}
                      </td>
                      <td className="px-6 py-3">
                        {att.attendanceStatus === 'Present' && (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            PRESENT
                          </span>
                        )}
                        {att.attendanceStatus === 'Late' && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            LATE (+{att.lateMinutes}m)
                          </span>
                        )}
                        {att.attendanceStatus === 'Absent' && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            ABSENT
                          </span>
                        )}
                        {att.attendanceStatus === 'On Leave' && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            ON LEAVE
                          </span>
                        )}
                        {att.attendanceStatus === 'Half Day' && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            HALF DAY
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => onNavigateTo('attendance')}
                          className="text-xs text-gray-400 hover:text-blue-600 font-medium cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS + SYSTEM LOGS */}
        <div className="flex flex-col gap-6">
          {/* HR Quick Actions */}
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6">
            <h3 className="font-bold text-[#002855] text-sm mb-4">HR Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                id="btn-quick-add-emp"
                onClick={onOpenAddEmployee}
                className="w-full text-left bg-gray-50 border border-gray-200 p-3 rounded flex items-center justify-between hover:border-[#D4AF37] hover:bg-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-[#002855]">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">Register New Employee</span>
                    <span className="text-[10px] text-gray-400">Add personnel profile</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#D4AF37] transition-colors" />
              </button>

              <button
                id="btn-quick-record-att"
                onClick={onOpenRecordAttendance}
                className="w-full text-left bg-gray-50 border border-gray-200 p-3 rounded flex items-center justify-between hover:border-[#D4AF37] hover:bg-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-yellow-100 flex items-center justify-center text-yellow-700">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">Finalize Daily Attendance</span>
                    <span className="text-[10px] text-gray-400">Check-in / Check-out</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#D4AF37] transition-colors" />
              </button>

              <button
                id="btn-quick-reports"
                onClick={() => onNavigateTo('reports')}
                className="w-full text-left bg-gray-50 border border-gray-200 p-3 rounded flex items-center justify-between hover:border-[#D4AF37] hover:bg-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-700">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">Official HR Reports</span>
                    <span className="text-[10px] text-gray-400">PDF &amp; CSV export</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#D4AF37] transition-colors" />
              </button>
            </div>
          </div>

          {/* Recent System Logs - Dark Geometric Card */}
          <div className="bg-[#002855] rounded-lg shadow-sm p-6 text-white border border-[#002855]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-[#ffffff80]">Recent System Logs</h3>
              <span className="text-[10px] bg-white text-[#002855] px-2 py-0.5 rounded font-bold">
                {isAdmin ? 'ADMIN ACCESS' : 'ACTIVITY'}
              </span>
            </div>
            <div className="space-y-3">
              {activityLogs.length === 0 ? (
                <p className="text-white/60 text-xs py-3 text-center">No recent activity logs recorded yet.</p>
              ) : (
                activityLogs.slice(0, 3).map((log, idx) => (
                  <div
                    key={log.id}
                    className={`text-xs pl-3 py-1 ${
                      idx === 0 ? 'border-l-2 border-[#D4AF37]' : 'border-l-2 border-[#ffffff40]'
                    }`}
                  >
                    <p className="font-semibold text-white/90 truncate">
                      {log.action}: {log.recordOrEntity}
                    </p>
                    <p className="text-[#ffffff60] text-[10px] font-mono mt-0.5">
                      {log.userName} &middot; {log.timestamp.substring(11)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
