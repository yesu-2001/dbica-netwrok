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
} from '../types';
import {
  INITIAL_STAFF_MEMBERS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DEPARTMENTS,
  INITIAL_GLOBAL_THRESHOLDS,
} from '../data/seedData';
import { calculateWorkingDays } from '../utils/dateUtils';
import { mockEmailService } from '../services/mockEmailService';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';

interface AppContextType {
  currentUser: StaffMember;
  staffList: StaffMember[];
  leaveRequests: LeaveRequest[];
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
  login: (identifier: string, password?: string, rememberMe?: boolean) => { success: boolean; error?: string };
  loginAsRole: (role: StaffMember['role']) => void;
  loginAsStaffId: (staffId: string) => void;
  logout: () => void;
  switchUser: (staffId: string) => void;
  quickSwitchRole: (role: StaffMember['role']) => void;

  // Zero-Trust Onboarding, Account Activation & Password Security
  activateAccount: (email: string, token: string, newPassword: string) => { success: boolean; error?: string };
  requestPasswordReset: (email: string) => { success: boolean; resetToken?: string; error?: string };
  resetPasswordWithToken: (email: string, token: string, newPassword: string) => { success: boolean; error?: string };
  resendActivationInvite: (staffId: string) => { success: boolean; inviteLink?: string; token?: string; error?: string };
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
  }) => { success: boolean; error?: string };
  
  getMonthlyPermissionStats: (staffId: string, monthStr?: string) => {
    usedMinutes: number;
    remainingMinutes: number;
    maxMinutes: number;
    requestsCount: number;
  };
  
  cancelLeave: (requestId: string) => { success: boolean; error?: string };
  approveLeave: (requestId: string, approvalNote?: string) => { success: boolean; error?: string };
  rejectLeave: (requestId: string, rejectionReason: string) => { success: boolean; error?: string };
  overrideLeave: (requestId: string, newStatus: LeaveRequest['status'], reason: string) => { success: boolean; error?: string };

  // Staff Directory & Management
  addStaff: (staffData: Omit<StaffMember, 'id'>) => {
    success: boolean;
    error?: string;
    newStaff?: StaffMember;
    activationLink?: string;
    activationToken?: string;
  };
  updateStaff: (id: string, staffData: Partial<StaffMember>) => { success: boolean; error?: string };
  updateOwnProfile: (profileData: {
    name: string;
    email: string;
    phone: string;
    department: Department;
    designation: string;
    portalPassword?: string;
  }) => { success: boolean; error?: string };
  updateStaffPassword: (staffId: string, newPassword: string) => { success: boolean; error?: string };
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
  STAFF: 'dbica_staff_v2',
  LEAVES: 'dbica_leaves_v2',
  AUDIT: 'dbica_audit_v2',
  CURRENT_USER_ID: 'dbica_current_user_id_v2',
  DEPARTMENTS: 'dbica_departments_v2',
  GLOBAL_THRESHOLDS: 'dbica_global_thresholds_v2',
  IS_AUTHENTICATED: 'dbica_is_auth_v2',
};

// Clean legacy v1 keys containing dummy seed records
try {
  ['dbica_staff_v1', 'dbica_leaves_v1', 'dbica_audit_v1', 'dbica_current_user_id_v1', 'dbica_departments_v1'].forEach((k) => {
    localStorage.removeItem(k);
  });
} catch {}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Load staff
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF);
      const parsed: StaffMember[] = saved ? JSON.parse(saved) : INITIAL_STAFF_MEMBERS;
      return parsed.map((s) => {
        const isSuperAdmin = s.id === 'dbica-001' || s.role === 'Super Admin';
        const comp = s.leaveBalance?.compensatory ?? (s.leaveBalance as any)?.earned ?? 15;
        const threshComp = s.leaveThresholds
          ? s.leaveThresholds.compensatory ?? (s.leaveThresholds as any)?.earned ?? 15
          : undefined;
        return {
          ...s,
          email: isSuperAdmin ? 'director@dbica.org' : s.email,
          userId: isSuperAdmin ? 'director@dbica.org' : s.userId,
          portalPassword: isSuperAdmin ? (s.portalPassword || 'dbica@2026') : s.portalPassword,
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
      return parsed.map((r) => {
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

  // Load audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [emailHistory, setEmailHistory] = useState<EmailNotification[]>(() =>
    mockEmailService.getHistory()
  );
  const [dispatchedNotifications, setDispatchedNotifications] = useState<DispatchedNotification[]>(
    () => notificationService.getLocalHistory()
  );
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

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

  // User Authentication & Session Management
  const login = (
    identifier: string,
    password?: string,
    rememberMe: boolean = true
  ): { success: boolean; error?: string } => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      return { success: false, error: 'Please enter your institutional email or Staff ID.' };
    }

    const matched = staffList.find(
      (s) =>
        s.email.toLowerCase() === clean ||
        s.id.toLowerCase() === clean ||
        (s.userId && s.userId.toLowerCase() === clean) ||
        (clean === 'director@dbica.org' && (s.role === 'Super Admin' || s.id === 'dbica-001')) ||
        s.name.toLowerCase().includes(clean)
    );

    if (!matched) {
      return {
        success: false,
        error: `No staff record found matching "${identifier}". Please verify your credentials or use your activation invite.`,
      };
    }

    // Safeguard 1: Brute-force Lockout check
    if (matched.lockoutUntil) {
      const lockoutTime = new Date(matched.lockoutUntil).getTime();
      if (lockoutTime > Date.now()) {
        const remainingSecs = Math.ceil((lockoutTime - Date.now()) / 1000);
        return {
          success: false,
          error: `Account is temporarily locked for security due to multiple failed login attempts. Please retry in ${remainingSecs} seconds.`,
        };
      }
    }

    // Safeguard 2: Suspension check
    if (matched.accountStatus === 'suspended' || matched.status === 'Inactive') {
      return {
        success: false,
        error: 'This staff account has been suspended by administration. Access denied.',
      };
    }

    // Safeguard 3: First-time Account Onboarding & Private Password Setup check
    if (matched.accountStatus === 'invited' && !matched.portalPassword) {
      return {
        success: false,
        error: `Account for ${matched.name} has not been activated yet. Please click "Activate Account" below using your one-time activation token to set your private password.`,
      };
    }

    // Validate account password
    if (!password || !password.trim()) {
      return { success: false, error: 'Please enter your confidential portal password.' };
    }

    const storedPass = matched.portalPassword || 'dbica@2026';

    if (password !== storedPass) {
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
            error: `Incorrect password for this staff account. (${5 - failedAttempts} attempts remaining before temporary lockout)`,
          };
        }
      }

    // Successful login: reset failed attempts and log timestamp
    const authUpdate = {
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      lastLoginAt: new Date().toISOString(),
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

    addToast('Welcome to DBICA', `Signed in as ${matched.name} (${matched.role})`, 'success');
    return { success: true };
  };

  // Zero-Trust First-Time Activation: Staff initializes their own private confidential password
  const activateAccount = (
    email: string,
    token: string,
    newPassword: string
  ): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, error: 'Both official email and one-time activation token are required.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long for security compliance.' };
    }

    const matched = staffList.find((s) => s.email.toLowerCase() === cleanEmail);
    if (!matched) {
      return { success: false, error: 'No staff record found with this email address.' };
    }

    if (matched.accountStatus === 'suspended') {
      return { success: false, error: 'This staff account is suspended. Please contact the administrator.' };
    }

    if (!matched.activationToken || matched.activationToken !== cleanToken) {
      return {
        success: false,
        error: 'Invalid activation token. Please ensure you entered the exact token from your invitation, or request a new one.',
      };
    }

    if (matched.activationExpiresAt && new Date(matched.activationExpiresAt).getTime() < Date.now()) {
      return {
        success: false,
        error: 'This activation token has expired. Please ask Super Admin or HR to reissue an invitation.',
      };
    }

    const activationUpdates = {
      portalPassword: newPassword,
      accountStatus: 'active' as const,
      status: 'Active' as const,
      activationToken: undefined,
      activationExpiresAt: undefined,
      activatedAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      lastLoginAt: new Date().toISOString(),
    };

    setStaffList((prev) =>
      prev.map((s) => (s.id === matched.id ? { ...s, ...activationUpdates } : s))
    );

    firestoreService.updateStaffFields(matched.id, activationUpdates);

    createAuditEntry(
      'ACCOUNT_ACTIVATED',
      `Staff member ${matched.name} (${matched.email}) successfully claimed account and established confidential password.`,
      matched.id
    );

    // Auto-login newly activated user
    setCurrentUserId(matched.id);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
    } catch {}

    addToast('Account Activated', `Welcome to DBICA, ${matched.name}! Your private password is set.`, 'success');
    return { success: true };
  };

  // Self-Service Password Recovery
  const requestPasswordReset = (
    email: string
  ): { success: boolean; resetToken?: string; error?: string } => {
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

    const resetToken = 'rst-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    const updates = { resetToken, resetExpiresAt };

    setStaffList((prev) =>
      prev.map((s) => (s.id === matched.id ? { ...s, ...updates } : s))
    );

    firestoreService.updateStaffFields(matched.id, updates);

    createAuditEntry(
      'PASSWORD_RESET_REQUESTED',
      `Self-service password recovery token generated for ${matched.name} (${matched.email})`,
      matched.id
    );

    notificationService.dispatchCustom(
      matched.name,
      matched.phone,
      matched.email,
      'both',
      'DBICA Portal - Password Reset Security Token',
      `Dear ${matched.name}, your one-time password reset code is: ${resetToken}. This code expires in 1 hour. Use it on the login page to establish a new password.`,
      { staffId: matched.id, staffName: matched.name, department: matched.department }
    );

    addToast('Security Code Dispatched', `Password reset token sent to ${matched.email}`, 'info');
    return { success: true, resetToken };
  };

  // Set new password using verified reset token
  const resetPasswordWithToken = (
    email: string,
    token: string,
    newPassword: string
  ): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, error: 'Email and recovery code are required.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    const matched = staffList.find((s) => s.email.toLowerCase() === cleanEmail);
    if (!matched) {
      return { success: false, error: 'No staff record found with this email address.' };
    }

    if (matched.accountStatus === 'suspended') {
      return { success: false, error: 'This account is suspended. Contact administration.' };
    }

    if (!matched.resetToken || matched.resetToken !== cleanToken) {
      return { success: false, error: 'Invalid password recovery code. Please request a fresh code.' };
    }

    if (matched.resetExpiresAt && new Date(matched.resetExpiresAt).getTime() < Date.now()) {
      return { success: false, error: 'Recovery code has expired. Please request a new one.' };
    }

    const updates = {
      portalPassword: newPassword,
      resetToken: undefined,
      resetExpiresAt: undefined,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    };

    setStaffList((prev) =>
      prev.map((s) => (s.id === matched.id ? { ...s, ...updates } : s))
    );

    firestoreService.updateStaffFields(matched.id, updates);

    createAuditEntry(
      'PASSWORD_RESET_COMPLETED',
      `Staff member ${matched.name} (${matched.email}) successfully reset password using recovery token.`,
      matched.id
    );

    addToast('Password Updated', 'Your confidential password has been updated. You can now sign in.', 'success');
    return { success: true };
  };

  // Resend or generate new onboarding invitation token
  const resendActivationInvite = (
    staffId: string
  ): { success: boolean; inviteLink?: string; token?: string; error?: string } => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Only Super Admin and HR can issue account invitations.' };
    }

    const target = staffList.find((s) => s.id === staffId);
    if (!target) return { success: false, error: 'Staff member not found.' };

    const activationToken = 'act-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const updates = {
      accountStatus: 'invited' as const,
      activationToken,
      activationExpiresAt,
    };

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, ...updates } : s))
    );

    firestoreService.updateStaffFields(staffId, updates);

    createAuditEntry(
      'ACTIVATION_INVITE_ISSUED',
      `Regenerated onboarding activation invite for ${target.name} (${target.email})`,
      staffId
    );

    notificationService.dispatchCustom(
      target.name,
      target.phone,
      target.email,
      'both',
      'DBICA Staff Portal - Onboarding Invitation & Password Setup',
      `Dear ${target.name}, your DBICA staff portal profile is ready. Use activation token: ${activationToken} or click your personal link to set your password.`,
      { staffId: target.id, staffName: target.name, department: target.department }
    );

    const inviteLink = `${window.location.origin}/#activate?token=${activationToken}&email=${encodeURIComponent(target.email)}`;

    addToast('Invitation Issued', `Onboarding link dispatched to ${target.email}`, 'success');
    return { success: true, inviteLink, token: activationToken };
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

      addToast('Authenticated', `Active as ${matched.name} • ${matched.role}`, 'success');
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

      addToast('Signed In', `Welcome back, ${matched.name}`, 'success');
    }
  };

  const logout = () => {
    createAuditEntry(
      'User Sign-Out',
      `Staff ${currentUser.name} signed out of DBICA Portal.`,
      currentUser.id
    );

    setIsAuthenticated(false);
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

  // Monthly Permission Stats (Max 60 mins / month institutional allowance)
  const getMonthlyPermissionStats = (staffId: string, monthStr?: string) => {
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
    const maxMinutes = 60;
    const remainingMinutes = Math.max(0, maxMinutes - usedMinutes);
    return {
      usedMinutes,
      remainingMinutes,
      maxMinutes,
      requestsCount: matchingRequests.length,
    };
  };

  // Apply Leave & Permission
  const applyLeave = ({
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
  }) => {
    // --- SPECIAL HANDLING FOR PERMISSION (MAX 60 MINS/MONTH) ---
    if (leaveType === 'Permission') {
      if (!startDate) {
        return { success: false, error: 'Please choose the date for the permission.' };
      }

      const minutes = permissionMinutes || 60;
      if (minutes <= 0) {
        return { success: false, error: 'Permission duration must be at least 1 minute.' };
      }
      if (minutes > 60) {
        return { success: false, error: 'Maximum permission duration per application is 60 minutes.' };
      }

      const monthKey = startDate.slice(0, 7); // YYYY-MM
      const stats = getMonthlyPermissionStats(currentUser.id, monthKey);

      if (stats.usedMinutes + minutes > 60) {
        return {
          success: false,
          error: `Maximum time for permissions per month is 60 minutes. You have already used ${stats.usedMinutes} minutes for ${monthKey}. Remaining allowance: ${stats.remainingMinutes} minutes.`,
        };
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
        permissionStartTime: permissionStartTime || '09:30 AM',
        permissionEndTime: permissionEndTime || '10:30 AM',
        reason,
        emergencyContact,
        status: 'Pending',
        appliedAt: new Date().toISOString(),
      };

      setLeaveRequests((prev) => [newRequest, ...prev]);
      createAuditEntry(
        'PERMISSION_APPLIED',
        `Submitted Permission request for ${minutes} minutes on ${startDate} (${newRequest.permissionStartTime} - ${newRequest.permissionEndTime})`,
        newRequest.id
      );

      // Save to Firestore database
      firestoreService.saveLeaveRequest(newRequest);

      // Dispatch notifications
      const applicantStaff = staffList.find((s) => s.id === currentUser.id);
      const hodStaff =
        staffList.find((s) => s.department === currentUser.department && s.role === 'Manager') ||
        staffList.find((s) => s.role === 'HR');

      notificationService.dispatchLeaveSubmitted(
        newRequest,
        applicantStaff?.phone,
        hodStaff?.phone,
        hodStaff?.name,
        hodStaff?.email
      );

      addToast(
        'Permission Application Submitted',
        `Requested ${minutes} minutes permission on ${startDate}. Dispatched via WhatsApp and Email.`,
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

      setLeaveRequests((prev) => [newRequest, ...prev]);
      createAuditEntry(
        'COMPENSATORY_LEAVE_APPLIED',
        `Claimed ${totalDays} day(s) Compensatory Leave on ${compLeaveTargetDate} for working ${hours} hrs on ${workedDate} (${workedPeriodType || 'Extra Duty'}): "${dutyText}"`,
        newRequest.id
      );

      // Save to Firestore database
      firestoreService.saveLeaveRequest(newRequest);
      mockEmailService.notifyLeaveSubmitted(newRequest);

      const applicantStaff = staffList.find((s) => s.id === currentUser.id);
      const hodStaff =
        staffList.find((s) => s.department === currentUser.department && s.role === 'Manager') ||
        staffList.find((s) => s.role === 'HR');

      notificationService.dispatchLeaveSubmitted(
        newRequest,
        applicantStaff?.phone,
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

    setLeaveRequests((prev) => [newRequest, ...prev]);
    createAuditEntry(
      'LEAVE_APPLIED',
      `Submitted ${totalDays} day(s) of ${leaveType} Leave (${startDate} to ${endDate})`,
      newRequest.id
    );

    // Save to Firestore database
    firestoreService.saveLeaveRequest(newRequest);

    // Dispatch mock email notifications
    mockEmailService.notifyLeaveSubmitted(newRequest);

    // Dispatch official Email and WhatsApp confirmation to applicant & HoD acknowledgement
    const applicantStaff = staffList.find((s) => s.id === currentUser.id);
    const hodStaff =
      staffList.find((s) => s.department === currentUser.department && s.role === 'Manager') ||
      staffList.find((s) => s.role === 'HR');

    notificationService.dispatchLeaveSubmitted(
      newRequest,
      applicantStaff?.phone,
      hodStaff?.phone,
      hodStaff?.name,
      hodStaff?.email
    );

    addToast(
      'Leave Application Submitted',
      `Confirmation sent via WhatsApp and Email for ${totalDays} day(s) of ${leaveType} Leave.`,
      'success'
    );
    return { success: true };
  };

  // Cancel own pending leave
  const cancelLeave = (requestId: string) => {
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
  const approveLeave = (requestId: string, approvalNote?: string) => {
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
  const rejectLeave = (requestId: string, rejectionReason: string) => {
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
  const overrideLeave = (requestId: string, newStatus: LeaveRequest['status'], reason: string) => {
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
    } else if (newStatus === 'Rejected') {
      mockEmailService.notifyLeaveRejected(target, `${currentUser.name} (Super Admin Override)`, reason);
    }

    addToast('Override Applied', `Status updated to ${newStatus} in Cloud Firestore.`, 'success');
    return { success: true };
  };

  // Staff CRUD
  const addStaff = (staffData: Omit<StaffMember, 'id'>) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Permission denied: Only Super Admin and HR can add staff.' };
    }

    if (!staffData.name || !staffData.email) {
      return { success: false, error: 'Full name and email are required.' };
    }

    if (staffList.some((s) => s.email.toLowerCase() === staffData.email.toLowerCase())) {
      return { success: false, error: 'A staff member with this email already exists.' };
    }

    const newId = `dbica-${String(staffList.length + 1).padStart(3, '0')}`;
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

    // Safeguarding Architecture: Zero-Knowledge Admin Creation
    // Super Admin NEVER generates or knows staff password.
    // Instead, a high-entropy activation token is generated for the staff member to set their own private password.
    const activationToken = 'act-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days validity

    const newStaff: StaffMember = {
      ...staffData,
      id: newId,
      avatarBg,
      status: staffData.status || 'Active',
      accountStatus: 'invited',
      activationToken,
      activationExpiresAt,
      portalPassword: undefined, // Strictly confidential, to be chosen by staff
    };

    setStaffList((prev) => [...prev, newStaff]);
    firestoreService.upsertStaff(newStaff);

    createAuditEntry(
      'STAFF_CREATED',
      `Onboarded staff profile for ${newStaff.name} (${newStaff.role}, ${newStaff.department}). One-time activation token issued for employee password setup.`,
      newId
    );

    // Auto-dispatch onboarding invitation notice
    notificationService.dispatchCustomNotification({
      recipientName: newStaff.name,
      email: newStaff.email,
      phone: newStaff.phone,
      channel: 'both',
      subject: 'Welcome to DBICA - Account Invitation & Password Setup',
      message: `Dear ${newStaff.name}, your DBICA staff profile has been created. To establish your confidential password, use activation token: ${activationToken} or click your personal onboarding link.`,
      targetStaffId: newStaff.id,
      department: newStaff.department,
    });

    const activationLink = `${window.location.origin}/#activate?token=${activationToken}&email=${encodeURIComponent(newStaff.email)}`;

    addToast(
      'Staff Onboarded & Invite Dispatched',
      `${newStaff.name} created. Secure activation link generated for employee password setup.`,
      'success'
    );
    return { success: true, newStaff, activationLink, activationToken };
  };

  const updateStaff = (id: string, staffData: Partial<StaffMember>) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
      return { success: false, error: 'Permission denied: Only Super Admin and HR can update staff.' };
    }

    const target = staffList.find((s) => s.id === id);
    if (!target) return { success: false, error: 'Staff member not found.' };

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

  const updateStaffPassword = (staffId: string, newPassword: string) => {
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, portalPassword: newPassword.trim() } : s))
    );

    firestoreService.updateStaffFields(staffId, { portalPassword: newPassword.trim() });
    createAuditEntry('PASSWORD_UPDATED', `Updated portal authentication password for staff ID ${staffId}`, staffId);
    addToast('Password Saved', 'Account password updated successfully in database.', 'success');
    return { success: true };
  };

  // User Self Profile Update (persisted in localStorage & Firestore, strictly for own profile)
  const updateOwnProfile = (profileData: {
    name: string;
    email: string;
    phone: string;
    department: Department;
    designation: string;
    portalPassword?: string;
  }) => {
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

    addToast('Profile Updated', 'Your profile and password have been saved to the database.', 'success');
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
    addToast('Staff Deleted', `${target.name} has been removed from the database.`, 'info');
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
        activateAccount,
        requestPasswordReset,
        resetPasswordWithToken,
        resendActivationInvite,
        toggleStaffSuspension,
        applyLeave,
        getMonthlyPermissionStats,
        cancelLeave,
        approveLeave,
        rejectLeave,
        overrideLeave,
        addStaff,
        updateStaff,
        updateOwnProfile,
        updateStaffPassword,
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
