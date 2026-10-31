import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DepartmentItem, StaffMember } from '../types';
import {
  Building2,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  Info,
  Calendar,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export const CustomizationSettingsView: React.FC = () => {
  const {
    currentUser,
    departments,
    staffList,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    globalThresholds,
    updateGlobalThresholds,
    updateStaffLeaveThresholds,
    addToast,
  } = useApp();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'global-thresholds' | 'staff-thresholds'>('departments');

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptHodId, setDeptHodId] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [isDeletingDept, setIsDeletingDept] = useState(false);

  // Global Thresholds Form State
  const [globalCasual, setGlobalCasual] = useState(globalThresholds.casual);
  const [globalSick, setGlobalSick] = useState(globalThresholds.sick);
  const [globalEarned, setGlobalEarned] = useState<number>(globalThresholds.compensatory ?? globalThresholds.earned ?? 15);
  const [globalCompMax, setGlobalCompMax] = useState(globalThresholds.compensatoryMax ?? 5);
  const [syncAllStaff, setSyncAllStaff] = useState(false);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // Staff Threshold Editor Modal State
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffThresholdCasual, setStaffThresholdCasual] = useState(12);
  const [staffThresholdSick, setStaffThresholdSick] = useState(10);
  const [staffThresholdEarned, setStaffThresholdEarned] = useState(15);
  const [staffBalanceCasual, setStaffBalanceCasual] = useState(12);
  const [staffBalanceSick, setStaffBalanceSick] = useState(10);
  const [staffBalanceEarned, setStaffBalanceEarned] = useState(15);
  const [thresholdReason, setThresholdReason] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDeptFilter, setStaffDeptFilter] = useState('All');

  const isSuperAdmin = currentUser.role === 'Super Admin';

  // Open Create Department Modal
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setDeptHodId('');
    setDeptError('');
    setIsDeptModalOpen(true);
  };

  // Open Edit Department Modal
  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptDesc(dept.description || '');
    setDeptHodId(dept.hodId || '');
    setDeptError('');
    setIsDeptModalOpen(true);
  };

  // Submit Department Form
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError('');

    if (!deptName.trim()) {
      setDeptError('Department name is required.');
      return;
    }
    if (!deptCode.trim()) {
      setDeptError('Department code is required (e.g. MP, DVA).');
      return;
    }

    setIsSavingDept(true);
    try {
      if (editingDept) {
        const res = await updateDepartment(editingDept.id, {
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          description: deptDesc.trim(),
          hodId: deptHodId.trim() ? deptHodId.trim() : '',
        });
        if (!res.success) {
          setDeptError(res.error || 'Failed to update department.');
          setIsSavingDept(false);
          return;
        }
      } else {
        const res = await createDepartment({
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          description: deptDesc.trim(),
          hodId: deptHodId.trim() ? deptHodId.trim() : undefined,
        });
        if (!res.success) {
          setDeptError(res.error || 'Failed to create department.');
          setIsSavingDept(false);
          return;
        }
      }

      setIsDeptModalOpen(false);
    } catch (err: any) {
      setDeptError(err?.message || 'An unexpected error occurred while saving the department.');
    } finally {
      setIsSavingDept(false);
    }
  };

  // Confirm Delete Department
  const handleConfirmDeleteDept = async () => {
    if (!deletingDept) return;
    setIsDeletingDept(true);
    try {
      const res = await deleteDepartment(deletingDept.id);
      if (!res.success) {
        addToast('Cannot Delete Department', res.error || 'Failed to delete department.', 'error');
      }
      setDeletingDept(null);
    } finally {
      setIsDeletingDept(false);
    }
  };

  // Save Global Thresholds
  const handleSaveGlobalThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);

    try {
      const res = await updateGlobalThresholds(
        {
          casual: Number(globalCasual),
          sick: Number(globalSick),
          earned: Number(globalEarned),
          compensatoryMax: Number(globalCompMax),
        },
        syncAllStaff
      );

      if (!res.success) {
        addToast('Error', res.error || 'Failed to save global thresholds.', 'error');
      } else {
        setSyncAllStaff(false);
      }
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Open Staff Threshold Modal
  const handleOpenStaffThresholdModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    const quota = staff.leaveThresholds || {
      casual: globalThresholds.casual,
      sick: globalThresholds.sick,
      earned: globalThresholds.earned,
      compensatory: globalThresholds.compensatory ?? globalThresholds.earned,
    };
    setStaffThresholdCasual(quota.casual);
    setStaffThresholdSick(quota.sick);
    setStaffThresholdEarned(quota.compensatory ?? quota.earned);

    setStaffBalanceCasual(staff.leaveBalance.casual);
    setStaffBalanceSick(staff.leaveBalance.sick);
    setStaffBalanceEarned(staff.leaveBalance.compensatory ?? staff.leaveBalance.earned);
    setThresholdReason('');
  };

  // Apply Global Defaults to currently editing staff member
  const handleApplyGlobalToCurrentStaff = () => {
    setStaffThresholdCasual(globalThresholds.casual);
    setStaffThresholdSick(globalThresholds.sick);
    const globalComp = globalThresholds.compensatory ?? globalThresholds.earned;
    setStaffThresholdEarned(globalComp);

    setStaffBalanceCasual(globalThresholds.casual);
    setStaffBalanceSick(globalThresholds.sick);
    setStaffBalanceEarned(globalComp);
    setThresholdReason('Reset to DBICA institution global annual thresholds.');
  };

  // Save Staff Threshold
  const handleSaveStaffThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const res = await updateStaffLeaveThresholds(
      selectedStaff.id,
      {
        casual: Number(staffThresholdCasual),
        sick: Number(staffThresholdSick),
        earned: Number(staffThresholdEarned),
        compensatory: Number(staffThresholdEarned),
      },
      {
        casual: Number(staffBalanceCasual),
        sick: Number(staffBalanceSick),
        earned: Number(staffBalanceEarned),
        compensatory: Number(staffBalanceEarned),
      },
      thresholdReason.trim()
    );

    if (res.success) {
      setSelectedStaff(null);
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.designation.toLowerCase().includes(staffSearch.toLowerCase());
    const matchesDept = staffDeptFilter === 'All' || s.department === staffDeptFilter;
    return matchesSearch && matchesDept;
  });

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-xs">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Super Admin Access Required</h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Customization options for institutional departments and leave threshold quotas are restricted to the DBICA Rector & Director (Super Admin).
        </p>
        <div className="text-xs text-slate-400">
          Current logged in role: <span className="font-semibold text-slate-700">{currentUser.role}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            Super Admin Governance & Customization
          </div>
          <h2 className="text-xl font-bold text-slate-900">System Policy & Department Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and edit institutional departments, set global default leave quotas, and tailor threshold allowances for individual staff.
          </p>
        </div>

        {/* Action button based on active sub tab */}
        {activeSubTab === 'departments' && (
          <button
            onClick={handleOpenCreateDept}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Department</span>
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === 'departments'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments Management ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('global-thresholds')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === 'global-thresholds'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Global Leave Thresholds</span>
        </button>

        <button
          onClick={() => setActiveSubTab('staff-thresholds')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === 'staff-thresholds'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Quota & Threshold Editor</span>
        </button>
      </div>

      {/* SUB-TAB 1: DEPARTMENTS MANAGEMENT */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const assignedStaff = staffList.filter(
                (s) => s.department.toLowerCase() === dept.name.toLowerCase()
              );
              const hod = dept.hodId ? staffList.find((s) => s.id === dept.hodId) : null;

              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group"
                >
                  <div>
                    {/* Header: Name and Code */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold tracking-wide">
                            {dept.code}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm truncate" title={dept.name}>
                            {dept.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingDept(dept)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Department"
                          disabled={departments.length <= 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] leading-relaxed mb-4">
                      {dept.description || 'No specialized description recorded for this department.'}
                    </p>

                    {/* Head of Department info */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-3 text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                        Head of Department (HOD)
                      </span>
                      {hod ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                              hod.avatarBg || 'bg-blue-600'
                            }`}
                          >
                            {hod.name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{hod.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{hod.designation}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">No HOD assigned yet</div>
                      )}
                    </div>
                  </div>

                  {/* Footer: Staff count & assigned tags */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        <strong className="text-slate-800 font-bold">{assignedStaff.length}</strong> staff assigned
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      ID: {dept.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GLOBAL LEAVE THRESHOLDS */}
      {activeSubTab === 'global-thresholds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Institution-Wide Annual Quotas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These baseline quotas serve as default allocations for all staff members across Don Bosco Institute of Communication Arts.
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-[10.5px] text-slate-400 block">Last Updated:</span>
                <span className="text-xs font-semibold text-slate-700">
                  {new Date(globalThresholds.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveGlobalThresholds} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Casual Leave */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-blue-900">Casual Leave (CL)</label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Annual
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={globalCasual}
                      onChange={(e) => setGlobalCasual(Number(e.target.value))}
                      className="w-full text-xl font-extrabold text-center py-2 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-medium">Days</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    Short personal, domestic, or urgent family requirements.
                  </p>
                </div>

                {/* Sick Leave */}
                <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-rose-900">Sick Leave (SL)</label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
                      Annual
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={globalSick}
                      onChange={(e) => setGlobalSick(Number(e.target.value))}
                      className="w-full text-xl font-extrabold text-center py-2 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-medium">Days</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    Medical diagnosis, hospitalization, or doctor-advised rest.
                  </p>
                </div>

                {/* Compensatory Leave */}
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-amber-900">Compensatory Leave (Comp Off)</label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                      Comp Off
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={globalEarned}
                      onChange={(e) => setGlobalEarned(Number(e.target.value))}
                      className="w-full text-xl font-extrabold text-center py-2 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-medium">Days</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    Credited for extra hours worked after office hours and institutional duties on holidays.
                  </p>
                </div>
              </div>

              {/* Additional Threshold Config */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Compensatory Off Policy Threshold</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Maximum compensatory days faculty can claim per academic semester for weekend shoot / production supervision.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={globalCompMax}
                      onChange={(e) => setGlobalCompMax(Number(e.target.value))}
                      className="w-20 text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                    <span className="text-xs text-slate-500">Days</span>
                  </div>
                </div>
              </div>

              {/* Propagation Checkbox */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="sync-all-staff"
                  checked={syncAllStaff}
                  onChange={(e) => setSyncAllStaff(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sync-all-staff" className="text-xs text-amber-900 cursor-pointer">
                  <strong className="font-bold block">Apply and synchronize to all existing staff members ({staffList.length} profiles)</strong>
                  <span className="text-amber-800 block text-[11px] mt-0.5">
                    If checked, this will update both the annual quota thresholds and reset the remaining balances for all staff in DBICA to these new numbers. If unchecked, changes only apply to future hires and newly generated balances.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGlobalCasual(globalThresholds.casual);
                    setGlobalSick(globalThresholds.sick);
                    setGlobalEarned(globalThresholds.compensatory ?? globalThresholds.earned ?? 15);
                    setGlobalCompMax(globalThresholds.compensatoryMax ?? 5);
                    setSyncAllStaff(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  disabled={isSavingGlobal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{syncAllStaff ? 'Save & Sync All Staff' : 'Save Global Thresholds'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Guidelines and Summary */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Info className="w-4 h-4" />
                DBICA Institutional Rules
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Leave Policy Structure</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Total annual allowance currently defaults to{' '}
                <strong className="text-white font-semibold">
                  {globalCasual + globalSick + globalEarned} days
                </strong>{' '}
                per academic staff member.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                  <span>Casual Leave:</span>
                  <strong className="text-white">{globalCasual} days</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                  <span>Sick Leave:</span>
                  <strong className="text-white">{globalSick} days</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                  <span>Compensatory Leave:</span>
                  <strong className="text-white">{globalEarned} days</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                  <span>Max Compensatory:</span>
                  <strong className="text-white">{globalCompMax} days</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs text-xs text-slate-600 space-y-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Special Seniority Adjustments
              </h4>
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                To grant additional leave days (such as sabbatical allowances, study leave, or higher Compensatory Leave) for specific Department Heads or Senior Professors, switch to the <strong>Staff Quota & Threshold Editor</strong> tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STAFF QUOTA & THRESHOLD EDITOR */}
      {activeSubTab === 'staff-thresholds' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Individual Staff Threshold & Quota Allocations</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize specific annual quotas and remaining balances for any of the {staffList.length} DBICA staff members.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                />
              </div>

              <select
                value={staffDeptFilter}
                onChange={(e) => setStaffDeptFilter(e.target.value)}
                className="text-xs py-1.5 px-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Staff Threshold Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">Staff Member</th>
                  <th className="py-3 px-4 font-semibold">Department & Role</th>
                  <th className="py-3 px-4 font-semibold text-center">Casual Leave (CL)</th>
                  <th className="py-3 px-4 font-semibold text-center">Sick Leave (SL)</th>
                  <th className="py-3 px-4 font-semibold text-center">Compensatory Leave (CO)</th>
                  <th className="py-3 px-4 font-semibold text-center">Total Rem.</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => {
                  const threshold = staff.leaveThresholds || {
                    casual: globalThresholds.casual,
                    sick: globalThresholds.sick,
                    earned: globalThresholds.earned,
                    compensatory: globalThresholds.compensatory ?? globalThresholds.earned,
                  };
                  const compBal = staff.leaveBalance.compensatory ?? staff.leaveBalance.earned;
                  const compThreshold = threshold.compensatory ?? threshold.earned;
                  const totalRemaining =
                    staff.leaveBalance.casual + staff.leaveBalance.sick + compBal;

                  const isCustomized =
                    threshold.casual !== globalThresholds.casual ||
                    threshold.sick !== globalThresholds.sick ||
                    compThreshold !== (globalThresholds.compensatory ?? globalThresholds.earned);

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${
                              staff.avatarBg || 'bg-blue-600'
                            }`}
                          >
                            {staff.name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {staff.name}
                              {isCustomized && (
                                <span
                                  className="text-[9.5px] px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold"
                                  title="Customized Quota (different from global defaults)"
                                >
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-500">{staff.designation}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{staff.department}</div>
                        <div className="text-[10.5px] text-slate-500">{staff.role}</div>
                      </td>

                      {/* Casual Leave */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-blue-900">
                            {staff.leaveBalance.casual} <span className="text-[10px] text-slate-400">/ {threshold.casual}</span>
                          </span>
                          <span className="text-[9.5px] text-slate-400">bal / quota</span>
                        </div>
                      </td>

                      {/* Sick Leave */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-rose-900">
                            {staff.leaveBalance.sick} <span className="text-[10px] text-slate-400">/ {threshold.sick}</span>
                          </span>
                          <span className="text-[9.5px] text-slate-400">bal / quota</span>
                        </div>
                      </td>

                      {/* Compensatory Leave */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-amber-900">
                            {compBal} <span className="text-[10px] text-slate-400">/ {compThreshold}</span>
                          </span>
                          <span className="text-[9.5px] text-slate-400">bal / quota</span>
                        </div>
                      </td>

                      {/* Total Remaining */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-xs">
                          {totalRemaining}d
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenStaffThresholdModal(staff)}
                          className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                          title="Configure staff quotas and remaining days"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Edit Quota</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT DEPARTMENT */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <Building2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h3>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deptError && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deptError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDepartment} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visual Communication & Media Tech"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department Short Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VCM, AVFX, SOUND"
                  maxLength={8}
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white uppercase font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Head of Department (HOD)
                </label>
                <select
                  value={deptHodId}
                  onChange={(e) => setDeptHodId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Unassigned --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} - {s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of department scope, labs, and academic focus..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingDept}
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDept}
                  className="flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm shadow-blue-600/30"
                >
                  {isSavingDept && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingDept ? 'Saving to Cloud...' : editingDept ? 'Update Department' : 'Create Department'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE DEPARTMENT CONFIRMATION */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Department?</h3>
                <p className="text-xs text-slate-500">Super Admin action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-slate-900">{deletingDept.name}</strong> ({deletingDept.code})?
            </p>

            {staffList.filter((s) => s.department.toLowerCase() === deletingDept.name.toLowerCase()).length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs mb-4">
                <strong>Warning:</strong> Active staff members are assigned to this department. You must reassign them to another department before this department can be deleted.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeletingDept}
                onClick={() => setDeletingDept(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingDept}
                onClick={handleConfirmDeleteDept}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm"
              >
                {isDeletingDept && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingDept ? 'Removing...' : 'Yes, Remove Department'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STAFF THRESHOLD & BALANCE CUSTOMIZATION */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-600">
                <Sliders className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Staff Leave Quotas</h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedStaff.name} • {selectedStaff.department} ({selectedStaff.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-3 mb-2">
              <span className="text-xs text-slate-500 font-medium">Leave Categories</span>
              <button
                type="button"
                onClick={handleApplyGlobalToCurrentStaff}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to Global Defaults
              </button>
            </div>

            <form onSubmit={handleSaveStaffThreshold} className="space-y-4 text-xs">
              <div className="space-y-3">
                {/* Casual Leave Row */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-blue-900 text-xs">Casual Leave (CL)</span>
                    <span className="text-[10.5px] text-slate-500">
                      Global Default: {globalThresholds.casual}d
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Annual Quota Threshold (Max Days)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={staffThresholdCasual}
                        onChange={(e) => setStaffThresholdCasual(Number(e.target.value))}
                        className="w-full text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Current Available Balance
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={staffBalanceCasual}
                        onChange={(e) => setStaffBalanceCasual(Number(e.target.value))}
                        className="w-full text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white text-blue-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Sick Leave Row */}
                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-rose-900 text-xs">Sick Leave (SL)</span>
                    <span className="text-[10.5px] text-slate-500">
                      Global Default: {globalThresholds.sick}d
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Annual Quota Threshold (Max Days)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={staffThresholdSick}
                        onChange={(e) => setStaffThresholdSick(Number(e.target.value))}
                        className="w-full text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Current Available Balance
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={staffBalanceSick}
                        onChange={(e) => setStaffBalanceSick(Number(e.target.value))}
                        className="w-full text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white text-rose-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Compensatory Leave Row */}
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-900 text-xs">Compensatory Leave (Comp Off)</span>
                    <span className="text-[10.5px] text-slate-500">
                      Global Default: {globalThresholds.compensatory ?? globalThresholds.earned}d
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Annual Quota Threshold (Max Days)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={staffThresholdEarned}
                        onChange={(e) => setStaffThresholdEarned(Number(e.target.value))}
                        className="w-full text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                        Current Available Balance
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={staffBalanceEarned}
                        onChange={(e) => setStaffBalanceEarned(Number(e.target.value))}
                        className="w-full text-center font-bold py-1.5 border border-slate-300 rounded-lg bg-white text-amber-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adjustment Reason / Audit Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Seniority entitlement, Sabbatical arrangement, HR policy exception"
                  value={thresholdReason}
                  onChange={(e) => setThresholdReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm shadow-purple-600/30"
                >
                  Save Quota & Balances
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
