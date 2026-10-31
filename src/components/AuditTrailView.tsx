import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  History,
  Search,
  AlertCircle,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, emailHistory, currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'emails'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Permission check: Super Admin and HR only
  if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          The System Audit Trail is reserved for Super Admin and HR oversight.
        </p>
      </div>
    );
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== 'All' && log.action !== actionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEmails = emailHistory.filter((item) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const toStr = Array.isArray(item.to) ? item.to.join(' ') : item.to;
      return (
        item.subject.toLowerCase().includes(q) ||
        toStr.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueActions = ['All', ...Array.from(new Set(auditLogs.map((l) => l.action)))];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-800 rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">System Activity & Audit Log</h2>
            <p className="text-xs text-slate-500">
              Immutable log of approvals, rejections, overrides, and staff profile modifications
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {auditLogs.length} Total Recorded Events
        </span>
      </div>

      {/* Logs Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity Audit Trail</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeSubTab === 'audit' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {auditLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('emails')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'emails'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>System Communications (Emails)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeSubTab === 'emails' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {emailHistory.length}
              </span>
            </button>
          </div>

          {activeSubTab === 'emails' && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dispatches logged to DevTools console in real-time</span>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeSubTab === 'audit'
                    ? 'Search actor, details...'
                    : 'Search subject, recipients...'
                }
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 bg-white"
              />
            </div>

            {/* Action Filter (Only for audit) */}
            {activeSubTab === 'audit' && (
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none font-medium"
              >
                {uniqueActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            )}
          </div>

          <span className="text-xs text-slate-400">
            Showing {activeSubTab === 'audit' ? filteredLogs.length : filteredEmails.length} entries
          </span>
        </div>

        {/* Audit Log Table */}
        {activeSubTab === 'audit' ? (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Actor / User</th>
                  <th className="py-3 px-4 font-semibold">Action Type</th>
                  <th className="py-3 px-4 font-semibold">Event Description & Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                      No system events recorded in the audit trail yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const actionBadges: Record<string, string> = {
                    LEAVE_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    LEAVE_REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
                    LEAVE_APPLIED: 'bg-blue-50 text-blue-700 border-blue-200',
                    LEAVE_CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
                    ADMIN_OVERRIDE: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
                    STAFF_CREATED: 'bg-purple-50 text-purple-700 border-purple-200',
                    STAFF_UPDATED: 'bg-slate-100 text-slate-700 border-slate-200',
                    STAFF_DELETED: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
                    BALANCE_ADJUSTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        <div className="font-medium text-slate-800">
                          {formatDateTime(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.id}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.actorName}</div>
                        <span className="text-[10.5px] text-slate-500">{log.actorRole}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            actionBadges[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 leading-relaxed text-slate-700">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Emails View */
          <div className="space-y-3 mt-2">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No simulated emails recorded yet matching query.
              </div>
            ) : (
              filteredEmails.map((email) => {
                const badgeConfig = {
                  LEAVE_SUBMITTED: {
                    label: 'Leave Submitted',
                    badge: 'bg-blue-50 text-blue-700 border-blue-200',
                    icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
                  },
                  LEAVE_APPROVED: {
                    label: 'Leave Approved',
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
                  },
                  LEAVE_REJECTED: {
                    label: 'Leave Rejected',
                    badge: 'bg-rose-50 text-rose-700 border-rose-200',
                    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
                  },
                  LEAVE_CANCELLED: {
                    label: 'Leave Cancelled',
                    badge: 'bg-slate-100 text-slate-700 border-slate-200',
                    icon: <X className="w-3.5 h-3.5 text-slate-500" />,
                  },
                }[email.type];

                const toDisplay = Array.isArray(email.to) ? email.to.join(', ') : email.to;

                return (
                  <div
                    key={email.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeConfig.badge}`}
                          >
                            {badgeConfig.icon}
                            {badgeConfig.label}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ID: {email.id}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {email.subject}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 text-[11px]">
                          {new Date(email.timestamp).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => handleCopy(email.body, email.id)}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          {copiedId === email.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy Body</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <strong className="text-slate-500">From: </strong>
                        <span className="text-slate-700">{email.from}</span>
                      </div>
                      <div>
                        <strong className="text-slate-500">To: </strong>
                        <span className="text-blue-700 font-medium">{toDisplay}</span>
                      </div>
                    </div>

                    <pre className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {email.body}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
