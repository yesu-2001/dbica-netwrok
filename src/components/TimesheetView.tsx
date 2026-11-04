import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Check,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TimesheetEntry, LeaveType } from '../types';
import { formatDate, getTodayDateString } from '../utils/dateUtils';

// Preset date ranges helper
type DatePreset = 'this-month' | 'last-month' | 'this-week' | 'last-7-days' | 'last-30-days' | 'all-time' | 'custom';
type ViewMode = 'by-date' | 'by-staff' | 'table';

export const TimesheetView: React.FC = () => {
  const {
    currentUser,
    staffList,
    timesheetEntries,
    timesheetLoadError,
    addTimesheetEntry,
    deleteTimesheetEntry,
    leaveRequests,
    departments,
  } = useApp();

  const isDirector = currentUser.role === 'Super Admin' || currentUser.role === 'HR';
  const isManager = currentUser.role === 'Manager';
  const canOversee = isDirector || isManager;

  const todayStr = getTodayDateString();
  const currentDate = new Date();

  // Month & Year state
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed: 0 = Jan, 10 = Nov

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('this-month');
  const [startDate, setStartDate] = useState<string>(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  // User / Staff Filter state
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Status & Priority & Search filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('by-date');
  const [isLogTaskOpen, setIsLogTaskOpen] = useState<boolean>(!isDirector);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Form state for logging a task
  const [formWorkDate, setFormWorkDate] = useState<string>(todayStr);
  const [formTaskName, setFormTaskName] = useState<string>('');
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formStatus, setFormStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('In Progress');
  const [formWorkingHours, setFormWorkingHours] = useState<string>('2');
  const [formComments, setFormComments] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sample data toggle for demonstration/testing if real timesheet collection has few entries
  const [showSampleData, setShowSampleData] = useState<boolean>(false);

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Quick preset handler
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'this-month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      setSelectedYear(y);
      setSelectedMonth(m);
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last-month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevDate.getFullYear();
      const m = prevDate.getMonth();
      setSelectedYear(y);
      setSelectedMonth(m);
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this-week') {
      const curr = new Date(now);
      const day = curr.getDay(); // 0 is Sunday
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(curr.setDate(diff));
      const sunday = new Date(curr.setDate(diff + 6));
      setStartDate(getTodayDateString(monday));
      setEndDate(getTodayDateString(sunday));
    } else if (preset === 'last-7-days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setStartDate(getTodayDateString(past));
      setEndDate(getTodayDateString(now));
    } else if (preset === 'last-30-days') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setStartDate(getTodayDateString(past));
      setEndDate(getTodayDateString(now));
    } else if (preset === 'all-time') {
      setStartDate('2024-01-01');
      setEndDate('2028-12-31');
    }
  };

  // Month navigation (Previous / Next)
  const handlePrevMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    setDatePreset('custom');
    const start = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(newYear, newMonth + 1, 0).getDate();
    const end = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(start);
    setEndDate(end);
  };

  const handleNextMonth = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    setDatePreset('custom');
    const start = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(newYear, newMonth + 1, 0).getDate();
    const end = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(start);
    setEndDate(end);
  };

  const handleMonthDropdownChange = (mIndex: number) => {
    setSelectedMonth(mIndex);
    setDatePreset('custom');
    const start = `${selectedYear}-${String(mIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, mIndex + 1, 0).getDate();
    const end = `${selectedYear}-${String(mIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(start);
    setEndDate(end);
  };

  const handleYearDropdownChange = (year: number) => {
    setSelectedYear(year);
    setDatePreset('custom');
    const start = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, selectedMonth + 1, 0).getDate();
    const end = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setStartDate(start);
    setEndDate(end);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedStaffId('all');
    setSelectedDepartment('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
    handleSelectPreset('this-month');
  };

  // Generate realistic sample records if requested
  const sampleEntries: TimesheetEntry[] = useMemo(() => {
    if (!showSampleData) return [];
    const baseStaff = staffList.length > 0 ? staffList : [currentUser];
    const s1 = baseStaff[0] || currentUser;
    const s2 = baseStaff[1] || baseStaff[0] || currentUser;
    const s3 = baseStaff[2] || baseStaff[0] || currentUser;

    const currY = selectedYear;
    const currM = String(selectedMonth + 1).padStart(2, '0');

    return [
      {
        id: 'sample-1',
        staffId: s1.id,
        staffName: s1.name,
        staffEmail: s1.email,
        department: s1.department || 'Administration',
        workDate: `${currY}-${currM}-02`,
        taskName: 'Review and approve annual syllabus curriculum outline',
        priority: 'High',
        status: 'Completed',
        workingHours: 4.5,
        comments: 'Coordinated with department heads for lab requirement verification.',
        createdAt: `${currY}-${currM}-02T10:00:00.000Z`,
      },
      {
        id: 'sample-2',
        staffId: s1.id,
        staffName: s1.name,
        staffEmail: s1.email,
        department: s1.department || 'Administration',
        workDate: `${currY}-${currM}-02`,
        taskName: 'Institutional faculty council coordination meeting',
        priority: 'Medium',
        status: 'Completed',
        workingHours: 2.5,
        comments: 'Quarterly review of academic timeline and exam schedules.',
        createdAt: `${currY}-${currM}-02T14:30:00.000Z`,
      },
      {
        id: 'sample-3',
        staffId: s2.id,
        staffName: s2.name,
        staffEmail: s2.email,
        department: s2.department || 'Media Production',
        workDate: `${currY}-${currM}-03`,
        taskName: 'Studio soundstage acoustic calibration & lighting setup',
        priority: 'High',
        status: 'Completed',
        workingHours: 6.0,
        comments: 'Prepared main broadcast studio for student documentary production.',
        createdAt: `${currY}-${currM}-03T09:15:00.000Z`,
      },
      {
        id: 'sample-4',
        staffId: s2.id,
        staffName: s2.name,
        staffEmail: s2.email,
        department: s2.department || 'Media Production',
        workDate: `${currY}-${currM}-04`,
        taskName: 'Multi-camera switcher system software upgrade',
        priority: 'Medium',
        status: 'In Progress',
        workingHours: 3.5,
        comments: 'Updated firmware on Blackmagic ATEM live switcher.',
        createdAt: `${currY}-${currM}-04T11:00:00.000Z`,
      },
      {
        id: 'sample-5',
        staffId: s3.id,
        staffName: s3.name,
        staffEmail: s3.email,
        department: s3.department || 'Design & Visual Arts',
        workDate: `${currY}-${currM}-05`,
        taskName: 'Animation suite workstation rendering benchmarks',
        priority: 'Low',
        status: 'Completed',
        workingHours: 5.0,
        comments: 'Tested Blender and Maya render nodes on Mac Studio lab.',
        createdAt: `${currY}-${currM}-05T15:00:00.000Z`,
      },
      {
        id: 'sample-6',
        staffId: s3.id,
        staffName: s3.name,
        staffEmail: s3.email,
        department: s3.department || 'Design & Visual Arts',
        workDate: `${currY}-${currM}-08`,
        taskName: 'Student digital portfolio review & grading submission',
        priority: 'High',
        status: 'In Progress',
        workingHours: 4.0,
        comments: 'Assessed final semester typography and branding project boards.',
        createdAt: `${currY}-${currM}-08T16:20:00.000Z`,
      },
    ];
  }, [showSampleData, staffList, currentUser, selectedYear, selectedMonth]);

  // Combine real timesheet entries and optional sample entries
  const allEntriesPool = useMemo(() => {
    if (showSampleData && timesheetEntries.length === 0) {
      return sampleEntries;
    }
    return timesheetEntries;
  }, [timesheetEntries, showSampleData, sampleEntries]);

  // Role scoping: Admin sees all; Manager sees department; Staff sees self
  const roleScopedEntries = useMemo(() => {
    return allEntriesPool.filter((entry) => {
      if (isDirector) return true;
      if (isManager) return entry.department === currentUser.department || entry.staffId === currentUser.id;
      return entry.staffId === currentUser.id;
    });
  }, [allEntriesPool, isDirector, isManager, currentUser.department, currentUser.id]);

  // Active filter logic
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return roleScopedEntries.filter((entry) => {
      // 1. Staff Filter
      if (selectedStaffId !== 'all' && entry.staffId !== selectedStaffId) {
        return false;
      }

      // 2. Department Filter
      if (selectedDepartment !== 'all' && entry.department !== selectedDepartment) {
        return false;
      }

      // 3. Date Range Filter
      if (startDate && entry.workDate < startDate) {
        return false;
      }
      if (endDate && entry.workDate > endDate) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all' && entry.status !== statusFilter) {
        return false;
      }

      // 5. Priority Filter
      if (priorityFilter !== 'all' && entry.priority !== priorityFilter) {
        return false;
      }

      // 6. Text Search Filter
      if (q) {
        const matchTask = (entry.taskName || entry.task || '').toLowerCase().includes(q);
        const matchComment = (entry.comments || '').toLowerCase().includes(q);
        const matchStaff = (entry.staffName || '').toLowerCase().includes(q);
        const matchDept = (entry.department || '').toLowerCase().includes(q);
        const matchDate = entry.workDate.includes(q);
        if (!matchTask && !matchComment && !matchStaff && !matchDept && !matchDate) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt));
  }, [
    roleScopedEntries,
    selectedStaffId,
    selectedDepartment,
    startDate,
    endDate,
    statusFilter,
    priorityFilter,
    searchQuery,
  ]);

  // Aggregate Metrics based on filteredEntries
  const metrics = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, item) => sum + (Number(item.workingHours) || 0), 0);
    const totalTasks = filteredEntries.length;
    const completedTasks = filteredEntries.filter((e) => e.status === 'Completed').length;
    const inProgressTasks = filteredEntries.filter((e) => e.status === 'In Progress').length;
    const notStartedTasks = filteredEntries.filter((e) => e.status === 'Not Started').length;
    const highPriorityTasks = filteredEntries.filter((e) => e.priority === 'High').length;

    const uniqueDates = new Set(filteredEntries.map((e) => e.workDate));
    const uniqueStaff = new Set(filteredEntries.map((e) => e.staffId));

    const avgHoursPerDay = uniqueDates.size > 0 ? (totalHours / uniqueDates.size).toFixed(1) : '0';
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalHours: Number(totalHours.toFixed(2)),
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      highPriorityTasks,
      uniqueDaysCount: uniqueDates.size,
      activeStaffCount: uniqueStaff.size,
      avgHoursPerDay,
      completionRate,
    };
  }, [filteredEntries]);

  // Staff members eligible for filter selection
  const selectableStaff = useMemo(() => {
    const list = [...staffList];
    if (isManager && !isDirector) {
      return list.filter((s) => s.department === currentUser.department);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, isManager, isDirector, currentUser.department]);

  // Staff entry count map in current period
  const staffHoursMap = useMemo(() => {
    const map = new Map<string, { count: number; hours: number }>();
    roleScopedEntries.forEach((entry) => {
      // Respect current date range for the counts
      if (startDate && entry.workDate < startDate) return;
      if (endDate && entry.workDate > endDate) return;

      const current = map.get(entry.staffId) || { count: 0, hours: 0 };
      map.set(entry.staffId, {
        count: current.count + 1,
        hours: current.hours + (Number(entry.workingHours) || 0),
      });
    });
    return map;
  }, [roleScopedEntries, startDate, endDate]);

  // Selected single staff profile details
  const selectedStaffMember = useMemo(() => {
    if (selectedStaffId === 'all') return null;
    return staffList.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, staffList]);

  // Cross-reference with DBICA Leave Calendar
  const selectedStaffLeaves = useMemo(() => {
    if (!selectedStaffMember) return [];
    return leaveRequests.filter((req) => {
      if (req.staffId !== selectedStaffMember.id) return false;
      if (req.status !== 'Approved') return false;
      // Overlap with current date range
      if (startDate && req.endDate < startDate) return false;
      if (endDate && req.startDate > endDate) return false;
      return true;
    });
  }, [selectedStaffMember, leaveRequests, startDate, endDate]);

  // Grouped entries by Date
  const entriesByDate = useMemo(() => {
    const groups: { date: string; entries: TimesheetEntry[]; totalHours: number }[] = [];
    const dateMap = new Map<string, TimesheetEntry[]>();

    filteredEntries.forEach((entry) => {
      const list = dateMap.get(entry.workDate) || [];
      list.push(entry);
      dateMap.set(entry.workDate, list);
    });

    // Sort dates descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    sortedDates.forEach((date) => {
      const list = dateMap.get(date) || [];
      const totalHours = list.reduce((sum, item) => sum + (Number(item.workingHours) || 0), 0);
      groups.push({
        date,
        entries: list,
        totalHours: Number(totalHours.toFixed(2)),
      });
    });

    return groups;
  }, [filteredEntries]);

  // Grouped entries by Staff Member
  const entriesByStaff = useMemo(() => {
    const groups: {
      staffId: string;
      staffName: string;
      department: string;
      entries: TimesheetEntry[];
      totalHours: number;
    }[] = [];
    const staffMap = new Map<string, TimesheetEntry[]>();

    filteredEntries.forEach((entry) => {
      const list = staffMap.get(entry.staffId) || [];
      list.push(entry);
      staffMap.set(entry.staffId, list);
    });

    staffMap.forEach((list, staffId) => {
      const totalHours = list.reduce((sum, item) => sum + (Number(item.workingHours) || 0), 0);
      const first = list[0];
      groups.push({
        staffId,
        staffName: first.staffName,
        department: first.department,
        entries: list,
        totalHours: Number(totalHours.toFixed(2)),
      });
    });

    return groups.sort((a, b) => b.totalHours - a.totalHours || a.staffName.localeCompare(b.staffName));
  }, [filteredEntries]);

  // Handle task submission
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const hoursNum = parseFloat(formWorkingHours);
      if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
        setFormError('Working hours must be a valid number between 0.25 and 24.');
        return;
      }

      const res = await addTimesheetEntry({
        workDate: formWorkDate,
        taskName: formTaskName.trim(),
        priority: formPriority,
        status: formStatus,
        workingHours: hoursNum,
        comments: formComments.trim(),
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to submit task. Please check details.');
        return;
      }

      // Reset form on success
      setFormTaskName('');
      setFormComments('');
      setFormWorkingHours('2');
      setFormPriority('Medium');
      setFormStatus('In Progress');
      setFormWorkDate(todayStr);
      if (isDirector) {
        setIsLogTaskOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deletion of an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to remove this timesheet task record?')) return;
    setIsDeletingId(entryId);
    try {
      await deleteTimesheetEntry(entryId);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      alert('No timesheet records to export in the current selection.');
      return;
    }

    const headers = [
      'Staff Name',
      'Staff Email',
      'Department',
      'Work Date',
      'Task Name',
      'Priority',
      'Status',
      'Working Hours',
      'Comments',
      'Recorded At',
    ];

    const rows = filteredEntries.map((e) => [
      `"${(e.staffName || '').replace(/"/g, '""')}"`,
      `"${(e.staffEmail || '').replace(/"/g, '""')}"`,
      `"${(e.department || '').replace(/"/g, '""')}"`,
      `"${e.workDate}"`,
      `"${(e.taskName || e.task || '').replace(/"/g, '""')}"`,
      `"${e.priority || 'Medium'}"`,
      `"${e.status || 'In Progress'}"`,
      `"${e.workingHours ?? 0}"`,
      `"${(e.comments || '').replace(/"/g, '""')}"`,
      `"${e.createdAt || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);

    const staffSlug = selectedStaffId !== 'all' ? selectedStaffMember?.name.replace(/\s+/g, '_') || 'Staff' : 'All_Staff';
    link.setAttribute('download', `DBICA_Timesheets_${staffSlug}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print helper
  const handlePrint = () => {
    window.print();
  };

  // Helper to check if any filters are actively restricting
  const hasActiveFilters =
    selectedStaffId !== 'all' ||
    selectedDepartment !== 'all' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    searchQuery.trim().length > 0 ||
    datePreset !== 'this-month';

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 print:border-none print:shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-blue-600 p-3 text-white shadow-xs shadow-blue-600/30">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {canOversee ? 'Staff Timesheets & Activity Tracker' : 'My Work Timesheet'}
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {canOversee ? 'Director Oversight' : 'Staff Portal'}
                </span>
                {showSampleData && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    Sample Data Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                {canOversee
                  ? 'Inspect, filter by staff member, dates and months, and export institutional timesheet reports.'
                  : 'Log and track your daily tasks, projects, working hours, and completed duty deliverables.'}
              </p>
            </div>
          </div>

          {/* Action buttons (Export, Print, Log Task) */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {canOversee && (
              <>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredEntries.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
                  title="Export current filtered view to CSV file"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  title="Print institutional timesheet report"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Print</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsLogTaskOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs shadow-blue-600/30 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isLogTaskOpen ? 'Hide Task Form' : 'Log New Task'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Task Logging Form */}
        {isLogTaskOpen && (
          <div className="mt-5 border-t border-slate-100 pt-5 print:hidden">
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">
                    +
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Record Daily Task / Duty Update
                  </h3>
                  <span className="text-xs text-slate-500">
                    Logging for: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.department})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogTaskOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-white"
                  title="Close form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitTask} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Task Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Task / Activity Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={200}
                      value={formTaskName}
                      onChange={(e) => setFormTaskName(e.target.value)}
                      placeholder="e.g. Broadcast editing, lab sound calibration, lecture slides"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Work Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Work Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formWorkDate}
                      max={todayStr}
                      onChange={(e) => setFormWorkDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Working Hours */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Working Hours <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      required
                      value={formWorkingHours}
                      onChange={(e) => setFormWorkingHours(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as typeof formPriority)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as typeof formStatus)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>

                  {/* Comments / Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Comments / Deliverable Notes (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={2000}
                      value={formComments}
                      onChange={(e) => setFormComments(e.target.value)}
                      placeholder="e.g. Session notes, milestone reached, equipment checked"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {formError && (
                  <p role="alert" className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                    {formError}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLogTaskOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formTaskName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs shadow-blue-600/30"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Task Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cloud database alert if applicable */}
        {timesheetLoadError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{timesheetLoadError}</span>
          </div>
        )}
      </div>

      {/* FILTER CONTROL PANEL FOR ADMIN & MANAGEMENT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Timesheet Filters & Scope</h2>
              <p className="text-xs text-slate-500">
                Filter by specific staff user, calendar month, or customized date range
              </p>
            </div>
          </div>

          {/* Quick preset pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { id: 'this-month', label: 'This Month' },
                { id: 'last-month', label: 'Last Month' },
                { id: 'this-week', label: 'This Week' },
                { id: 'last-30-days', label: 'Last 30 Days' },
                { id: 'all-time', label: 'All Time' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                title="Reset all filters"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Filter Grid: 1. Staff User, 2. Month Selector, 3. Date Range */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* 1. FILTER OF WHICH USER TIMESHEET TO SEE */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-600" />
                Staff Member Filter
              </span>
              {selectedStaffId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffId('all')}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Show All Staff
                </button>
              )}
            </label>
            <div className="relative">
              <select
                id="staff-timesheet-user-select"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="all">
                  👥 All Staff Members ({selectableStaff.length} faculty/staff)
                </option>
                {selectableStaff.map((staff) => {
                  const staffStat = staffHoursMap.get(staff.id);
                  const hoursStr = staffStat ? ` • ${staffStat.hours} hrs (${staffStat.count} tasks)` : ' • 0 hrs';
                  return (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.department}){hoursStr}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 2. MONTH & YEAR PICKER */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-600" />
                Select Month & Year
              </span>
              <span className="text-[11px] text-slate-400">
                {monthNames[selectedMonth]} {selectedYear}
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => handleMonthDropdownChange(Number(e.target.value))}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => handleYearDropdownChange(Number(e.target.value))}
                className="w-24 rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 3. DATES FILTER (START DATE & END DATE RANGE) */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                Custom Date Range (From → To)
              </span>
              <button
                type="button"
                onClick={() => {
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                  setDatePreset('custom');
                }}
                className="text-[11px] text-emerald-600 hover:underline"
              >
                Today Only
              </button>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                title="End Date"
              />
            </div>
          </div>
        </div>

        {/* Secondary Filters Bar: Department, Status, Priority, Text Search */}
        <div className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Search box */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search Tasks or Notes</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, comments, faculty..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Staff Avatars Ribbon for 1-Click User Switching */}
        {canOversee && selectableStaff.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
              <span>Quick Staff Filter:</span>
              <span className="text-slate-400">Click any avatar to focus on that staff member</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedStaffId('all')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-colors ${
                  selectedStaffId === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>All Staff ({selectableStaff.length})</span>
              </button>

              {selectableStaff.map((staff) => {
                const isSelected = selectedStaffId === staff.id;
                const stats = staffHoursMap.get(staff.id);
                const hours = stats?.hours || 0;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs shrink-0 transition-colors border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                        staff.avatarBg || 'bg-slate-600'
                      }`}
                    >
                      {staff.name.slice(0, 1)}
                    </div>
                    <span className="truncate max-w-[110px]">{staff.name.split(' ')[0]}</span>
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                        hours > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {hours}h
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SELECTED USER SPOTLIGHT CARD (When a specific user is filtered) */}
      {selectedStaffMember && (
        <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0 ${
                  selectedStaffMember.avatarBg || 'bg-blue-600'
                }`}
              >
                {selectedStaffMember.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedStaffMember.name}</h3>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                    {selectedStaffMember.role}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {selectedStaffMember.department}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedStaffMember.designation} • {selectedStaffMember.email} • {selectedStaffMember.phone}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-blue-200 bg-white px-3.5 py-2 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">Hours Logged</div>
                <div className="text-lg font-bold text-blue-700">{metrics.totalHours} hrs</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">Tasks Logged</div>
                <div className="text-lg font-bold text-slate-800">{metrics.totalTasks} tasks</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">Active Days</div>
                <div className="text-lg font-bold text-emerald-700">{metrics.uniqueDaysCount} days</div>
              </div>
            </div>
          </div>

          {/* Institutional Attendance Cross-Reference Notice */}
          <div className="mt-3.5 border-t border-blue-100/80 pt-3">
            {selectedStaffLeaves.length > 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>DBICA Attendance Cross-Reference:</strong> {selectedStaffMember.name} had{' '}
                  <strong>{selectedStaffLeaves.length} approved leave(s)</strong> in this window:{' '}
                  {selectedStaffLeaves.map((l) => `${l.leaveType} (${l.startDate} to ${l.endDate})`).join(', ')}.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>No registered leave days during this filtered date window (Full faculty presence recorded).</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* AGGREGATED SUMMARY KPI CARDS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-3">
        {/* Total Hours */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Hours</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.totalHours}</div>
          <div className="mt-1 text-[11px] text-slate-500">{metrics.avgHoursPerDay} hrs / active day</div>
        </div>

        {/* Total Tasks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Tasks</span>
            <ClipboardList className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.totalTasks}</div>
          <div className="mt-1 text-[11px] text-slate-500">{metrics.completedTasks} completed</div>
        </div>

        {/* Active Contributors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Contributors</span>
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.activeStaffCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {canOversee ? `out of ${selectableStaff.length} staff` : 'Personal timesheet'}
          </div>
        </div>

        {/* Working Days */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Logged Days</span>
            <CalendarDays className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">{metrics.uniqueDaysCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">Distinct calendar dates</div>
        </div>

        {/* Completion Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Completion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.completionRate}%</div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.completionRate}%` }} />
          </div>
        </div>

        {/* High Priority Tasks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>High Priority</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-700">{metrics.highPriorityTasks}</div>
          <div className="mt-1 text-[11px] text-slate-500">Critical deliverables</div>
        </div>
      </section>

      {/* VIEW SWITCHER & RESULT SUMMARY BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">{filteredEntries.length}</span> task records found
          <span>•</span>
          <span>
            {selectedStaffId === 'all'
              ? 'All Staff Members'
              : selectedStaffMember?.name || 'Selected Staff'}
          </span>
          <span>•</span>
          <span className="font-medium text-slate-700">
            {formatDate(startDate)} to {formatDate(endDate)}
          </span>
        </div>

        {/* View Mode selector */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-2xs print:hidden">
          <button
            type="button"
            onClick={() => setViewMode('by-date')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
              viewMode === 'by-date'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>By Date</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('by-staff')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
              viewMode === 'by-staff'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>By Staff</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Master Table</span>
          </button>
        </div>
      </div>

      {/* MAIN ENTRIES CONTAINER ACCORDING TO VIEW MODE */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-slate-800">No Timesheet Records Found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'No task entries match the selected staff member, date range, or search criteria. Try broadening your filters or resetting to This Month.'
              : 'There are no recorded task entries yet. Staff members can log their tasks using the form above.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLogTaskOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs shadow-blue-600/30"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log a Task</span>
            </button>

            {timesheetEntries.length === 0 && (
              <button
                type="button"
                onClick={() => setShowSampleData((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <Briefcase className="h-3.5 w-3.5 text-amber-700" />
                <span>{showSampleData ? 'Hide Sample Records' : 'Load Demo Timesheet Records'}</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'by-date' ? (
        /* 1. CHRONOLOGICAL GROUPING BY DATE */
        <div className="space-y-4">
          {entriesByDate.map((group) => {
            // Check if any leaves were taken on this date
            const dateLeaves = leaveRequests.filter(
              (r) => r.status === 'Approved' && r.startDate <= group.date && r.endDate >= group.date
            );

            return (
              <div
                key={group.date}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Date Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 px-5 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-bold text-xs">
                      {group.date.split('-')[2]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{formatDate(group.date)}</h4>
                      <p className="text-[11px] text-slate-500">
                        {group.entries.length} task updates •{' '}
                        {new Set(group.entries.map((e) => e.staffId)).size} staff contributors
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {dateLeaves.length > 0 && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-200">
                        🌴 {dateLeaves.length} faculty on leave
                      </span>
                    )}
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {group.totalHours} hrs logged
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task entries list for this date */}
                <div className="divide-y divide-slate-100">
                  {group.entries.map((entry) => {
                    const statusStyle =
                      entry.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : entry.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200';

                    const priorityStyle =
                      entry.priority === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : entry.priority === 'Low'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <div
                        key={entry.id}
                        className="p-4 sm:px-5 hover:bg-slate-50/60 transition-colors flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">
                              {entry.taskName || entry.task || 'Untitled Task'}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${priorityStyle}`}>
                              {entry.priority || 'Medium'} Priority
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${statusStyle}`}>
                              {entry.status || 'In Progress'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-700 flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              {entry.staffName}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              {entry.department}
                            </span>
                            {entry.comments && (
                              <>
                                <span>•</span>
                                <span className="italic text-slate-600">"{entry.comments}"</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900 tabular-nums">
                              {entry.workingHours} hrs
                            </div>
                            <div className="text-[10px] text-slate-400">Duration</div>
                          </div>

                          {canOversee && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={isDeletingId === entry.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors print:hidden"
                              title="Delete this timesheet entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'by-staff' ? (
        /* 2. GROUPING BY STAFF MEMBER */
        <div className="grid gap-4 sm:grid-cols-2">
          {entriesByStaff.map((staffGroup) => {
            const staffObj = staffList.find((s) => s.id === staffGroup.staffId);
            const completedCount = staffGroup.entries.filter((e) => e.status === 'Completed').length;

            return (
              <div
                key={staffGroup.staffId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        staffObj?.avatarBg || 'bg-blue-600'
                      }`}
                    >
                      {staffGroup.staffName
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{staffGroup.staffName}</h4>
                      <p className="text-xs text-slate-500">{staffGroup.department}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-blue-700">{staffGroup.totalHours} hrs</div>
                    <div className="text-[10px] text-slate-400">{staffGroup.entries.length} tasks</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {completedCount} of {staffGroup.entries.length} completed
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(staffGroup.staffId);
                      setViewMode('by-date');
                    }}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Filter to this staff member →
                  </button>
                </div>

                {/* List of recent tasks for this staff */}
                <div className="space-y-1.5 pt-1">
                  {staffGroup.entries.slice(0, 4).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-800 truncate">
                          {entry.taskName || entry.task}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatDate(entry.workDate)}</p>
                      </div>
                      <span className="font-bold text-slate-700 shrink-0 tabular-nums">
                        {entry.workingHours}h
                      </span>
                    </div>
                  ))}
                  {staffGroup.entries.length > 4 && (
                    <p className="text-center text-[11px] text-slate-400">
                      + {staffGroup.entries.length - 4} more tasks
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. MASTER TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold">Staff Member</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Work Date</th>
                  <th className="px-4 py-3 font-semibold">Task Description</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Hours</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  {canOversee && <th className="px-4 py-3 text-center font-semibold print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const statusStyle =
                    entry.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : entry.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-600';

                  const priorityStyle =
                    entry.priority === 'High'
                      ? 'bg-rose-50 text-rose-700'
                      : entry.priority === 'Low'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-50 text-amber-700';

                  return (
                    <tr key={entry.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/30">
                      <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-900">
                        {entry.staffName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                        {entry.department}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-slate-700">
                        {formatDate(entry.workDate)}
                      </td>
                      <td className="max-w-xs break-words px-4 py-3 align-top text-slate-800 font-medium">
                        {entry.taskName || entry.task || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityStyle}`}>
                          {entry.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
                          {entry.status || 'In Progress'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top font-bold text-slate-900 tabular-nums">
                        {entry.workingHours ?? '—'}
                      </td>
                      <td className="max-w-xs break-words px-4 py-3 align-top text-slate-500 text-xs">
                        {entry.comments || '—'}
                      </td>
                      {canOversee && (
                        <td className="whitespace-nowrap px-4 py-3 text-center align-top print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={isDeletingId === entry.id}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
