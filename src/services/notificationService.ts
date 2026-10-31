import { LeaveRequest, StaffMember, DispatchedNotification, NotificationChannel } from '../types';
import { firestoreService } from './firestoreService';

const SYSTEM_SENDER_EMAIL = 'leave-notifications@dbica.ac.in';
const HR_OFFICE_EMAIL = 'hr-office@dbica.ac.in';
const STORAGE_KEY = 'dbica_notifications_history_v2';

export function formatWhatsAppPhone(phone: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[^0-9]/g, '');
  // If starts with 0 and is 11 digits, replace 0 with country code 91
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '91' + cleaned.slice(1);
  }
  // If 10 digits (standard Indian mobile without country code), prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppDirectUrl(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}

type NotificationListener = (notification: DispatchedNotification) => void;

class NotificationDispatchService {
  private listeners: Set<NotificationListener> = new Set();

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getLocalHistory(): DispatchedNotification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return [];
  }

  private saveToLocal(item: DispatchedNotification): void {
    try {
      const history = this.getLocalHistory();
      const updated = [item, ...history].slice(0, 150);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  private async recordAndDispatch(notif: DispatchedNotification): Promise<void> {
    // 1. Save to local storage for immediate offline display
    this.saveToLocal(notif);

    // 2. Persist to Firestore database
    try {
      await firestoreService.saveNotification(notif);
    } catch (err) {
      console.warn('[NotificationService] Cloud persistence fallback:', err);
    }

    // 3. Log to console with styled visual indicators
    const isWhatsApp = notif.channel === 'whatsapp' || notif.channel === 'both';
    const channelBadge = isWhatsApp ? '📱 WHATSAPP' : '✉️ EMAIL';
    const badgeColor = isWhatsApp ? '#25D366' : '#0284C7';

    console.groupCollapsed(
      `%c[DISPATCH CENTER]%c %c ${channelBadge} %c ${notif.subject} → ${notif.recipientName}`,
      'color: #0369A1; font-weight: bold;',
      'color: inherit;',
      `background: ${badgeColor}; color: #FFFFFF; font-weight: 700; border-radius: 4px; padding: 2px 6px; font-size: 11px;`,
      'color: #1E293B; font-weight: 600;'
    );
    console.info(
      `Recipient: ${notif.recipientName} (${notif.recipientEmail || notif.recipientPhone})\n` +
      `Timestamp: ${new Date(notif.timestamp).toLocaleString('en-IN')}\n\n` +
      `Message Content:\n${notif.message}`
    );
    if (notif.whatsappUrl) {
      console.info(`Direct WhatsApp Link: ${notif.whatsappUrl}`);
    }
    console.groupEnd();

    // 4. Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(notif);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  /**
   * Dispatch when a leave request is submitted:
   * 1. Confirmation to Applicant (Email + WhatsApp)
   * 2. Acknowledgement to HoD & HR (Email + WhatsApp)
   */
  public async dispatchLeaveSubmitted(
    request: LeaveRequest,
    applicantPhone?: string,
    managerPhone?: string,
    managerName?: string,
    managerEmail?: string
  ): Promise<DispatchedNotification[]> {
    const timestamp = new Date().toISOString();
    const results: DispatchedNotification[] = [];

    const isPermission = request.leaveType === 'Permission';
    const durationLabel = isPermission
      ? `${request.startDate} • ${request.permissionMinutes || 60} minutes (${request.permissionStartTime || '09:30'} - ${request.permissionEndTime || '10:30'})`
      : `${request.startDate} to ${request.endDate} (${request.totalDays} working days)`;
    const subjectPrefix = isPermission
      ? `[DBICA] Permission Application Acknowledged: ${request.permissionMinutes || 60} Mins on ${request.startDate}`
      : `[DBICA] Leave Application Acknowledged: ${request.leaveType} (${request.totalDays}d)`;

    // --- 1. APPLICANT EMAIL CONFIRMATION ---
    const applicantEmailNotif: DispatchedNotification = {
      id: `notif-${Date.now()}-app-email`,
      recipientName: request.staffName,
      recipientEmail: request.staffEmail,
      recipientPhone: applicantPhone,
      channel: 'email',
      type: 'LEAVE_SUBMITTED',
      subject: subjectPrefix,
      timestamp,
      referenceId: request.id,
      status: 'dispatched',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
      },
      message: `Dear ${request.staffName},\n\nYour ${isPermission ? 'permission' : 'leave'} application #${request.id} has been successfully recorded in the DBICA Portal.\n\n` +
        `• Category: ${isPermission ? 'Institutional Permission (Short Duration)' : `${request.leaveType} Leave`}\n` +
        `• Duration: ${durationLabel}\n` +
        `• Department: ${request.department}\n` +
        `• Status: PENDING APPROVAL\n\n` +
        `Your application has been routed to your Department Head and HR for review.\n\nWarm regards,\nDBICA Leave Administration`,
    };
    await this.recordAndDispatch(applicantEmailNotif);
    results.push(applicantEmailNotif);

    // --- 2. APPLICANT WHATSAPP CONFIRMATION ---
    if (applicantPhone) {
      const waText =
        `🏛️ *DBICA Portal — ${isPermission ? 'Permission Request' : 'Leave Application'} Received*\n\n` +
        `Dear *${request.staffName}*,\n` +
        `Your request *#${request.id}* has been successfully submitted.\n\n` +
        `📋 *Type:* ${isPermission ? `Permission (${request.permissionMinutes || 60} mins)` : `${request.leaveType} Leave`}\n` +
        `📅 *Time:* ${durationLabel}\n` +
        `🏢 *Department:* ${request.department}\n` +
        `⏳ *Status:* Pending HoD & HR Approval\n\n` +
        `You will receive an automated WhatsApp confirmation as soon as a decision is recorded.\n\n` +
        `_Don Bosco Institute of Communication Arts_`;

      const applicantWaNotif: DispatchedNotification = {
        id: `notif-${Date.now()}-app-wa`,
        recipientName: request.staffName,
        recipientPhone: applicantPhone,
        channel: 'whatsapp',
        type: 'LEAVE_SUBMITTED',
        subject: `[WhatsApp] Application Confirmation #${request.id}`,
        timestamp,
        referenceId: request.id,
        status: 'delivered',
        whatsappUrl: buildWhatsAppDirectUrl(applicantPhone, waText),
        message: waText,
        metadata: {
          requestId: request.id,
          staffName: request.staffName,
          department: request.department,
          leaveType: request.leaveType,
        },
      };
      await this.recordAndDispatch(applicantWaNotif);
      results.push(applicantWaNotif);
    }

    // --- 3. HOD / HR ACKNOWLEDGEMENT WHATSAPP ---
    const targetManagerPhone = managerPhone || '+91 98402 33452'; // Default to HR if no manager phone
    const targetManagerName = managerName || 'Department Head / HR Office';

    const hodWaText = isPermission
      ? `🔔 *DBICA Portal — Permission Action Required*\n\n` +
        `Dear *${targetManagerName}*,\n` +
        `A new Permission application requires your review.\n\n` +
        `👤 *Staff:* ${request.staffName} (${request.department})\n` +
        `⏱️ *Permission Duration:* ${request.permissionMinutes || 60} minutes\n` +
        `📅 *Time Slot:* ${durationLabel}\n` +
        `💬 *Reason:* "${request.reason}"\n\n` +
        `👉 Please log in to the DBICA Portal to review and approve.\n\n` +
        `_DBICA Automated Notification Center_`
      : `🔔 *DBICA Leave Portal — Action Required*\n\n` +
        `Dear *${targetManagerName}*,\n` +
        `A new leave application requires your review.\n\n` +
        `👤 *Staff:* ${request.staffName} (${request.department})\n` +
        `📋 *Leave:* ${request.leaveType} (${request.totalDays} working days)\n` +
        `📅 *Duration:* ${request.startDate} to ${request.endDate}\n` +
        `💬 *Reason:* "${request.reason}"\n\n` +
        `👉 Please log in to the DBICA Leave Portal to authorize or reject.\n\n` +
        `_DBICA Automated Notification Center_`;

    const hodWaNotif: DispatchedNotification = {
      id: `notif-${Date.now()}-hod-wa`,
      recipientName: targetManagerName,
      recipientPhone: targetManagerPhone,
      recipientEmail: managerEmail || HR_OFFICE_EMAIL,
      channel: 'whatsapp',
      type: 'LEAVE_SUBMITTED',
      subject: isPermission
        ? `[WhatsApp] Permission Action Required: ${request.staffName} (${request.permissionMinutes || 60}m)`
        : `[WhatsApp] Action Required: ${request.staffName} (${request.totalDays}d)`,
      timestamp,
      referenceId: request.id,
      status: 'delivered',
      whatsappUrl: buildWhatsAppDirectUrl(targetManagerPhone, hodWaText),
      message: hodWaText,
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        department: request.department,
        leaveType: request.leaveType,
      },
    };
    await this.recordAndDispatch(hodWaNotif);
    results.push(hodWaNotif);

    return results;
  }

  /**
   * Dispatch when a leave request is approved
   */
  public async dispatchLeaveApproved(
    request: LeaveRequest,
    actionedBy: string,
    applicantPhone?: string,
    note?: string
  ): Promise<DispatchedNotification[]> {
    const timestamp = new Date().toISOString();
    const results: DispatchedNotification[] = [];

    const isPermission = request.leaveType === 'Permission';
    const durationLabel = isPermission
      ? `${request.startDate} • ${request.permissionMinutes || 60} minutes (${request.permissionStartTime || '09:30'} - ${request.permissionEndTime || '10:30'})`
      : `${request.startDate} to ${request.endDate} (${request.totalDays} working days)`;

    // 1. Email to Applicant
    const emailNotif: DispatchedNotification = {
      id: `notif-${Date.now()}-approved-email`,
      recipientName: request.staffName,
      recipientEmail: request.staffEmail,
      recipientPhone: applicantPhone,
      channel: 'email',
      type: 'LEAVE_APPROVED',
      subject: isPermission
        ? `[DBICA] APPROVED: Permission (${request.permissionMinutes || 60} mins on ${request.startDate})`
        : `[DBICA] APPROVED: ${request.leaveType} Leave (${request.startDate} to ${request.endDate})`,
      timestamp,
      referenceId: request.id,
      status: 'dispatched',
      message: `Dear ${request.staffName},\n\nYour ${isPermission ? 'permission request' : 'leave application'} #${request.id} has been APPROVED by ${actionedBy}.\n\n` +
        `• Category: ${isPermission ? 'Permission (Monthly Short Absence)' : `${request.leaveType} Leave`}\n` +
        `• Details: ${durationLabel}\n` +
        `${note ? `• Reviewer Note: "${note}"\n` : ''}` +
        `• Status: AUTHORIZED\n\n` +
        `Have a pleasant time!\n\nWarm regards,\nDBICA Administration`,
    };
    await this.recordAndDispatch(emailNotif);
    results.push(emailNotif);

    // 2. WhatsApp to Applicant
    if (applicantPhone) {
      const waText =
        `✅ *DBICA Portal — ${isPermission ? 'Permission Approved' : 'Leave Approved'}*\n\n` +
        `Dear *${request.staffName}*,\n` +
        `Your request *#${request.id}* has been *APPROVED* by *${actionedBy}*.\n\n` +
        `📋 *Category:* ${isPermission ? `Permission (${request.permissionMinutes || 60} mins)` : `${request.leaveType} Leave`}\n` +
        `📅 *Time:* ${durationLabel}\n` +
        `${note ? `💬 *Note:* "${note}"\n` : ''}` +
        `🟢 *Status:* Authorized & Recorded\n\n` +
        `_Don Bosco Institute of Communication Arts_`;

      const waNotif: DispatchedNotification = {
        id: `notif-${Date.now()}-approved-wa`,
        recipientName: request.staffName,
        recipientPhone: applicantPhone,
        channel: 'whatsapp',
        type: 'LEAVE_APPROVED',
        subject: `[WhatsApp] ${isPermission ? 'Permission' : 'Leave'} Approved #${request.id}`,
        timestamp,
        referenceId: request.id,
        status: 'delivered',
        whatsappUrl: buildWhatsAppDirectUrl(applicantPhone, waText),
        message: waText,
      };
      await this.recordAndDispatch(waNotif);
      results.push(waNotif);
    }

    return results;
  }

  /**
   * Dispatch when a leave request is rejected
   */
  public async dispatchLeaveRejected(
    request: LeaveRequest,
    actionedBy: string,
    rejectionReason: string,
    applicantPhone?: string
  ): Promise<DispatchedNotification[]> {
    const timestamp = new Date().toISOString();
    const results: DispatchedNotification[] = [];
    const isPermission = request.leaveType === 'Permission';

    // 1. Email to Applicant
    const emailNotif: DispatchedNotification = {
      id: `notif-${Date.now()}-rejected-email`,
      recipientName: request.staffName,
      recipientEmail: request.staffEmail,
      recipientPhone: applicantPhone,
      channel: 'email',
      type: 'LEAVE_REJECTED',
      subject: `[DBICA] ${isPermission ? 'Permission' : 'Leave'} Request #${request.id} Update`,
      timestamp,
      referenceId: request.id,
      status: 'dispatched',
      message: `Dear ${request.staffName},\n\nYour application #${request.id} for ${isPermission ? 'Permission' : `${request.leaveType} leave`} could not be approved at this time.\n\n` +
        `• Reviewed By: ${actionedBy}\n` +
        `• Reason: "${rejectionReason}"\n\n` +
        `No balance or monthly allowance has been deducted. Please contact your Department Head or HR for rescheduling.\n\nSincerely,\nDBICA Administration`,
    };
    await this.recordAndDispatch(emailNotif);
    results.push(emailNotif);

    // 2. WhatsApp to Applicant
    if (applicantPhone) {
      const waText =
        `❌ *DBICA Portal — Application Update*\n\n` +
        `Dear *${request.staffName}*,\n` +
        `Your application *#${request.id}* (${isPermission ? 'Permission' : `${request.leaveType} Leave`}) could not be approved by *${actionedBy}*.\n\n` +
        `📌 *Reason:* "${rejectionReason}"\n` +
        `ℹ️ *Balance:* No monthly quota deducted\n\n` +
        `Please contact your Department Head or HR Office for any questions.\n\n` +
        `_DBICA Leave Administration_`;

      const waNotif: DispatchedNotification = {
        id: `notif-${Date.now()}-rejected-wa`,
        recipientName: request.staffName,
        recipientPhone: applicantPhone,
        channel: 'whatsapp',
        type: 'LEAVE_REJECTED',
        subject: `[WhatsApp] Application Status Update #${request.id}`,
        timestamp,
        referenceId: request.id,
        status: 'delivered',
        whatsappUrl: buildWhatsAppDirectUrl(applicantPhone, waText),
        message: waText,
      };
      await this.recordAndDispatch(waNotif);
      results.push(waNotif);
    }

    return results;
  }

  /**
   * Dispatch custom notification via Email or WhatsApp on-demand
   */
  public async dispatchCustom(
    recipientName: string,
    phone: string,
    email: string,
    channel: NotificationChannel,
    subject: string,
    message: string
  ): Promise<DispatchedNotification> {
    const timestamp = new Date().toISOString();
    const cleanPhone = phone ? formatWhatsAppPhone(phone) : '';
    const waUrl = cleanPhone ? buildWhatsAppDirectUrl(phone, message) : undefined;

    const notif: DispatchedNotification = {
      id: `notif-${Date.now()}-custom`,
      recipientName,
      recipientPhone: phone,
      recipientEmail: email,
      channel,
      type: 'CUSTOM',
      subject,
      message,
      timestamp,
      status: 'delivered',
      whatsappUrl: waUrl,
    };

    await this.recordAndDispatch(notif);
    return notif;
  }
}

export const notificationService = new NotificationDispatchService();
