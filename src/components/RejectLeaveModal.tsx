import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, AlertTriangle, MessageSquare } from 'lucide-react';
import { LeaveRequest } from '../types';
import { formatDateRange } from '../utils/dateUtils';

interface RejectLeaveModalProps {
  request: LeaveRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RejectLeaveModal: React.FC<RejectLeaveModalProps> = ({ request, isOpen, onClose }) => {
  const { rejectLeave } = useApp();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A rejection reason is mandatory to guide the staff member.');
      return;
    }

    const result = rejectLeave(request.id, reason.trim());
    if (result.success) {
      setReason('');
      setError(null);
      onClose();
    } else {
      setError(result.error || 'Failed to reject leave.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Reject Leave Application</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Application details summary */}
        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Applicant:</span>
            <span className="font-semibold text-slate-800">{request.staffName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Department:</span>
            <span className="font-medium text-slate-700">{request.department}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Duration:</span>
            <span className="font-medium text-slate-700">
              {formatDateRange(request.startDate, request.endDate)} ({request.totalDays} days)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Category:</span>
            <span className="font-semibold text-slate-800">{request.leaveType} Leave</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleReject}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            Mandatory Rejection Comment / Reason *
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g., Department clash with ongoing production shoot, insufficient coverage during student exams..."
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white placeholder:text-slate-400 resize-none"
          />

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm shadow-rose-600/30"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
