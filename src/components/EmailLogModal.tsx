import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmailNotification } from '../types';
import {
  Mail,
  X,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

interface EmailLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailLogModal: React.FC<EmailLogModalProps> = ({ isOpen, onClose }) => {
  const { emailHistory } = useApp();
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(
    emailHistory[0] || null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEmail = selectedEmail || emailHistory[0] || null;

  const handleCopyBody = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const typeConfig = {
    LEAVE_SUBMITTED: {
      label: 'Submitted',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
    },
    LEAVE_APPROVED: {
      label: 'Approved',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    LEAVE_REJECTED: {
      label: 'Rejected',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
    LEAVE_CANCELLED: {
      label: 'Cancelled',
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: <X className="w-3.5 h-3.5 text-slate-500" />,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Mock Email Notification Service
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Console Logging Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Simulating automated institutional communications sent to staff, managers, and HR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            aria-label="Close Email Logs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-slate-900 text-slate-200 px-5 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>
              All email events are formatted with color codes and logged directly to{' '}
              <strong className="text-white font-semibold">DevTools Console</strong>.
            </span>
          </div>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            Press F12 / Inspect to view console groups
          </span>
        </div>

        {/* Content Body: Two Columns on tablet/desktop */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Email List */}
          <div className="w-full md:w-5/12 border-r border-slate-200 overflow-y-auto bg-slate-50/40 p-3 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
              Dispatched Emails ({emailHistory.length})
            </div>

            {emailHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No simulated emails sent yet. Submit, approve, or reject a leave request to see
                outgoing notifications!
              </div>
            ) : (
              emailHistory.map((item) => {
                const isSelected = currentEmail?.id === item.id;
                const badge = typeConfig[item.type];
                const toDisplay = Array.isArray(item.to) ? item.to.join(', ') : item.to;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEmail(item)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500'
                        : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      To: {toDisplay}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Email Details */}
          <div className="w-full md:w-7/12 flex-1 flex flex-col min-h-0 bg-white overflow-y-auto p-5">
            {currentEmail ? (
              <div className="space-y-4">
                {/* Email Header Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {currentEmail.subject}
                    </h4>
                    <button
                      onClick={() => handleCopyBody(currentEmail.body, currentEmail.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors shrink-0 flex items-center gap-1 text-xs"
                      title="Copy Email Text"
                    >
                      {copiedId === currentEmail.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 text-[11px] font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-500">From: </span>
                      <span className="text-slate-800 font-medium">{currentEmail.from}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Sent: </span>
                      <span className="text-slate-700">
                        {new Date(currentEmail.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-500">To: </span>
                      <span className="text-blue-700 font-medium">
                        {Array.isArray(currentEmail.to)
                          ? currentEmail.to.join(', ')
                          : currentEmail.to}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Message Content */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Message Body
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner overflow-x-auto">
                    {currentEmail.body}
                  </pre>
                </div>

                {/* Metadata Pill if available */}
                {currentEmail.metadata && (
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                    <div>
                      <strong>System Metadata:</strong> Ref #{currentEmail.metadata.requestId} •{' '}
                      {currentEmail.metadata.staffName} ({currentEmail.metadata.department})
                    </div>
                    <span className="text-blue-700 font-semibold">
                      {currentEmail.metadata.totalDays} day(s)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs">
                <Mail className="w-10 h-10 text-slate-300 mb-2" />
                <span>Select an email on the left to preview its content</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Don Bosco Institute of Communication Arts • Mock SMTP & Console Notification Service
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
