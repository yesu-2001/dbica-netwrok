import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Timer,
  ShieldCheck,
  Briefcase,
  CalendarCheck,
  Moon,
  Sparkles,
} from 'lucide-react';
import { LeaveType } from '../types';
import { calculateWorkingDays } from '../utils/dateUtils';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: LeaveType;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({
  isOpen,
  onClose,
  initialType = 'Casual',
}) => {
  const { currentUser, applyLeave, getMonthlyPermissionStats } = useApp();

  // Normalize initialType if legacy 'Earned' is passed
  const effectiveInitialType: LeaveType =
    (initialType as string) === 'Earned' ? 'Compensatory' : initialType;

  const [leaveType, setLeaveType] = useState<LeaveType>(effectiveInitialType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Permission specific fields (max 60 mins/month)
  const [permissionMinutes, setPermissionMinutes] = useState<number>(60);
  const [permissionStartTime, setPermissionStartTime] = useState<string>('09:30 AM');
  const [permissionEndTime, setPermissionEndTime] = useState<string>('10:30 AM');

  // Compensatory Leave specific fields (Claim for extra hours / holidays worked)
  const [workedDate, setWorkedDate] = useState<string>('');
  const [workedHours, setWorkedHours] = useState<number>(8);
  const [workedPeriodType, setWorkedPeriodType] = useState<string>('After Office Hours');
  const [workedDutyDetails, setWorkedDutyDetails] = useState<string>('');

  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default dates and reset form when opening
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + 1);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const toStr = (d: Date) => d.toISOString().split('T')[0];
      const todayStr = toStr(today);
      const nextDayStr = toStr(nextDay);
      const yesterdayStr = toStr(yesterday);

      setStartDate(nextDayStr);
      setEndDate(nextDayStr);
      setWorkedDate(yesterdayStr);
      setWorkedHours(8);
      setWorkedPeriodType('After Office Hours');
      setWorkedDutyDetails('');

      const normalizedType: LeaveType =
        (initialType as string) === 'Earned' ? 'Compensatory' : initialType || 'Casual';
      setLeaveType(normalizedType);
      setErrorMsg(null);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const isPermission = leaveType === 'Permission';
  const isCompensatory = leaveType === 'Compensatory' || (leaveType as string) === 'Earned';

  const targetMonthStr = (startDate || new Date().toISOString().split('T')[0]).slice(0, 7);
  const permStats = getMonthlyPermissionStats(currentUser.id, targetMonthStr);

  const totalWorkingDays = calculateWorkingDays(startDate, endDate || startDate);

  // Balance lookup for the active leave category
  const balanceKey =
    leaveType === 'Casual'
      ? 'casual'
      : leaveType === 'Sick'
      ? 'sick'
      : isCompensatory
      ? 'compensatory'
      : null;

  const availableBalance =
    balanceKey !== null
      ? (currentUser.leaveBalance[balanceKey] ?? (currentUser.leaveBalance as any)?.earned ?? 0)
      : null;

  const isLeaveInsufficient =
    !isPermission && availableBalance !== null && totalWorkingDays > availableBalance;

  // Check permission monthly allowance
  const isPermissionExceeded =
    isPermission &&
    (permStats.remainingMinutes <= 0 || permissionMinutes > permStats.remainingMinutes);

  const isSubmitDisabled = isPermission ? isPermissionExceeded : isLeaveInsufficient;

  // Quick preset helper for permission duration
  const handleSelectMinutes = (mins: number) => {
    setPermissionMinutes(mins);
    if (mins === 15) {
      setPermissionStartTime('09:30 AM');
      setPermissionEndTime('09:45 AM');
    } else if (mins === 30) {
      setPermissionStartTime('09:30 AM');
      setPermissionEndTime('10:00 AM');
    } else if (mins === 45) {
      setPermissionStartTime('09:30 AM');
      setPermissionEndTime('10:15 AM');
    } else {
      setPermissionStartTime('09:30 AM');
      setPermissionEndTime('10:30 AM');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!emergencyContact.trim()) {
      setErrorMsg('Please provide an emergency contact number or contact person.');
      return;
    }

    // Permission validation
    if (isPermission) {
      if (!startDate) {
        setErrorMsg('Please choose the date for the permission.');
        return;
      }
      if (permissionMinutes <= 0) {
        setErrorMsg('Permission duration must be at least 1 minute.');
        return;
      }
      if (permissionMinutes > 60) {
        setErrorMsg('Maximum time for permissions is 60 minutes per month.');
        return;
      }
      if (permissionMinutes > permStats.remainingMinutes) {
        setErrorMsg(
          `Exceeds monthly quota! You have only ${permStats.remainingMinutes} minutes remaining for ${targetMonthStr}.`
        );
        return;
      }
      if (!reason.trim()) {
        setErrorMsg('Please specify a brief reason for your permission.');
        return;
      }
    }

    // Compensatory Leave validation
    if (isCompensatory) {
      if (!startDate) {
        setErrorMsg('Please specify the date for which you want to take your Compensatory Leave.');
        return;
      }
      if (!workedDate) {
        setErrorMsg('Please enter the date previously worked (after office hours or on a holiday).');
        return;
      }
      if (!workedHours || workedHours <= 0) {
        setErrorMsg('Please specify the extra hours worked for this claim.');
        return;
      }
      if (!workedDutyDetails.trim()) {
        setErrorMsg('Please enter the details of the duties or tasks handled during the extra worked time.');
        return;
      }
      if (availableBalance !== null && totalWorkingDays > availableBalance) {
        setErrorMsg(
          `Insufficient Compensatory Leave balance. Available: ${availableBalance} days, Requested: ${totalWorkingDays} days.`
        );
        return;
      }
    }

    // Standard Leave validation
    if (!isPermission && !isCompensatory) {
      if (!startDate || !endDate) {
        setErrorMsg('Please choose both start and end dates for your leave.');
        return;
      }
      if (!reason.trim()) {
        setErrorMsg('Please specify the reason for your leave.');
        return;
      }
      if (availableBalance !== null && totalWorkingDays > availableBalance) {
        setErrorMsg(
          `Insufficient ${leaveType} leave balance. Available: ${availableBalance} days, Requested: ${totalWorkingDays} days.`
        );
        return;
      }
    }

    const finalReason = isCompensatory
      ? reason.trim() || `Compensatory leave claimed for working on ${workedDate} (${workedHours}h - ${workedPeriodType}): ${workedDutyDetails.trim()}`
      : reason.trim();

    const result = applyLeave({
      leaveType: isCompensatory ? 'Compensatory' : leaveType,
      startDate,
      endDate: isPermission ? startDate : isCompensatory ? (endDate || startDate) : endDate,
      reason: finalReason,
      emergencyContact: emergencyContact.trim(),
      permissionMinutes: isPermission ? permissionMinutes : undefined,
      permissionStartTime: isPermission ? permissionStartTime : undefined,
      permissionEndTime: isPermission ? permissionEndTime : undefined,
      workedDate: isCompensatory ? workedDate : undefined,
      workedHours: isCompensatory ? Number(workedHours) : undefined,
      workedDutyDetails: isCompensatory ? workedDutyDetails.trim() : undefined,
      workedPeriodType: isCompensatory ? workedPeriodType : undefined,
      compensatoryLeaveDate: isCompensatory ? startDate : undefined,
    });

    if (result.success) {
      setReason('');
      setWorkedDutyDetails('');
      setEmergencyContact('');
      onClose();
    } else {
      setErrorMsg(result.error || 'Failed to submit leave application.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {isPermission ? (
                <>
                  <Timer className="w-5 h-5 text-violet-600" />
                  <span>Apply for Permission</span>
                </>
              ) : isCompensatory ? (
                <>
                  <CalendarCheck className="w-5 h-5 text-amber-600" />
                  <span>Claim Compensatory Leave (Comp Off)</span>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Apply for Staff Leave</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Staff Member: <span className="font-semibold text-slate-700">{currentUser.name}</span> ({currentUser.department})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mode Segmented Switcher */}
        <div className="mt-4 p-1 bg-slate-100 rounded-xl flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setLeaveType('Casual')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              !isPermission && !isCompensatory
                ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Regular Leave</span>
          </button>

          <button
            type="button"
            onClick={() => setLeaveType('Compensatory')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isCompensatory
                ? 'bg-white text-amber-900 shadow-xs ring-1 ring-amber-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Compensatory Leave</span>
          </button>

          <button
            type="button"
            onClick={() => setLeaveType('Permission')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
              isPermission
                ? 'bg-white text-violet-900 shadow-xs ring-1 ring-violet-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-violet-600" />
            <span>Permission (60m)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Selector when Regular Leave is active */}
          {!isPermission && !isCompensatory && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Leave Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Casual', 'Sick', 'Leave Without Pay (LWP)'] as LeaveType[]).map((type) => {
                  const isSelected = leaveType === type;
                  const bal =
                    type === 'Casual'
                      ? currentUser.leaveBalance.casual
                      : type === 'Sick'
                      ? currentUser.leaveBalance.sick
                      : null;

                  return (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setLeaveType(type)}
                      className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div className="truncate font-medium">{type}</div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5 font-normal">
                        {bal !== null ? `Bal: ${bal} days` : 'Unpaid Leave'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* COMPENSATORY LEAVE SPECIAL CLAIM INTERFACE */}
          {/* ========================================================================= */}
          {isCompensatory ? (
            <div className="space-y-4">
              {/* Informational Policy Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs">
                <div className="flex items-start gap-2.5">
                  <Briefcase className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs">
                      Compensatory Leave (Comp Off Claim)
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      Staff can claim Compensatory Leave for extra time or days worked — especially{' '}
                      <strong>after office hours</strong> and on <strong>holidays/weekends</strong>.
                      Enter the details of the day and hours previously worked, and choose the date for taking compensatory off.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Extra Time / Day Previously Worked */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Details of Day & Hours Previously Worked</span>
                  </span>
                  <span className="text-[10.5px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                    Step 1: Previous Work
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Day previously worked */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Day Previously Worked *
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={workedDate}
                      onChange={(e) => setWorkedDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Date when extra service was performed
                    </span>
                  </div>

                  {/* Work Context / Timing */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Timing / Occasion *
                    </label>
                    <select
                      value={workedPeriodType}
                      onChange={(e) => setWorkedPeriodType(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                    >
                      <option value="After Office Hours">After Office Hours (Evening/Late Night)</option>
                      <option value="Holiday Duty">Institution / Public Holiday</option>
                      <option value="Weekend Duty (Saturday/Sunday)">Weekend Duty (Saturday / Sunday)</option>
                      <option value="Special Event / Official Duty">Special Event / Media Production Duty</option>
                    </select>
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Context of overtime or holiday work
                    </span>
                  </div>
                </div>

                {/* Hours Worked */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Hours Worked Previously *
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {workedHours} Hours
                    </span>
                  </div>

                  {/* Quick Hour Presets */}
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { hrs: 3, label: '3h (Evening)' },
                      { hrs: 4, label: '4h (Half Day)' },
                      { hrs: 6, label: '6h (Extended)' },
                      { hrs: 8, label: '8h (Full Day)' },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.hrs}
                        onClick={() => setWorkedHours(preset.hrs)}
                        className={`py-1.5 px-2 text-xs rounded-lg font-medium border text-center transition-all ${
                          workedHours === preset.hrs
                            ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual Hours Input Slider */}
                  <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 shrink-0">Exact Hours:</span>
                    <input
                      type="range"
                      min={1}
                      max={16}
                      step={1}
                      value={workedHours}
                      onChange={(e) => setWorkedHours(Number(e.target.value))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={workedHours}
                      onChange={(e) => setWorkedHours(Number(e.target.value))}
                      className="w-14 px-2 py-1 text-xs border border-slate-300 rounded-md text-center font-bold text-slate-800"
                    />
                    <span className="text-xs text-slate-500">hrs</span>
                  </div>
                </div>

                {/* Duty Details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Details & Duties Performed *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={workedDutyDetails}
                    onChange={(e) => setWorkedDutyDetails(e.target.value)}
                    placeholder="Describe specific duties performed (e.g. Conducted video recording for admissions, handled convocation audio setup, supervised exam hall on holiday)..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Section 2: Date for which they want to take Compensatory Leave */}
              <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Date for which you want to take Compensatory Leave</span>
                  </span>
                  <span className="text-[10.5px] font-semibold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200">
                    Step 2: Leave Date
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Compensatory Leave Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setEndDate(e.target.value);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                    />
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Date when you want to avail comp off
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Leave Duration
                    </label>
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-600">Calculated:</span>
                      <strong className="text-slate-900 text-sm">
                        {totalWorkingDays} {totalWorkingDays === 1 ? 'Day' : 'Days'}
                      </strong>
                    </div>
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      1 day of compensatory leave credit
                    </span>
                  </div>
                </div>

                {/* Balance validation */}
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Your Compensatory Leave Balance: <strong>{availableBalance ?? 0} days</strong>
                  </span>
                  {isLeaveInsufficient ? (
                    <span className="font-semibold text-rose-600 flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> Exceeds available balance
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-700 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Balance remaining after: {(availableBalance ?? 0) - totalWorkingDays} days
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : isPermission ? (
            /* ========================================================================= */
            /* PERMISSION SPECIAL INTERFACE (MAX 60 MINS/MONTH) */
            /* ========================================================================= */
            <div className="space-y-3.5">
              {/* Institutional Rule & Monthly Quota Card */}
              <div className="p-3.5 rounded-xl bg-violet-50/60 border border-violet-200 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-violet-100">
                  <div className="flex items-center gap-2 text-violet-950 font-bold">
                    <ShieldCheck className="w-4 h-4 text-violet-600" />
                    <span>Monthly Permission Allowance</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                    Max 60 Mins / Month
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
                  <div className="bg-white/80 p-2 rounded-lg border border-violet-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">
                      Total Quota
                    </div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {permStats.maxMinutes}m
                    </div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-violet-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">
                      Used ({targetMonthStr})
                    </div>
                    <div className="text-base font-black text-violet-700 mt-0.5">
                      {permStats.usedMinutes}m
                    </div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-violet-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">
                      Remaining
                    </div>
                    <div
                      className={`text-base font-black mt-0.5 ${
                        permStats.remainingMinutes <= 0
                          ? 'text-rose-600'
                          : permStats.remainingMinutes < 30
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {permStats.remainingMinutes}m
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-violet-100/70 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        permStats.usedMinutes >= 60 ? 'bg-rose-500' : 'bg-violet-600'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((permStats.usedMinutes / 60) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 mt-1">
                    <span>{permStats.usedMinutes} mins utilized</span>
                    <span>{permStats.remainingMinutes} mins available</span>
                  </div>
                </div>
              </div>

              {/* Date of Permission */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date of Permission *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white font-medium"
                />
              </div>

              {/* Duration Presets & Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Permission Duration *
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Requested: <strong className="text-violet-700">{permissionMinutes} mins</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[15, 30, 45, 60].map((mins) => {
                    const isSelected = permissionMinutes === mins;
                    const exceeds = mins > permStats.remainingMinutes;

                    return (
                      <button
                        type="button"
                        key={mins}
                        disabled={exceeds}
                        onClick={() => handleSelectMinutes(mins)}
                        className={`py-2 px-2 text-xs rounded-xl font-semibold border transition-all text-center ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : exceeds
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50/40'
                        }`}
                      >
                        {mins} Mins
                      </button>
                    );
                  })}
                </div>

                {/* Custom Minutes Input Slider */}
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600 shrink-0 font-medium">Custom Minutes:</span>
                  <input
                    type="range"
                    min={5}
                    max={Math.min(60, permStats.remainingMinutes || 60)}
                    step={5}
                    value={permissionMinutes}
                    onChange={(e) => setPermissionMinutes(Number(e.target.value))}
                    className="flex-1 accent-violet-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={permissionMinutes}
                      onChange={(e) => setPermissionMinutes(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-bold text-slate-800 bg-white"
                    />
                    <span className="text-xs text-slate-500 font-medium">min</span>
                  </div>
                </div>

                {isPermissionExceeded && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {permStats.remainingMinutes <= 0
                      ? 'You have already exhausted your 60-minute permission quota for this month.'
                      : `Selected ${permissionMinutes} minutes exceeds your remaining allowance of ${permStats.remainingMinutes} minutes.`}
                  </p>
                )}
              </div>

              {/* Time Window (From - To) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={permissionStartTime}
                    onChange={(e) => setPermissionStartTime(e.target.value)}
                    placeholder="e.g. 09:30 AM"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={permissionEndTime}
                    onChange={(e) => setPermissionEndTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* REGULAR LEAVE INTERFACE (CASUAL / SICK / LWP) */
            /* ========================================================================= */
            <div className="space-y-3.5">
              {/* Date Picker Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && new Date(e.target.value) > new Date(endDate)) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Calculated Working Days Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Calculated Working Days:</span>
                  </div>
                  <span className="font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {totalWorkingDays} {totalWorkingDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  (Working day calculation excludes Sundays automatically)
                </div>

                {availableBalance !== null && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Current {leaveType} Balance: <strong>{availableBalance} days</strong>
                    </span>
                    {isLeaveInsufficient ? (
                      <span className="font-semibold text-rose-600 flex items-center gap-1 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" /> Exceeds available ({totalWorkingDays - availableBalance} short)
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-700 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Remaining after: {availableBalance - totalWorkingDays} days
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason / Remarks (Optional if compensatory duty details already keyed in) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isPermission
                ? 'Reason for Permission *'
                : isCompensatory
                ? 'Additional Remarks / Reason (Optional)'
                : 'Reason for Leave *'}
            </label>
            <textarea
              required={!isCompensatory}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isPermission
                  ? 'E.g., Urgent bank visit, personal medical appointment, transport delay...'
                  : isCompensatory
                  ? 'Any additional notes for Department Manager or HR review...'
                  : 'E.g., Family wedding ceremony, medical checkup, personal work...'
              }
              className={`w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 resize-none bg-white placeholder:text-slate-400 ${
                isPermission
                  ? 'focus:ring-violet-500'
                  : isCompensatory
                  ? 'focus:ring-amber-500'
                  : 'focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Emergency Contact Person & Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 98400 12345 (Colleague / Spouse / Family Member)"
                className={`w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-white placeholder:text-slate-400 ${
                  isPermission
                    ? 'focus:ring-violet-500'
                    : isCompensatory
                    ? 'focus:ring-amber-500'
                    : 'focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all ${
                isSubmitDisabled
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : isPermission
                  ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/30'
                  : isCompensatory
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              {isPermission
                ? `Submit Permission (${permissionMinutes} Mins)`
                : isCompensatory
                ? `Claim Compensatory Leave (${totalWorkingDays} Day${totalWorkingDays > 1 ? 's' : ''})`
                : 'Submit Leave Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
