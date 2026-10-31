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

      // Fetch Staff
      const staffSnap = await getDocs(collection(db, COLLECTIONS.STAFF));
      const staffList = staffSnap.docs.map((d) => d.data() as StaffMember);

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
      const leaveRequests = reqSnap.docs.map((d) => d.data() as LeaveRequest);

      // Fetch Audit Logs
      const auditSnap = await getDocs(
        query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'), limit(150))
      );
      const auditLogs = auditSnap.docs.map((d) => d.data() as AuditLog);

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

  // --- Staff Operations ---

  async upsertStaff(staff: StaffMember): Promise<boolean> {
    try {
      const cleanStaff = sanitizeForFirestore(staff);
      await setDoc(doc(db, COLLECTIONS.STAFF, staff.id), cleanStaff);
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
      return true;
    } catch (error) {
      console.error('[Firestore] Error updating staff:', error);
      return false;
    }
  }

  async deleteStaff(staffId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.STAFF, staffId));
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting staff:', error);
      return false;
    }
  }

  // --- Leave Request Operations ---

  async saveLeaveRequest(request: LeaveRequest): Promise<boolean> {
    try {
      const cleanReq = sanitizeForFirestore(request);
      await setDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, request.id), cleanReq);
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
      return true;
    } catch (error) {
      console.error('[Firestore] Error updating leave request:', error);
      return false;
    }
  }

  // --- Department Operations ---

  async saveDepartment(department: DepartmentItem): Promise<boolean> {
    try {
      const cleanDept = sanitizeForFirestore(department);
      await setDoc(doc(db, COLLECTIONS.DEPARTMENTS, department.id), cleanDept);
      console.info(`[Firestore] Successfully saved department "${department.name}" (${department.id})`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving department:', error);
      return false;
    }
  }

  async deleteDepartment(deptId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DEPARTMENTS, deptId));
      console.info(`[Firestore] Successfully deleted department ${deptId}`);
      return true;
    } catch (error) {
      console.error('[Firestore] Error deleting department:', error);
      return false;
    }
  }

  // --- Settings Operations ---

  async saveGlobalSettings(settings: GlobalLeaveThresholds): Promise<boolean> {
    try {
      const cleanSettings = sanitizeForFirestore(settings);
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'globalThresholds'), cleanSettings);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving global settings:', error);
      return false;
    }
  }

  // --- Audit Log Operations ---

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

  // --- Notification Operations ---

  async saveNotification(notification: DispatchedNotification): Promise<boolean> {
    try {
      const cleanNotif = sanitizeForFirestore(notification);
      await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notification.id), cleanNotif);
      return true;
    } catch (error) {
      console.error('[Firestore] Error saving notification:', error);
      return false;
    }
  }
}

export const firestoreService = new FirestoreService();
