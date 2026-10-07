import React, { useState } from 'react';
import {
  User,
  CalendarCheck,
  PlaneTakeoff,
  Scale,
  Bell,
  Key,
  ShieldCheck,
  Edit2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Phone,
  Mail,
  MapPin,
  Lock,
  Calendar,
  Briefcase,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { EthioReLogo } from '../components/EthioReLogo';

interface EmployeePortalViewProps {
  activeSection?: 'my-profile' | 'my-attendance' | 'my-leave' | 'my-leave-balance' | 'my-notifications' | 'account-settings';
  onNavigateSection?: (section: any) => void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  activeSection = 'my-profile',
  onNavigateSection,
}) => {
  const { currentUser, changePassword, updateProfile } = useAuth();
  const {
    employees,
    attendanceRecords,
    leaveRecords,
    leaveTypes,
    publicHolidays,
    createLeaveRecord,
    getEmployeeBalance,
    updateEmployee,
  } = useHRMS();

  // Find linked employee profile
  const linkedEmployee = employees.find(
    (e) =>
      (e.email && currentUser?.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      e.userId === currentUser?.id ||
      e.linkedUserId === currentUser?.id
  );

  // Form states for profile edit
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [phone, setPhone] = useState(linkedEmployee?.phoneNumber || currentUser?.phone || '');
  const [altPhone, setAltPhone] = useState(linkedEmployee?.altPhoneNumber || '');
  const [address, setAddress] = useState(linkedEmployee?.address || '');
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // New leave request modal
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState(leaveTypes[0]?.id || '');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveNotice, setLeaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter attendance to ONLY this employee
  const myAttendance = attendanceRecords.filter((a) => {
    if (linkedEmployee?.employeeId && a.employeeId === linkedEmployee.employeeId) return true;
    if (currentUser?.email && a.employeeEmail?.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  });

  // Filter leave records to ONLY this employee
  const myLeaves = leaveRecords.filter((l) => {
    if (linkedEmployee?.employeeId && l.employeeId === linkedEmployee.employeeId) return true;
    if (currentUser?.email && l.employeeEmail?.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  });

  // Calculate personal balance
  const myBalances = linkedEmployee?.employeeId
    ? getEmployeeBalance(linkedEmployee.employeeId)
    : [];

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);

    try {
      if (linkedEmployee) {
        await updateEmployee(linkedEmployee.id, {
          phoneNumber: phone,
          altPhoneNumber: altPhone,
          address,
        });
      }
      await updateProfile({ phone });
      setIsEditingPersonal(false);
      setProfileNotice({
        type: 'success',
        message: 'Personal contact information successfully updated.',
      });
    } catch (err: any) {
      setProfileNotice({
        type: 'error',
        message: err.message || 'Failed to update personal details.',
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (!res.success) {
        setPasswordNotice({ type: 'error', message: res.error || 'Failed to change password.' });
      } else {
        setPasswordNotice({ type: 'success', message: 'Password successfully updated!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordNotice({ type: 'error', message: err.message || 'Password update failed.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveNotice(null);

    if (!linkedEmployee) {
      setLeaveNotice({
        type: 'error',
        message: 'Your account is not linked to an official employee master record yet. Please contact HR.',
      });
      return;
    }

    const res = await createLeaveRecord({
      employeeId: linkedEmployee.employeeId,
      leaveTypeId: selectedLeaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason,
    });

    if (!res.success) {
      setLeaveNotice({ type: 'error', message: res.error || 'Failed to submit leave request.' });
    } else {
      setLeaveNotice({ type: 'success', message: 'Leave record registered and saved to database!' });
      setIsRequestLeaveOpen(false);
      setLeaveReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{ backgroundColor: 'var(--primary-color, #002855)' }}
          >
            {currentUser?.fullName?.charAt(0) || 'E'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{currentUser?.fullName}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Employee Self-Service
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{currentUser?.email}</span>
              <span>&middot;</span>
              <span>{linkedEmployee?.position || 'Staff Member'}</span>
              <span>&middot;</span>
              <span>{linkedEmployee?.departmentName || currentUser?.department || 'Ethiopian Reinsurance'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            Employee ID: <strong className="text-slate-900 font-mono">{linkedEmployee?.employeeId || 'Pending Linking'}</strong>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex items-center gap-1 px-4 overflow-x-auto bg-slate-50/70 border-b border-slate-200">
          {[
            { id: 'my-profile', label: 'My Profile', icon: User },
            { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
            { id: 'my-leave', label: 'My Leave Records', icon: PlaneTakeoff },
            { id: 'my-leave-balance', label: 'My Leave Balance', icon: Scale },
            { id: 'my-notifications', label: 'My Notifications', icon: Bell },
            { id: 'account-settings', label: 'Account Settings', icon: Key },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onNavigateSection?.(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#002855] text-[#002855] bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#002855]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: My Profile */}
        {activeSection === 'my-profile' && (
          <div className="p-6 space-y-6">
            {profileNotice && (
              <div
                className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
                  profileNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {profileNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{profileNotice.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personnel Master Info */}
              <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Official Master Data (HR Verified)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-900">
                    Read Only
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Full Name</span>
                    <strong className="text-slate-900 font-semibold">{linkedEmployee?.fullName || currentUser?.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Staff ID</span>
                    <strong className="text-slate-900 font-mono font-semibold">{linkedEmployee?.employeeId || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Department</span>
                    <strong className="text-slate-900 font-semibold">{linkedEmployee?.departmentName || currentUser?.department || 'Executive Office'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Position / Title</span>
                    <strong className="text-slate-900 font-semibold">{linkedEmployee?.position || 'Staff Member'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Employment Type</span>
                    <strong className="text-slate-900 font-semibold">{linkedEmployee?.employmentType || 'Permanent'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Date of Hire</span>
                    <strong className="text-slate-900 font-semibold">{linkedEmployee?.hireDate || '2024-01-01'}</strong>
                  </div>
                </div>
              </div>

              {/* Permitted Personal Contact Information */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Permitted Personal Information
                  </h3>
                  {!isEditingPersonal && (
                    <button
                      onClick={() => setIsEditingPersonal(true)}
                      className="flex items-center gap-1 text-xs font-bold text-[#002855] hover:underline cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>
                  )}
                </div>

                {isEditingPersonal ? (
                  <form onSubmit={handleSavePersonalInfo} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Primary Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+251 91 ..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alternative Phone</label>
                      <input
                        type="text"
                        value={altPhone}
                        onChange={(e) => setAltPhone(e.target.value)}
                        placeholder="+251 92 ..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Addis Ababa, Bole Sub-City, Woreda 03"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingPersonal(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#002855] text-white font-bold cursor-pointer hover:bg-[#003366]"
                      >
                        Save Updates
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{currentUser?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{phone || 'No phone recorded'}</span>
                    </div>
                    {altPhone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{altPhone} (Alternative)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{address || 'Addis Ababa, Ethiopia'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Attendance */}
        {activeSection === 'my-attendance' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Personal Attendance Records
              </h3>
              <span className="text-[11px] text-slate-500">
                Showing {myAttendance.length} records for your profile
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-xs">No attendance recorded yet</p>
                      </td>
                    </tr>
                  ) : (
                    myAttendance.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {att.attendanceDate}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {att.checkInTime || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {att.checkOutTime || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              att.attendanceStatus === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.attendanceStatus === 'Late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.attendanceStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {att.workingHours ? `${att.workingHours} hrs` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">
                          {att.remarks || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: My Leave Records */}
        {activeSection === 'my-leave' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Personal Leave Records
              </h3>
              <button
                onClick={() => setIsRequestLeaveOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#002855] text-white text-xs font-bold hover:bg-[#003366] transition-colors cursor-pointer"
              >
                + Register Leave
              </button>
            </div>

            {leaveNotice && (
              <div className="p-3 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs">
                {leaveNotice.message}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <PlaneTakeoff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-xs">No leave records registered</p>
                      </td>
                    </tr>
                  ) : (
                    myLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {l.leaveTypeName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{l.startDate}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{l.endDate}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {l.numberOfDays} days
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.leaveStatus === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.leaveStatus === 'Completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {l.leaveStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">
                          {l.reason || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: My Leave Balance */}
        {activeSection === 'my-leave-balance' && (
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Statutory Leave Allowances &amp; Balances
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveTypes.map((type) => {
                const balItem = myBalances.find((b) => b.leaveTypeId === type.id);
                const entitled = balItem ? balItem.entitled : type.defaultDays;
                const used = balItem ? balItem.used : 0;
                const remaining = balItem ? balItem.remaining : type.defaultDays;

                return (
                  <div
                    key={type.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{type.name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold">
                        {type.code}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-2xl font-black text-[#002855]">{remaining}</span>
                        <span className="text-slate-500 text-[11px] ml-1">days left</span>
                      </div>
                      <div className="text-[11px] text-slate-500 text-right">
                        <span>Used: <strong>{used}</strong> / {entitled}</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#002855] h-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((entitled - remaining) / (entitled || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: My Notifications */}
        {activeSection === 'my-notifications' && (
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Personal Notices &amp; Statutory Holidays
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                <div className="font-bold text-[#002855] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Account Email Verified &amp; Secured</span>
                </div>
                <p className="text-slate-600">
                  Your corporate email address (<strong>{currentUser?.email}</strong>) has been verified with Ethiopian Reinsurance S.C. identity directory.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Upcoming Official Holidays</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {publicHolidays.slice(0, 4).map((h) => (
                    <div key={h.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{h.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{h.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Account Settings (Change Password) */}
        {activeSection === 'account-settings' && (
          <div className="p-6 max-w-lg space-y-4">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Manage Account Credentials
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your authentication password for portal access.
              </p>
            </div>

            {passwordNotice && (
              <div
                className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
                  passwordNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {passwordNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{passwordNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="px-5 py-2 rounded-lg bg-[#002855] text-white font-bold hover:bg-[#003366] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isChangingPass ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Register Leave Modal */}
      {isRequestLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 text-white"
              style={{ backgroundColor: 'var(--primary-color, #002855)' }}
            >
              <h3 className="font-bold text-sm">Register Leave Authorization</h3>
              <button
                onClick={() => setIsRequestLeaveOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitLeaveRequest} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={selectedLeaveType}
                  onChange={(e) => setSelectedLeaveType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.defaultDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Annual vacation leave"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestLeaveOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#002855] text-white font-bold cursor-pointer hover:bg-[#003366]"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
