import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Clock,
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle,
  FileText,
  Building,
} from 'lucide-react';
import { formatDate, formatDateRange, doDateRangesOverlap } from '../utils/dateUtils';
import { Department } from '../types';

export const OverviewView: React.FC<{ onApplyLeave: () => void }> = ({ onApplyLeave }) => {
  const { staffList, leaveRequests, currentUser, setActiveTab, departments: appDepartments } = useApp();

  // Calendar month state - start around current demo date (September 2026)
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date(2026, 8, 1)); // Sept 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>('2026-09-22');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  // Stats calculation
  const activeStaffCount = staffList.filter((s) => s.status === 'Active').length;
  const pendingRequestsCount = leaveRequests.filter((r) => r.status === 'Pending').length;

  const todayStr = '2026-09-20'; // Current date anchor

  const onLeaveToday = leaveRequests.filter(
    (r) => r.status === 'Approved' && r.startDate <= todayStr && r.endDate >= todayStr
  );

  const approvedThisMonth = leaveRequests.filter((r) => {
    if (r.status !== 'Approved') return false;
    const start = new Date(r.startDate);
    return (
      start.getFullYear() === currentMonthDate.getFullYear() &&
      start.getMonth() === currentMonthDate.getMonth()
    );
  }).length;

  // Department clash detection:
  // Find overlaps between staff in the same department
  const departmentalClashes = useMemo(() => {
    const clashes: {
      department: Department;
      staffA: string;
      staffB: string;
      dateRangeA: string;
      dateRangeB: string;
      status: string;
    }[] = [];

    const activeLeaves = leaveRequests.filter(
      (r) => r.status === 'Approved' || r.status === 'Pending'
    );

    for (let i = 0; i < activeLeaves.length; i++) {
      for (let j = i + 1; j < activeLeaves.length; j++) {
        const reqA = activeLeaves[i];
        const reqB = activeLeaves[j];

        if (reqA.staffId !== reqB.staffId && reqA.department === reqB.department) {
          if (doDateRangesOverlap(reqA.startDate, reqA.endDate, reqB.startDate, reqB.endDate)) {
            clashes.push({
              department: reqA.department,
              staffA: reqA.staffName,
              staffB: reqB.staffName,
              dateRangeA: `${formatDate(reqA.startDate)} - ${formatDate(reqA.endDate)}`,
              dateRangeB: `${formatDate(reqB.startDate)} - ${formatDate(reqB.endDate)}`,
              status: reqA.status === 'Approved' && reqB.status === 'Approved' ? 'Approved Overlap' : 'Pending Review',
            });
          }
        }
      }
    }
    return clashes;
  }, [leaveRequests]);

  // Calendar days generation
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysArray = useMemo(() => {
    const arr = [];
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      arr.push({
        dayNumber: prevMonthDays - i,
        dateStr: '',
        isCurrentMonth: false,
      });
    }
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      arr.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
      });
    }
    return arr;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

  const monthLabel = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Leaves for a particular day
  const getLeavesForDate = (dateStr: string) => {
    if (!dateStr) return [];
    return leaveRequests.filter((r) => {
      if (departmentFilter !== 'All' && r.department !== departmentFilter) return false;
      return (
        (r.status === 'Approved' || r.status === 'Pending') &&
        dateStr >= r.startDate &&
        dateStr <= r.endDate
      );
    });
  };

  const selectedDayLeaves = getLeavesForDate(selectedCalendarDay);

  // Departments list for filter
  const departments: string[] = appDepartments.map((d) => d.name);

  return (
    <div className="space-y-6">
      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Staff</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{activeStaffCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">DBICA Faculty & Officers</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Requests</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingRequestsCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {currentUser.role !== 'Staff' ? (
                <button
                  onClick={() => setActiveTab('requests')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Review approvals →
                </button>
              ) : (
                'Awaiting manager review'
              )}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">On Leave Today</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{onLeaveToday.length}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {onLeaveToday.length > 0
                ? onLeaveToday.map((r) => r.staffName.split(' ')[0]).join(', ')
                : 'All present today'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Approved in {monthLabel.split(' ')[0]}</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{approvedThisMonth}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Scheduled leaves</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Overlap / Clash Warning Banner */}
      {departmentalClashes.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Operational Schedule Alert: Concurrent Department Leaves ({departmentalClashes.length})
                </h3>
                <span className="text-[11px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded font-medium">
                  Staffing Conflict Prevention
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                The system detected overlapping leaves within the same department. Review scheduling to ensure continuous lab, studio, and class supervision:
              </p>
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2">
                {departmentalClashes.map((clash, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white/80 rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {clash.department}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        <strong className="text-amber-900">{clash.staffA}</strong> ({clash.dateRangeA}) overlaps with{' '}
                        <strong className="text-amber-900">{clash.staffB}</strong> ({clash.dateRangeB})
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 shrink-0">
                      {clash.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar & Day Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar View (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          {/* Calendar Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>{monthLabel}</span>
              </h2>
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Department:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="All">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 mt-3 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div
                key={d}
                className={`text-[11px] font-semibold py-1.5 uppercase tracking-wider ${
                  i === 0 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 mt-1">
            {daysArray.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="min-h-[78px] p-1.5 rounded-xl bg-slate-50/50 border border-transparent text-slate-300 text-xs"
                  >
                    <span>{cell.dayNumber}</span>
                  </div>
                );
              }

              const leavesOnThisDay = getLeavesForDate(cell.dateStr);
              const isSelected = selectedCalendarDay === cell.dateStr;
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedCalendarDay(cell.dateStr)}
                  className={`min-h-[78px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs'
                      : isToday
                      ? 'border-blue-300 bg-blue-50/20'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]'
                          : isSelected
                          ? 'text-blue-700 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {leavesOnThisDay.length > 0 && (
                      <span className="text-[10px] font-bold px-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {leavesOnThisDay.length}
                      </span>
                    )}
                  </div>

                  {/* Micro leave pills */}
                  <div className="space-y-1 mt-1">
                    {leavesOnThisDay.slice(0, 2).map((l) => (
                      <div
                        key={l.id}
                        className={`text-[9.5px] px-1 py-0.5 rounded truncate font-medium ${
                          l.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                        title={`${l.staffName} (${l.leaveType} - ${l.status})`}
                      >
                        {l.staffName.split(' ')[0]} ({l.leaveType[0]})
                      </div>
                    ))}
                    {leavesOnThisDay.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-medium text-center">
                        +{leavesOnThisDay.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Footer Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Approved Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Pending Approval</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Today Indicator</span>
              </div>
            </div>
            <span>Click any day to inspect staffing details</span>
          </div>
        </div>

        {/* Day Inspector & Upcoming Leaves (1 Col) */}
        <div className="space-y-6">
          {/* Selected Day Inspector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
                  Selected Date Details
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatDate(selectedCalendarDay)}
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                {selectedDayLeaves.length} on leave
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {selectedDayLeaves.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-400/80 mb-2" />
                  <p className="text-xs font-medium text-slate-600">Full Staff Availability</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No approved or pending leaves on this date.
                  </p>
                </div>
              ) : (
                selectedDayLeaves.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{req.staffName}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {req.department}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          req.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>
                        Type:{' '}
                        {req.leaveType === 'Permission' ? (
                          <strong className="text-violet-700 font-bold">Permission ({req.permissionMinutes || 60}m)</strong>
                        ) : (
                          <strong>{req.leaveType} Leave</strong>
                        )}
                      </span>
                      <span>
                        {req.leaveType === 'Permission'
                          ? req.permissionStartTime || '09:30 AM'
                          : `${req.totalDays} day(s)`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 italic truncate" title={req.reason}>
                      "{req.reason}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Leaves List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Upcoming Staff Leaves
              </h3>
              <span className="text-[11px] text-slate-400">Next 14 days</span>
            </div>

            <div className="mt-3 divide-y divide-slate-100 text-xs">
              {leaveRequests.filter((r) => r.status === 'Approved' && r.startDate >= todayStr).length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No upcoming approved leaves scheduled.
                </div>
              ) : (
                leaveRequests
                  .filter((r) => r.status === 'Approved' && r.startDate >= todayStr)
                  .slice(0, 5)
                  .map((req) => (
                    <div key={req.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{req.staffName}</div>
                        <div className="text-[11px] text-slate-500">
                          {req.department} • {req.leaveType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-700 text-[11px]">
                          {formatDateRange(req.startDate, req.endDate)}
                        </div>
                        <div className="text-[10.5px] text-slate-400">{req.totalDays}d</div>
                      </div>
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
