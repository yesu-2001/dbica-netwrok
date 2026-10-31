import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  User,
  Phone,
  ShieldCheck,
  Sparkles,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { DispatchedNotification, NotificationChannel, StaffMember } from '../types';
import { buildWhatsAppDirectUrl, formatWhatsAppPhone } from '../services/notificationService';

export const NotificationDispatchCenter: React.FC = () => {
  const {
    staffList,
    dispatchedNotifications,
    dispatchCustomNotification,
    currentUser,
    addToast,
  } = useApp();

  // Filters & Search
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Dispatch Form State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<string>(staffList[0]?.id || '');
  const [channel, setChannel] = useState<NotificationChannel>('both');
  const [templateType, setTemplateType] = useState<'acknowledgement' | 'reminder' | 'custom'>('acknowledgement');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // Selected target staff
  const targetStaff = staffList.find((s) => s.id === targetStaffId) || staffList[0];

  // Auto-generate template text when target changes
  const getTemplateText = (type: typeof templateType, staff: StaffMember) => {
    switch (type) {
      case 'acknowledgement':
        return (
          `🏛️ *DBICA Leave Portal — Official Notice*\n\n` +
          `Dear *${staff.name}* (${staff.department}),\n` +
          `This is an automated confirmation that your leave balance record is active with DBICA.\n\n` +
          `📊 *Available Balances:* Casual: ${staff.leaveBalance.casual}d | Sick: ${staff.leaveBalance.sick}d | Compensatory: ${staff.leaveBalance.compensatory ?? staff.leaveBalance.earned}d.\n\n` +
          `If you require any schedule adjustment, please log into the DBICA portal or contact HR.\n\n` +
          `_Don Bosco Institute of Communication Arts_`
        );
      case 'reminder':
        return (
          `🔔 *DBICA Portal Reminder*\n\n` +
          `Dear *${staff.name}*,\n` +
          `Please ensure all upcoming leave applications and duty handover acknowledgements for this term are submitted 3 days in advance.\n\n` +
          `Warm regards,\n*DBICA Leave Administration*`
        );
      case 'custom':
        return customMessage;
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Copied to Clipboard', 'Notification text copied for manual pasting if needed.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaff) return;

    const messageToSend =
      templateType === 'custom' ? customMessage : getTemplateText(templateType, targetStaff);

    if (!messageToSend.trim()) {
      addToast('Message Required', 'Please enter a notification message body.', 'warning');
      return;
    }

    const subject =
      templateType === 'acknowledgement'
        ? `[DBICA] Leave Quota & Policy Acknowledgment`
        : templateType === 'reminder'
        ? `[DBICA] Roster Scheduling Reminder`
        : customSubject || `[DBICA Notification] Message from ${currentUser.name}`;

    setIsDispatching(true);

    try {
      const dispatched = await dispatchCustomNotification({
        recipientName: targetStaff.name,
        phone: targetStaff.phone,
        email: targetStaff.email,
        channel,
        subject,
        message: messageToSend,
      });

      addToast(
        'Notification Dispatched',
        `Dispatched via ${channel.toUpperCase()} to ${targetStaff.name}.`,
        'success'
      );

      // If WhatsApp included, open direct link
      if (channel === 'whatsapp' || channel === 'both') {
        const url = buildWhatsAppDirectUrl(targetStaff.phone, messageToSend);
        window.open(url, '_blank');
      }

      setIsComposerOpen(false);
      setCustomMessage('');
      setCustomSubject('');
    } catch {
      addToast('Dispatch Error', 'Failed to dispatch notification.', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  // Filtered notifications list
  const filtered = dispatchedNotifications.filter((n) => {
    const matchesChannel =
      selectedChannel === 'all' ||
      (selectedChannel === 'whatsapp' && (n.channel === 'whatsapp' || n.channel === 'both')) ||
      (selectedChannel === 'email' && (n.channel === 'email' || n.channel === 'both'));

    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      n.recipientName.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      (n.recipientPhone && n.recipientPhone.includes(q)) ||
      (n.recipientEmail && n.recipientEmail.toLowerCase().includes(q));

    return matchesChannel && matchesQuery;
  });

  const totalWhatsApp = dispatchedNotifications.filter(
    (n) => n.channel === 'whatsapp' || n.channel === 'both'
  ).length;
  const totalEmail = dispatchedNotifications.filter(
    (n) => n.channel === 'email' || n.channel === 'both'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Channel Dispatch Engine • Live Cloud Firestore</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Institutional Notification & Dispatch Center
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Automated confirmation and acknowledgement alerts are dispatched through official
              institution <strong>Email</strong> and <strong>WhatsApp</strong> channels whenever faculty
              submit leaves, receive approvals, or require scheduling notices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsComposerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Custom Alert</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Dispatched</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {dispatchedNotifications.length}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Dispatches</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{totalWhatsApp}</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Email Confirmations</span>
            </div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{totalEmail}</div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Gateway Delivery</span>
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">100% Active</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by faculty, subject, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Channel:
          </span>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium w-full sm:w-auto">
            <button
              onClick={() => setSelectedChannel('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedChannel === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({dispatchedNotifications.length})
            </button>
            <button
              onClick={() => setSelectedChannel('whatsapp')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                selectedChannel === 'whatsapp'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3 h-3 text-emerald-600" />
              WhatsApp ({totalWhatsApp})
            </button>
            <button
              onClick={() => setSelectedChannel('email')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                selectedChannel === 'email'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3 h-3 text-blue-600" />
              Email ({totalEmail})
            </button>
          </div>
        </div>
      </div>

      {/* Dispatched Notification Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Dispatched Notifications Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              When faculty members submit leaves, or when admins approve or reject requests, automated
              confirmations and acknowledgements appear here.
            </p>
            <button
              onClick={() => setIsComposerOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700"
            >
              Send First Notification
            </button>
          </div>
        ) : (
          filtered.map((item) => {
            const isWhatsApp = item.channel === 'whatsapp' || item.channel === 'both';
            const cleanPhone = item.recipientPhone ? formatWhatsAppPhone(item.recipientPhone) : '';
            const waUrl = item.whatsappUrl || (cleanPhone ? buildWhatsAppDirectUrl(item.recipientPhone!, item.message) : '');

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-xs transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Channel badge */}
                    {isWhatsApp ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Mail className="w-3 h-3" />
                        Email
                      </span>
                    )}

                    {/* Status badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Dispatched
                    </span>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.subject}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Recipient: <strong className="text-slate-700">{item.recipientName}</strong>
                    </span>
                    {item.recipientPhone && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {item.recipientPhone}
                      </span>
                    )}
                    {item.recipientEmail && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3 text-blue-600" />
                        {item.recipientEmail}
                      </span>
                    )}
                  </div>

                  {/* Message body preview box */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 font-mono whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                    {item.message}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex md:flex-col items-center gap-2 shrink-0 pt-2 md:pt-0">
                  {isWhatsApp && waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      title="Open in WhatsApp Web or Mobile"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {item.recipientEmail && (
                    <a
                      href={`mailto:${item.recipientEmail}?subject=${encodeURIComponent(
                        item.subject
                      )}&body=${encodeURIComponent(item.message)}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors"
                      title="Open in default Email Client"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open Mail Client</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleCopy(item.message, item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    title="Copy full message text"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch Custom Alert Modal / Drawer */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Dispatch Notification (Email & WhatsApp)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send real-time confirmation or acknowledgement to faculty
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsComposerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendCustom} className="space-y-4">
              {/* Recipient Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Staff Member
                </label>
                <select
                  value={targetStaffId}
                  onChange={(e) => setTargetStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.department} • {s.role}) — {s.phone}
                    </option>
                  ))}
                </select>
                {targetStaff && (
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Phone className="w-3 h-3" /> WhatsApp: {targetStaff.phone}
                    </span>
                    <span className="flex items-center gap-1 text-blue-700 font-medium">
                      <Mail className="w-3 h-3" /> {targetStaff.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispatch Channels
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('both')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      channel === 'both'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>Both Channels</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      channel === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      channel === 'email'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Email</span>
                  </button>
                </div>
              </div>

              {/* Template Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Template
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTemplateType('acknowledgement')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                      templateType === 'acknowledgement'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Quota Acknowledgment
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateType('reminder')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                      templateType === 'reminder'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Roster Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateType('custom')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                      templateType === 'custom'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Custom Compose
                  </button>
                </div>
              </div>

              {templateType === 'custom' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject Line (for Email)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. [DBICA Notice] Scheduled Holiday Duty Handover"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Custom Message Body
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Type your message here..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Live Preview
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
                    {targetStaff && getTemplateText(templateType, targetStaff)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
