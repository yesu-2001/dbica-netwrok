import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailyAttendance, AttendanceStatus, MonthlyAttendanceSummary } from '../types';
import { firestoreService } from '../services/firestoreService';

const statusStyles: Record<AttendanceStatus, string> = {
  Present: 'bg-emerald-100 text-emerald-800',
  Late: 'bg-amber-100 text-amber-800',
  Absent: 'bg-rose-100 text-rose-800',
  Holiday: 'bg-slate-100 text-slate-600',
  'On Leave': 'bg-blue-100 text-blue-800',
  Pending: 'bg-slate-100 text-slate-600',
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getWeekdayLabel = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { weekday: 'long' });
};

type AdminAttendancePeriod = 'today' | 'week' | 'month' | 'custom';

export const AttendanceReportView: React.FC = () => {
  const { currentUser, staffList } = useApp();
  const isManager = currentUser.role === 'Manager';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const [summaries, setSummaries] = useState<MonthlyAttendanceSummary[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyAttendance[]>([]);
  const [rangeDailyRecords, setRangeDailyRecords] = useState<DailyAttendance[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const [adminPeriod, setAdminPeriod] = useState<AdminAttendancePeriod>('today');
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() => toDateInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    setSummaries([]);
    if (isSuperAdmin) {
      setIsSummaryLoading(false);
      setSummaryError(null);
      return;
    }

    setIsSummaryLoading(true);
    setSummaryError(null);
    const unsubscribe = firestoreService.subscribeAttendanceReportSummaries(
      (data) => {
        setSummaries(data);
        setIsSummaryLoading(false);
      },
      () => {
        setSummaryError('Attendance summaries could not be loaded. Check your connection and account permissions.');
        setIsSummaryLoading(false);
      },
      isManager ? currentUser.department : undefined
    );
    return unsubscribe;
  }, [currentUser.department, isManager, isSuperAdmin]);

  useEffect(() => {
    setDailyRecords([]);
    setDailyError(null);
    if (isSuperAdmin || selectedStaffId === 'all') {
      setIsDailyLoading(false);
      return;
    }

    setIsDailyLoading(true);
    const unsubscribe = firestoreService.subscribeAttendanceReportDaily(
      selectedStaffId,
      (records) => {
        setDailyRecords(records);
        setIsDailyLoading(false);
      },
      () => {
        setDailyError('Daily attendance could not be loaded for this staff member.');
        setIsDailyLoading(false);
      },
      isManager ? currentUser.department : undefined
    );
    return unsubscribe;
  }, [currentUser.department, isManager, isSuperAdmin, selectedStaffId]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = selectedMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const reportableStaff = useMemo(
    () => staffList.filter(
      (staff) =>
        Boolean(staff.attendanceEmployeeId) &&
        staff.role !== 'Super Admin' &&
        staff.id !== 'dbica-001' &&
        staff.email.trim().toLowerCase() !== 'director@dbica.org' &&
        staff.userId?.trim().toLowerCase() !== 'director@dbica.org' &&
        (!isManager || staff.department === currentUser.department)
    ),
    [currentUser.department, isManager, staffList]
  );
  const reportableStaffIds = useMemo(
    () => new Set(reportableStaff.map((staff) => staff.id)),
    [reportableStaff]
  );

  const { startDate: rangeStartDate, endDate: rangeEndDate } = useMemo(() => {
    const now = new Date();
    const today = toDateInputValue(now);

    if (adminPeriod === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    if (adminPeriod === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { startDate: toDateInputValue(weekStart), endDate: today };
    }
    if (adminPeriod === 'month') {
      return { startDate: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: today };
    }
    return { startDate: today, endDate: today };
  }, [adminPeriod, customEndDate, customStartDate]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setRangeDailyRecords([]);
      setIsRangeLoading(false);
      return;
    }

    if (!rangeStartDate || !rangeEndDate || rangeStartDate > rangeEndDate) {
      setRangeDailyRecords([]);
      setRangeError('Choose a valid date range with the start on or before the end.');
      setIsRangeLoading(false);
      return;
    }

    setRangeDailyRecords([]);
    setRangeError(null);
    setIsRangeLoading(true);
    const unsubscribe = firestoreService.subscribeAttendanceRange(
      rangeStartDate,
      rangeEndDate,
      (records) => {
        setRangeDailyRecords(records);
        setIsRangeLoading(false);
      },
      () => {
        setRangeError('Attendance records could not be loaded for this date range.');
        setIsRangeLoading(false);
      }
    );
    return unsubscribe;
  }, [isSuperAdmin, rangeEndDate, rangeStartDate]);

  const monthSummaries = summaries.filter(
    (summary) =>
      summary.month === monthKey &&
      reportableStaffIds.has(summary.staffId) &&
      (selectedStaffId === 'all' || summary.staffId === selectedStaffId)
  );
  const selectedDailyRecords = dailyRecords
    .filter((record) => record.month === monthKey && record.staffId === selectedStaffId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedStaff = reportableStaff.find((staff) => staff.id === selectedStaffId);
  const isOrganizationWide = currentUser.role === 'Super Admin' || currentUser.role === 'HR';
  const filteredRangeRecords = rangeDailyRecords
    .filter((record) =>
      reportableStaffIds.has(record.staffId) &&
      (selectedStaffId === 'all' || record.staffId === selectedStaffId)
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
  const allStaffColumns = reportableStaff
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const rangeDates = Array.from(new Set(filteredRangeRecords.map((record) => record.date))).sort();
  const attendanceByDateAndStaff = new Map<string, Map<string, DailyAttendance>>();
  for (const record of filteredRangeRecords) {
    let recordsForDate = attendanceByDateAndStaff.get(record.date);
    if (!recordsForDate) {
      recordsForDate = new Map<string, DailyAttendance>();
      attendanceByDateAndStaff.set(record.date, recordsForDate);
    }
    recordsForDate.set(record.staffId, record);
  }

  useEffect(() => {
    if (selectedStaffId !== 'all' && !reportableStaffIds.has(selectedStaffId)) {
      setSelectedStaffId('all');
    }
  }, [reportableStaffIds, selectedStaffId]);

  const moveMonth = (offset: number) => {
    setSelectedMonth(new Date(year, month + offset, 1));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isManager ? 'Department Attendance' : 'Staff Attendance Report'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSuperAdmin
              ? 'View attendance by day, week, month, or staff member.'
              : isManager
              ? `Attendance summaries for ${currentUser.department}.`
              : 'Attendance summaries across all departments.'}
            {' '}Calculations are generated by the attendance sync service.
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-32 text-center text-sm font-semibold text-slate-800">{monthLabel}</span>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {isSuperAdmin && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3">
            <CalendarDays className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <h2 className="font-semibold text-slate-900">
                {selectedStaff ? `${selectedStaff.name} attendance details` : 'Staff attendance'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {rangeStartDate} to {rangeEndDate}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/60 p-4">
            <label htmlFor="admin-attendance-period" className="grid gap-1 text-xs font-medium text-slate-600">
              Period
              <select
                id="admin-attendance-period"
                value={adminPeriod}
                onChange={(event) => setAdminPeriod(event.target.value as AdminAttendancePeriod)}
                className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="custom">Custom range</option>
              </select>
            </label>
            <label htmlFor="admin-attendance-staff" className="grid gap-1 text-xs font-medium text-slate-600">
              Staff member
              <select
                id="admin-attendance-staff"
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value)}
                className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">All staff</option>
                {reportableStaff
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
              </select>
            </label>
            {adminPeriod === 'custom' && (
              <>
                <label htmlFor="admin-attendance-start" className="grid gap-1 text-xs font-medium text-slate-600">
                  From
                  <input
                    id="admin-attendance-start"
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                </label>
                <label htmlFor="admin-attendance-end" className="grid gap-1 text-xs font-medium text-slate-600">
                  To
                  <input
                    id="admin-attendance-end"
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </>
            )}
          </div>
          {rangeError && (
            <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {rangeError}
            </div>
          )}
          {isRangeLoading ? (
            <p className="p-6 text-center text-sm text-slate-500">Loading daily attendance…</p>
          ) : filteredRangeRecords.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              No attendance records are available for the selected period and staff member.
            </p>
          ) : selectedStaffId === 'all' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 w-32 min-w-32 border border-slate-300 bg-slate-50 px-4 py-3"
                    >
                      Date
                    </th>
                    <th
                      rowSpan={2}
                      className="sticky left-32 z-20 w-32 min-w-32 border border-slate-300 bg-slate-50 px-4 py-3"
                    >
                      Day
                    </th>
                    {allStaffColumns.map((staff) => (
                      <th key={staff.id} colSpan={2} className="border border-slate-300 px-4 py-3 text-center">
                        {staff.name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {allStaffColumns.flatMap((staff) => [
                      <th key={`${staff.id}-clock-in`} className="border border-slate-300 px-4 py-2 text-center">Clock in</th>,
                      <th key={`${staff.id}-clock-out`} className="border border-slate-300 px-4 py-2 text-center">Clock out</th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {rangeDates.map((date) => (
                    <tr key={date} className="group hover:bg-slate-50/70">
                      <td className="sticky left-0 z-10 w-32 min-w-32 border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 group-hover:bg-slate-50/70">
                        {date}
                      </td>
                      <td className="sticky left-32 z-10 w-32 min-w-32 border border-slate-200 bg-white px-4 py-3 text-slate-600 group-hover:bg-slate-50/70">
                        {getWeekdayLabel(date)}
                      </td>
                      {allStaffColumns.map((staff) => {
                        const record = attendanceByDateAndStaff.get(date)?.get(staff.id);
                        return (
                          <React.Fragment key={staff.id}>
                            <td className="whitespace-nowrap border border-slate-200 px-4 py-3 text-center text-slate-700">
                              {record?.clockIn && record.clockIn !== '--' ? record.clockIn : '—'}
                            </td>
                            <td className="whitespace-nowrap border border-slate-200 px-4 py-3 text-center text-slate-700">
                              {record?.clockOut && record.clockOut !== '--' ? record.clockOut : '—'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Clock in</th>
                    <th className="px-4 py-3">Clock out</th>
                    <th className="px-4 py-3 text-right">Worked</th>
                    <th className="px-4 py-3 text-right">Overtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRangeRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-800">{record.date}</td>
                      <td className="px-4 py-3 text-slate-600">{getWeekdayLabel(record.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{record.department || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status]}`}>
                          {record.status === 'Pending' ? 'Awaiting punch' : record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.clockIn}</td>
                      <td className="px-4 py-3 text-slate-600">{record.clockOut}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{record.workedFormatted}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{record.overworkFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!isSuperAdmin && (
        <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <label htmlFor="attendance-staff-filter" className="text-sm font-medium text-slate-600">
          Staff member
        </label>
        <select
          id="attendance-staff-filter"
          value={selectedStaffId}
          onChange={(event) => setSelectedStaffId(event.target.value)}
          className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All {isManager ? 'department' : 'staff'}</option>
          {reportableStaff
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
        </select>
        {isManager && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            {currentUser.department}
          </span>
        )}
      </div>

      {summaryError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {summaryError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Monthly summaries</h2>
        </div>
        {isSummaryLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading attendance summaries…</p>
        ) : monthSummaries.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            No mapped staff attendance summaries are available for {monthLabel}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Staff member</th>
                  {isOrganizationWide && <th className="px-4 py-3">Department</th>}
                  <th className="px-4 py-3 text-right">Present</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3 text-right">Late</th>
                  <th className="px-4 py-3 text-right">Leave</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Worked</th>
                  <th className="px-4 py-3 text-right">Overtime</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthSummaries
                  .slice()
                  .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
                  .map((summary) => (
                    <tr key={summary.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{summary.employeeName}</div>
                        <div className="text-xs text-slate-500">ZKTeco ID: {summary.employeeId}</div>
                      </td>
                      {isOrganizationWide && <td className="px-4 py-3 text-slate-600">{summary.department || '—'}</td>}
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{summary.presentDays}</td>
                      <td className="px-4 py-3 text-right font-medium text-rose-700">{summary.absentDays}</td>
                      <td className="px-4 py-3 text-right font-medium text-amber-700">{summary.lateDays}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{summary.leaveDays}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">{summary.attendanceRate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-slate-700">{summary.totalWorkedHours} h</td>
                      <td className="px-4 py-3 text-right text-slate-700">{summary.totalOverworkFormatted}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStaffId(summary.staffId)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          View days
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedStaff && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">{selectedStaff.name} — Daily attendance</h2>
            <p className="mt-0.5 text-xs text-slate-500">{monthLabel}</p>
          </div>
          {dailyError && (
            <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {dailyError}
            </div>
          )}
          {isDailyLoading ? (
            <p className="p-6 text-center text-sm text-slate-500">Loading daily attendance…</p>
          ) : selectedDailyRecords.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No daily attendance records are available for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Clock in</th>
                    <th className="px-4 py-3">Clock out</th>
                    <th className="px-4 py-3 text-right">Worked</th>
                    <th className="px-4 py-3 text-right">Overtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDailyRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{record.date}</td>
                      <td className="px-4 py-3 text-slate-600">{getWeekdayLabel(record.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status]}`}>
                          {record.status === 'Pending' ? 'Awaiting punch' : record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.clockIn}</td>
                      <td className="px-4 py-3 text-slate-600">{record.clockOut}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{record.workedFormatted}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{record.overworkFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
        </>
      )}
    </div>
  );
};
