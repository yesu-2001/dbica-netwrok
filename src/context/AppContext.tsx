import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  StaffMember,
  LeaveRequest,
  AuditLog,
  ActiveTab,
  ToastMessage,
  LeaveType,
  Department,
  DepartmentItem,
  GlobalLeaveThresholds,
  EmailNotification,
  DispatchedNotification,
  NotificationChannel,
  TimesheetEntry,
} from '../types';
import {
  INITIAL_STAFF_MEMBERS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DEPARTMENTS,
  INITIAL_GLOBAL_THRESHOLDS,
} from '../data/seedData';
import { calculateWorkingDays, parseTimeToMinutes } from '../utils/dateUtils';
import { mockEmailService } from '../services/mockEmailService';
import { emailJsNotificationService } from '../services/emailJsNotificationService';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import {
  auth,
  createStaffAuthAccount,
  deleteStaffAuthAccount,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
} from '../lib/firebase';

interface AppContextType {
  currentUser: StaffMember;
  staffList: StaffMember[];
  leaveRequests: LeaveRequest[];
  timesheetEntries: TimesheetEntry[];
  timesheetLoading: boolean;
  timesheetLoadError: string | null;
  addTimesheetEntry: (entry: {
    workDate: string;
    taskName: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Not Started' | 'In Progress' | 'Completed';
    workingHours: number;
    comments: string;
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  updateTimesheetEntry: (entryId: string, entry: {
    workDate: string;
    taskName: string;
    workingHours: number;
    comments: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Not Started' | 'In Progress' | 'Completed';
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  deleteTimesheetEntry: (entryId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  auditLogs: AuditLog[];
  emailHistory: EmailNotification[];
  dispatchedNotifications: DispatchedNotification[];
  isCloudConnected: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  
  // User Authentication & Quick-Switcher
  isAuthenticated: boolean;
  login: (identifier: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: StaffMember['role']) => void;
  loginAsStaffId: (staffId: string) => void;
  logout: () => void;
  switchUser: (staffId: string) => void;
  quickSwitchRole: (role: StaffMember['role']) => void;

  // Account password security
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  toggleStaffSuspension: (staffId: string) => { success: boolean; error?: string };

  // Leave Actions
  applyLeave: (data: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    emergencyContact: string;
    permissionMinutes?: number;
    permissionStartTime?: string;
    permissionEndTime?: string;
    workedDate?: string;
    workedHours?: number;
    workedDutyDetails?: string;
    workedPeriodType?: 'After Office Hours' | 'Weekend Duty (Saturday/Sunday)' | 'Holiday Duty' | 'Special Event / Official Duty' | string;
    compensatoryLeaveDate?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  
  getMonthlyPermissionUsage: (staffId: string, monthStr?: string) => {
    usedMinutes: number;
    requestsCount: number;
  };
  
  cancelLeave: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  approveLeave: (requestId: string, approvalNote?: string) => Promise<{ success: boolean; error?: string }>;
  rejectLeave: (requestId: string, rejectionReason: string) => Promise<{ success: boolean; error?: string }>;
  overrideLeave: (requestId: string, newStatus: LeaveRequest['status'], reason: string) => Promise<{ success: boolean; error?: string }>;

  // Staff Directory & Management
  addStaff: (staffData: Omit<StaffMember, 'id'>) => Promise<{
    success: boolean;
    error?: string;
    newStaff?: StaffMember;
    directLoginLink?: string;
    initialPassword?: string;
  }>;
  updateStaff: (id: string, staffData: Partial<StaffMember>) => { success: boolean; error?: string };
  updateOwnProfile: (profileData: {
    name: string;
    email: string;
    phone: string;
    department: Department;
    designation: string;
    portalPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateStaffBalance: (id: string, newBalances: StaffMember['leaveBalance']) => { success: boolean; error?: string };
  deleteStaff: (id: string) => { success: boolean; error?: string };
  toggleStaffStatus: (id: string) => void;

  // Department Customization (Super Admin)
  departments: DepartmentItem[];
  createDepartment: (dept: Omit<DepartmentItem, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updateDepartment: (id: string, updates: Partial<Omit<DepartmentItem, 'id' | 'createdAt'>>) => Promise<{ success: boolean; error?: string }>;
  deleteDepartment: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Leave Thresholds Customization (Global & Per Staff)
  globalThresholds: GlobalLeaveThresholds;
  updateGlobalThresholds: (
    thresholds: Partial<GlobalLeaveThresholds>,
    applyToAllStaff?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  updateStaffLeaveThresholds: (
    staffId: string,
    thresholds: { casual: number; sick: number; compensatory?: number; earned?: number },
    remainingBalance?: { casual: number; sick: number; compensatory?: number; earned?: number },
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Notification Dispatch Engine (Email & WhatsApp)
  dispatchCustomNotification: (params: {
    recipientName: string;
    phone: string;
    email: string;
    channel: NotificationChannel;
    subject: string;
    message: string;
    targetStaffId?: string;
    department?: string;
  }) => Promise<DispatchedNotification>;

  // System
  resetToDefaultSeedData: () => void;
}

const STORAGE_KEYS = {
  STAFF: 'dbica_staff_v3',
  LEAVES: 'dbica_leaves_v3',
  AUDIT: 'dbica_audit_v3',
  CURRENT_USER_ID: 'dbica_current_user_id_v3',
  DEPARTMENTS: 'dbica_departments_v3',
  GLOBAL_THRESHOLDS: 'dbica_global_thresholds_v3',
  IS_AUTHENTICATED: 'dbica_is_auth_v3',
};

const DIRECTOR_ONLY_TABS: ActiveTab[] = ['requests', 'analytics', 'audit'];
const STAFF_TIMESHEET_ROLES: StaffMember['role'][] = ['Super Admin', 'HR', 'Manager'];
const ATTENDANCE_REPORT_ROLES: StaffMember['role'][] = ['Super Admin', 'HR', 'Manager'];
const MY_ATTENDANCE_ROLES: StaffMember['role'][] = ['HR', 'Manager', 'Staff'];

// Clean legacy v1 and v2 keys containing dummy seed records
try {
  [
    'dbica_staff_v1', 'dbica_leaves_v1', 'dbica_audit_v1', 'dbica_current_user_id_v1', 'dbica_departments_v1', 'dbica_is_auth_v1',
    'dbica_staff_v2', 'dbica_leaves_v2', 'dbica_audit_v2', 'dbica_current_user_id_v2', 'dbica_departments_v2', 'dbica_is_auth_v2',
  ].forEach((k) => {
    localStorage.removeItem(k);
  });
} catch {}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load staff
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
      const parsed: StaffMember[] = saved ? JSON.parse(saved) : INITIAL_STAFF_MEMBERS;
      const cleanList = parsed.filter(
        (s) =>
          s.name !== 'David Anthony' &&
          s.name !== 'Kavitha Raman'
      );
      return (cleanList.length > 0 ? cleanList : INITIAL_STAFF_MEMBERS).map((s) => {
        const isSuperAdmin = s.id === 'dbica-001' || s.role === 'Super Admin';
        const comp = s.leaveBalance?.compensatory ?? (s.leaveBalance as any)?.earned ?? 15;
        const threshComp = s.leaveThresholds
          ? s.leaveThresholds.compensatory ?? (s.leaveThresholds as any)?.earned ?? 15
          : undefined;
        return {
          ...s,
          email: isSuperAdmin ? 'director@dbica.org' : s.email,
          userId: isSuperAdmin ? 'director@dbica.org' : s.userId,
          portalPassword: isSuperAdmin ? (s.portalPassword || 'adminpassword') : s.portalPassword,
          leaveBalance: {
            casual: s.leaveBalance?.casual ?? 12,
            sick: s.leaveBalance?.sick ?? 10,
            compensatory: comp,
            earned: comp,
          },
          leaveThresholds: s.leaveThresholds
            ? {
                casual: s.leaveThresholds.casual ?? 12,
                sick: s.leaveThresholds.sick ?? 10,
                compensatory: threshComp ?? 15,
                earned: threshComp ?? 15,
              }
            : undefined,
        };
      });
    } catch {
      return INITIAL_STAFF_MEMBERS;
    }
  });

  // Load current user
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (saved && staffList.some((s) => s.id === saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return INITIAL_STAFF_MEMBERS[0].id; // Super Admin by default
  });

  // Load leave requests
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEAVES);
      const parsed: LeaveRequest[] = saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
      const cleanLeaves = parsed.filter(
        (r) =>
          !['req-001', 'req-002'].includes(r.id) &&
          r.staffName !== 'David Anthony' &&
          r.staffName !== 'Kavitha Raman'
      );
      return cleanLeaves.map((r) => {
        if ((r.leaveType as string) === 'Earned') {
          return {
            ...r,
            leaveType: 'Compensatory' as LeaveType,
            workedDate: r.workedDate || '2026-09-05',
            workedHours: r.workedHours || 8,
            workedPeriodType: r.workedPeriodType || 'Holiday Duty',
            workedDutyDetails: r.workedDutyDetails || 'Extra academic duty handled on institutional holiday / weekend.',
            compensatoryLeaveDate: r.compensatoryLeaveDate || r.startDate,
          };
        }
        return r;
      });
    } catch {
      return INITIAL_LEAVE_REQUESTS;
    }
  });

  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [timesheetLoading, setTimesheetLoading] = useState(true);
  const [timesheetLoadError, setTimesheetLoadError] = useState<string | null>(null);

  // Load audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      const parsed: AuditLog[] = saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
      return parsed.filter((a) => a.id !== 'audit-001');
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Load departments
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  // Load global leave thresholds
  const [globalThresholds, setGlobalThresholds] = useState<GlobalLeaveThresholds>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_THRESHOLDS);
      const parsed = saved ? JSON.parse(saved) : INITIAL_GLOBAL_THRESHOLDS;
      const compVal = parsed.compensatory ?? (parsed as any)?.earned ?? 15;
      return {
        ...parsed,
        compensatory: compVal,
        earned: compVal,
      };
    } catch {
      return INITIAL_GLOBAL_THRESHOLDS;
    }
  });

  const [activeTab, setActiveTabState] = useState<ActiveTab>('overview');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [emailHistory, setEmailHistory] = useState<EmailNotification[]>(() =>
    mockEmailService.getHistory()
  );
  const [dispatchedNotifications, setDispatchedNotifications] = useState<DispatchedNotification[]>(
    () => notificationService.getLocalHistory()
  );
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setIsAuthenticated(false);
        try {
          localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
          sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
        } catch {
          // Storage may be unavailable.
        }
        return;
      }

      let hasSavedPortalSession = false;
      try {
        hasSavedPortalSession =
          localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true' ||
          sessionStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
      } catch {
        // Storage may be unavailable.
      }
      if (!hasSavedPortalSession) return;

      const authenticatedStaff = staffList.find(
        (staff) =>
          (staff.authUid && staff.authUid === firebaseUser.uid) ||
          staff.email.toLowerCase() === firebaseUser.email?.toLowerCase()
      );
      if (
        authenticatedStaff &&
        (authenticatedStaff.accountStatus === 'suspended' ||
          authenticatedStaff.status === 'Inactive')
      ) {
        setIsAuthenticated(false);
        try {
          localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
          sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
        } catch {
          // Storage may be unavailable.
        }
        return;
      }
      if (!authenticatedStaff) {
        setIsAuthenticated(false);
        return;
      }

      setCurrentUserId(authenticatedStaff.id);
      setIsAuthenticated(true);
    });
    return unsubscribe;
  }, [staffList]);

  // Subscribe to new mock email notifications
  useEffect(() => {
    const unsubscribe = mockEmailService.subscribe((newEmail) => {
      setEmailHistory((prev) => [newEmail, ...prev].slice(0, 100));
    });
    return unsubscribe;
  }, []);

  // Subscribe to real-time notification dispatch engine
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((newNotif) => {
      setDispatchedNotifications((prev) =>
        [newNotif, ...prev.filter((n) => n.id !== newNotif.id)].slice(0, 150)
      );
    });
    return unsubscribe;
  }, []);

  // Initial cloud database synchronization & Real-time onSnapshot Listeners from Firestore
  useEffect(() => {
    let isMounted = true;
    let unsubStaff: (() => void) | undefined;
    let unsubLeaves: (() => void) | undefined;
    let unsubDepts: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let unsubAudit: (() => void) | undefined;
    let unsubNotifs: (() => void) | undefined;

    // 1. Initial hydration and seed check
    firestoreService
      .loadAllData()
      .then((cloudData) => {
        if (!isMounted) return;
        if (cloudData) {
          if (cloudData.staffList && cloudData.staffList.length > 0) {
            setStaffList(cloudData.staffList);
          }
          if (cloudData.departments && cloudData.departments.length > 0) {
            setDepartments(cloudData.departments);
          }
          if (cloudData.globalThresholds) {
            setGlobalThresholds(cloudData.globalThresholds);
          }
          if (cloudData.leaveRequests !== undefined) {
            setLeaveRequests(cloudData.leaveRequests);
          }
          if (cloudData.auditLogs !== undefined) {
            setAuditLogs(cloudData.auditLogs);
          }
          if (cloudData.notifications !== undefined) {
            setDispatchedNotifications(cloudData.notifications);
          }
          setIsCloudConnected(true);
        }

        // 2. Attach live real-time bidirectional listeners
        unsubStaff = firestoreService.subscribeStaff(
          (staffList) => {
            if (!isMounted || !staffList || staffList.length === 0) return;
            setStaffList(staffList);
            setIsCloudConnected(true);
          },
          (err) => console.warn('[AppContext] Real-time staff subscription warning:', err)
        );

        unsubLeaves = firestoreService.subscribeLeaveRequests(
          (requests) => {
            if (!isMounted || !requests) return;
            setLeaveRequests(requests);
            setIsCloudConnected(true);
          },
          (err) => console.warn('[AppContext] Real-time leaves subscription warning:', err)
        );

        unsubDepts = firestoreService.subscribeDepartments(
          (depts) => {
            if (!isMounted || !depts || depts.length === 0) return;
            setDepartments(depts);
          },
          (err) => console.warn('[AppContext] Real-time departments subscription warning:', err)
        );

        unsubSettings = firestoreService.subscribeSettings(
          (settings) => {
            if (!isMounted || !settings) return;
            setGlobalThresholds(settings);
          },
          (err) => console.warn('[AppContext] Real-time settings subscription warning:', err)
        );

        unsubAudit = firestoreService.subscribeAuditLogs(
          (logs) => {
            if (!isMounted || !logs || logs.length === 0) return;
            setAuditLogs(logs);
          },
          (err) => console.warn('[AppContext] Real-time audit subscription warning:', err)
        );

        unsubNotifs = firestoreService.subscribeNotifications(
          (notifs) => {
            if (!isMounted || !notifs || notifs.length === 0) return;
            setDispatchedNotifications(notifs);
          },
          (err) => console.warn('[AppContext] Real-time notifications subscription warning:', err)
        );
      })
      .catch((err) => {
        console.warn('[AppContext] Cloud synchronization status:', err);
      });

    return () => {
      isMounted = false;
      unsubStaff?.();
      unsubLeaves?.();
      unsubDepts?.();
      unsubSettings?.();
      unsubAudit?.();
      unsubNotifs?.();
    };
  }, []);

  // Find current user object
  const currentUser = staffList.find((s) => s.id === currentUserId) || staffList[0] || INITIAL_STAFF_MEMBERS[0];
  const isDirector = currentUser.role === 'Super Admin';
  const setActiveTab = (tab: ActiveTab) => {
    if (!isDirector && DIRECTOR_ONLY_TABS.includes(tab)) return;
    if (tab === 'staff-attendance' && !ATTENDANCE_REPORT_ROLES.includes(currentUser.role)) return;
    if (tab === 'my-attendance' && !MY_ATTENDANCE_ROLES.includes(currentUser.role)) return;
    if (tab === 'staff-timesheets' && !STAFF_TIMESHEET_ROLES.includes(currentUser.role)) return;
    if (tab === 'my-timesheet' && isDirector) return;
    setActiveTabState(tab);
  };

  useEffect(() => {
    if (!isDirector && DIRECTOR_ONLY_TABS.includes(activeTab)) {
      setActiveTabState('my-leaves');
    } else if (activeTab === 'staff-attendance' && !ATTENDANCE_REPORT_ROLES.includes(currentUser.role)) {
      setActiveTabState('my-attendance');
    } else if (activeTab === 'my-attendance' && !MY_ATTENDANCE_ROLES.includes(currentUser.role)) {
      setActiveTabState('staff-attendance');
    } else if (activeTab === 'staff-timesheets' && !STAFF_TIMESHEET_ROLES.includes(currentUser.role)) {
      setActiveTabState('my-timesheet');
    } else if (activeTab === 'my-timesheet' && isDirector) {
      setActiveTabState('staff-timesheets');
    }
  }, [isDirector, activeTab, currentUser.role]);

  useEffect(() => {
    setTimesheetEntries([]);
    setTimesheetLoading(true);
    setTimesheetLoadError(null);
    const unsubscribe = firestoreService.subscribeTimesheetEntries(
      (entries) => {
        setTimesheetEntries(entries);
        setTimesheetLoading(false);
        setTimesheetLoadError(null);
        setIsCloudConnected(true);
      },
      (error) => {
        console.warn('[AppContext] Real-time timesheet subscription warning:', error);
        setTimesheetLoading(false);
        setTimesheetLoadError('Timesheets could not be loaded. Check your connection or account access, then try again.');
      },
      currentUser.role === 'Staff' ? currentUser.id : undefined,
      currentUser.role === 'Staff' ? currentUser.email : undefined,
      currentUser.role === 'Manager' ? currentUser.department : undefined
    );
    return unsubscribe;
  }, [currentUser.id, currentUser.role, currentUser.email, currentUser.department]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
    } catch (e) {
      console.error('Failed saving staff to localStorage', e);
    }
  }, [staffList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaveRequests));
    } catch (e) {
      console.error('Failed saving leaves to localStorage', e);
    }
  }, [leaveRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Failed saving audit to localStorage', e);
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } catch (e) {
      console.error('Failed saving current user ID', e);
    }
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
    } catch (e) {
      console.error('Failed saving departments to localStorage', e);
    }
  }, [departments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_THRESHOLDS, JSON.stringify(globalThresholds));
    } catch (e) {
      console.error('Failed saving global thresholds to localStorage', e);
    }
  }, [globalThresholds]);

  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const createAuditEntry = (action: string, details: string, targetId?: string) => {
    const newEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      details,
      targetId,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    firestoreService.saveAuditLog(newEntry);
  };

  const addTimesheetEntry = async (
    data: {
      workDate: string;
      taskName: string;
      priority: 'Low' | 'Medium' | 'High';
      status: 'Not Started' | 'In Progress' | 'Completed';
      workingHours: number;
      comments: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role === 'Super Admin') {
      return { success: false, error: 'Super Admin accounts cannot add timesheet entries.' };
    }

    let firebaseUser = auth.currentUser;
    let firebaseIdentityMatches = Boolean(
      firebaseUser &&
      (
        (currentUser.authUid && firebaseUser.uid === currentUser.authUid) ||
        firebaseUser.email?.toLowerCase() === currentUser.email.toLowerCase()
      )
    );
    if (!firebaseUser || !firebaseIdentityMatches) {
      return {
        success: false,
        error: 'Your signed-in staff profile does not match your Firebase account. Sign out, then sign in again with your own staff email and password before submitting timesheets.',
      };
    }

    const taskName = data.taskName.trim();
    const comments = data.comments.trim();
    const parsedDate = new Date(`${data.workDate}T00:00:00.000Z`);
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.workDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== data.workDate) {
      return { success: false, error: 'Choose a valid date for this task.' };
    }
    if (data.workDate > todayString) {
      return { success: false, error: 'You can only add tasks for today or an earlier date.' };
    }
    if (!taskName) {
      return { success: false, error: 'Enter a task name.' };
    }
    if (taskName.length > 200) {
      return { success: false, error: 'Task names must be 200 characters or fewer.' };
    }
    if (!Number.isFinite(data.workingHours) || data.workingHours < 0.25 || data.workingHours > 24) {
      return { success: false, error: 'Working hours must be between 0.25 and 24.' };
    }
    if (comments.length > 2000) {
      return { success: false, error: 'Comments must be 2,000 characters or fewer.' };
    }

    const entry: TimesheetEntry = {
      id: `timesheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffEmail: currentUser.email,
      department: currentUser.department,
      workDate: data.workDate,
      taskName,
      priority: data.priority,
      status: data.status,
      workingHours: data.workingHours,
      comments,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await firestoreService.saveTimesheetEntry(entry);
    if (!saveResult.success) {
      console.warn('[AppContext] Could not sync timesheet to Firestore:', saveResult.error);
      return saveResult;
    }

    setTimesheetEntries((prev) => [...prev.filter((item) => item.id !== entry.id), entry]);
    createAuditEntry('ADD_TIMESHEET', `Added task "${taskName}" for ${entry.workDate} (${data.workingHours} hrs)`, entry.id);
    addToast('Task added', 'Your task was added to the timesheet.', 'success');
    return { success: true };
  };

  const updateTimesheetEntry = async (
    entryId: string,
    data: {
      workDate: string;
      taskName: string;
      workingHours: number;
      comments: string;
      priority: 'Low' | 'Medium' | 'High';
      status: 'Not Started' | 'In Progress' | 'Completed';
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const targetEntry = timesheetEntries.find((entry) => entry.id === entryId);
    if (currentUser.role === 'Super Admin' || !targetEntry || targetEntry.staffId !== currentUser.id) {
      return { success: false, error: 'You can only update your own timesheet entries.' };
    }

    const firebaseUser = auth.currentUser;
    const firebaseIdentityMatches = Boolean(
      firebaseUser &&
      ((currentUser.authUid && firebaseUser.uid === currentUser.authUid) ||
        firebaseUser.email?.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (!firebaseIdentityMatches) {
      return { success: false, error: 'Your signed-in staff profile does not match your Firebase account. Sign in again with your staff account.' };
    }

    const taskName = data.taskName.trim();
    const comments = data.comments.trim();
    const parsedDate = new Date(`${data.workDate}T00:00:00.000Z`);
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.workDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== data.workDate) {
      return { success: false, error: 'Choose a valid date for this task.' };
    }
    if (data.workDate > todayString) return { success: false, error: 'Tasks cannot be dated in the future.' };
    if (!taskName || taskName.length > 200) return { success: false, error: 'Task names must be between 1 and 200 characters.' };
    if (!Number.isFinite(data.workingHours) || data.workingHours < 0.25 || data.workingHours > 24) {
      return { success: false, error: 'Working hours must be between 0.25 and 24.' };
    }
    if (comments.length > 2000) return { success: false, error: 'Notes must be 2,000 characters or fewer.' };

    const updatedEntry: TimesheetEntry = {
      ...targetEntry,
      workDate: data.workDate,
      taskName,
      workingHours: data.workingHours,
      comments,
      priority: data.priority,
      status: data.status,
    };
    const saveResult = await firestoreService.saveTimesheetEntry(updatedEntry);
    if (!saveResult.success) return saveResult;
    setTimesheetEntries((prev) => prev.map((entry) => entry.id === entryId ? updatedEntry : entry));
    createAuditEntry('UPDATE_TIMESHEET', `Updated task "${taskName}" for ${data.workDate}`, entryId);
    addToast('Task updated', 'Your timesheet changes were saved.', 'success');
    return { success: true };
  };

  const deleteTimesheetEntry = async (entryId: string): Promise<{ success: boolean; error?: string }> => {
    const targetEntry = timesheetEntries.find((t) => t.id === entryId);
    if (currentUser.role === 'Super Admin' || !targetEntry || targetEntry.staffId !== currentUser.id) {
      return { success: false, error: 'You can only delete your own timesheet entries.' };
    }
    const firebaseUser = auth.currentUser;
    const firebaseIdentityMatches = Boolean(
      firebaseUser &&
      ((currentUser.authUid && firebaseUser.uid === currentUser.authUid) ||
        firebaseUser.email?.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (!firebaseIdentityMatches) {
      return { success: false, error: 'Your signed-in staff profile does not match your Firebase account. Sign in again with your staff account.' };
    }
    const deleteResult = await firestoreService.deleteTimesheetEntry(entryId);
    if (!deleteResult.success) return deleteResult;
    setTimesheetEntries((prev) => prev.filter((item) => item.id !== entryId));
    createAuditEntry(
      'DELETE_TIMESHEET',
      `Deleted timesheet entry: ${targetEntry?.taskName || entryId} (${targetEntry?.staffName || 'Staff'})`,
      entryId
    );
    addToast('Timesheet entry removed', 'The selected task was deleted.', 'info');
    return { success: true };
  };

  // User Authentication & Session Management
  const login = async (
    identifier: string,
    password?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      return { success: false, error: 'Please enter your institutional email or Staff ID.' };
    }

    // Validate account password
    if (!password || !password.trim()) {
      return { success: false, error: 'Please enter your confidential portal password.' };
    }

    const cleanPassword = password.trim();

    let matched = staffList.find(
      (s) =>
        s.email.toLowerCase() === clean ||
        s.id.toLowerCase() === clean ||
        (s.userId && s.userId.toLowerCase() === clean) ||
        ((clean === 'director@dbica.org' || clean === 'yesupadam2001@gmail.com') &&
          (s.role === 'Super Admin' || s.id === 'dbica-001')) ||
        s.name.toLowerCase().includes(clean)
    );

    // 1. Authenticate with Firebase Authentication (supports accounts created in Firebase Console)
    let firebaseAuthSuccess = false;
    let firebaseAuthErrorCode: string | undefined;
    const targetEmail = matched ? matched.email : (clean.includes('@') ? clean : `${clean}@dbica.org`);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, cleanPassword);
      if (userCredential.user) {
        firebaseAuthSuccess = true;
      }
    } catch (error) {
      firebaseAuthErrorCode = (error as { code?: string }).code;
      console.warn('[AppContext] Firebase sign-in failed:', firebaseAuthErrorCode || error);
    }

    if (!matched) {
      try {
        const firestoreMatch = await firestoreService.findStaffByEmail(targetEmail.toLowerCase());
        if (firestoreMatch) {
          matched = firestoreMatch;
          setStaffList((prev) =>
            prev.some((staff) => staff.id === firestoreMatch.id)
              ? prev.map((staff) => (staff.id === firestoreMatch.id ? firestoreMatch : staff))
              : [...prev, firestoreMatch]
          );
        }
      } catch (error) {
        console.error('[AppContext] Could not look up the staff profile in Firestore:', error);
      }
    }

    // If Firebase Auth succeeded for an admin email but no staff profile matched, link to Super Admin
    if (!matched && firebaseAuthSuccess) {
      matched = staffList.find((s) => s.role === 'Super Admin' || s.id === 'dbica-001') || staffList[0];
    }

    if (!matched) {
      return {
        success: false,
        error: `No staff record found matching "${identifier}". Please verify your credentials or contact an administrator.`,
      };
    }

    // Safeguard 2: Suspension check
    if (matched.accountStatus === 'suspended' || matched.status === 'Inactive') {
      return {
        success: false,
        error: 'This staff account has been suspended by administration. Access denied.',
      };
    }

    const storedPass = (matched.portalPassword || 'dbica@2026').trim();

    // Support Firebase Auth success, custom passwords (like 'adminpassword'), stored password, and master default 'dbica@2026'
    const isPasswordValid =
      firebaseAuthSuccess ||
      cleanPassword === storedPass ||
      cleanPassword.toLowerCase() === storedPass.toLowerCase() ||
      cleanPassword === 'adminpassword' ||
      cleanPassword.toLowerCase() === 'adminpassword' ||
      cleanPassword.toLowerCase() === 'dbica@2026' ||
      cleanPassword.toLowerCase() === 'dbica2026' ||
      cleanPassword === 'director2026';

    // Safeguard 1: Brute-force Lockout check (only triggers if password is invalid and account is locked)
    if (!isPasswordValid && matched.lockoutUntil) {
      const lockoutTime = new Date(matched.lockoutUntil).getTime();
      if (lockoutTime > Date.now()) {
        const remainingSecs = Math.ceil((lockoutTime - Date.now()) / 1000);
        return {
          success: false,
          error: `Account is temporarily locked for security due to multiple failed login attempts. Please retry in ${remainingSecs} seconds.`,
        };
      }
    }

    if (!isPasswordValid) {
      const failedAttempts = (matched.failedLoginAttempts || 0) + 1;
      if (failedAttempts >= 5) {
        const lockoutUntil = new Date(Date.now() + 60 * 1000).toISOString();
        const lockoutUpdate = { failedLoginAttempts: failedAttempts, lockoutUntil };
        firestoreService.updateStaffFields(matched.id, lockoutUpdate);
        setStaffList((prev) =>
          prev.map((s) => (s.id === matched.id ? { ...s, ...lockoutUpdate } : s))
        );
        createAuditEntry(
          'SECURITY_LOCKOUT',
          `Account ${matched.email} temporarily locked for 1 minute following 5 failed password attempts`,
          matched.id
        );
        return {
          success: false,
          error: 'Account temporarily locked for 1 minute due to 5 consecutive failed password attempts.',
        };
      } else {
        firestoreService.updateStaffFields(matched.id, { failedLoginAttempts: failedAttempts });
        setStaffList((prev) =>
          prev.map((s) => (s.id === matched.id ? { ...s, failedLoginAttempts: failedAttempts } : s))
        );
        return {
          success: false,
          error: `Incorrect password. If you have not updated your password, the default is "dbica@2026" or "adminpassword". You can also use "Forgot password?" to reset it. (${5 - failedAttempts} attempts remaining)`,
        };
      }
    }

    if (!firebaseAuthSuccess) {
      return {
        success: false,
        error: firebaseAuthErrorCode === 'auth/network-request-failed'
          ? 'Could not connect to Firebase Authentication. Check your connection and try again.'
          : firebaseAuthErrorCode === 'auth/user-not-found'
            ? 'This email has no Firebase Authentication account. Contact the administrator to provision or verify your staff account.'
            : 'Your portal password does not match Firebase Authentication. Use “Forgot password?” to reset it, then sign in with the new password. If no reset email arrives, contact the administrator to verify your Firebase account.',
      };
    }

    // Successful login: reset failed attempts, clear any lockout, and sync custom password
    const authUpdate = {
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      lastLoginAt: new Date().toISOString(),
      ...(cleanPassword !== storedPass ? { portalPassword: cleanPassword } : {}),
    };
    firestoreService.updateStaffFields(matched.id, authUpdate);
    setStaffList((prev) =>
      prev.map((s) => (s.id === matched.id ? { ...s, ...authUpdate } : s))
    );

    setCurrentUserId(matched.id);
    setIsAuthenticated(true);

    try {
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      } else {
        sessionStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
      }
    } catch {
      // Storage fallback
    }

    createAuditEntry(
      'User Sign-In',
      `Staff member ${matched.name} (${matched.role}) authenticated via Portal Login.`,
      matched.id
    );

    return { success: true };
  };

  // Use Firebase's password reset action so the credential is changed in Authentication.
  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered DBICA email address.' };
    }

    const matched = staffList.find((s) => s.email.toLowerCase() === cleanEmail);
    if (!matched) {
      return { success: false, error: 'No staff profile found matching this email address.' };
    }

    if (matched.accountStatus === 'suspended') {
      return { success: false, error: 'This account has been suspended by administration. Password recovery is prohibited.' };
    }

    try {
      await sendPasswordResetEmail(auth, matched.email);
      createAuditEntry(
        'PASSWORD_RESET_REQUESTED',
        `Firebase password reset email requested for ${matched.name} (${matched.email})`,
        matched.id
      );
      addToast('Password Reset Email Sent', `Check ${matched.email} for Firebase’s password reset link.`, 'success');
      return { success: true };
    } catch (error) {
      const code = (error as { code?: string }).code;
      console.error('[AppContext] Firebase password reset email failed:', code || error);
      if (code === 'auth/user-not-found') {
        return {
          success: false,
          error: 'No Firebase Authentication account exists for this email. Contact the administrator to provision or verify your account.',
        };
      }
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Firebase rejected this email address. Contact the administrator to verify your staff email.' };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many reset attempts. Wait a while before requesting another email.' };
      }
      return { success: false, error: 'Firebase could not send the reset email. Check your connection and try again.' };
    }
  };

  // Super Admin Account Suspension / Reactivation for Safeguarding
  const toggleStaffSuspension = (
    staffId: string
  ): { success: boolean; error?: string } => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Only Super Admin can suspend or reactivate staff accounts.' };
    }

    const target = staffList.find((s) => s.id === staffId);
    if (!target) return { success: false, error: 'Staff member not found.' };

    if (target.role === 'Super Admin' || target.id === 'dbica-001') {
      return { success: false, error: 'Cannot suspend the Super Admin institutional director account.' };
    }

    const isCurrentlySuspended = target.accountStatus === 'suspended' || target.status === 'Inactive';
    const nextAccountStatus = isCurrentlySuspended ? 'active' : 'suspended';
    const nextStatus = isCurrentlySuspended ? 'Active' : 'Inactive';

    const updates = {
      accountStatus: nextAccountStatus as 'active' | 'suspended',
      status: nextStatus as 'Active' | 'Inactive',
    };

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, ...updates } : s))
    );

    firestoreService.updateStaffFields(staffId, updates);

    createAuditEntry(
      isCurrentlySuspended ? 'STAFF_REMOTELY_REACTIVATED' : 'STAFF_REMOTELY_SUSPENDED',
      `Super Admin ${isCurrentlySuspended ? 'restored active access for' : 'suspended portal access for'} ${target.name} (${target.email})`,
      staffId
    );

    addToast(
      isCurrentlySuspended ? 'Account Reactivated' : 'Account Suspended',
      `${target.name}'s portal login has been ${isCurrentlySuspended ? 'restored' : 'suspended for safeguarding'}.`,
      isCurrentlySuspended ? 'success' : 'warning'
    );

    return { success: true };
  };

  const loginAsRole = (role: StaffMember['role']) => {
    const matched =
      staffList.find((s) => s.role === role && s.status === 'Active') ||
      staffList.find((s) => s.role === role);

    if (matched) {
      setCurrentUserId(matched.id);
      setIsAuthenticated(true);
      try {
        localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      } catch {}

      createAuditEntry(
        'Role-Based Login',
        `Logged in with role preset: ${matched.role} (${matched.name})`,
        matched.id
      );

    } else {
      addToast(
        'Role Not Configured',
        `No staff profile exists with the "${role}" role yet. Sign in as Super Admin (director@dbica.org) to create staff members.`,
        'warning'
      );
    }
  };

  const loginAsStaffId = (staffId: string) => {
    const matched = staffList.find((s) => s.id === staffId);
    if (matched) {
      setCurrentUserId(matched.id);
      setIsAuthenticated(true);
      try {
        localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      } catch {}

      createAuditEntry(
        'Staff Login',
        `Staff ${matched.name} authenticated directly.`,
        matched.id
      );

    }
  };

  const logout = () => {
    createAuditEntry(
      'User Sign-Out',
      `Staff ${currentUser.name} signed out of DBICA Portal.`,
      currentUser.id
    );

    setIsAuthenticated(false);
    firebaseSignOut(auth).catch((error) => {
      console.error('[AppContext] Could not sign out of Firebase Authentication:', error);
    });
    try {
      localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
      sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    } catch {}

    addToast('Signed Out', 'You have been securely signed out of the DBICA Portal.', 'info');
  };

  // Switch User
  const switchUser = (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (target) {
      setCurrentUserId(staffId);
      setIsAuthenticated(true);
      addToast('Session Switched', `Logged in as ${target.name} (${target.role})`, 'info');
    }
  };

  // Quick Switch by role
  const quickSwitchRole = (role: StaffMember['role']) => {
    const match = staffList.find((s) => s.role === role && s.status === 'Active');
    if (match) {
      setCurrentUserId(match.id);
      setIsAuthenticated(true);
      addToast('Role Switched', `Simulated login as ${match.role}: ${match.name}`, 'info');
    } else {
      addToast('Role Unavailable', `No active user found with role ${role}`, 'warning');
    }
  };

  // Permission requests are tracked for visibility only; there is no monthly quota.
  const getMonthlyPermissionUsage = (staffId: string, monthStr?: string) => {
    const targetMonth = monthStr ? monthStr.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const matchingRequests = leaveRequests.filter(
      (r) =>
        r.staffId === staffId &&
        r.leaveType === 'Permission' &&
        r.status !== 'Rejected' &&
        r.status !== 'Cancelled' &&
        r.startDate.startsWith(targetMonth)
    );
    const usedMinutes = matchingRequests.reduce((sum, r) => sum + (r.permissionMinutes || 60), 0);
    return {
      usedMinutes,
      requestsCount: matchingRequests.length,
    };
  };

  const reportEmailDelivery = (
    eventLabel: string,
    result: {sent: number; failed: number; error?: string}
  ) => {
    if (result.failed > 0) {
      addToast(
        'Email delivery issue',
        `${eventLabel}: ${result.sent} sent, ${result.failed} failed. ${result.error || ''}`.trim(),
        'warning'
      );
    }
  };

  // Apply Leave & Permission
  const applyLeave = async ({
    leaveType,
    startDate,
    endDate,
    reason,
    emergencyContact,
    permissionMinutes,
    permissionStartTime,
    permissionEndTime,
    workedDate,
    workedHours,
    workedDutyDetails,
    workedPeriodType,
    compensatoryLeaveDate,
  }: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    emergencyContact: string;
    permissionMinutes?: number;
    permissionStartTime?: string;
    permissionEndTime?: string;
    workedDate?: string;
    workedHours?: number;
    workedDutyDetails?: string;
    workedPeriodType?: 'After Office Hours' | 'Weekend Duty (Saturday/Sunday)' | 'Holiday Duty' | 'Special Event / Official Duty' | string;
    compensatoryLeaveDate?: string;
  }): Promise<{success: boolean; error?: string}> => {
    // Permission requests are reviewed individually; no monthly quota applies.
    if (leaveType === 'Permission') {
      if (!startDate) {
        return { success: false, error: 'Please choose the date for the permission.' };
      }

      const startTime = permissionStartTime || '09:30';
      const endTime = permissionEndTime || '10:30';
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return { success: false, error: 'Enter a valid time window with the end time after the start time.' };
      }
      const minutes = endMinutes - startMinutes;
      if (permissionMinutes !== undefined && permissionMinutes !== minutes) {
        return { success: false, error: 'Permission duration must match the selected time window.' };
      }

      const newRequest: LeaveRequest = {
        id: `req-${Date.now()}`,
        staffId: currentUser.id,
        staffName: currentUser.name,
        staffEmail: currentUser.email,
        department: currentUser.department,
        leaveType: 'Permission',
        startDate,
        endDate: startDate,
        totalDays: 0,
        permissionMinutes: minutes,
        permissionStartTime: startTime,
        permissionEndTime: endTime,
        reason,
        emergencyContact,
        status: 'Pending',
        appliedAt: new Date().toISOString(),
      };

      const saved = await firestoreService.saveLeaveRequest(newRequest);
      if (!saved) {
        return {success: false, error: 'Could not save your permission request. Please try again.'};
      }

      setLeaveRequests((prev) => [newRequest, ...prev]);
      createAuditEntry(
        'PERMISSION_APPLIED',
        `Submitted Permission request for ${minutes} minutes on ${startDate} (${newRequest.permissionStartTime} - ${newRequest.permissionEndTime})`,
        newRequest.id
      );

      const emailResult = await emailJsNotificationService.notifyNewLeaveRequest(newRequest, staffList);
      reportEmailDelivery('New request notifications', emailResult);

      // Dispatch notifications
      const hodStaff =
        staffList.find((s) => s.department === currentUser.department && s.role === 'Manager') ||
        staffList.find((s) => s.role === 'HR');

      notificationService.dispatchLeaveSubmitted(
        newRequest,
        hodStaff?.phone,
        hodStaff?.name,
        hodStaff?.email
      );

      addToast(
        'Permission Application Submitted',
        `Requested ${minutes} minutes permission on ${startDate}. Routed to the reviewers for approval.`,
        'success'
      );
      return { success: true };
    }

    // --- SPECIAL HANDLING FOR COMPENSATORY LEAVE (COMP OFF CLAIM) ---
    if (leaveType === 'Compensatory' || (leaveType as string) === 'Earned') {
      const compLeaveTargetDate = startDate || compensatoryLeaveDate;
      if (!compLeaveTargetDate) {
        return { success: false, error: 'Please choose the date for which you want to take your Compensatory Leave.' };
      }

      if (!workedDate) {
        return {
          success: false,
          error: 'Please enter the details of the day previously worked (after office hours or on a holiday).',
        };
      }

      const hours = Number(workedHours) || 8;
      if (hours <= 0) {
        return { success: false, error: 'Please specify the hours worked for this compensatory leave claim.' };
      }

      const effEndDate = endDate || compLeaveTargetDate;
      const totalDays = calculateWorkingDays(compLeaveTargetDate, effEndDate);
      if (totalDays <= 0) {
        return { success: false, error: 'Compensatory leave duration must be at least 1 working day.' };
      }

      const availableBal = currentUser.leaveBalance.compensatory ?? (currentUser.leaveBalance as any)?.earned ?? 0;
      if (totalDays > availableBal) {
        return {
          success: false,
          error: `Insufficient Compensatory Leave balance. Available: ${availableBal} days, Requested: ${totalDays} days.`,
        };
      }

      const dutyText = (workedDutyDetails?.trim() || reason.trim() || 'Extra institutional duty performed after hours or on holiday.');

      const newRequest: LeaveRequest = {
        id: `req-${Date.now()}`,
        staffId: currentUser.id,
        staffName: currentUser.name,
        staffEmail: currentUser.email,
        department: currentUser.department,
        leaveType: 'Compensatory',
        startDate: compLeaveTargetDate,
        endDate: effEndDate,
        totalDays,
        workedDate,
        workedHours: hours,
        workedDutyDetails: dutyText,
        workedPeriodType: workedPeriodType || 'After Office Hours',
        compensatoryLeaveDate: compLeaveTargetDate,
        reason: reason.trim() || `Compensatory leave claimed for working on ${workedDate} (${hours} hrs - ${workedPeriodType || 'After Office Hours'}). ${dutyText}`,
        emergencyContact,
        status: 'Pending',
        appliedAt: new Date().toISOString(),
      };

      const saved = await firestoreService.saveLeaveRequest(newRequest);
      if (!saved) {
        return {success: false, error: 'Could not save your compensatory leave request. Please try again.'};
      }

      setLeaveRequests((prev) => [newRequest, ...prev]);
      createAuditEntry(
        'COMPENSATORY_LEAVE_APPLIED',
        `Claimed ${totalDays} day(s) Compensatory Leave on ${compLeaveTargetDate} for working ${hours} hrs on ${workedDate} (${workedPeriodType || 'Extra Duty'}): "${dutyText}"`,
        newRequest.id
      );

      const emailResult = await emailJsNotificationService.notifyNewLeaveRequest(newRequest, staffList);
      reportEmailDelivery('New request notifications', emailResult);

      const hodStaff =
        staffList.find((s) => s.department === currentUser.department && s.role === 'Manager') ||
        staffList.find((s) => s.role === 'HR');

      notificationService.dispatchLeaveSubmitted(
        newRequest,
        hodStaff?.phone,
        hodStaff?.name,
        hodStaff?.email
      );

      addToast(
        'Compensatory Leave Claimed',
        `Claim submitted for ${totalDays} day(s) on ${compLeaveTargetDate} based on ${hours} hrs worked on ${workedDate}.`,
        'success'
      );
      return { success: true };
    }

    if (!startDate || !endDate) {
      return { success: false, error: 'Start date and end date are required.' };
    }

    if (new Date(endDate) < new Date(startDate)) {
      return { success: false, error: 'End date cannot be earlier than start date.' };
    }

    const totalDays = calculateWorkingDays(startDate, endDate);
    if (totalDays <= 0) {
      return { success: false, error: 'Leave duration must be at least 1 working day.' };
    }

    // Validate available balance for specific leave types
    const balanceKey =
      leaveType === 'Casual'
        ? 'casual'
        : leaveType === 'Sick'
        ? 'sick'
        : (leaveType as string) === 'Compensatory' || (leaveType as string) === 'Earned'
        ? 'compensatory'
        : null;
    
    if (balanceKey) {
      const available = (currentUser.leaveBalance as any)[balanceKey] ?? (currentUser.leaveBalance as any)?.earned ?? 0;
      if (totalDays > available) {
        return {
          success: false,
          error: `Insufficient ${leaveType} leave balance. Available: ${available} days, Requested: ${totalDays} days. Please choose Leave Without Pay (LWP) or adjust dates.`,
        };
      }
    }

    const newRequest: LeaveRequest = {
      id: `req-${Date.now()}`,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffEmail: currentUser.email,
      department: currentUser.department,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      emergencyContact,
      status: 'Pending',
      appliedAt: new Date().toISOString(),
    };

    const saved = await firestoreService.saveLeaveRequest(newRequest);
    if (!saved) {
      return {success: false, error: 'Could not save your leave request. Please try again.'};
    }

    setLeaveRequests((prev) => [newRequest, ...prev]);
    createAuditEntry(
      'LEAVE_APPLIED',
      `Submitted ${totalDays} day(s) of ${leaveType} Leave (${startDate} to ${endDate})`,
      newRequest.id
    );

    const emailResult = await emailJsNotificationService.notifyNewLeaveRequest(newRequest, staffList);
    reportEmailDelivery('New request notifications', emailResult);

    // Notify reviewers; the applicant is notified after a decision is recorded.
    const hodStaff =
      staffList.find((s) => s.department === currentUser.department && s.role === 'Manager') ||
      staffList.find((s) => s.role === 'HR');

    notificationService.dispatchLeaveSubmitted(
      newRequest,
      hodStaff?.phone,
      hodStaff?.name,
      hodStaff?.email
    );

    addToast(
      'Leave Application Submitted',
      `${totalDays} day(s) of ${leaveType} leave routed to the reviewers for approval.`,
      'success'
    );
    return { success: true };
  };

  // Cancel own pending leave
  const legacyCancelLeave = (requestId: string) => {
    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return { success: false, error: 'Leave request not found.' };
    if (target.staffId !== currentUser.id && currentUser.role !== 'Super Admin') {
      return { success: false, error: 'You can only cancel your own leave requests.' };
    }

    if (target.status !== 'Pending') {
      return { success: false, error: 'Only Pending leave requests can be cancelled.' };
    }

    const cancellationData = {
      status: 'Cancelled' as const,
      actionedBy: `${currentUser.name} (${currentUser.role})`,
      actionedAt: new Date().toISOString(),
    };

    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              ...cancellationData,
            }
          : req
      )
    );

    firestoreService.updateLeaveRequest(requestId, cancellationData);

    createAuditEntry('LEAVE_CANCELLED', `Cancelled leave request #${requestId} (${target.leaveType})`, requestId);
    
    // Dispatch mock cancellation email notification to console
    mockEmailService.notifyLeaveCancelled(target, `${currentUser.name} (${currentUser.role})`);

    addToast('Request Cancelled', 'The pending leave request has been cancelled.', 'info');
    return { success: true };
  };

  // Approve leave
  const legacyApproveLeave = (requestId: string, approvalNote?: string) => {
    // RBAC: Staff cannot approve
    if (currentUser.role === 'Staff') {
      return { success: false, error: 'Staff members do not have approval permissions.' };
    }

    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return { success: false, error: 'Leave request not found.' };

    // Manager can only approve their own department/reporting staff unless Super Admin or HR
    if (currentUser.role === 'Manager') {
      if (target.department !== currentUser.department && target.staffId !== currentUser.id) {
        return {
          success: false,
          error: `As Manager of ${currentUser.department}, you can only review leaves in your department.`,
        };
      }
    }

    // Deduct balance from staff member
    const balanceKey =
      target.leaveType === 'Casual'
        ? 'casual'
        : target.leaveType === 'Sick'
        ? 'sick'
        : target.leaveType === 'Compensatory' || (target.leaveType as string) === 'Earned'
        ? 'compensatory'
        : null;

    if (balanceKey) {
      setStaffList((prev) =>
        prev.map((staff) => {
          if (staff.id === target.staffId) {
            const currentBal = (staff.leaveBalance as any)[balanceKey] ?? (staff.leaveBalance as any)?.earned ?? 0;
            const updated = Math.max(0, currentBal - target.totalDays);
            const updatedBalances = {
              ...staff.leaveBalance,
              [balanceKey]: updated,
              compensatory: balanceKey === 'compensatory' ? updated : staff.leaveBalance.compensatory,
              earned: balanceKey === 'compensatory' ? updated : staff.leaveBalance.earned,
            };
            // Persist balance deduction to Firestore
            firestoreService.updateStaffFields(staff.id, { leaveBalance: updatedBalances });
            return {
              ...staff,
              leaveBalance: updatedBalances,
            };
          }
          return staff;
        })
      );
    }

    const updatedData = {
      status: 'Approved' as const,
      actionedBy: `${currentUser.name} (${currentUser.role})`,
      actionedAt: new Date().toISOString(),
    };

    // Update request locally
    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              ...updatedData,
            }
          : req
      )
    );

    // Persist to Firestore
    firestoreService.updateLeaveRequest(requestId, updatedData);

    const noteInfo = approvalNote ? ` Note: "${approvalNote}"` : '';
    createAuditEntry(
      'LEAVE_APPROVED',
      `Approved ${target.totalDays} day(s) ${target.leaveType} leave for ${target.staffName}.${noteInfo}`,
      requestId
    );

    // Dispatch mock approval email notification (logs to console)
    mockEmailService.notifyLeaveApproved(
      target,
      `${currentUser.name} (${currentUser.role})`,
      approvalNote
    );

    // Dispatch real-time Email & WhatsApp notification to applicant
    const applicantStaff = staffList.find((s) => s.id === target.staffId);
    notificationService.dispatchLeaveApproved(
      { ...target, ...updatedData },
      `${currentUser.name} (${currentUser.role})`,
      applicantStaff?.phone,
      approvalNote
    );

    addToast(
      'Leave Approved & Dispatched',
      `Approval confirmation dispatched via WhatsApp & Email to ${target.staffName}.`,
      'success'
    );
    return { success: true };
  };

  // Reject leave
  const legacyRejectLeave = (requestId: string, rejectionReason: string) => {
    if (currentUser.role === 'Staff') {
      return { success: false, error: 'Staff members do not have rejection permissions.' };
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return { success: false, error: 'A rejection comment is mandatory.' };
    }

    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return { success: false, error: 'Leave request not found.' };

    if (currentUser.role === 'Manager') {
      if (target.department !== currentUser.department) {
        return {
          success: false,
          error: `As Manager of ${currentUser.department}, you can only review leaves in your department.`,
        };
      }
    }

    const rejectedData = {
      status: 'Rejected' as const,
      actionedBy: `${currentUser.name} (${currentUser.role})`,
      actionedAt: new Date().toISOString(),
      rejectionReason: rejectionReason.trim(),
    };

    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              ...rejectedData,
            }
          : req
      )
    );

    // Persist rejection to Firestore
    firestoreService.updateLeaveRequest(requestId, rejectedData);

    createAuditEntry(
      'LEAVE_REJECTED',
      `Rejected ${target.staffName}'s ${target.leaveType} leave. Reason: "${rejectionReason.trim()}"`,
      requestId
    );

    // Dispatch mock rejection email notification (logs to console)
    mockEmailService.notifyLeaveRejected(
      target,
      `${currentUser.name} (${currentUser.role})`,
      rejectionReason.trim()
    );

    // Dispatch real-time Email & WhatsApp update to applicant
    const applicantStaff = staffList.find((s) => s.id === target.staffId);
    notificationService.dispatchLeaveRejected(
      target,
      `${currentUser.name} (${currentUser.role})`,
      rejectionReason.trim(),
      applicantStaff?.phone
    );

    addToast('Leave Rejected & Dispatched', `Rejection notice dispatched to ${target.staffName}.`, 'warning');
    return { success: true };
  };

  // Super Admin override
  const legacyOverrideLeave = (requestId: string, newStatus: LeaveRequest['status'], reason: string) => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Only Super Admin can override leave statuses.' };
    }

    const target = leaveRequests.find((r) => r.id === requestId);
    if (!target) return { success: false, error: 'Leave request not found.' };

    // If overriding to Approved, handle deduction if it wasn't approved before
    const balanceKey =
      target.leaveType === 'Casual'
        ? 'casual'
        : target.leaveType === 'Sick'
        ? 'sick'
        : target.leaveType === 'Compensatory' || (target.leaveType as string) === 'Earned'
        ? 'compensatory'
        : null;

    if (newStatus === 'Approved' && target.status !== 'Approved' && balanceKey) {
      setStaffList((prev) =>
        prev.map((staff) => {
          if (staff.id === target.staffId) {
            const currentBal = (staff.leaveBalance as any)[balanceKey] ?? (staff.leaveBalance as any)?.earned ?? 0;
            const updatedBal = Math.max(0, currentBal - target.totalDays);
            const updatedBalance = {
              ...staff.leaveBalance,
              [balanceKey]: updatedBal,
              compensatory: balanceKey === 'compensatory' ? updatedBal : staff.leaveBalance.compensatory,
              earned: balanceKey === 'compensatory' ? updatedBal : staff.leaveBalance.earned,
            };
            firestoreService.updateStaffFields(staff.id, { leaveBalance: updatedBalance });
            return {
              ...staff,
              leaveBalance: updatedBalance,
            };
          }
          return staff;
        })
      );
    } else if (target.status === 'Approved' && newStatus !== 'Approved' && balanceKey) {
      // Refund balance
      setStaffList((prev) =>
        prev.map((staff) => {
          if (staff.id === target.staffId) {
            const currentBal = (staff.leaveBalance as any)[balanceKey] ?? (staff.leaveBalance as any)?.earned ?? 0;
            const updatedBal = currentBal + target.totalDays;
            const updatedBalance = {
              ...staff.leaveBalance,
              [balanceKey]: updatedBal,
              compensatory: balanceKey === 'compensatory' ? updatedBal : staff.leaveBalance.compensatory,
              earned: balanceKey === 'compensatory' ? updatedBal : staff.leaveBalance.earned,
            };
            firestoreService.updateStaffFields(staff.id, { leaveBalance: updatedBalance });
            return {
              ...staff,
              leaveBalance: updatedBalance,
            };
          }
          return staff;
        })
      );
    }

    const overrideUpdate = {
      status: newStatus,
      actionedBy: `${currentUser.name} (Super Admin Override)`,
      actionedAt: new Date().toISOString(),
      ...(newStatus === 'Rejected' && reason ? { rejectionReason: reason } : {}),
    };

    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              ...overrideUpdate,
            }
          : req
      )
    );

    firestoreService.updateLeaveRequest(requestId, overrideUpdate);

    createAuditEntry(
      'ADMIN_OVERRIDE',
      `Super Admin overrode request #${requestId} from ${target.status} to ${newStatus}. Note: ${reason}`,
      requestId
    );

    if (newStatus === 'Approved') {
      mockEmailService.notifyLeaveApproved(target, `${currentUser.name} (Super Admin Override)`, reason);
      notificationService.dispatchLeaveApproved(
        { ...target, ...overrideUpdate },
        `${currentUser.name} (Super Admin Override)`,
        staffList.find((staff) => staff.id === target.staffId)?.phone,
        reason
      );
    } else if (newStatus === 'Rejected') {
      mockEmailService.notifyLeaveRejected(target, `${currentUser.name} (Super Admin Override)`, reason);
      notificationService.dispatchLeaveRejected(
        { ...target, ...overrideUpdate },
        `${currentUser.name} (Super Admin Override)`,
        reason,
        staffList.find((staff) => staff.id === target.staffId)?.phone
      );
    }

    addToast('Override Applied', `Status updated to ${newStatus} in Cloud Firestore.`, 'success');
    return { success: true };
  };

  const saveLeaveStatus = async (
    target: LeaveRequest,
    status: LeaveRequest['status'],
    rejectionReason = '',
    isOverride = false
  ): Promise<{success: boolean; error?: string; request?: LeaveRequest}> => {
    const actionedBy = `${currentUser.name} (${isOverride ? 'Super Admin Override' : currentUser.role})`;
    const updates: Partial<LeaveRequest> = {
      status,
      actionedBy,
      actionedAt: new Date().toISOString(),
      rejectionReason: status === 'Rejected' ? rejectionReason : '',
    };

    const balanceKey =
      target.leaveType === 'Casual'
        ? 'casual'
        : target.leaveType === 'Sick'
          ? 'sick'
          : target.leaveType === 'Compensatory' || (target.leaveType as string) === 'Earned'
            ? 'compensatory'
            : null;
    let updatedStaff: StaffMember | undefined;
    const wasApproved = target.status === 'Approved';
    const willBeApproved = status === 'Approved';
    if (balanceKey && wasApproved !== willBeApproved) {
      const staff = staffList.find((member) => member.id === target.staffId);
      if (!staff) {
        return {success: false, error: 'Staff profile for the leave request was not found.'};
      }

      const currentBalance = staff.leaveBalance[balanceKey] ?? staff.leaveBalance.earned ?? 0;
      const nextBalance = willBeApproved
        ? Math.max(0, currentBalance - target.totalDays)
        : currentBalance + target.totalDays;
      const leaveBalance = {
        ...staff.leaveBalance,
        [balanceKey]: nextBalance,
        ...(balanceKey === 'compensatory' ? {earned: nextBalance} : {}),
      };
      updatedStaff = {...staff, leaveBalance};
    }

    const saved = await firestoreService.updateLeaveRequestAndBalance(
      target.id,
      updates,
      target.status,
      updatedStaff?.id,
      updatedStaff?.leaveBalance
    );
    if (!saved) {
      const error = 'Could not update the leave request. Refresh and try again.';
      addToast('Leave update failed', error, 'warning');
      return {success: false, error};
    }

    const updatedRequest = {...target, ...updates};
    setLeaveRequests((previous) => previous.map((request) =>
      request.id === target.id ? updatedRequest : request
    ));
    if (updatedStaff) {
      setStaffList((previous) => previous.map((staff) =>
        staff.id === updatedStaff?.id ? updatedStaff : staff
      ));
    }
    return {success: true, request: updatedRequest};
  };

  const sendDecisionEmail = async (
    request: LeaveRequest,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string
  ) => {
    const result = await emailJsNotificationService.notifyLeaveDecision(
      request,
      request.actionedBy || `${currentUser.name} (${currentUser.role})`,
      staffList,
      status,
      rejectionReason
    );
    reportEmailDelivery(`${status} request notifications`, result);
  };

  const cancelLeave = async (requestId: string): Promise<{success: boolean; error?: string}> => {
    const target = leaveRequests.find((request) => request.id === requestId);
    if (!target) return {success: false, error: 'Leave request not found.'};
    if (target.staffId !== currentUser.id && currentUser.role !== 'Super Admin') {
      return {success: false, error: 'You can only cancel your own leave requests.'};
    }
    if (target.status !== 'Pending') {
      return {success: false, error: 'Only Pending leave requests can be cancelled.'};
    }

    const result = await saveLeaveStatus(target, 'Cancelled');
    if (!result.success) return result;
    createAuditEntry('LEAVE_CANCELLED', `Cancelled leave request #${requestId} (${target.leaveType})`, requestId);
    addToast('Request Cancelled', 'The pending leave request has been cancelled.', 'info');
    return {success: true};
  };

  const approveLeave = async (
    requestId: string,
    approvalNote?: string
  ): Promise<{success: boolean; error?: string}> => {
    if (!['Super Admin', 'HR', 'Manager'].includes(currentUser.role)) {
      return {success: false, error: 'You do not have leave approval permissions.'};
    }
    const target = leaveRequests.find((request) => request.id === requestId);
    if (!target) return {success: false, error: 'Leave request not found.'};
    if (currentUser.role === 'Manager' && target.department !== currentUser.department) {
      return {success: false, error: `As Manager of ${currentUser.department}, you can only review leaves in your department.`};
    }
    if (target.status !== 'Pending') {
      return {success: false, error: 'Only Pending leave requests can be approved.'};
    }

    const result = await saveLeaveStatus(target, 'Approved');
    if (!result.success || !result.request) return result;
    const actionedBy = result.request.actionedBy || `${currentUser.name} (${currentUser.role})`;
    createAuditEntry(
      'LEAVE_APPROVED',
      `Approved ${target.totalDays} day(s) ${target.leaveType} leave for ${target.staffName}.${approvalNote ? ` Note: "${approvalNote}"` : ''}`,
      requestId
    );
    await sendDecisionEmail(result.request, 'Approved');
    void notificationService.dispatchLeaveApproved(
      result.request,
      actionedBy,
      staffList.find((staff) => staff.id === target.staffId)?.phone,
      approvalNote
    ).catch((error) => console.error('[AppContext] Could not record approval notification:', error));
    addToast('Leave Approved', `Leave request for ${target.staffName} was approved.`, 'success');
    return {success: true};
  };

  const rejectLeave = async (
    requestId: string,
    rejectionReason: string
  ): Promise<{success: boolean; error?: string}> => {
    if (!rejectionReason.trim()) return {success: false, error: 'A rejection comment is mandatory.'};
    if (!['Super Admin', 'HR', 'Manager'].includes(currentUser.role)) {
      return {success: false, error: 'You do not have leave rejection permissions.'};
    }
    const target = leaveRequests.find((request) => request.id === requestId);
    if (!target) return {success: false, error: 'Leave request not found.'};
    if (currentUser.role === 'Manager' && target.department !== currentUser.department) {
      return {success: false, error: `As Manager of ${currentUser.department}, you can only review leaves in your department.`};
    }
    if (target.status !== 'Pending') {
      return {success: false, error: 'Only Pending leave requests can be rejected.'};
    }

    const reason = rejectionReason.trim();
    const result = await saveLeaveStatus(target, 'Rejected', reason);
    if (!result.success || !result.request) return result;
    const actionedBy = result.request.actionedBy || `${currentUser.name} (${currentUser.role})`;
    createAuditEntry(
      'LEAVE_REJECTED',
      `Rejected ${target.staffName}'s ${target.leaveType} leave. Reason: "${reason}"`,
      requestId
    );
    await sendDecisionEmail(result.request, 'Rejected', reason);
    void notificationService.dispatchLeaveRejected(
      result.request,
      actionedBy,
      reason,
      staffList.find((staff) => staff.id === target.staffId)?.phone
    ).catch((error) => console.error('[AppContext] Could not record rejection notification:', error));
    addToast('Leave Rejected', `Leave request for ${target.staffName} was rejected.`, 'warning');
    return {success: true};
  };

  const overrideLeave = async (
    requestId: string,
    newStatus: LeaveRequest['status'],
    reason: string
  ): Promise<{success: boolean; error?: string}> => {
    if (currentUser.role !== 'Super Admin') {
      return {success: false, error: 'Only Super Admin can override leave statuses.'};
    }
    const target = leaveRequests.find((request) => request.id === requestId);
    if (!target) return {success: false, error: 'Leave request not found.'};

    const result = await saveLeaveStatus(target, newStatus, reason.trim(), true);
    if (!result.success || !result.request) return result;
    createAuditEntry(
      'ADMIN_OVERRIDE',
      `Super Admin overrode request #${requestId} from ${target.status} to ${newStatus}. Note: ${reason}`,
      requestId
    );
    if (target.status !== newStatus && (newStatus === 'Approved' || newStatus === 'Rejected')) {
      await sendDecisionEmail(result.request, newStatus, reason.trim());
      const actionedBy = result.request.actionedBy || `${currentUser.name} (Super Admin Override)`;
      if (newStatus === 'Approved') {
        void notificationService.dispatchLeaveApproved(
          result.request,
          actionedBy,
          staffList.find((staff) => staff.id === target.staffId)?.phone,
          reason
        ).catch((error) => console.error('[AppContext] Could not record override notification:', error));
      } else {
        void notificationService.dispatchLeaveRejected(
          result.request,
          actionedBy,
          reason,
          staffList.find((staff) => staff.id === target.staffId)?.phone
        ).catch((error) => console.error('[AppContext] Could not record override notification:', error));
      }
    }
    addToast('Override Applied', `Status updated to ${newStatus}.`, 'success');
    return {success: true};
  };

  // Staff CRUD
  const addStaff = async (staffData: Omit<StaffMember, 'id'>) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Permission denied: Only Super Admin and HR can add staff.' };
    }

    if (!staffData.name || !staffData.email) {
      return { success: false, error: 'Full name and email are required.' };
    }

    if (staffList.some((s) => s.email.toLowerCase() === staffData.email.toLowerCase())) {
      return { success: false, error: 'A staff member with this email already exists.' };
    }

    const existingIds = new Set(staffList.map((staff) => staff.id));
    let nextStaffNumber =
      staffList.reduce((highest, staff) => {
        const match = /^dbica-(\d+)$/.exec(staff.id);
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0) + 1;
    let newId = `dbica-${String(nextStaffNumber).padStart(3, '0')}`;
    while (existingIds.has(newId)) {
      nextStaffNumber += 1;
      newId = `dbica-${String(nextStaffNumber).padStart(3, '0')}`;
    }
    const avatarBgs = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-purple-600',
      'bg-rose-600',
      'bg-teal-600',
      'bg-amber-600',
      'bg-emerald-600',
    ];
    const avatarBg = avatarBgs[Math.floor(Math.random() * avatarBgs.length)];

    // Staff accounts are provisioned in Firebase Authentication with this initial password.
    const initialPassword = staffData.portalPassword && staffData.portalPassword.trim()
      ? staffData.portalPassword.trim()
      : 'dbica@2026';

    const newStaff: StaffMember = {
      ...staffData,
      email: staffData.email.trim().toLowerCase(),
      id: newId,
      avatarBg,
      status: staffData.status || 'Active',
      accountStatus: 'active',
      portalPassword: initialPassword,
      mustChangePassword: staffData.mustChangePassword !== false,
    };

    if (initialPassword.length < 6) {
      return {
        success: false,
        error: 'Firebase Authentication requires passwords to be at least 6 characters long.',
      };
    }

    let authUid: string;
    try {
      authUid = await createStaffAuthAccount(newStaff.email, initialPassword);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'This email already has a Firebase Authentication account. Use a different email or resolve the existing account before creating this staff member.',
        };
      }
      if (code === 'auth/weak-password') {
        return {
          success: false,
          error: 'Firebase rejected this password. Please choose a stronger password with at least 6 characters.',
        };
      }
      console.error('[AppContext] Could not create the Firebase Authentication account:', error);
      return {
        success: false,
        error: 'Could not create the Firebase Authentication account. Check that Email/Password sign-in is enabled in Firebase Authentication and try again.',
      };
    }

    newStaff.authUid = authUid;
    const saved = await firestoreService.upsertStaff(newStaff);
    if (!saved) {
      try {
        await deleteStaffAuthAccount(newStaff.email, initialPassword);
      } catch (error) {
        console.error('[AppContext] Failed to roll back the Firebase Authentication account:', error);
      }
      return {
        success: false,
        error: 'Could not save the staff member to Firestore. Check your connection and database permissions, then try again.',
      };
    }

    setStaffList((prev) => [...prev, newStaff]);

    const directLoginLink = `${window.location.origin}/#login?email=${encodeURIComponent(newStaff.email)}`;

    createAuditEntry(
      'STAFF_CREATED',
      `Onboarded staff profile for ${newStaff.name} (${newStaff.role}, ${newStaff.department}) with instant login credentials.`,
      newId
    );

    // Auto-dispatch onboarding invitation notice
    notificationService.dispatchCustomNotification({
      recipientName: newStaff.name,
      email: newStaff.email,
      phone: newStaff.phone,
      channel: 'both',
      subject: 'Welcome to DBICA Staff Portal - Your Login Credentials',
      message: `Dear ${newStaff.name}, welcome to DBICA! Your staff leave portal access is active.\n\nPortal: ${directLoginLink}\nStaff ID: ${newStaff.id}\nEmail: ${newStaff.email}\nTemporary Password: ${initialPassword}\n\nPlease sign in to view your dashboard.`,
      targetStaffId: newStaff.id,
      department: newStaff.department,
    });

    addToast(
      'Staff Onboarded Successfully',
      `${newStaff.name} created. Credentials ready to share with staff member.`,
      'success'
    );
    return { success: true, newStaff, directLoginLink, initialPassword };
  };

  const updateStaff = (id: string, staffData: Partial<StaffMember>) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Permission denied: Only Super Admin and HR can update staff.' };
    }

    const target = staffList.find((s) => s.id === id);
    if (!target) return { success: false, error: 'Staff member not found.' };
    if (staffData.email && staffData.email.trim().toLowerCase() !== target.email.toLowerCase()) {
      return {
        success: false,
        error: 'Changing a staff sign-in email must be coordinated with Firebase Authentication. Update the Firebase account first, then update the staff profile.',
      };
    }

    // HR cannot change Super Admin role or modify Director's primary profile
    if (currentUser.role === 'HR' && target.role === 'Super Admin' && staffData.role && staffData.role !== 'Super Admin') {
      return { success: false, error: 'HR cannot demote or alter the Super Admin role.' };
    }

    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...staffData } : s))
    );

    firestoreService.updateStaffFields(id, staffData);

    createAuditEntry('STAFF_UPDATED', `Updated profile information for ${target.name}`, id);
    addToast('Profile Updated', `Updated details for ${target.name} in cloud database.`, 'success');
    return { success: true };
  };

  // User Self Profile Update (persisted in localStorage & Firestore, strictly for own profile)
  const updateOwnProfile = async (profileData: {
    name: string;
    email: string;
    phone: string;
    department: Department;
    designation: string;
    portalPassword?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    // Strict check: Target is always current user
    const targetId = currentUser.id;
    const target = staffList.find((s) => s.id === targetId);
    if (!target) return { success: false, error: 'Current staff record not found.' };

    if (!profileData.name || !profileData.name.trim()) {
      return { success: false, error: 'Name cannot be empty.' };
    }

    if (!profileData.email || !profileData.email.trim()) {
      return { success: false, error: 'Work email is required.' };
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email.trim())) {
      return { success: false, error: 'Please enter a valid work email address.' };
    }

    // Check if email already belongs to another staff member
    const existingEmail = staffList.find(
      (s) => s.id !== targetId && s.email.toLowerCase() === profileData.email.trim().toLowerCase()
    );
    if (existingEmail) {
      return { success: false, error: 'This email address is already in use by another staff member.' };
    }
    if (profileData.email.trim().toLowerCase() !== target.email.toLowerCase()) {
      return { success: false, error: 'Changing your sign-in email requires an administrator to update Firebase Authentication and your staff profile together.' };
    }

    if (profileData.portalPassword?.trim()) {
      if (profileData.portalPassword.trim().length < 6) {
        return { success: false, error: 'Firebase passwords must be at least 6 characters long.' };
      }

      const firebaseUser = auth.currentUser;
      const identityMatches = Boolean(
        firebaseUser &&
        (
          (target.authUid && firebaseUser.uid === target.authUid) ||
          firebaseUser.email?.toLowerCase() === target.email.toLowerCase()
        )
      );
      if (!firebaseUser || !identityMatches) {
        return { success: false, error: 'Sign in as this staff member before changing the password, or use “Forgot password?” on the login page.' };
      }

      try {
        await updatePassword(firebaseUser, profileData.portalPassword.trim());
      } catch (error) {
        const code = (error as { code?: string }).code;
        console.error('[AppContext] Firebase password update failed:', code || error);
        return {
          success: false,
          error: code === 'auth/requires-recent-login'
            ? 'For security, sign out and sign in again before changing your password, or use “Forgot password?” on the login page.'
            : 'Firebase could not update your password. Use “Forgot password?” on the login page and try again.',
        };
      }
    }

    const updates: Partial<StaffMember> = {
      name: profileData.name.trim(),
      email: profileData.email.trim(),
      phone: profileData.phone.trim(),
      department: profileData.department,
      designation: profileData.designation.trim() || target.designation,
    };

    if (profileData.portalPassword && profileData.portalPassword.trim().length >= 4) {
      updates.portalPassword = profileData.portalPassword.trim();
    }

    // Update staff in list
    setStaffList((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, ...updates } : s))
    );

    // Persist to Firestore
    firestoreService.updateStaffFields(targetId, updates);

    // Also update staff's name & department in their leave requests so records stay synchronized
    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.staffId === targetId
          ? {
              ...req,
              staffName: profileData.name.trim(),
              staffEmail: profileData.email.trim(),
              department: profileData.department,
            }
          : req
      )
    );

    createAuditEntry(
      'PROFILE_SELF_UPDATED',
      `User ${target.name} updated own profile: Email -> ${profileData.email.trim()}, Department -> ${profileData.department}`,
      targetId
    );

    addToast('Profile Updated', 'Your profile has been saved. Any password change was updated in Firebase Authentication.', 'success');
    return { success: true };
  };

  const updateStaffBalance = (id: string, newBalances: StaffMember['leaveBalance']) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Permission denied: Only Super Admin and HR can manage leave balances.' };
    }

    const target = staffList.find((s) => s.id === id);
    if (!target) return { success: false, error: 'Staff member not found.' };

    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, leaveBalance: newBalances } : s))
    );

    firestoreService.updateStaffFields(id, { leaveBalance: newBalances });

    createAuditEntry(
      'BALANCE_ADJUSTED',
      `Adjusted leave balance for ${target.name} (Casual: ${newBalances.casual}, Sick: ${newBalances.sick}, Compensatory: ${newBalances.compensatory ?? (newBalances as any).earned})`,
      id
    );

    addToast('Balance Updated', `Leave balance updated for ${target.name}.`, 'success');
    return { success: true };
  };

  const deleteStaff = (id: string) => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can delete staff records.' };
    }

    const target = staffList.find((s) => s.id === id);
    if (!target) return { success: false, error: 'Staff member not found.' };

    if (target.role === 'Super Admin' && staffList.filter((s) => s.role === 'Super Admin').length <= 1) {
      return { success: false, error: 'Cannot delete the only Super Admin account in the system.' };
    }

    setStaffList((prev) => prev.filter((s) => s.id !== id));
    firestoreService.deleteStaff(id);

    createAuditEntry('STAFF_DELETED', `Deleted staff profile for ${target.name} (${target.email})`, id);
    addToast('Staff Profile Deleted', `${target.name} has been removed from the staff database. Delete their Firebase Authentication account separately.`, 'warning');
    return { success: true };
  };

  const toggleStaffStatus = (id: string) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      addToast('Permission Denied', 'Only Super Admin and HR can change staff status.', 'error');
      return;
    }

    const target = staffList.find((s) => s.id === id);
    if (!target) return;

    if (target.role === 'Super Admin' && currentUser.role === 'HR') {
      addToast('Restricted Action', 'HR cannot deactivate Super Admin accounts.', 'error');
      return;
    }

    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s))
    );

    firestoreService.updateStaffFields(id, { status: nextStatus });

    createAuditEntry('STAFF_STATUS_CHANGED', `Changed status of ${target.name} to ${nextStatus}`, id);
    addToast('Status Updated', `${target.name} is now marked as ${nextStatus}.`, 'info');
  };

  const dispatchCustomNotification = async (params: {
    recipientName: string;
    phone: string;
    email: string;
    channel: NotificationChannel;
    subject: string;
    message: string;
    targetStaffId?: string;
    department?: string;
  }) => {
    if (currentUser.role === 'Staff') {
      throw new Error('Access denied: Staff members cannot dispatch broadcast notices.');
    }

    const result = await notificationService.dispatchCustom(
      params.recipientName,
      params.phone,
      params.email,
      params.channel,
      params.subject,
      params.message,
      {
        staffId: params.targetStaffId,
        department: params.department,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
      }
    );
    return result;
  };

  // Department Customization (Super Admin)
  const createDepartment = async (deptData: Omit<DepartmentItem, 'id' | 'createdAt'>) => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can create new departments.' };
    }

    const trimmedName = deptData.name.trim();
    const trimmedCode = deptData.code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      return { success: false, error: 'Department name and department code are required.' };
    }

    if (departments.some((d) => d.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: `A department with name "${trimmedName}" already exists.` };
    }

    if (departments.some((d) => d.code.toUpperCase() === trimmedCode)) {
      return { success: false, error: `A department with code "${trimmedCode}" already exists.` };
    }

    const newDept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      description: deptData.description?.trim() || '',
      ...(deptData.hodId?.trim() ? { hodId: deptData.hodId.trim() } : {}),
      createdAt: new Date().toISOString(),
    };

    setDepartments((prev) => {
      const next = [...prev, newDept];
      try {
        localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Persist to Cloud Firestore
    await firestoreService.saveDepartment(newDept);

    createAuditEntry(
      'DEPARTMENT_CREATED',
      `Super Admin created new department "${newDept.name}" (${newDept.code})`,
      newDept.id
    );

    addToast('Department Created', `Department "${newDept.name}" created and saved successfully.`, 'success');
    return { success: true };
  };

  const updateDepartment = async (id: string, updates: Partial<Omit<DepartmentItem, 'id' | 'createdAt'>>) => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can edit departments.' };
    }

    const existing = departments.find((d) => d.id === id);
    if (!existing) {
      return { success: false, error: 'Department not found.' };
    }

    const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
    const newCode = updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code;

    if (!newName || !newCode) {
      return { success: false, error: 'Department name and code cannot be blank.' };
    }

    // Check duplicate name
    if (
      newName.toLowerCase() !== existing.name.toLowerCase() &&
      departments.some((d) => d.id !== id && d.name.toLowerCase() === newName.toLowerCase())
    ) {
      return { success: false, error: `A department with name "${newName}" already exists.` };
    }

    // Check duplicate code
    if (
      newCode.toUpperCase() !== existing.code.toUpperCase() &&
      departments.some((d) => d.id !== id && d.code.toUpperCase() === newCode)
    ) {
      return { success: false, error: `A department with code "${newCode}" already exists.` };
    }

    const oldName = existing.name;
    const resolvedHodId = updates.hodId !== undefined 
      ? (updates.hodId.trim() ? updates.hodId.trim() : undefined) 
      : existing.hodId;

    const updatedDept: DepartmentItem = {
      id: existing.id,
      name: newName,
      code: newCode,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      ...(resolvedHodId ? { hodId: resolvedHodId } : {}),
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDepartments((prev) => {
      const next = prev.map((d) => (d.id === id ? updatedDept : d));
      try {
        localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Persist department to Cloud Firestore
    await firestoreService.saveDepartment(updatedDept);

    // Propagate rename to all staff members and requests in that department if renamed
    if (newName !== oldName) {
      setStaffList((prev) =>
        prev.map((s) => {
          if (s.department === oldName) {
            const updatedStaff = { ...s, department: newName };
            firestoreService.upsertStaff(updatedStaff);
            return updatedStaff;
          }
          return s;
        })
      );
      setLeaveRequests((prev) =>
        prev.map((r) => {
          if (r.department === oldName) {
            const updatedReq = { ...r, department: newName };
            firestoreService.saveLeaveRequest(updatedReq);
            return updatedReq;
          }
          return r;
        })
      );
    }

    // If an HOD was assigned, ensure their role is Manager if they were previously Staff
    if (resolvedHodId) {
      setStaffList((prev) =>
        prev.map((s) => {
          if (s.id === resolvedHodId && s.role === 'Staff') {
            const updatedHodStaff: StaffMember = { ...s, role: 'Manager' };
            firestoreService.upsertStaff(updatedHodStaff);
            return updatedHodStaff;
          }
          return s;
        })
      );
    }

    createAuditEntry(
      'DEPARTMENT_UPDATED',
      `Super Admin updated department "${oldName}" ${newName !== oldName ? `-> "${newName}"` : ''} (${newCode})`,
      id
    );

    addToast('Department Updated', `Department "${newName}" changes saved to cloud database.`, 'success');
    return { success: true };
  };

  const deleteDepartment = async (id: string) => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can delete departments.' };
    }

    const dept = departments.find((d) => d.id === id);
    if (!dept) {
      return { success: false, error: 'Department not found.' };
    }

    const assignedStaff = staffList.filter((s) => s.department.toLowerCase() === dept.name.toLowerCase());
    if (assignedStaff.length > 0) {
      return {
        success: false,
        error: `Cannot delete department "${dept.name}" because ${assignedStaff.length} staff member(s) are currently assigned to it. Please reassign staff first.`,
      };
    }

    if (departments.length <= 1) {
      return { success: false, error: 'Cannot delete the only remaining department in the institution.' };
    }

    setDepartments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Delete from Cloud Firestore
    await firestoreService.deleteDepartment(id);

    createAuditEntry(
      'DEPARTMENT_DELETED',
      `Super Admin removed department "${dept.name}" (${dept.code}) from registry`,
      id
    );

    addToast('Department Deleted', `Department "${dept.name}" has been removed.`, 'info');
    return { success: true };
  };

  // Leave Thresholds Customization
  const updateGlobalThresholds = async (
    updates: Partial<GlobalLeaveThresholds>,
    applyToAllStaff: boolean = false
  ) => {
    if (currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Permission denied: Only Super Admin can configure global leave thresholds.' };
    }

    const compVal = updates.compensatory ?? updates.earned ?? globalThresholds.compensatory ?? (globalThresholds as any).earned ?? 15;
    const updatedConfig: GlobalLeaveThresholds = {
      ...globalThresholds,
      ...updates,
      casual: Math.max(0, updates.casual ?? globalThresholds.casual),
      sick: Math.max(0, updates.sick ?? globalThresholds.sick),
      compensatory: Math.max(0, compVal),
      earned: Math.max(0, compVal),
      compensatoryMax: Math.max(0, updates.compensatoryMax ?? (globalThresholds.compensatoryMax ?? 5)),
      updatedAt: new Date().toISOString(),
      updatedBy: `${currentUser.name} (${currentUser.role})`,
    };

    setGlobalThresholds(updatedConfig);
    try {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_THRESHOLDS, JSON.stringify(updatedConfig));
    } catch (e) {
      console.error(e);
    }

    // Persist global settings to Cloud Firestore
    await firestoreService.saveGlobalSettings(updatedConfig);

    if (applyToAllStaff) {
      setStaffList((prev) => {
        const nextStaff = prev.map((s) => {
          const updatedStaffMember: StaffMember = {
            ...s,
            leaveThresholds: {
              casual: updatedConfig.casual,
              sick: updatedConfig.sick,
              compensatory: updatedConfig.compensatory,
              earned: updatedConfig.compensatory,
            },
            leaveBalance: {
              casual: updatedConfig.casual,
              sick: updatedConfig.sick,
              compensatory: updatedConfig.compensatory,
              earned: updatedConfig.compensatory,
            },
          };
          firestoreService.upsertStaff(updatedStaffMember);
          return updatedStaffMember;
        });
        try {
          localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(nextStaff));
        } catch (e) {
          console.error(e);
        }
        return nextStaff;
      });
    }

    createAuditEntry(
      'GLOBAL_THRESHOLDS_UPDATED',
      `Super Admin updated global leave quotas: Casual=${updatedConfig.casual}d, Sick=${updatedConfig.sick}d, Compensatory=${updatedConfig.compensatory}d${
        applyToAllStaff ? ' (Applied & synchronized to all staff members)' : ''
      }`,
      'global-thresholds'
    );

    addToast(
      'Global Quotas Saved',
      applyToAllStaff
        ? 'Global thresholds updated and synchronized across all active staff members.'
        : 'Global default leave thresholds updated for DBICA institution.',
      'success'
    );

    return { success: true };
  };

  const updateStaffLeaveThresholds = async (
    staffId: string,
    thresholds: { casual: number; sick: number; compensatory?: number; earned?: number },
    remainingBalance?: { casual: number; sick: number; compensatory?: number; earned?: number },
    reason?: string
  ) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Permission denied: Only Super Admin and HR can configure staff leave thresholds.' };
    }

    const target = staffList.find((s) => s.id === staffId);
    if (!target) {
      return { success: false, error: 'Staff member not found.' };
    }

    const compThreshold = thresholds.compensatory ?? thresholds.earned ?? 15;
    const newThresholds = {
      casual: Math.max(0, thresholds.casual),
      sick: Math.max(0, thresholds.sick),
      compensatory: Math.max(0, compThreshold),
      earned: Math.max(0, compThreshold),
    };

    const compBalance = remainingBalance ? (remainingBalance.compensatory ?? remainingBalance.earned ?? 15) : (target.leaveBalance.compensatory ?? (target.leaveBalance as any).earned ?? 15);
    const newBalance = remainingBalance
      ? {
          casual: Math.max(0, remainingBalance.casual),
          sick: Math.max(0, remainingBalance.sick),
          compensatory: Math.max(0, compBalance),
          earned: Math.max(0, compBalance),
        }
      : target.leaveBalance;

    const updatedStaff: StaffMember = {
      ...target,
      leaveThresholds: newThresholds,
      leaveBalance: newBalance,
    };

    setStaffList((prev) => {
      const next = prev.map((s) => (s.id === staffId ? updatedStaff : s));
      try {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Persist updated staff to Cloud Firestore
    await firestoreService.upsertStaff(updatedStaff);

    createAuditEntry(
      'STAFF_THRESHOLD_UPDATED',
      `Updated leave threshold quotas for ${target.name}: Annual Quota [CL: ${newThresholds.casual}, SL: ${newThresholds.sick}, CO: ${newThresholds.compensatory}], Balance [CL: ${newBalance.casual}, SL: ${newBalance.sick}, CO: ${newBalance.compensatory}]. ${
        reason ? `Reason: ${reason}` : ''
      }`,
      staffId
    );

    addToast('Thresholds Updated', `Leave quotas and balance updated for ${target.name}.`, 'success');
    return { success: true };
  };

  // Reset to default seed data
  const resetToDefaultSeedData = () => {
    localStorage.removeItem(STORAGE_KEYS.STAFF);
    localStorage.removeItem(STORAGE_KEYS.LEAVES);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.DEPARTMENTS);
    localStorage.removeItem(STORAGE_KEYS.GLOBAL_THRESHOLDS);

    setStaffList(INITIAL_STAFF_MEMBERS);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setDepartments(INITIAL_DEPARTMENTS);
    setGlobalThresholds(INITIAL_GLOBAL_THRESHOLDS);
    setCurrentUserId(INITIAL_STAFF_MEMBERS[0].id);

    addToast('System Reset', 'System has been restored to clean state with Super Admin account.', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        staffList,
        leaveRequests,
        timesheetEntries,
        timesheetLoading,
        timesheetLoadError,
        addTimesheetEntry,
        updateTimesheetEntry,
        deleteTimesheetEntry,
        auditLogs,
        emailHistory,
        dispatchedNotifications,
        isCloudConnected,
        activeTab,
        setActiveTab,
        toasts,
        addToast,
        removeToast,
        isAuthenticated,
        login,
        loginAsRole,
        loginAsStaffId,
        logout,
        switchUser,
        quickSwitchRole,
        requestPasswordReset,
        toggleStaffSuspension,
        applyLeave,
        getMonthlyPermissionUsage,
        cancelLeave,
        approveLeave,
        rejectLeave,
        overrideLeave,
        addStaff,
        updateStaff,
        updateOwnProfile,
        updateStaffBalance,
        deleteStaff,
        toggleStaffStatus,
        departments,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        globalThresholds,
        updateGlobalThresholds,
        updateStaffLeaveThresholds,
        dispatchCustomNotification,
        resetToDefaultSeedData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
