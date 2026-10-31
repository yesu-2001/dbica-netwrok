import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileCheck2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ShieldAlert,
  AlertCircle,
  Calendar,
  Building,
  User,
  Info,
} from 'lucide-react';
import { formatDateRange, formatDateTime } from '../utils/dateUtils';
import { LeaveRequest, LeaveStatus, Department } from '../types';
import { RejectLeaveModal } from './RejectLeaveModal';
import { OverrideLeaveModal } from './OverrideLeaveModal';

export const LeaveRequestsView: React.FC = () => {
  const { currentUser, leaveRequests, approveLeave, departments: appDepartments } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    currentUser.role === 'Manager' ? currentUser.department : 'All'
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
  const [overridingRequest, setOverridingRequest] = useState<LeaveRequest | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  // RBAC check: Only Super Admin, HR, and Manager can review
  if (currentUser.role === 'Staff') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          The Leave Approvals center is restricted to Super Admin, HR, and Department Managers.
          Please switch role using the Quick Switcher at the top to test review actions.
        </p>
      </div>
    );
  }

  // Filter requests
  const filteredRequests = leaveRequests.filter((req) => {
    // Status filter
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;

    // Department filter
    if (departmentFilter !== 'All' && req.department !== departmentFilter) return false;

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        req.staffName.toLowerCase().includes(q) ||
        req.leaveType.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q) ||
        req.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = (requestId: string) => {
    approveLeave(requestId, approvalNote.trim() || undefined);
    setApprovingId(null);
    setApprovalNote('');
  };

  const departments: string[] = appDepartments.map((d) => d.name);

  return (
    <div className="space-y-6">
      {/* Role Banner / Context */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Leave Review & Approval Portal
            </h2>
            <p className="text-xs text-slate-500">
              Active Reviewer: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})
              {currentUser.role === 'Manager' && ` • Reviewing ${currentUser.department}`}
            </p>
          </div>
        </div>

        {/* Quick Pending Counter Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Pending Actions:</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            {leaveRequests.filter((r) => r.status === 'Pending').length} Pending System-Wide
          </span>
        </div>
      </div>

      {/* Main Filter & Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        {/* Filters Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['Pending', 'Approved', 'Rejected', 'All'] as (string | LeaveStatus)[]).map(
              (status) => {
                const count =
                  status === 'All'
                    ? leaveRequests.length
                    : leaveRequests.filter((r) => r.status === status).length;

                return (
                  <button
                    key={status}
                    id={`filter-status-${status.toLowerCase()}`}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 ${
                      statusFilter === status
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        status === 'Pending' && count > 0
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* Department filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="All">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff, reason..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Staff Member</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Leave Details</th>
                <th className="py-3 px-4 font-semibold">Reason & Contact</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Decision Details</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <CheckCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600 text-xs">No leave requests match your filter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Check back later or adjust status/department filters above.
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

                  // Manager permission check: manager can only action their own department
                  const isManagerOfDifferentDept =
                    currentUser.role === 'Manager' && req.department !== currentUser.department;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Staff info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{req.staffName}</div>
                        <div className="text-[10.5px] text-slate-400">{req.staffEmail}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {req.department}
                      </td>

                      {/* Leave details */}
                      <td className="py-3.5 px-4">
                        {req.leaveType === 'Permission' ? (
                          <>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                                Permission
                              </span>
                              <strong className="text-violet-700">{req.permissionMinutes || 60} mins</strong>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {req.startDate} • {req.permissionStartTime || '09:30 AM'} - {req.permissionEndTime || '10:30 AM'}
                            </div>
                          </>
                        ) : req.leaveType === 'Compensatory' ? (
                          <>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Compensatory Leave
                              </span>
                              <strong className="text-amber-800">{req.totalDays}d</strong>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                              Claim Date: {req.compensatoryLeaveDate || req.startDate}
                            </div>
                            {req.workedDate && (
                              <div className="text-[10px] text-slate-500 mt-1 bg-amber-50/80 rounded px-2 py-1 border border-amber-200/80">
                                <span className="font-medium text-amber-900">Worked Prior:</span> {req.workedDate} ({req.workedHours || 8} hrs • {req.workedPeriodType || 'Overtime'})
                                {req.workedDutyDetails && (
                                  <div className="italic text-slate-500 mt-0.5">"{req.workedDutyDetails}"</div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-slate-800">
                              {req.leaveType} Leave • <strong className="text-blue-600">{req.totalDays}d</strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatDateRange(req.startDate, req.endDate)}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-700 line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          Emergency: {req.emergencyContact}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            statusBadges[req.status]
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>

                      {/* Decision Details */}
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
                          <span className="text-slate-400 italic text-[11px]">Awaiting Decision</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'Pending' ? (
                          isManagerOfDifferentDept ? (
                            <span
                              className="text-[10.5px] text-slate-400 italic"
                              title="As a department manager, you can only approve staff in your department"
                            >
                              Dept Manager Only
                            </span>
                          ) : approvingId === req.id ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <input
                                type="text"
                                placeholder="Optional approval note..."
                                value={approvalNote}
                                onChange={(e) => setApprovalNote(e.target.value)}
                                className="text-[11px] p-1 border border-slate-300 rounded w-36"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10.5px] font-semibold hover:bg-emerald-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => {
                                    setApprovingId(null);
                                    setApprovalNote('');
                                  }}
                                  className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10.5px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`approve-btn-${req.id}`}
                                onClick={() => setApprovingId(req.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                id={`reject-btn-${req.id}`}
                                onClick={() => setRejectingRequest(req)}
                                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )
                        ) : currentUser.role === 'Super Admin' ? (
                          <button
                            id={`override-btn-${req.id}`}
                            onClick={() => setOverridingRequest(req)}
                            className="px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-lg font-medium transition-colors"
                            title="Super Admin Override privileges"
                          >
                            Override
                          </button>
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

      {/* Reject Modal */}
      <RejectLeaveModal
        isOpen={Boolean(rejectingRequest)}
        request={rejectingRequest}
        onClose={() => setRejectingRequest(null)}
      />

      {/* Super Admin Override Modal */}
      <OverrideLeaveModal
        isOpen={Boolean(overridingRequest)}
        request={overridingRequest}
        onClose={() => setOverridingRequest(null)}
      />
    </div>
  );
};
