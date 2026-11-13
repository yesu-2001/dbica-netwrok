import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { DailyAttendance, AttendanceStatus, MonthlyAttendanceSummary } from '../types';
import { firestoreService } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../utils/dateUtils';

const statusStyles: Record<AttendanceStatus, { label: string; color: string; marker: string }> = {
  Present: {
    label: 'Present',
    color: 'bg-emerald-100 text-emerald-800',
    marker: 'bg-emerald-500',
  },
  Late: {
    label: 'Late',
    color: 'bg-amber-100 text-amber-800',
    marker: 'bg-amber-500',
  },
  Absent: {
    label: 'Absent',
    color: 'bg-rose-100 text-rose-800',
    marker: 'bg-rose-500',
  },
  Holiday: {
    label: 'Holiday',
    color: 'bg-slate-100 text-slate-600',
    marker: 'bg-slate-400',
  },
  'On Leave': {
    label: 'On Leave',
    color: 'bg-blue-100 text-blue-800',
    marker: 'bg-blue-500',
  },
  Pending: {
    label: 'Awaiting punch',
    color: 'bg-slate-100 text-slate-600',
    marker: 'bg-slate-300',
  },
};

export const MyAttendanceView: React.FC = () => {
  const { currentUser } = useApp();
  const [dailyRecords, setDailyRecords] = useState<DailyAttendance[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyAttendanceSummary[]>([]);
  const [isDailyLoading, setIsDailyLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  useEffect(() => {
    setDailyRecords([]);
    setMonthlySummaries([]);
    setIsDailyLoading(true);
    setIsSummaryLoading(true);
    setLoadError(null);

    const unsubscribeDaily = firestoreService.subscribeDailyAttendance(
      currentUser.id,
      (records) => {
        setDailyRecords(records);
        setIsDailyLoading(false);
      },
      () => {
        setLoadError('Daily attendance could not be loaded. Check your connection and account access.');
        setIsDailyLoading(false);
      }
    );
    const unsubscribeSummary = firestoreService.subscribeMonthlyAttendanceSummary(
      currentUser.id,
      (summaries) => {
        setMonthlySummaries(summaries);
        setIsSummaryLoading(false);
      },
      () => {
        setLoadError('Attendance summary could not be loaded. Check your connection and account access.');
        setIsSummaryLoading(false);
      }
    );

    return () => {
      unsubscribeDaily();
      unsubscribeSummary();
    };
  }, [currentUser.id]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = selectedMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const monthRecords = useMemo(
    () => dailyRecords.filter((record) => record.month === monthKey),
    [dailyRecords, monthKey]
  );
  const monthSummary = monthlySummaries.find((summary) => summary.month === monthKey);
  const recordsByDate = useMemo(
    () => new Map(monthRecords.map((record) => [record.date, record])),
    [monthRecords]
  );
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const calendarDays = useMemo(
    () => [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }),
    ],
    [daysInMonth, firstWeekday, month, year]
  );
  const selectedRecord = recordsByDate.get(selectedDate);
  const isLoading = isDailyLoading || isSummaryLoading;

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(year, month + offset, 1);
    setSelectedMonth(nextMonth);
    setSelectedDate(getTodayDateString(nextMonth));
  };

  const metrics = monthSummary
    ? [
        { label: 'Present', value: monthSummary.presentDays, style: 'text-emerald-700' },
        { label: 'Absent', value: monthSummary.absentDays, style: 'text-rose-700' },
        { label: 'Late', value: monthSummary.lateDays, style: 'text-amber-700' },
        { label: 'Attendance rate', value: `${monthSummary.attendanceRate.toFixed(1)}%`, style: 'text-blue-700' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Attendance records and summaries synced from the biometric system.
          </p>
        </div>
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
      </header>

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {!currentUser.attendanceEmployeeId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your profile is not linked to a ZKTeco employee ID yet. Please ask HR to add it to your staff profile.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading attendance…
        </div>
      ) : (
        <>
          {monthSummary ? (
            <section aria-label="Monthly attendance summary">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</div>
                    <div className={`mt-2 text-2xl font-bold ${metric.style}`}>{metric.value}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {metric.label === 'Attendance rate'
                        ? `${monthSummary.presentDays} of ${monthSummary.attendanceDays} attendance days`
                        : `Out of ${monthSummary.totalWorkingDays} working days`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <span>Approved leave: <strong className="text-slate-900">{monthSummary.leaveDays} days</strong></span>
                <span>Total worked: <strong className="text-slate-900">{monthSummary.totalWorkedHours} hours</strong></span>
                <span>Overtime: <strong className="text-slate-900">{monthSummary.totalOverworkFormatted}</strong></span>
              </div>
            </section>
          ) : currentUser.attendanceEmployeeId ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              No backend summary is available for this month yet. Confirm the bridge is running and that its
              <code className="mx-1 rounded bg-slate-100 px-1">FIRESTORE_DATABASE_ID</code>
              matches the portal&apos;s
              <code className="mx-1 rounded bg-slate-100 px-1">VITE_FIREBASE_DATABASE_ID</code>
              (or both use the default database), then allow a sync cycle to complete.
            </div>
          ) : null}

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-2 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarCheck2 className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-slate-900">Attendance calendar</h2>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 text-[11px] font-semibold uppercase text-slate-400">{day}</div>
                ))}
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`blank-${index}`} />;
                  const record = recordsByDate.get(date);
                  const isSelected = selectedDate === date;
                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      title={record ? `${date}: ${statusStyles[record.status].label}` : `${date}: No record`}
                      aria-label={record ? `${date}, ${statusStyles[record.status].label}` : `${date}, no attendance record`}
                      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600'
                          : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{Number(date.slice(-2))}</span>
                      {record && (
                        <span className={`h-2 w-2 rounded-full ${statusStyles[record.status].marker}`} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                {(Object.keys(statusStyles) as AttendanceStatus[]).map((status) => (
                  <span key={status} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusStyles[status].marker}`} />
                    {statusStyles[status].label}
                  </span>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="font-bold text-slate-900">
                {selectedDate}
              </h2>
              {selectedRecord ? (
                <>
                  <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selectedRecord.status].color}`}>
                    {statusStyles[selectedRecord.status].label}
                  </span>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-slate-500"><Clock3 className="h-4 w-4" />Clock in</span>
                      <strong className="text-slate-900">{selectedRecord.clockIn}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-slate-500"><Clock3 className="h-4 w-4" />Clock out</span>
                      <strong className="text-slate-900">{selectedRecord.clockOut}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className="text-slate-500">Worked</span>
                      <strong className="text-slate-900">{selectedRecord.workedFormatted}</strong>
                    </div>
                    {selectedRecord.punches.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Punches</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedRecord.punches.map((punch, index) => (
                            <span key={`${punch}-${index}`} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {punch}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  No attendance record was provided by the backend for this date.
                </p>
              )}
            </aside>
          </section>
        </>
      )}
    </div>
  );
};
