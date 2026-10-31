import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  PlusCircle,
  XCircle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Search,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Mail,
  Phone,
  Building,
  Timer,
  Briefcase,
  CalendarCheck,
} from 'lucide-react';
import { formatDateRange, formatDateTime } from '../utils/dateUtils';
import { LeaveStatus, LeaveType } from '../types';
import { EditProfileModal } from './EditProfileModal';

export const MyLeaveView: React.FC<{ onApplyLeave: (type?: LeaveType) => void }> = ({
  onApplyLeave,
}) => {
  const { currentUser, leaveRequests, cancelLeave, getMonthlyPermissionStats } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Filter requests for logged-in user
  const myRequests = leaveRequests.filter((r) => r.staffId === currentUser.id);

  // Current month permission allowance stats (Max 60 mins/month)
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const permStats = getMonthlyPermissionStats(currentUser.id, currentMonthKey);

  // Calculate Used days per leave category from Approved requests
  const usedCasual = myRequests
    .filter((r) => r.leaveType === 'Casual' && r.status === 'Approved')
    .reduce((sum, r) => sum + r.totalDays, 0);

  const usedSick = myRequests
    .filter((r) => r.leaveType === 'Sick' && r.status === 'Approved')
    .reduce((sum, r) => sum + r.totalDays, 0);

  const usedCompensatory = myRequests
    .filter(
      (r) => (r.leaveType === 'Compensatory' || (r.leaveType as string) === 'Earned') && r.status === 'Approved'
    )
    .reduce((sum, r) => sum + r.totalDays, 0);

  const currentCompBal =
    currentUser.leaveBalance.compensatory ?? (currentUser.leaveBalance as any)?.earned ?? 0;

  // Balance breakdown cards data
  const balanceCards = [
    {
      type: 'Casual Leave',
      code: 'CL',
      color: 'blue',
      remaining: currentUser.leaveBalance.casual,
      used: usedCasual,
      allocated: currentUser.leaveBalance.casual + usedCasual,
      desc: 'Short personal and family matters',
      leaveType: 'Casual' as LeaveType,
    },
    {
      type: 'Sick Leave',
      code: 'SL',
      color: 'rose',
      remaining: currentUser.leaveBalance.sick,
      used: usedSick,
      allocated: currentUser.leaveBalance.sick + usedSick,
      desc: 'Medical checkups and illness recovery',
      leaveType: 'Sick' as LeaveType,
    },
    {
      type: 'Compensatory Leave',
      code: 'CO',
      color: 'amber',
      remaining: currentCompBal,
      used: usedCompensatory,
      allocated: currentCompBal + usedCompensatory,
      desc: 'Claim for extra hours or holidays worked',
      leaveType: 'Compensatory' as LeaveType,
    },
  ];

  // Filtered requests
  const filteredRequests = myRequests.filter((req) => {
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        req.leaveType.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q) ||
        req.startDate.includes(q) ||
        req.endDate.includes(q)
      );
    }
    return true;
  });

  const handleCancelClick = (requestId: string) => {
    cancelLeave(requestId);
    setCancellingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Profile Summary Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md ${
              currentUser.avatarBg || 'bg-blue-600'
            }`}
          >
            {currentUser.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {currentUser.role}
              </span>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {currentUser.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-slate-800">{currentUser.designation}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                <Building className="w-3.5 h-3.5 text-blue-500" />
                {currentUser.department}
              </span>
              <span>•</span>
              <span>Joined {currentUser.joinedDate}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 font-medium">{currentUser.email}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser.phone}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="edit-own-profile-btn"
            onClick={() => setIsEditProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shadow-2xs"
            title="Edit your contact and department profile information"
          >
            <UserCog className="w-4 h-4 text-slate-600" />
            <span>Edit Profile</span>
          </button>

          <button
            id="my-permission-apply-btn"
            onClick={() => onApplyLeave('Permission')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all shadow-2xs"
            title="Apply for monthly Permission (Max 60 mins/month)"
          >
            <Timer className="w-4 h-4 text-violet-600" />
            <span>Apply Permission</span>
          </button>

          <button
            id="my-leave-apply-btn"
            onClick={() => onApplyLeave('Casual')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Balance Portfolio: Allocated vs Used vs Remaining */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Leave & Permission Allowance Portfolio
          </h3>
          <span className="text-xs text-slate-500">Academic Year 2026-2027</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balanceCards.map((card) => {
            const usagePercent =
              card.allocated > 0 ? Math.round((card.used / card.allocated) * 100) : 0;

            const bgGradients = {
              blue: 'border-blue-200 hover:border-blue-300',
              rose: 'border-rose-200 hover:border-rose-300',
              emerald: 'border-emerald-200 hover:border-emerald-300',
              amber: 'border-amber-200 hover:border-amber-300 bg-amber-50/20',
            };

            const barColors = {
              blue: 'bg-blue-600',
              rose: 'bg-rose-500',
              emerald: 'bg-emerald-600',
              amber: 'bg-amber-600',
            };

            return (
              <div
                key={card.type}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  bgGradients[card.color as keyof typeof bgGradients]
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{card.type}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      card.color === 'amber'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {card.code}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        {card.remaining}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5 font-medium">Days Left</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-400">Used: </span>
                      <strong className="text-slate-700">{card.used}d</strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          barColors[card.color as keyof typeof barColors]
                        }`}
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Breakdown details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Allocated: <strong>{card.allocated} days</strong>
                    </span>
                    <span>
                      Used: <strong>{usagePercent}%</strong>
                    </span>
                  </div>
                </div>

                {card.type === 'Compensatory Leave' && (
                  <button
                    onClick={() => onApplyLeave('Compensatory')}
                    className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Claim Comp Off</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* 4th Card: Monthly Permission Allowance (Max 60 Mins/Month) */}
          <div className="bg-white rounded-2xl border border-violet-200 hover:border-violet-300 p-5 shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-900">Permission Quota</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200">
                  60m / Mo
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className={`text-3xl font-black tracking-tight ${permStats.remainingMinutes <= 0 ? 'text-rose-600' : 'text-violet-900'}`}>
                    {permStats.remainingMinutes}
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5 font-medium">Mins Left</span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400">Used: </span>
                  <strong className="text-violet-700">{permStats.usedMinutes}m</strong>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-violet-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      permStats.usedMinutes >= 60 ? 'bg-rose-500' : 'bg-violet-600'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((permStats.usedMinutes / 60) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-violet-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Allowance: <strong>60 mins</strong>
                </span>
                <span>
                  Used: <strong>{Math.round((permStats.usedMinutes / 60) * 100)}%</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => onApplyLeave('Permission')}
              className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Request Permission</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leave Application History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Application Status & History</h3>
            <p className="text-xs text-slate-500">Track and manage your submitted requests</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search requests..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              {(['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as (string | LeaveStatus)[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                      statusFilter === status
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Date Range</th>
                <th className="py-3 px-4 font-semibold">Days</th>
                <th className="py-3 px-4 font-semibold">Reason & Contact</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Review / Approver</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600 text-xs">No leave applications found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click "Submit Leave Application" to apply for time off.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const statusBadges = {
                    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
                    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
                  };

                  const isPermission = req.leaveType === 'Permission';
                  const isCompensatory = req.leaveType === 'Compensatory' || (req.leaveType as string) === 'Earned';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {isPermission ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                            <Timer className="w-3 h-3 text-violet-600" />
                            <span>Permission</span>
                          </span>
                        ) : isCompensatory ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <CalendarCheck className="w-3 h-3 text-amber-600" />
                            <span>Compensatory</span>
                          </span>
                        ) : (
                          <span>{req.leaveType}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {isPermission ? req.startDate : formatDateRange(req.startDate, req.endDate)}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {isPermission ? (
                            <span className="text-violet-700 font-semibold">
                              {req.permissionStartTime || '09:30 AM'} - {req.permissionEndTime || '10:30 AM'}
                            </span>
                          ) : isCompensatory && req.workedDate ? (
                            <span className="text-amber-800 font-medium">
                              Worked: {req.workedDate} ({req.workedHours || 8}h)
                            </span>
                          ) : (
                            <span>Applied {formatDateTime(req.appliedAt)}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isPermission ? (
                          <div>
                            <span className="font-bold text-violet-700 text-xs">
                              {req.permissionMinutes || 60} mins
                            </span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              0 days quota
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {isCompensatory && req.workedDate && (
                          <div className="mb-1">
                            <span className="inline-block text-[10px] bg-amber-100/80 text-amber-900 font-semibold px-1.5 py-0.5 rounded border border-amber-200">
                              {req.workedPeriodType || 'Overtime / Holiday'}: {req.workedHours || 8}h worked
                            </span>
                          </div>
                        )}
                        <p className="text-slate-700 truncate" title={req.reason}>
                          {req.reason}
                        </p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                          Emergency: {req.emergencyContact}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            statusBadges[req.status]
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {req.actionedBy ? (
                          <div>
                            <span className="font-medium text-slate-800 text-[11px] block">
                              {req.actionedBy}
                            </span>
                            {req.rejectionReason && (
                              <p className="text-[10.5px] text-rose-600 italic mt-0.5">
                                "{req.rejectionReason}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Under Review</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'Pending' ? (
                          cancellingId === req.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCancelClick(req.id)}
                                className="px-2 py-1 bg-rose-600 text-white rounded text-[10.5px] font-semibold hover:bg-rose-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setCancellingId(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10.5px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`cancel-leave-${req.id}`}
                              onClick={() => setCancellingId(req.id)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px] font-medium transition-colors"
                              title="Cancel your pending leave request"
                            >
                              Cancel
                            </button>
                          )
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Self-Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </div>
  );
};
