import React, { useState } from 'react';
import { Activity, Search, Filter, Shield, Calendar, Download, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { AccessDenied } from '../components/AccessDenied';
import { exportToCSV } from '../utils/exportUtils';
import { EthioReLogo } from '../components/EthioReLogo';

export const ActivityLogsView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { activityLogs } = useHRMS();

  if (!isAdmin) {
    return (
      <AccessDenied
        moduleName="System Audit &amp; Activity Logs"
        requiredRole="Administrator"
      />
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Filter logs
  const filteredLogs = activityLogs.filter((log) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEntity = log.recordOrEntity.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      if (!matchUser && !matchAction && !matchEntity && !matchDetails) return false;
    }

    if (selectedModule) {
      if (selectedModule === 'Data Configuration') {
        if (log.module !== 'Data Configuration' && log.module !== 'Company Profile') return false;
      } else if (log.module !== selectedModule) {
        return false;
      }
    }

    if (selectedRole) {
      const actualRole = log.role === 'HR Officer' ? 'HR Admin' : log.role || log.userRole;
      if (actualRole !== selectedRole) return false;
    }

    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      'Log ID',
      'Timestamp',
      'User',
      'Role',
      'Module',
      'Action',
      'Target User / Record',
      'Previous Value',
      'New Value',
      'Device / IP',
      'Details',
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.userName,
      l.role || l.userRole || '',
      l.module,
      l.action,
      l.targetUser || l.recordOrEntity,
      l.previousValue || '',
      l.newValue || '',
      l.deviceInfo || '',
      l.details,
    ]);

    exportToCSV(`Ethio-Re_RBAC_Activity_Audit_Log_${new Date().toISOString().substring(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <EthioReLogo size="sm" showText={false} />
            <h1 className="text-xl font-bold text-slate-900">System Activity &amp; Audit Logs</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
              Immutable Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace operational adjustments, authentication events, leave bookings, and administrative settings.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, entity, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-xs"
          >
            <option value="">All Modules</option>
            <option value="RBAC">RBAC</option>
            <option value="User Management">User Management</option>
            <option value="Administration">Administration</option>
            <option value="Authentication">Authentication</option>
            <option value="Employee Management">Employee Management</option>
            <option value="Employees">Employees</option>
            <option value="Departments">Departments</option>
            <option value="Attendance">Attendance</option>
            <option value="Leave Management">Leave Management</option>
            <option value="Reports">Reports</option>
            <option value="Data Configuration">Data Configuration</option>
            <option value="Branding">Branding</option>
            <option value="Public Holidays">Public Holidays</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
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
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Actor (User &amp; Role)</th>
                <th className="px-4 py-3.5">Module &amp; Action</th>
                <th className="px-4 py-3.5">Target User / Record</th>
                <th className="px-4 py-3.5">Audit Changes / Values</th>
                <th className="px-4 py-3.5">Device / IP</th>
                <th className="px-4 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No activity logs recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Actions performed by authenticated users and RBAC updates will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const roleName = log.role || log.userRole || 'System';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide inline-block mt-0.5 ${
                            roleName === 'Administrator'
                              ? 'bg-[#002855] text-amber-300'
                              : roleName === 'HR Admin' || (roleName as any) === 'HR Officer'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {roleName === 'HR Officer' ? 'HR Admin' : roleName}
                        </span>
                      </td>

                      {/* Module & Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.module === 'RBAC'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : log.module === 'User Management'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.module}
                        </span>
                        <div className="font-semibold text-slate-800 text-[11px] mt-1">
                          {log.action}
                        </div>
                      </td>

                      {/* Target User / Record */}
                      <td className="px-4 py-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                        {log.targetUser || log.recordOrEntity}
                      </td>

                      {/* Changes (Old -> New) */}
                      <td className="px-4 py-3 text-[11px] whitespace-nowrap">
                        {log.previousValue || log.newValue ? (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            {log.previousValue && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 line-through">
                                {log.previousValue}
                              </span>
                            )}
                            <span className="text-slate-400">&rarr;</span>
                            {log.newValue && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">—</span>
                        )}
                      </td>

                      {/* Device / IP */}
                      <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                        <span className="font-mono">{log.deviceInfo || 'Enterprise Web Client'}</span>
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3 text-slate-600 max-w-[260px] truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
