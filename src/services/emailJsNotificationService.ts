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

interface FormattedEmailMessage {
  text: string;
  html: string;
}

class EmailJsNotificationService {
  private async send(
    recipients: StaffMember[],
    subject: string,
    message: FormattedEmailMessage
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
            message: message.text,
            message_html: message.html,
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

    const subject = `New ${request.leaveType.toLowerCase()} request from ${request.staffName}`;
    const message = this.formatMessage({
      title: 'New leave request submitted',
      paragraphs: [
        `${request.staffName} has submitted a leave request. Please review the request details below.`,
      ],
      details: this.getRequestDetails(request),
      closing: 'This is an automated notification from the DBICA Staff Portal.',
    });
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

    const subject = `${request.leaveType} request ${status.toLowerCase()}`;
    const applicantMessage = this.formatMessage({
      title: `Your ${request.leaveType.toLowerCase()} request was ${status.toLowerCase()}`,
      paragraphs: [
        `Hello ${request.staffName},`,
        status === 'Approved'
          ? 'Your request has been approved. Please keep this email for your records.'
          : 'Your request was not approved. Please review the decision note below and contact your reviewer if you need clarification.',
      ],
      details: [
        ...this.getRequestDetails(request),
        {label: 'Decision', value: status},
        {label: 'Reviewed by', value: actionedBy},
        ...(status === 'Rejected' && rejectionReason?.trim()
          ? [{label: 'Decision note', value: rejectionReason.trim()}]
          : []),
      ],
      closing: 'This is an automated notification from the DBICA Staff Portal.',
    });
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

    const stakeholderMessage = this.formatMessage({
      title: 'Leave request approved',
      paragraphs: [
        `${request.staffName}'s leave request has been approved. This notification is for department scheduling and coordination.`,
      ],
      details: [
        ...this.getRequestDetails(request),
        {label: 'Decision', value: 'Approved'},
        {label: 'Approved by', value: actionedBy},
      ],
      closing: 'This is an automated notification from the DBICA Staff Portal.',
    });
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

  private getRequestDetails(request: LeaveRequest): Array<{label: string; value: string}> {
    return [
      {label: 'Staff member', value: request.staffName},
      {label: 'Department', value: request.department},
      {label: 'Request type', value: request.leaveType},
      {label: 'Date(s)', value: this.formatPeriod(request)},
      {label: 'Duration', value: `${request.totalDays} day${request.totalDays === 1 ? '' : 's'}`},
      ...(request.reason.trim() ? [{label: 'Reason', value: request.reason.trim()}] : []),
      ...(request.workedDate
        ? [{label: 'Date worked', value: this.formatDate(request.workedDate)}]
        : []),
      ...(request.workedHours
        ? [{label: 'Extra hours worked', value: `${request.workedHours} hour${request.workedHours === 1 ? '' : 's'}`}]
        : []),
      ...(request.workedPeriodType
        ? [{label: 'Work period', value: request.workedPeriodType}]
        : []),
      ...(request.workedDutyDetails?.trim()
        ? [{label: 'Work details', value: request.workedDutyDetails.trim()}]
        : []),
    ];
  }

  private formatMessage(content: {
    title: string;
    paragraphs: string[];
    details: Array<{label: string; value: string}>;
    closing: string;
  }): FormattedEmailMessage {
    const text = [
      content.title,
      '',
      ...content.paragraphs,
      '',
      'REQUEST DETAILS',
      ...content.details.map(({label, value}) => `${label}: ${value}`),
      '',
      content.closing,
    ].join('\n');
    const paragraphs = content.paragraphs
      .map((paragraph) => `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap">${this.escapeHtml(paragraph)}</p>`)
      .join('');
    const rows = content.details
      .map(({label, value}) => `<tr><th align="left" style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:13px;font-weight:600;vertical-align:top">${this.escapeHtml(label)}</th><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;white-space:pre-wrap">${this.escapeHtml(value)}</td></tr>`)
      .join('');
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a"><div style="border-bottom:3px solid #0f5c97;padding-bottom:14px;margin-bottom:20px"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#0f5c97">DBICA STAFF PORTAL</div><h1 style="font-size:21px;line-height:1.3;margin:10px 0 0;color:#0f172a">${this.escapeHtml(content.title)}</h1></div>${paragraphs}<h2 style="margin:20px 0 8px;color:#0f172a;font-size:14px">Request details</h2><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;border-spacing:0;margin:0 0 18px">${rows}</table><p style="margin:0;color:#64748b;font-size:12px;line-height:1.5">${this.escapeHtml(content.closing)}</p></div>`;
    return {text, html};
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character] || character);
  }

  private formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
  }

  private formatPeriod(request: LeaveRequest): string {
    if (request.leaveType === 'Permission') {
      const times = request.permissionStartTime && request.permissionEndTime
        ? `, ${request.permissionStartTime} to ${request.permissionEndTime}`
        : '';
      return `${this.formatDate(request.startDate)}${times}${request.permissionMinutes ? ` (${request.permissionMinutes} minutes)` : ''}`;
    }

    return request.startDate === request.endDate
      ? this.formatDate(request.startDate)
      : `${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)}`;
  }
}

export const emailJsNotificationService = new EmailJsNotificationService();
