import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ClipboardList, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TimesheetEntry } from '../types';
import { formatDate, getTodayDateString } from '../utils/dateUtils';

type TaskDraft = {
  workDate: string;
  taskName: string;
  workingHours: string;
  comments: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Not Started' | 'In Progress' | 'Completed';
};

const emptyDraft = (): TaskDraft => ({
  workDate: getTodayDateString(),
  taskName: '',
  workingHours: '',
  comments: '',
  priority: 'Medium',
  status: 'In Progress',
});

export const TimesheetView: React.FC<{mode: 'staff' | 'mine'}> = ({mode}) => {
  const {
    currentUser,
    staffList,
    timesheetEntries,
    timesheetLoading,
    timesheetLoadError,
    addTimesheetEntry,
    updateTimesheetEntry,
    deleteTimesheetEntry,
  } = useApp();

  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isStaffTimesheetView = mode === 'staff';
  const canViewAllStaff = isStaffTimesheetView && (isSuperAdmin || currentUser.role === 'HR');
  const showStaffColumn = isStaffTimesheetView;
  const isManager = currentUser.role === 'Manager';
  const canEdit = mode === 'mine' && !isSuperAdmin;
  const now = new Date();
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [newTask, setNewTask] = useState<TaskDraft | null>(null);
  const [drafts, setDrafts] = useState<Record<string, TaskDraft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoadErrorDismissed, setIsLoadErrorDismissed] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const newTaskRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!timesheetLoadError) setIsLoadErrorDismissed(false);
  }, [timesheetLoadError]);

  useEffect(() => {
    if (newTask) {
      taskInputRef.current?.focus();
      newTaskRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [newTask !== null]);

  const visibleEntries = useMemo(() => timesheetEntries
    .filter((entry) => {
      if (mode === 'mine' && entry.staffId !== currentUser.id) return false;
      if (isStaffTimesheetView && currentUser.role === 'Staff') return false;
      if (currentUser.role === 'Staff' && entry.staffId !== currentUser.id) return false;
      if (isManager && entry.department !== currentUser.department && entry.staffId !== currentUser.id) return false;
      if (isStaffTimesheetView && selectedStaffId !== 'all' && entry.staffId !== selectedStaffId) return false;
      if (startDate && entry.workDate < startDate) return false;
      if (endDate && entry.workDate > endDate) return false;
      return true;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  [timesheetEntries, mode, currentUser.id, currentUser.role, currentUser.department, isManager, isStaffTimesheetView, canViewAllStaff, selectedStaffId, startDate, endDate]);

  const updateDraft = (entry: TimesheetEntry, changes: Partial<TaskDraft>) => {
    setDrafts((current) => ({
      ...current,
      [entry.id]: {
        workDate: current[entry.id]?.workDate ?? entry.workDate,
        taskName: current[entry.id]?.taskName ?? entry.taskName ?? entry.task ?? '',
        workingHours: current[entry.id]?.workingHours ?? String(entry.workingHours ?? ''),
        comments: current[entry.id]?.comments ?? entry.comments ?? '',
        priority: current[entry.id]?.priority ?? entry.priority ?? 'Medium',
        status: current[entry.id]?.status ?? entry.status ?? 'In Progress',
        ...changes,
      },
    }));
  };

  const getDraft = (entry: TimesheetEntry): TaskDraft => drafts[entry.id] ?? {
    workDate: entry.workDate,
    taskName: entry.taskName ?? entry.task ?? '',
    workingHours: String(entry.workingHours ?? ''),
    comments: entry.comments ?? '',
    priority: entry.priority ?? 'Medium',
    status: entry.status ?? 'In Progress',
  };

  const saveNewTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTask) return;
    setBusyId('new');
    setError('');
    try {
      const result = await addTimesheetEntry({
        workDate: newTask.workDate,
        taskName: newTask.taskName,
        workingHours: Number(newTask.workingHours),
        comments: newTask.comments,
        priority: newTask.priority,
        status: newTask.status,
      });
      if (!result.success) {
        setError(result.error || 'Could not save this task.');
        return;
      }
      setNewTask(null);
    } finally {
      setBusyId(null);
    }
  };

  const saveEditedTask = async (entry: TimesheetEntry) => {
    const draft = getDraft(entry);
    setBusyId(entry.id);
    setError('');
    try {
      const result = await updateTimesheetEntry(entry.id, {
        workDate: draft.workDate,
        taskName: draft.taskName,
        workingHours: Number(draft.workingHours),
        comments: draft.comments,
        priority: draft.priority,
        status: draft.status,
      });
      if (!result.success) {
        setError(result.error || 'Could not update this task.');
        return;
      }
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
    } finally {
      setBusyId(null);
    }
  };

  const removeTask = async (entryId: string) => {
    if (!window.confirm('Delete this timesheet task?')) return;
    setBusyId(entryId);
    setError('');
    try {
      const result = await deleteTimesheetEntry(entryId);
      if (!result.success) setError(result.error || 'Could not delete this task.');
      else {
        setDrafts((current) => {
          const next = { ...current };
          delete next[entryId];
          return next;
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const renderDraftFields = (
    draft: TaskDraft,
    onChange: (changes: Partial<TaskDraft>) => void,
    isNewTask = false,
  ) => (
    <>
      <td className="min-w-36 border-b border-r border-slate-100 p-2">
        <input aria-label="Work date" type="date" max={getTodayDateString()} value={draft.workDate}
          onChange={(event) => onChange({ workDate: event.target.value })}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white" />
      </td>
      <td className="min-w-56 border-b border-r border-slate-100 p-2">
        <input ref={isNewTask ? taskInputRef : undefined} aria-label="Task" type="text" maxLength={200} value={draft.taskName}
          onChange={(event) => onChange({ taskName: event.target.value })}
          placeholder="Write a task..."
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white" />
      </td>
      <td className="w-28 border-b border-r border-slate-100 p-2">
        <input aria-label="Hours" type="number" min="0.25" max="24" step="0.25" value={draft.workingHours}
          onChange={(event) => onChange({ workingHours: event.target.value })}
          placeholder="0"
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white" />
      </td>
      <td className="min-w-32 border-b border-r border-slate-100 p-2">
        <select aria-label="Priority" value={draft.priority}
          onChange={(event) => onChange({ priority: event.target.value as TaskDraft['priority'] })}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white">
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </td>
      <td className="min-w-36 border-b border-r border-slate-100 p-2">
        <select aria-label="Status" value={draft.status}
          onChange={(event) => onChange({ status: event.target.value as TaskDraft['status'] })}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white">
          <option value="Not Started">Not started</option>
          <option value="In Progress">In progress</option>
          <option value="Completed">Completed</option>
        </select>
      </td>
      <td className="min-w-52 border-b border-r border-slate-100 p-2">
        <input aria-label="Notes" type="text" maxLength={2000} value={draft.comments}
          onChange={(event) => onChange({ comments: event.target.value })}
          placeholder="Add a note..."
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-600 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white" />
      </td>
    </>
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardList className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Timesheet</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isStaffTimesheetView
              ? isManager
                ? `View staff tasks for ${currentUser.department}.`
                : 'View staff tasks for a selected period.'
              : 'Add and update your work directly in the table.'}
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={() => { setNewTask(emptyDraft()); setError(''); }}
            disabled={Boolean(newTask)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow disabled:opacity-50">
            <Plus className="h-4 w-4" /> New task
          </button>
        )}
      </header>

      {isStaffTimesheetView && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          {(canViewAllStaff || isManager) && (
            <label className="flex min-w-52 flex-col gap-1 text-xs font-medium text-slate-600">
              Staff member
              <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800">
                <option value="all">All staff</option>
                {[...staffList]
                  .filter((staff) => isSuperAdmin || currentUser.role === 'HR' || staff.department === currentUser.department)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            From
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            To
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800" />
          </label>
        </div>
      )}

      {timesheetLoadError && !isLoadErrorDismissed && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{timesheetLoadError}</span>
          <button type="button" onClick={() => setIsLoadErrorDismissed(true)}
            className="shrink-0 rounded p-0.5 text-rose-600 hover:bg-rose-100" aria-label="Dismiss timesheet loading error" title="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}
            className="shrink-0 rounded p-0.5 text-rose-600 hover:bg-rose-100" aria-label="Dismiss timesheet action error" title="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[calc(100vh-18rem)] min-h-56 overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {showStaffColumn && <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-4 py-3">Staff</th>}
                <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-3"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Date</span></th>
                <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">Task</th>
                <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">Hours</th>
                <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">Priority</th>
                <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">Status</th>
                <th className="sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">Notes</th>
                {canEdit && <th className="sticky top-0 z-10 w-24 border-b border-slate-200 bg-slate-50 px-2 py-3" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => {
                const draft = getDraft(entry);
                const isDirty = Boolean(drafts[entry.id]);
                return (
                  <tr key={entry.id} className="group transition-colors hover:bg-slate-50/70">
                    {showStaffColumn && <td className="whitespace-nowrap border-b border-r border-slate-100 px-4 py-2.5 text-sm text-slate-700">{entry.staffName}</td>}
                    {canEdit
                      ? renderDraftFields(draft, (changes) => updateDraft(entry, changes))
                      : <>
                          <td className="whitespace-nowrap border-b border-r border-slate-100 px-3 py-2.5 text-sm text-slate-600">{formatDate(entry.workDate)}</td>
                          <td className="border-b border-r border-slate-100 px-3 py-2.5 text-sm font-medium text-slate-800">{entry.taskName || entry.task || '—'}</td>
                          <td className="border-b border-r border-slate-100 px-3 py-2.5 text-sm text-slate-600">{entry.workingHours ?? '—'}</td>
                          <td className="border-b border-r border-slate-100 px-3 py-2.5 text-sm">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.priority === 'High' ? 'bg-rose-50 text-rose-700' : entry.priority === 'Low' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{entry.priority || 'Medium'}</span>
                          </td>
                          <td className="border-b border-r border-slate-100 px-3 py-2.5 text-sm">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : entry.status === 'Not Started' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{entry.status || 'In Progress'}</span>
                          </td>
                          <td className="border-b border-r border-slate-100 px-3 py-2.5 text-sm text-slate-500">{entry.comments || '—'}</td>
                        </>
                    }
                    {canEdit && (
                      <td className="border-b border-slate-100 px-2 py-2">
                        <div className="flex items-center gap-1">
                          {isDirty && (
                            <>
                              <button type="button" onClick={() => saveEditedTask(entry)} disabled={busyId === entry.id}
                                className="rounded-md p-1.5 text-blue-700 hover:bg-blue-100 disabled:opacity-50" title="Save changes" aria-label="Save changes">
                                <Check className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setDrafts((current) => {
                                const next = { ...current };
                                delete next[entry.id];
                                return next;
                              })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Discard changes" aria-label="Discard changes">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button type="button" onClick={() => removeTask(entry.id)} disabled={busyId === entry.id}
                            className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                            title="Delete task" aria-label="Delete task">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {newTask && (
                <tr ref={newTaskRowRef} className="bg-blue-50/70 ring-1 ring-inset ring-blue-100">
                  {showStaffColumn && <td className="border-b border-r border-slate-100 px-4 py-2.5 text-sm text-slate-500">{currentUser.name}</td>}
                  {renderDraftFields(newTask, (changes) => setNewTask((current) => current ? { ...current, ...changes } : current), true)}
                  <td className="border-b border-slate-100 p-2">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={saveNewTask} disabled={busyId === 'new'}
                        className="rounded-md p-1.5 text-blue-700 hover:bg-blue-100 disabled:opacity-50" title="Save task" aria-label="Save task">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => { setNewTask(null); setError(''); }}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Cancel" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {visibleEntries.length === 0 && !newTask && (
                <tr>
                  <td colSpan={6 + (showStaffColumn ? 1 : 0) + (canEdit ? 1 : 0)} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      {timesheetLoading ? 'Loading timesheets...' : timesheetLoadError ? 'Timesheet data is unavailable' : 'No tasks in this period'}
                    </p>
                    {!timesheetLoading && !timesheetLoadError && (
                      <p className="mt-1 text-sm text-slate-500">{canEdit ? 'Create a task to start your timesheet.' : 'Try a different staff member or date range.'}</p>
                    )}
                    {timesheetLoadError && (
                      <p className="mt-1 text-sm text-slate-500">This is a loading issue, not an indication that you have no tasks.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <button type="button" onClick={() => { setNewTask(emptyDraft()); setError(''); }} disabled={Boolean(newTask)}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add a task
          </button>
        )}
      </div>
    </section>
  );
};
