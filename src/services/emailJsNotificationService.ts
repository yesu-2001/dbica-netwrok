import emailjs, {EmailJSResponseStatus} from '@emailjs/browser';
import {LeaveRequest, StaffMember} from '../types';

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export interface EmailDeliveryResult {
  sent: number;
  failed: number;
  error?: string;
}

class EmailJsNotificationService {
  private async send(
    recipients: StaffMember[],
    subject: string,
    message: string
  ): Promise<EmailDeliveryResult> {
    if (!serviceId || !templateId || !publicKey) {
      return {
        sent: 0,
        failed: recipients.length,
        error: 'EmailJS is not configured. Add its service, template, and public key to the Vite environment.',
      };
    }

    let sent = 0;
    let failed = 0;
    const errors = new Set<string>();
    for (const recipient of recipients) {
      if (!recipient.email?.trim()) {
        failed += 1;
        console.error(`[EmailJS] ${recipient.name} has no email address.`);
        continue;
      }

      try {
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: recipient.email.trim(),
            to_name: recipient.name,
            subject,
            message,
          },
          {publicKey}
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`[EmailJS] Could not send an email to ${recipient.email}:`, error);
        if (error instanceof EmailJSResponseStatus) {
          errors.add(`EmailJS ${error.status}: ${error.text}`);
        } else if (error instanceof Error) {
          errors.add(error.message);
        } else {
          errors.add('Unexpected error while sending through EmailJS.');
        }
      }
    }

    return {
      sent,
      failed,
      ...(failed > 0
        ? {error: [...errors].join(' ') || 'One or more emails could not be sent.'}
        : {}),
    };
  }

  async notifyNewLeaveRequest(
    request: LeaveRequest,
    staff: StaffMember[]
  ): Promise<EmailDeliveryResult> {
    const admins = staff.filter(
      (member) =>
        member.role === 'Super Admin' &&
        member.status === 'Active' &&
        member.accountStatus !== 'suspended'
    );
    const recipients = this.uniqueRecipients(admins);
    if (recipients.length === 0) {
      return {sent: 0, failed: 1, error: 'No active Super Admin email recipient was found.'};
    }

    const subject = `New leave request: ${request.staffName}`;
    const message =
      `${request.staffName} submitted a ${request.leaveType} request for ` +
      `${this.formatPeriod(request)}.`;
    return this.send(recipients, subject, message);
  }

  async notifyLeaveDecision(
    request: LeaveRequest,
    actionedBy: string,
    staff: StaffMember[],
    status: 'Approved' | 'Rejected',
    rejectionReason?: string
  ): Promise<EmailDeliveryResult> {
    const applicant = staff.find((member) => member.id === request.staffId);
    if (!applicant) {
      return {sent: 0, failed: 1, error: 'The applicant profile was not found.'};
    }

    const subject = `Leave request ${status.toLowerCase()}: ${request.leaveType}`;
    const applicantMessage = status === 'Approved'
      ? `Your ${request.leaveType} request for ${this.formatPeriod(request)} was approved by ${actionedBy}.`
      : `Your ${request.leaveType} request for ${this.formatPeriod(request)} was not approved by ${actionedBy}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;
    const applicantResult = await this.send([applicant], subject, applicantMessage);
    if (status === 'Rejected') return applicantResult;

    const otherRecipients = this.uniqueRecipients(
      staff.filter(
          (member) =>
            member.id !== applicant.id &&
            member.status === 'Active' &&
            member.accountStatus !== 'suspended' &&
            (member.role === 'HR' ||
              (member.role === 'Manager' && member.department === request.department))
      )
    );
    if (otherRecipients.length === 0) return applicantResult;

    const stakeholderMessage =
      `${request.staffName}'s ${request.leaveType} request for ` +
      `${this.formatPeriod(request)} was approved by ${actionedBy}.`;
    const stakeholderResult = await this.send(
      otherRecipients,
      subject,
      stakeholderMessage
    );
    return {
      sent: applicantResult.sent + stakeholderResult.sent,
      failed: applicantResult.failed + stakeholderResult.failed,
      ...(applicantResult.error || stakeholderResult.error
        ? {error: applicantResult.error || stakeholderResult.error}
        : {}),
    };
  }

  private uniqueRecipients(recipients: StaffMember[]): StaffMember[] {
    const byEmail = new Map<string, StaffMember>();
    recipients.forEach((recipient) => {
      const email = recipient.email?.trim().toLowerCase();
      if (email) byEmail.set(email, recipient);
    });
    return [...byEmail.values()];
  }

  private formatPeriod(request: LeaveRequest): string {
    if (request.leaveType === 'Permission') {
      const times = request.permissionStartTime && request.permissionEndTime
        ? `, ${request.permissionStartTime}–${request.permissionEndTime}`
        : '';
      return `${request.startDate}${times}${request.permissionMinutes ? ` (${request.permissionMinutes} minutes)` : ''}`;
    }

    return request.startDate === request.endDate
      ? request.startDate
      : `${request.startDate} to ${request.endDate}`;
  }
}

export const emailJsNotificationService = new EmailJsNotificationService();
