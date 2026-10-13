import React from 'react';
import { X, Bell, Calendar, Clock, Plane, AlertTriangle } from 'lucide-react';
import { useHRMS } from '../context/HRMSContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTo: (tab: any) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTo,
}) => {
  const { attendanceRecords, leaveRecords, publicHolidays } = useHRMS();

  if (!isOpen) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Late employees today
  const lateToday = attendanceRecords.filter(
    (a) => a.attendanceDate === todayStr && (a.lateStatus || a.attendanceStatus === 'Late')
  );

  // Absent today
  const absentToday = attendanceRecords.filter(
    (a) => a.attendanceDate === todayStr && a.attendanceStatus === 'Absent'
  );

  // Active leaves today
  const leavesToday = leaveRecords.filter(
    (l) => l.leaveStatus === 'Active' && todayStr >= l.startDate && todayStr <= l.endDate
  );

  // Upcoming holidays in the next 30 days
  const upcomingHolidays = publicHolidays.filter(
    (h) => h.date >= todayStr && h.date <= futureDate
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div
            className="px-5 py-4 border-b border-slate-200 text-white flex items-center justify-between"
            style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Operational Alerts</h3>
                <span className="text-[11px] text-blue-200">Today: {todayStr}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {/* Late Arrivals */}
            {lateToday.length > 0 && (
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Late Arrivals Today ({lateToday.length})</span>
                </div>
                <div className="space-y-1.5">
                  {lateToday.map((att) => (
                    <div key={att.id} className="text-[11px] bg-white p-2 rounded border border-amber-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{att.employeeName}</div>
                        <div className="text-slate-500">{att.department}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        +{att.lateMinutes} min ({att.checkInTime})
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTo('attendance');
                  }}
                  className="mt-2 text-[11px] font-semibold text-amber-900 hover:underline inline-block cursor-pointer"
                >
                  View Attendance Sheet &rarr;
                </button>
              </div>
            )}

            {/* Absent Employees */}
            {absentToday.length > 0 && (
              <div className="border border-rose-200 rounded-lg p-3 bg-rose-50/50">
                <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Recorded Absences ({absentToday.length})</span>
                </div>
                <div className="space-y-1.5">
                  {absentToday.map((att) => (
                    <div key={att.id} className="text-[11px] bg-white p-2 rounded border border-rose-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{att.employeeName}</div>
                        <div className="text-slate-500">{att.remarks || 'No remarks logged'}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        Absent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employees on Leave */}
            {leavesToday.length > 0 && (
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 mb-1.5">
                  <Plane className="w-3.5 h-3.5 text-blue-600" />
                  <span>Employees on Leave ({leavesToday.length})</span>
                </div>
                <div className="space-y-1.5">
                  {leavesToday.map((l) => (
                    <div key={l.id} className="text-[11px] bg-white p-2 rounded border border-blue-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{l.employeeName}</div>
                        <div className="text-slate-500">{l.leaveTypeName} ({l.numberOfDays} days)</div>
                      </div>
                      <span className="text-[10px] text-blue-700 font-medium">
                        until {l.endDate}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTo('leave');
                  }}
                  className="mt-2 text-[11px] font-semibold text-blue-900 hover:underline inline-block cursor-pointer"
                >
                  Manage Leave Records &rarr;
                </button>
              </div>
            )}

            {/* Upcoming Holidays */}
            {upcomingHolidays.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span>Upcoming Public Holidays</span>
                </div>
                <div className="space-y-1.5">
                  {upcomingHolidays.map((h) => (
                    <div key={h.id} className="text-[11px] bg-white p-2 rounded border border-slate-200">
                      <div className="font-semibold text-slate-800">{h.name}</div>
                      <div className="text-slate-500 flex items-center justify-between mt-0.5">
                        <span>{h.date}</span>
                        <span className="text-amber-700 font-medium">Office Closed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State when no alerts */}
            {lateToday.length === 0 && absentToday.length === 0 && leavesToday.length === 0 && upcomingHolidays.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">There are no operational alerts for today.</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <span className="text-[10px] text-slate-400">
              Ethio-Re HRMS Enterprise Notification Feed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
