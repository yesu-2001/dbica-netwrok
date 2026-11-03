import { DispatchedNotification, EmailNotification, StaffMember } from '../types';

const DECISION_TYPES = new Set(['LEAVE_APPROVED', 'LEAVE_REJECTED']);

function isApplicantSubmissionConfirmation(notification: DispatchedNotification): boolean {
  if (notification.type !== 'LEAVE_SUBMITTED') return false;
  if (notification.metadata?.audience) {
    return notification.metadata.audience === 'applicant';
  }

  // Legacy submission records did not identify their audience.
  return Boolean(
    notification.metadata?.staffName &&
    notification.recipientName.trim().toLowerCase() ===
      notification.metadata.staffName.trim().toLowerCase()
  );
}

function isDecisionForStaff(
  notification: DispatchedNotification,
  staff: StaffMember
): boolean {
  if (!DECISION_TYPES.has(notification.type)) return false;
  return (
    notification.metadata?.staffId === staff.id ||
    Boolean(
      notification.recipientEmail &&
      notification.recipientEmail.trim().toLowerCase() === staff.email.trim().toLowerCase()
    )
  );
}

function isDirectlyAddressedTo(
  notification: DispatchedNotification,
  staff: StaffMember
): boolean {
  return (
    Boolean(
      notification.recipientEmail &&
      notification.recipientEmail.trim().toLowerCase() === staff.email.trim().toLowerCase()
    ) ||
    Boolean(
      notification.recipientName &&
      notification.recipientName.trim().toLowerCase() === staff.name.trim().toLowerCase()
    )
  );
}

export function getVisibleNotifications(
  notifications: DispatchedNotification[],
  staff: StaffMember
): DispatchedNotification[] {
  return notifications.filter((notification) => {
    if (staff.role === 'Staff') {
      return isDecisionForStaff(notification, staff);
    }

    if (notification.type === 'LEAVE_SUBMITTED') {
      const isReviewerNotice =
        notification.metadata?.audience === 'reviewers' ||
        (!notification.metadata?.audience &&
          !isApplicantSubmissionConfirmation(notification));

      if (!isReviewerNotice) return false;
      return (
        staff.role === 'Super Admin' ||
        staff.role === 'HR' ||
        notification.metadata?.department === staff.department
      );
    }

    if (DECISION_TYPES.has(notification.type)) {
      return (
        staff.role === 'Super Admin' ||
        staff.role === 'HR' ||
        notification.metadata?.department === staff.department ||
        isDecisionForStaff(notification, staff)
      );
    }

    if (notification.type === 'CUSTOM') {
      return (
        staff.role === 'Super Admin' ||
        staff.role === 'HR' ||
        isDirectlyAddressedTo(notification, staff)
      );
    }

    return false;
  });
}

export function countNotificationEvents(notifications: DispatchedNotification[]): number {
  const eventKeys = new Set(
    notifications.map((notification) => {
      const requestId = notification.referenceId || notification.metadata?.requestId;
      return requestId
        ? `${notification.type}:${requestId}`
        : notification.id;
    })
  );
  return eventKeys.size;
}

function emailRecipients(email: EmailNotification): string[] {
  return Array.isArray(email.to) ? email.to : [email.to];
}

export function getVisibleEmailNotifications(
  emails: EmailNotification[],
  staff: StaffMember
): EmailNotification[] {
  return emails.filter((email) => {
    const recipients = emailRecipients(email).map((recipient) => recipient.trim().toLowerCase());
    const isApplicantSubmission =
      email.type === 'LEAVE_SUBMITTED' &&
      typeof email.to === 'string' &&
      email.to.trim().toLowerCase() === email.metadata?.staffEmail.trim().toLowerCase();

    if (staff.role === 'Staff') {
      return (
        DECISION_TYPES.has(email.type) &&
        (email.metadata?.staffEmail.trim().toLowerCase() === staff.email.trim().toLowerCase() ||
          recipients.includes(staff.email.trim().toLowerCase()))
      );
    }

    if (staff.role === 'Manager') {
      if (email.type === 'LEAVE_SUBMITTED') {
        return (
          !isApplicantSubmission &&
          email.metadata?.department === staff.department &&
          Array.isArray(email.to)
        );
      }

      return (
        email.metadata?.department === staff.department ||
        recipients.includes(staff.email.trim().toLowerCase())
      );
    }

    return !isApplicantSubmission;
  });
}

export function countEmailEvents(emails: EmailNotification[]): number {
  const eventKeys = new Set(
    emails.map((email) =>
      email.metadata?.requestId
        ? `${email.type}:${email.metadata.requestId}`
        : email.id
    )
  );
  return eventKeys.size;
}
