import React, { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Plus, Search, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const getLocalDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const TimesheetView: React.FC = () => {
  const { currentUser, staffList, timesheetEntries, timesheetLoadError, addTimesheetEntry } = useApp();
  const isDirector = currentUser.role === 'Super Admin';
  const today = getLocalDate();
  const [workDate, setWorkDate] = useState(today);
  const [taskName, setTaskName] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('In Progress');
  const [workingHours, setWorkingHours] = useState('1');
  const [comments, setComments] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return timesheetEntries
      .filter((entry) => isDirector || entry.staffId === currentUser.id)
      .filter((entry) => staffFilter === 'all' || entry.staffId === staffFilter)
      .filter((entry) =>
        !normalizedSearch ||
        (entry.taskName || entry.task || '').toLowerCase().includes(normalizedSearch) ||
        (entry.comments || '').toLowerCase().includes(normalizedSearch) ||
        entry.staffName.toLowerCase().includes(normalizedSearch) ||
        entry.department.toLowerCase().includes(normalizedSearch)
      )
      .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt));
  }, [timesheetEntries, currentUser.id, isDirector, search, staffFilter]);

  const todayCount = timesheetEntries.filter((entry) =>
    (isDirector || entry.staffId === currentUser.id) && entry.workDate === today
  ).length;
  const staffCount = new Set(
    timesheetEntries
      .filter((entry) => isDirector || entry.staffId === currentUser.id)
      .map((entry) => entry.staffId)
  ).size;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await addTimesheetEntry({
        workDate,
        taskName,
        priority,
        status,
        workingHours: Number(workingHours),
        comments,
      });
      if (!result.success) {
        setError(result.error || 'Could not add this task. Please try again.');
        return;
      }
      setTaskName('');
      setComments('');
      setPriority('Medium');
      setStatus('In Progress');
      setWorkingHours('1');
      setWorkDate(getLocalDate());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isDirector ? 'Staff Timesheets' : 'My Timesheet'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isDirector
                ? 'View and filter staff task updates. Timesheets are read-only for the Director.'
                : 'Add a row for each task you worked on. You can submit tasks for any day up to today.'}
            </p>
          </div>
        </div>

        {!isDirector && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span>Task name</span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={taskName}
                  onChange={(event) => setTaskName(event.target.value)}
                  placeholder="What did you work on?"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span>Priority</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">
                  <option>Not Started</option><option>In Progress</option><option>Completed</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span>Working hours</span>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  required
                  value={workingHours}
                  onChange={(event) => setWorkingHours(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Date</span>
                <input
                  type="date"
                  required
                  value={workDate}
                  max={today}
                  onChange={(event) => setWorkDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
                <span>Comments</span>
                <input
                  type="text"
                  maxLength={2000}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Optional notes"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
                />
              </label>
            </div>
            {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !taskName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Add task'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span><strong className="text-slate-900">{visibleEntries.length}</strong> task updates shown</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <span><strong className="text-slate-900">{todayCount}</strong> added for today</span>
          </div>
          {isDirector && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">
              <Users className="h-4 w-4 text-violet-600" />
              <span><strong className="text-slate-900">{staffCount}</strong> staff contributors</span>
            </div>
          )}
        </div>
        {timesheetLoadError && (
          <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {timesheetLoadError}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="font-bold text-slate-900">Timesheet</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isDirector ? 'Visible to you as the Director.' : 'Only you and the Director can view your entries.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isDirector && (
              <select
                value={staffFilter}
                onChange={(event) => setStaffFilter(event.target.value)}
                aria-label="Filter by staff member"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All staff</option>
                {[...staffList].sort((a, b) => a.name.localeCompare(b.name)).map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            )}
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks..."
                aria-label="Search timesheet entries"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none sm:w-56"
              />
            </label>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No task updates yet</p>
            <p className="mt-1 text-xs text-slate-500">
              {search || staffFilter !== 'all'
                ? 'Try another search or staff filter.'
                : isDirector
                ? 'Staff entries will appear here when they add tasks.'
                : 'Add a task above whenever you want to record your work.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  {isDirector && <th className="border-b border-slate-200 px-4 py-3 font-semibold">Staff</th>}
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold">Task Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold">Priority</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold">Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">Working Hrs</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold">Comments</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => {
                  const priorityValue = entry.priority || '—';
                  const statusValue = entry.status || '—';
                  const statusStyle =
                    statusValue === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : statusValue === 'In Progress'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-600';
                  return (
                    <tr key={entry.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50">
                      {isDirector && (
                        <td className="whitespace-nowrap px-4 py-3 align-top">
                          <p className="font-semibold text-slate-800">{entry.staffName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{entry.department}</p>
                        </td>
                      )}
                      <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-3 align-top font-medium text-slate-800">
                        {entry.taskName || entry.task || '—'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {entry.priority ? (
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            entry.priority === 'High' ? 'bg-rose-50 text-rose-700' :
                            entry.priority === 'Low' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'
                          }`}>{priorityValue}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${statusStyle}`}>
                          {statusValue}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums text-slate-700">
                        {typeof entry.workingHours === 'number' ? entry.workingHours : '—'}
                      </td>
                      <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-3 align-top text-slate-600">
                        {entry.comments || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-slate-700">
                        {formatDate(entry.workDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
