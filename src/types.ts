export type Role = 'Super Admin' | 'HR' | 'Manager' | 'Staff';

export type Department = string;

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string;
  hodId?: string; // Staff ID of Head of Department
  createdAt: string;
  updatedAt?: string;
}

export interface GlobalLeaveThresholds {
  casual: number;
  sick: number;
  compensatory: number;
  earned?: number; // legacy fallback
  compensatoryMax?: number;
  updatedAt: string;
  updatedBy: string;
}

export type LeaveType = 'Casual' | 'Sick' | 'Compensatory' | 'Leave Without Pay (LWP)' | 'Permission' | 'Earned';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveBalance {
  casual: number;
  sick: number;
  compensatory: number;
  earned?: number; // legacy fallback
}

export interface StaffMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  department: Department;
  role: Role;
  designation: string;
  leaveBalance: LeaveBalance;
  leaveThresholds?: LeaveBalance;
  status: 'Active' | 'Inactive';
  joinedDate: string;
  avatarBg?: string;
  reportingTo?: string; // Staff ID of manager/director
  portalPassword?: string; // Backend-stored authentication password
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  department: Department;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD (requested comp-off / leave date)
  endDate: string;   // YYYY-MM-DD
  totalDays: number;
  permissionMinutes?: number;    // Duration in minutes (e.g. 15, 30, 45, 60 mins - max 60 mins/month)
  permissionStartTime?: string;  // e.g. "09:30 AM" or "14:00"
  permissionEndTime?: string;    // e.g. "10:30 AM" or "15:00"
  // Compensatory Leave specific fields:
  workedDate?: string;           // Day previously worked (e.g. "2026-09-13")
  workedHours?: number;          // Extra hours worked (e.g. 8, 4, 3)
  workedDutyDetails?: string;    // Description of extra work/duties done
  workedPeriodType?: 'After Office Hours' | 'Weekend Duty (Saturday/Sunday)' | 'Holiday Duty' | 'Special Event / Official Duty' | string;
  compensatoryLeaveDate?: string;// Date for which compensatory leave is claimed
  reason: string;
  emergencyContact: string;
  status: LeaveStatus;
  actionedBy?: string;     // Name or Role of approver/rejecter
  actionedAt?: string;     // ISO date
  rejectionReason?: string;
  appliedAt: string;       // ISO date
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  details: string;
  targetId?: string;
}

export type ActiveTab =
  | 'overview'
  | 'my-leaves'
  | 'requests'
  | 'staff'
  | 'analytics'
  | 'audit'
  | 'settings'
  | 'notifications';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export type NotificationChannel = 'email' | 'whatsapp' | 'both';

export interface DispatchedNotification {
  id: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED' | 'CUSTOM';
  subject: string;
  message: string;
  status: 'dispatched' | 'delivered' | 'pending';
  timestamp: string;
  referenceId?: string;
  whatsappUrl?: string;
  metadata?: {
    requestId?: string;
    staffName?: string;
    department?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    totalDays?: number;
    actionedBy?: string;
    rejectionReason?: string;
  };
}

export interface EmailNotification {
  id: string;
  to: string | string[];
  from: string;
  subject: string;
  timestamp: string;
  body: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
  metadata?: {
    requestId: string;
    staffName: string;
    staffEmail: string;
    department: Department;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    actionedBy?: string;
    rejectionReason?: string;
    approvalNote?: string;
  };
}
