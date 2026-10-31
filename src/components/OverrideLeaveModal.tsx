import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShieldAlert } from 'lucide-react';
import { LeaveRequest, LeaveStatus } from '../types';
import { formatDateRange } from '../utils/dateUtils';

interface OverrideLeaveModalProps {
  request: LeaveRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OverrideLeaveModal: React.FC<OverrideLeaveModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const { overrideLeave, currentUser } = useApp();
  const [newStatus, setNewStatus] = useState<LeaveStatus>('Approved');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request || currentUser.role !== 'Super Admin') return null;

  const handleOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A super admin justification note is required for audit logging.');
      return;
    }

    const result = overrideLeave(request.id, newStatus, reason.trim());
    if (result.success) {
      setReason('');
      setError(null);
      onClose();
    } else {
      setError(result.error || 'Failed to override status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Super Admin Status Override</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Applicant:</span>
            <span className="font-semibold text-slate-800">{request.staffName} ({request.department})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dates:</span>
            <span className="font-medium text-slate-700">
              {formatDateRange(request.startDate, request.endDate)} ({request.totalDays}d)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Status:</span>
            <span className="font-bold text-slate-800">{request.status}</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleOverride} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Overridden Status *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Approved', 'Rejected', 'Pending'] as LeaveStatus[]).map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setNewStatus(status)}
                  className={`py-2 px-3 text-xs rounded-xl border text-center font-medium transition-all ${
                    newStatus === status
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Super Admin Justification Note *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for administrative override (recorded into audit log)..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
            >
              Apply Super Admin Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
