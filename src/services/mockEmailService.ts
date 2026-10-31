import { LeaveRequest, EmailNotification } from '../types';

const STORAGE_KEY = 'dbica_mock_emails_v1';
const SYSTEM_SENDER = 'DBICA Leave Portal <leave-notifications@dbica.ac.in>';
const HR_OFFICE_EMAIL = 'hr-office@dbica.ac.in';

type EmailListener = (email: EmailNotification) => void;

class MockEmailService {
  private listeners: Set<EmailListener> = new Set();

  /**
   * Dispatches and logs an email notification to the console with styled formatting
   */
  private dispatch(email: EmailNotification): void {
    // 1. Save to localStorage history
    try {
      const existing = this.getHistory();
      const updated = [email, ...existing].slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore local storage error
    }

    // 2. Determine badge colors based on notification type
    const badgeConfig = {
      LEAVE_SUBMITTED: {
        label: 'LEAVE SUBMITTED',
        bg: '#0284C7',
        color: '#FFFFFF',
      },
      LEAVE_APPROVED: {
        label: 'LEAVE APPROVED',
        bg: '#16A34A',
        color: '#FFFFFF',
      },
      LEAVE_REJECTED: {
        label: 'LEAVE REJECTED',
        bg: '#DC2626',
        color: '#FFFFFF',
      },
      LEAVE_CANCELLED: {
        label: 'LEAVE CANCELLED',
        bg: '#64748B',
        color: '#FFFFFF',
      },
    }[email.type];

    const toStr = Array.isArray(email.to) ? email.to.join(', ') : email.to;

    // 3. Log to browser console simulating system communication
    console.groupCollapsed(
      `%c[MOCK EMAIL SERVICE]%c %c ${badgeConfig.label} %c ${email.subject} → ${toStr}`,
      'color: #0369A1; font-weight: bold;',
      'color: inherit;',
      `background: ${badgeConfig.bg}; color: ${badgeConfig.color}; font-weight: 700; border-radius: 4px; padding: 2px 6px; font-size: 11px;`,
      'color: #1E293B; font-weight: 600;'
    );

    console.info(
      `%cFrom:    %c${email.from}\n` +
        `%cTo:      %c${toStr}\n` +
        `%cSubject: %c${email.subject}\n` +
        `%cDate:    %c${new Date(email.timestamp).toLocaleString('en-IN')}\n\n` +
        `%cEmail Message Body:%c\n${email.body}`,
      'font-weight: bold; color: #475569;',
      'color: #0F172A;',
      'font-weight: bold; color: #475569;',
      'color: #0284C7; font-weight: 600;',
      'font-weight: bold; color: #475569;',
      'color: #0F172A; font-weight: 600;',
      'font-weight: bold; color: #475569;',
      'color: #64748B;',
      'font-weight: bold; color: #334155; text-decoration: underline;',
      'color: #1E293B; font-family: monospace; line-height: 1.4;'
    );

    if (email.metadata) {
      console.log('%cSystem Metadata:', 'font-weight: bold; color: #64748B;', email.metadata);
    }

    console.groupEnd();

    // 4. Notify in-app subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(email);
      } catch (err) {
        console.error('Error in email listener:', err);
      }
    });
  }

  /**
   * Returns recent dispatched email notifications
   */
  public getHistory(): EmailNotification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  /**
   * Subscribe to new email dispatches
   */
  public subscribe(listener: EmailListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Triggered when a staff member submits a leave request
   */
  public notifyLeaveSubmitted(
    request: LeaveRequest,
    managerEmail?: string
  ): EmailNotification[] {
    const timestamp = new Date().toISOString();
    const sentEmails: EmailNotification[] = [];

    // 1. Confirmation Email to the Applicant
    const applicantEmail: EmailNotification = {
      id: `email-${Date.now()}-applicant`,
      to: request.staffEmail,
      from: SYSTEM_SENDER,
      subject: `[DBICA Leave Portal] Application Received: ${request.leaveType} Leave (${request.totalDays}d)`,
      timestamp,
      type: 'LEAVE_SUBMITTED',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        staffEmail: request.staffEmail,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
      },
      body: `Dear ${request.staffName},

Your leave request has been successfully submitted to the DBICA Staff Leave Management Portal.

LEAVE APPLICATION DETAILS:
--------------------------------------------------
• Request ID:         #${request.id}
• Leave Type:         ${request.leaveType} Leave
• Duration:           ${request.startDate} to ${request.endDate} (${request.totalDays} working day(s))
• Department:         ${request.department}
• Reason:             ${request.reason}
• Emergency Contact:  ${request.emergencyContact || 'Not specified'}
• Status:             PENDING APPROVAL
--------------------------------------------------

Your application has been routed to your Department Head and the HR Office for review. You will receive an automated notification as soon as a decision is recorded.

You can check real-time status under the "My Leaves" tab in the DBICA Portal.

Warm regards,
DBICA Human Resources & Leave Administration
Don Bosco Institute of Communication Arts
Chennai, Tamil Nadu, India`,
    };

    this.dispatch(applicantEmail);
    sentEmails.push(applicantEmail);

    // 2. Notification to Reporting Manager & HR
    const reviewerRecipients = [
      managerEmail || `${request.department.toLowerCase().replace(/[^a-z]/g, '')}-hod@dbica.ac.in`,
      HR_OFFICE_EMAIL,
    ];

    const approverEmail: EmailNotification = {
      id: `email-${Date.now()}-approvers`,
      to: reviewerRecipients,
      from: SYSTEM_SENDER,
      subject: `[DBICA Action Required] New Leave Request: ${request.staffName} (${request.department})`,
      timestamp,
      type: 'LEAVE_SUBMITTED',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        staffEmail: request.staffEmail,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
      },
      body: `Dear Reporting Authority / HR Office,

A new leave request has been submitted by ${request.staffName} and is awaiting your authorization.

STAFF REQUEST SUMMARY:
--------------------------------------------------
• Applicant:          ${request.staffName} (${request.staffEmail})
• Department:         ${request.department}
• Leave Type:         ${request.leaveType} Leave
• Duration:           ${request.startDate} to ${request.endDate} (${request.totalDays} day(s))
• Reason:             "${request.reason}"
• Emergency Contact:  ${request.emergencyContact || 'None provided'}
• Submitted On:       ${new Date().toLocaleString('en-IN')}
--------------------------------------------------

Please sign in to the DBICA Leave Management portal to approve or reject this application:
Navigation: Leave Request Approvals > Review

Regards,
DBICA Automated Notification System
Don Bosco Institute of Communication Arts`,
    };

    this.dispatch(approverEmail);
    sentEmails.push(approverEmail);

    return sentEmails;
  }

  /**
   * Triggered when a leave request is approved
   */
  public notifyLeaveApproved(
    request: LeaveRequest,
    actionedBy: string,
    approvalNote?: string
  ): EmailNotification[] {
    const timestamp = new Date().toISOString();
    const sentEmails: EmailNotification[] = [];

    // 1. Approval Notice to Applicant
    const staffNotice: EmailNotification = {
      id: `email-${Date.now()}-approved-staff`,
      to: request.staffEmail,
      from: SYSTEM_SENDER,
      subject: `[DBICA Leave Portal] APPROVED: ${request.leaveType} Leave (${request.startDate} to ${request.endDate})`,
      timestamp,
      type: 'LEAVE_APPROVED',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        staffEmail: request.staffEmail,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
        actionedBy,
        approvalNote,
      },
      body: `Dear ${request.staffName},

Your leave application has been APPROVED.

APPROVAL SUMMARY:
--------------------------------------------------
• Request ID:         #${request.id}
• Leave Type:         ${request.leaveType} Leave
• Period:             ${request.startDate} to ${request.endDate} (${request.totalDays} working day(s))
• Approved By:        ${actionedBy}
• Decision Date:      ${new Date().toLocaleString('en-IN')}
${approvalNote ? `• Note from Reviewer:  "${approvalNote}"\n` : ''}• Status:             APPROVED & DEDUCTED FROM QUOTA
--------------------------------------------------

Your team calendar and attendance roster have been updated accordingly. Please coordinate with your department colleagues to ensure smooth handover of any pending responsibilities during your absence.

Have a restful leave!

Warm regards,
Human Resources & Administration
Don Bosco Institute of Communication Arts (DBICA)`,
    };

    this.dispatch(staffNotice);
    sentEmails.push(staffNotice);

    // 2. Administrative Record CC to HR
    const hrRecord: EmailNotification = {
      id: `email-${Date.now()}-approved-hr`,
      to: HR_OFFICE_EMAIL,
      from: SYSTEM_SENDER,
      subject: `[DBICA Records] Leave Approved: ${request.staffName} (${request.totalDays}d ${request.leaveType})`,
      timestamp,
      type: 'LEAVE_APPROVED',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        staffEmail: request.staffEmail,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
        actionedBy,
      },
      body: `HR Administration Record:

Leave request #${request.id} for ${request.staffName} (${request.department}) has been approved by ${actionedBy}.

Details: ${request.leaveType} Leave from ${request.startDate} to ${request.endDate} (${request.totalDays} day(s)).
Deduction applied to institutional leave ledger.`,
    };

    this.dispatch(hrRecord);
    sentEmails.push(hrRecord);

    return sentEmails;
  }

  /**
   * Triggered when a leave request is rejected
   */
  public notifyLeaveRejected(
    request: LeaveRequest,
    actionedBy: string,
    rejectionReason: string
  ): EmailNotification[] {
    const timestamp = new Date().toISOString();
    const sentEmails: EmailNotification[] = [];

    // Rejection notification to staff member (CC HR Office)
    const staffNotice: EmailNotification = {
      id: `email-${Date.now()}-rejected`,
      to: [request.staffEmail, HR_OFFICE_EMAIL],
      from: SYSTEM_SENDER,
      subject: `[DBICA Leave Portal] Update: ${request.leaveType} Leave Request Not Approved`,
      timestamp,
      type: 'LEAVE_REJECTED',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        staffEmail: request.staffEmail,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
        actionedBy,
        rejectionReason,
      },
      body: `Dear ${request.staffName},

Please be informed that your leave request could not be approved at this time.

REJECTION DETAILS:
--------------------------------------------------
• Request ID:         #${request.id}
• Leave Type:         ${request.leaveType} Leave
• Requested Dates:    ${request.startDate} to ${request.endDate} (${request.totalDays} day(s))
• Reviewed By:        ${actionedBy}
• Decision:           REJECTED
• Reason Provided:    "${rejectionReason}"
--------------------------------------------------

No leave balance has been deducted from your annual quota. If you have questions regarding this decision or wish to reschedule alternative dates, please contact ${actionedBy} or the HR Office.

Sincerely,
DBICA Leave Administration
Don Bosco Institute of Communication Arts`,
    };

    this.dispatch(staffNotice);
    sentEmails.push(staffNotice);

    return sentEmails;
  }

  /**
   * Triggered when a leave request is cancelled by applicant
   */
  public notifyLeaveCancelled(
    request: LeaveRequest,
    cancelledBy: string
  ): EmailNotification[] {
    const timestamp = new Date().toISOString();
    const email: EmailNotification = {
      id: `email-${Date.now()}-cancelled`,
      to: [request.staffEmail, HR_OFFICE_EMAIL],
      from: SYSTEM_SENDER,
      subject: `[DBICA Leave Portal] Cancelled: ${request.leaveType} Leave Request #${request.id}`,
      timestamp,
      type: 'LEAVE_CANCELLED',
      metadata: {
        requestId: request.id,
        staffName: request.staffName,
        staffEmail: request.staffEmail,
        department: request.department,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
        actionedBy: cancelledBy,
      },
      body: `Notice: Leave request #${request.id} for ${request.staffName} (${request.leaveType} Leave from ${request.startDate} to ${request.endDate}) has been CANCELLED by ${cancelledBy}.

No balance was deducted. System roster has been released.`,
    };

    this.dispatch(email);
    return [email];
  }
}

export const mockEmailService = new MockEmailService();
