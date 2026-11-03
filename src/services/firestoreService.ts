import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import {
  StaffMember,
  LeaveRequest,
  DepartmentItem,
  GlobalLeaveThresholds,
  AuditLog,
  DispatchedNotification,
} from '../types';
import {
  INITIAL_STAFF_MEMBERS,
  INITIAL_DEPARTMENTS,
  INITIAL_GLOBAL_THRESHOLDS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_AUDIT_LOGS,
} from '../data/seedData';

// Password assignment helper for Super Admin account
const DEFAULT_PASSWORDS: Record<string, string> = {
  'dbica-001': 'dbica@2026',
  'director@dbica.org': 'dbica@2026',
};

// Helper to remove undefined values recursively so Firestore setDoc never throws Unsupported field value: undefined
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export class FirestoreService {
  private isSeeded = false;

  /**
   * Initializes Firestore collections if empty, populating DBICA faculty,
   * departments, thresholds, and initial requests.
   */
  async seedIfEmpty(): Promise<boolean> {
    if (this.isSeeded) return true;
    try {
      const staffSnapshot = await getDocs(collection(db, COLLECTIONS.STAFF));
      if (!staffSnapshot.empty) {
        this.isSeeded = true;
        return true;
      }

      console.info('[Firestore] Database is empty. Seeding initial DBICA faculty, departments, and quotas...');

      // 1. Seed Staff Members with account credentials
      for (const staff of INITIAL_STAFF_MEMBERS) {
        const staffWithPass: StaffMember = {
          ...staff,
          portalPassword: DEFAULT_PASSWORDS[staff.id] || 'dbica@2026',
        };
        await setDoc(doc(db, COLLECTIONS.STAFF, staff.id), staffWithPass);
      }

      // 2. Seed Departments
      for (const dept of INITIAL_DEPARTMENTS) {
        await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, dept.id), dept);
      }

      // 3. Seed Global Settings
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'globalThresholds'), INITIAL_GLOBAL_THRESHOLDS);

      // 4. Seed Initial Leave Requests
      for (const req of INITIAL_LEAVE_REQUESTS) {
        await setDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, req.id), req);
      }

      // 5. Seed Initial Audit Logs
      for (const log of INITIAL_AUDIT_LOGS) {
        await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, log.id), log);
      }

      console.info('[Firestore] Seeding completed successfully.');
      this.isSeeded = true;
      return true;
    } catch (error) {
      console.warn('[Firestore] Seed check or write encountered error:', error);
      return false;
    }
  }

  /**
   * Purges all sample mock data (David Anthony upcoming leaves, Kavitha Raman, Theresa, test audit logs)
   * from the live Cloud Firestore database so the application runs on a 100% clean production slate.
   */
  async purgeLegacyMockData(): Promise<void> {
    try {
      const mockLeaveIds = ['req-001', 'req-002'];
      const mockStaffIds = ['dbica-002', 'dbica-003', 'dbica-004'];
      const mockAuditIds = ['audit-001'];

      // 1. Delete mock leave requests
      for (const reqId of mockLeaveIds) {
        try {
          await deleteDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, reqId));
        } catch {
          // Ignore if already deleted
        }
      }

      // Check and delete any remaining leaves matching mock staff names or IDs
      const reqSnap = await getDocs(collection(db, COLLECTIONS.LEAVE_REQUESTS));
      for (const d of reqSnap.docs) {
        const data = d.data();
        if (
          mockLeaveIds.includes(d.id) ||
          mockStaffIds.includes(data.staffId) ||
          data.staffName === 'David Anthony' ||
          data.staffName === 'Kavitha Raman'
        ) {
          try {
            await deleteDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, d.id));
            console.info(`[Firestore] Purged sample leave request: ${d.id}`);
          } catch {}
        }
      }

      // 2. Delete mock staff members from Firestore
      for (const staffId of mockStaffIds) {
        try {
          await deleteDoc(doc(db, COLLECTIONS.STAFF, staffId));
          console.info(`[Firestore] Purged sample staff member: ${staffId}`);
        } catch {}
      }

      // 3. Delete mock audit logs
      for (const auditId of mockAuditIds) {
        try {
          await deleteDoc(doc(db, COLLECTIONS.AUDIT_LOGS, auditId));
        } catch {}
      }

      console.info('[Firestore] Legacy mock data purge completed cleanly.');
    } catch (err) {
      console.warn('[Firestore] Error during legacy mock data purge:', err);
    }
  }

  /**
   * Loads all core collections from Firestore
   */
  async loadAllData(): Promise<{
    staffList: StaffMember[];
    departments: DepartmentItem[];
    globalThresholds: GlobalLeaveThresholds | null;
    leaveRequests: LeaveRequest[];
    auditLogs: AuditLog[];
    notifications: DispatchedNotification[];
  } | null> {
    try {
      await this.seedIfEmpty();

      // Purge legacy sample data in live Firestore if present
      await this.purgeLegacyMockData();

      // Fetch Staff
      const staffSnap = await getDocs(collection(db, COLLECTIONS.STAFF));
      const rawStaffList = staffSnap.docs.map((d) => d.data() as StaffMember);
      const staffList = rawStaffList.filter(
        (s) =>
          !['dbica-002', 'dbica-003', 'dbica-004'].includes(s.id) &&
          s.name !== 'David Anthony' &&
          s.name !== 'Kavitha Raman'
      );

      // Fetch Departments
      const deptSnap = await getDocs(collection(db, COLLECTIONS.DEPARTMENTS));
      const departments = deptSnap.docs.map((d) => d.data() as DepartmentItem);

      // Fetch Global Settings
      const settingsSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'globalThresholds'));
      const globalThresholds = settingsSnap.exists()
        ? (settingsSnap.data() as GlobalLeaveThresholds)
        : null;

      // Fetch Leave Requests
      const reqSnap = await getDocs(collection(db, COLLECTIONS.LEAVE_REQUESTS));
      const rawLeaveRequests = reqSnap.docs.map((d) => d.data() as LeaveRequest);
      const leaveRequests = rawLeaveRequests.filter(
        (r) =>
          !['req-001', 'req-002'].includes(r.id) &&
          r.staffName !== 'David Anthony' &&
          r.staffName !== 'Kavitha Raman' &&
          !['dbica-002', 'dbica-003', 'dbica-004'].includes(r.staffId)
      );

      // Fetch Audit Logs
      const auditSnap = await getDocs(
        query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'), limit(150))
      );
      const rawAuditLogs = auditSnap.docs.map((d) => d.data() as AuditLog);
      const auditLogs = rawAuditLogs.filter((a) => a.id !== 'audit-001');

      // Fetch Dispatched Notifications
      const notifSnap = await getDocs(
        query(collection(db, COLLECTIONS.NOTIFICATIONS), orderBy('timestamp', 'desc'), limit(100))
      );
      const notifications = notifSnap.docs.map((d) => d.data() as DispatchedNotification);

      return {
        staffList,
        departments,
        globalThresholds,
        leaveRequests,
        auditLogs,
        notifications,
      };
    } catch (error) {
      console.warn('[Firestore] Failed to load from cloud database:', error);
      return null;
    }
  }

  // --- Real-time Listeners (onSnapshot) ---

  subscribeStaff(
    onData: (staff: StaffMember[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.STAFF),
      (snap) => {
        const staff = snap.docs
          .map((d) => d.data() as StaffMember)
          .filter(
            (s) =>
              !['dbica-002', 'dbica-003', 'dbica-004'].includes(s.id) &&
              s.name !== 'David Anthony' &&
              s.name !== 'Kavitha Raman'
          );
        onData(staff);
      },
      (err) => {
        console.warn('[Firestore] Staff snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeLeaveRequests(
    onData: (requests: LeaveRequest[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.LEAVE_REQUESTS),
      (snap) => {
        const requests = snap.docs
          .map((d) => d.data() as LeaveRequest)
          .filter(
            (r) =>
              !['req-001', 'req-002'].includes(r.id) &&
              r.staffName !== 'David Anthony' &&
              r.staffName !== 'Kavitha Raman' &&
              !['dbica-002', 'dbica-003', 'dbica-004'].includes(r.staffId)
          );
        onData(requests);
      },
      (err) => {
        console.warn('[Firestore] Leave requests snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeDepartments(
    onData: (depts: DepartmentItem[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTIONS.DEPARTMENTS),
      (snap) => {
        const depts = snap.docs.map((d) => d.data() as DepartmentItem);
        onData(depts);
      },
      (err) => {
        console.warn('[Firestore] Departments snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeSettings(
    onData: (settings: GlobalLeaveThresholds) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    return onSnapshot(
      doc(db, COLLECTIONS.SETTINGS, 'globalThresholds'),
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as GlobalLeaveThresholds);
        }
      },
      (err) => {
        console.warn('[Firestore] Settings snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeAuditLogs(
    onData: (logs: AuditLog[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.AUDIT_LOGS),
      orderBy('timestamp', 'desc'),
      limit(150)
    );
    return onSnapshot(
      q,
      (snap) => {
        const logs = snap.docs.map((d) => d.data() as AuditLog);
        onData(logs);
      },
      (err) => {
        console.warn('[Firestore] Audit logs snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeNotifications(
    onData: (notifs: DispatchedNotification[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    return onSnapshot(
      q,
      (snap) => {
        const notifs = snap.docs.map((d) => d.data() as DispatchedNotification);
        onData(notifs);
      },
      (err) => {
        console.warn('[Firestore] Notifications snapshot error:', err);
        onError?.(err);
      }
    );
  }

  // --- Staff Operations (CRUD) ---

  async upsertStaff(staff: StaffMember): Promise<boolean> {
    try {
      const cleanStaff = sanitizeForFirestore(staff);
      await setDoc(doc(db, COLLECTIONS.STAFF, staff.id), cleanStaff);
      console.info(`[Firestore] Saved staff record "${staff.name}" (${staff.id}) to Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving staff:', error);
      return false;
    }
  }

  async updateStaffFields(staffId: string, fields: Partial<StaffMember>): Promise<boolean> {
    try {
      const cleanFields = sanitizeForFirestore(fields);
      await updateDoc(doc(db, COLLECTIONS.STAFF, staffId), cleanFields);
      console.info(`[Firestore] Updated staff fields for ID "${staffId}" in Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error updating staff:', error);
      return false;
    }
  }

  async deleteStaff(staffId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.STAFF, staffId));
      console.info(`[Firestore] Deleted staff ID "${staffId}" from Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting staff:', error);
      return false;
    }
  }

  // --- Leave Request Operations (CRUD) ---

  async saveLeaveRequest(request: LeaveRequest): Promise<boolean> {
    try {
      const cleanReq = sanitizeForFirestore(request);
      await setDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, request.id), cleanReq);
      console.info(`[Firestore] Saved leave request #${request.id} for "${request.staffName}" to Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving leave request:', error);
      return false;
    }
  }

  async updateLeaveRequest(requestId: string, updates: Partial<LeaveRequest>): Promise<boolean> {
    try {
      const cleanUpdates = sanitizeForFirestore(updates);
      await updateDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, requestId), cleanUpdates);
      console.info(`[Firestore] Updated leave request #${requestId} in Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error updating leave request:', error);
      return false;
    }
  }

  // --- Department Operations (CRUD) ---

  async saveDepartment(department: DepartmentItem): Promise<boolean> {
    try {
      const cleanDept = sanitizeForFirestore(department);
      await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, department.id), cleanDept);
      console.info(`[Firestore] Saved department "${department.name}" (${department.id}) to Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving department:', error);
      return false;
    }
  }

  async deleteDepartment(deptId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId));
      console.info(`[Firestore] Deleted department ${deptId} from Cloud Firestore.`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting department:', error);
      return false;
    }
  }

  // --- Settings Operations (CRUD) ---

  async saveGlobalSettings(settings: GlobalLeaveThresholds): Promise<boolean> {
    try {
      const cleanSettings = sanitizeForFirestore(settings);
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'globalThresholds'), cleanSettings);
      console.info('[Firestore] Saved global leave thresholds to Cloud Firestore.');
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving global settings:', error);
      return false;
    }
  }

  // --- Audit Log Operations (CRUD) ---

  async saveAuditLog(log: AuditLog): Promise<boolean> {
    try {
      const cleanLog = sanitizeForFirestore(log);
      await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, log.id), cleanLog);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving audit log:', error);
      return false;
    }
  }

  // --- Notification Operations (CRUD) ---

  async saveNotification(notification: DispatchedNotification): Promise<boolean> {
    try {
      // Normalize status to strictly match firestore.rules ('Delivered', 'Sent', 'Failed', 'Pending')
      let normalizedStatus: 'Delivered' | 'Sent' | 'Failed' | 'Pending' = 'Delivered';
      const rawStatus = (notification.status || '').toLowerCase();
      if (rawStatus === 'delivered' || rawStatus === 'dispatched') {
        normalizedStatus = 'Delivered';
      } else if (rawStatus === 'pending') {
        normalizedStatus = 'Pending';
      } else if (rawStatus === 'failed') {
        normalizedStatus = 'Failed';
      } else if (rawStatus === 'sent') {
        normalizedStatus = 'Sent';
      }

      const notifToSave = {
        ...notification,
        status: normalizedStatus,
      };

      const cleanNotif = sanitizeForFirestore(notifToSave);
      await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notification.id), cleanNotif);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving notification:', error);
      return false;
    }
  }
}

export const firestoreService = new FirestoreService();
