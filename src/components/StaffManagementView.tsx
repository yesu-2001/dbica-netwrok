import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Sliders,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Building,
  Mail,
  Phone,
  Key,
  ShieldAlert,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Check,
  Share2,
  MessageCircle,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StaffMember, Role, Department } from '../types';

export const StaffManagementView: React.FC = () => {
  const {
    currentUser,
    staffList,
    addStaff,
    updateStaff,
    updateStaffBalance,
    updateStaffLeaveThresholds,
    deleteStaff,
    toggleStaffStatus,
    toggleStaffSuspension,
    requestPasswordReset,
    departments: appDepartments,
    globalThresholds,
    setActiveTab,
    addToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [balanceStaff, setBalanceStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [invitationModalData, setInvitationModalData] = useState<{
    staff: StaffMember;
    directLoginLink: string;
    password?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Add Staff Password States
  const [formPassword, setFormPassword] = useState('dbica@2026');
  const [formMustChangePassword, setFormMustChangePassword] = useState(true);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [formRole, setFormRole] = useState<Role>('Staff');
  const [formDesignation, setFormDesignation] = useState('');
  const [formCasual, setFormCasual] = useState(globalThresholds.casual);
  const [formSick, setFormSick] = useState(globalThresholds.sick);
  const [formEarned, setFormEarned] = useState(globalThresholds.earned);
  const [formQuotaCasual, setFormQuotaCasual] = useState(globalThresholds.casual);
  const [formQuotaSick, setFormQuotaSick] = useState(globalThresholds.sick);
  const [formQuotaEarned, setFormQuotaEarned] = useState(globalThresholds.earned);
  const [formThresholdReason, setFormThresholdReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isSavingBalance, setIsSavingBalance] = useState(false);
  const addStaffInProgress = useRef(false);
  const balanceSaveInProgress = useRef(false);

  // RBAC permission check: Super Admin and HR only
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isHR = currentUser.role === 'HR';

  if (!isSuperAdmin && !isHR) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          The Staff Directory and Management portal is accessible only by Super Admin and HR officers.
          Please sign in with an authorized Super Admin or HR account.
        </p>
      </div>
    );
  }

  const departments: string[] = appDepartments.map((d) => d.name);

  const roles: Role[] = ['Super Admin', 'HR', 'Manager', 'Staff'];

  // Open Edit Modal
  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPhone(staff.phone);
    setFormDepartment(staff.department);
    setFormRole(staff.role);
    setFormDesignation(staff.designation);
    setFormError(null);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormDepartment(departments[0] || 'Media Production');
    setFormRole('Staff');
    setFormDesignation('');
    setFormCasual(globalThresholds.casual);
    setFormSick(globalThresholds.sick);
    setFormEarned(globalThresholds.compensatory ?? globalThresholds.earned);
    setFormPassword('dbica@2026');
    setFormMustChangePassword(true);
    setShowFormPassword(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addStaffInProgress.current) return;
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Staff name and official email are required.');
      return;
    }

    const chosenPassword = formPassword.trim() || 'dbica@2026';

    addStaffInProgress.current = true;
    setIsAddingStaff(true);
    try {
    const res = await addStaff({
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || '+91 98400 00000',
      department: formDepartment || departments[0] || 'Media Production',
      role: formRole,
      designation: formDesignation.trim() || 'Faculty Member',
      leaveBalance: {
        casual: Number(formCasual) || 0,
        sick: Number(formSick) || 0,
        earned: Number(formEarned) || 0,
        compensatory: Number(formEarned) || 0,
      },
      leaveThresholds: {
        casual: Number(formCasual) || globalThresholds.casual,
        sick: Number(formSick) || globalThresholds.sick,
        earned: Number(formEarned) || globalThresholds.earned,
        compensatory: Number(formEarned) || (globalThresholds.compensatory ?? globalThresholds.earned),
      },
      portalPassword: chosenPassword,
      mustChangePassword: formMustChangePassword,
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
    });

    if (res.success && res.newStaff) {
      setIsAddModalOpen(false);
      setInvitationModalData({
        staff: res.newStaff,
        directLoginLink: res.directLoginLink || `${window.location.origin}/#login?email=${encodeURIComponent(res.newStaff.email)}`,
        password: res.initialPassword || chosenPassword || 'dbica@2026',
      });
      setCopiedLink(false);
      setCopiedPass(false);
      setCopiedAll(false);
      setShowModalPassword(false);
    } else {
      setFormError(res.error || 'Failed to add staff member.');
    }
    } catch (error) {
      console.error('[StaffManagementView] Failed to add staff member:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to add staff member.');
    } finally {
      addStaffInProgress.current = false;
      setIsAddingStaff(false);
    }
  };

  // Open existing account login details and sharing options.
  const handleOpenCredentialsModal = (staff: StaffMember) => {
    setCopiedLink(false);
    setCopiedPass(false);
    setCopiedAll(false);
    setShowModalPassword(false);

    const directLoginLink = `${window.location.origin}/#login?email=${encodeURIComponent(staff.email)}`;

    setInvitationModalData({
      staff,
      directLoginLink,
      password: staff.portalPassword || 'dbica@2026',
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const res = updateStaff(editingStaff.id, {
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      department: formDepartment,
      role: formRole,
      designation: formDesignation.trim(),
    });

    if (res.success) {
      setEditingStaff(null);
    } else {
      setFormError(res.error || 'Failed to update staff member.');
    }
  };

  // Handle Balance & Threshold Adjust Submit
  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceStaff || balanceSaveInProgress.current) return;
    balanceSaveInProgress.current = true;
    setIsSavingBalance(true);
    try {
      const res = await updateStaffLeaveThresholds(
        balanceStaff.id,
        {
          casual: Number(formQuotaCasual),
          sick: Number(formQuotaSick),
          earned: Number(formQuotaEarned),
          compensatory: Number(formQuotaEarned),
        },
        {
          casual: Number(formCasual),
          sick: Number(formSick),
          earned: Number(formEarned),
          compensatory: Number(formEarned),
        },
        formThresholdReason.trim() || undefined
      );

      if (res.success) {
        setBalanceStaff(null);
      } else {
        addToast('Unable to Save Changes', res.error || 'Failed to update staff leave quotas and balances.', 'error');
      }
    } catch (error) {
      console.error('[StaffManagementView] Failed to save staff leave balance:', error);
      addToast('Unable to Save Changes', error instanceof Error ? error.message : 'Failed to update staff leave quotas and balances.', 'error');
    } finally {
      balanceSaveInProgress.current = false;
      setIsSavingBalance(false);
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deletingStaff) return;
    deleteStaff(deletingStaff.id);
    setDeletingStaff(null);
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    if (departmentFilter !== 'All' && s.department !== departmentFilter) return false;
    if (roleFilter !== 'All' && s.role !== roleFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Staff Directory & Roster Administration
            </h2>
            <p className="text-xs text-slate-500">
              {staffList.length} registered staff members • Real-time Cloud Firestore Synced • Authorized: {currentUser.role}
            </p>
          </div>
        </div>

        {/* Add Staff Button */}
        <button
          id="add-new-staff-btn"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff Member</span>
        </button>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        {/* Filters Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff, email..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 bg-white"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none font-medium"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none font-medium"
            >
              <option value="All">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredStaff.length} of {staffList.length} staff
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Staff Profile</th>
                <th className="py-3 px-4 font-semibold">Department & Role</th>
                <th className="py-3 px-4 font-semibold">Contact Details</th>
                <th className="py-3 px-4 font-semibold">Leave Balance (CL / SL / CO)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Management Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => {
                const roleBadges = {
                  'Super Admin': 'bg-amber-100 text-amber-800 border-amber-200 font-bold',
                  HR: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
                  Manager: 'bg-blue-100 text-blue-800 border-blue-200',
                  Staff: 'bg-slate-100 text-slate-700 border-slate-200',
                };

                const compBal = staff.leaveBalance.compensatory ?? staff.leaveBalance.earned;

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name and Designation */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
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
                          <div className="font-bold text-slate-900">{staff.name}</div>
                          <div className="text-[10.5px] text-slate-400">{staff.designation}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department and Role */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{staff.department}</div>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded-md border mt-0.5 inline-block ${
                          roleBadges[staff.role]
                        }`}
                      >
                        {staff.role}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700">{staff.email}</div>
                      <div className="text-[10.5px] text-slate-400">{staff.phone}</div>
                    </td>

                    {/* Leave Balances */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded font-semibold text-[10.5px]"
                          title="Casual Leave Balance"
                        >
                          CL: {staff.leaveBalance.casual}
                        </span>
                        <span
                          className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded font-semibold text-[10.5px]"
                          title="Sick Leave Balance"
                        >
                          SL: {staff.leaveBalance.sick}
                        </span>
                        <span
                          className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold text-[10.5px]"
                          title="Compensatory Leave Balance"
                        >
                          CO: {compBal}
                        </span>
                      </div>
                    </td>

                    {/* Status & Account Security */}
                    <td className="py-3.5 px-4">
                      {staff.accountStatus === 'suspended' || staff.status === 'Inactive' ? (
                        <span
                          className="text-[10.5px] px-2.5 py-1 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1"
                          title="Account suspended by administration for security"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Suspended</span>
                        </span>
                      ) : (
                        <span
                          className="text-[10.5px] px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1"
                          title="Active staff account with established password"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Super Admin & HR: Share Credentials & Direct Login Link (Available for all staff) */}
                        <button
                          type="button"
                          onClick={() => handleOpenCredentialsModal(staff)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Share Login Credentials, WhatsApp Message & Direct Portal Link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Super Admin Safeguard: Suspend / Reactivate */}
                        {isSuperAdmin && staff.id !== currentUser.id && staff.role !== 'Super Admin' && (
                          <button
                            type="button"
                            onClick={() => toggleStaffSuspension(staff.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              staff.accountStatus === 'suspended'
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={
                              staff.accountStatus === 'suspended'
                                ? 'Reactivate Staff Portal Access'
                                : 'Suspend Staff Account for Safeguarding'
                            }
                          >
                            {staff.accountStatus === 'suspended' ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Super Admin/HR: Send a Firebase password reset link */}
                        {(isSuperAdmin || isHR) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const result = await requestPasswordReset(staff.email);
                              if (!result.success) {
                                addToast('Password Reset Failed', result.error || 'Could not send the Firebase reset email.', 'warning');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Send Firebase password reset link to employee"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Adjust Balance & Thresholds */}
                        <button
                          type="button"
                          onClick={() => {
                            setBalanceStaff(staff);
                            const q = staff.leaveThresholds || {
                              casual: globalThresholds.casual,
                              sick: globalThresholds.sick,
                              earned: globalThresholds.earned,
                              compensatory: globalThresholds.compensatory ?? globalThresholds.earned,
                            };
                            setFormQuotaCasual(q.casual);
                            setFormQuotaSick(q.sick);
                            setFormQuotaEarned(q.compensatory ?? q.earned);
                            setFormCasual(staff.leaveBalance.casual);
                            setFormSick(staff.leaveBalance.sick);
                            setFormEarned(staff.leaveBalance.compensatory ?? staff.leaveBalance.earned);
                            setFormThresholdReason('');
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Adjust Leave Quotas & Balances"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Staff Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Profile - Strictly Super Admin Only */}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeletingStaff(staff)}
                            disabled={staff.role === 'Super Admin' && staffList.filter((s) => s.role === 'Super Admin').length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
                            title={
                              staff.role === 'Super Admin' && staffList.filter((s) => s.role === 'Super Admin').length <= 1
                                ? 'Cannot delete the sole Super Admin'
                                : 'Delete Staff Record'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Add New DBICA Staff Member</h3>
              </div>
              <button
                disabled={isAddingStaff}
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
                {formError}
              </div>
            )}

            {/* Zero-Trust Safeguard Notice */}
            <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl text-left text-xs text-sky-950 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sky-900">Zero-Trust Credential Security Policy</p>
                <p className="text-[11px] text-sky-800 leading-relaxed mt-0.5">
                  Create the staff member's Firebase Authentication account and share their temporary credentials securely.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E.g., Prof. Anand Velu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="anand.v@dbica.ac.in"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98401 55678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r} disabled={r === 'Super Admin' && !isSuperAdmin}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="Assistant Professor / Studio Tech"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Initial Balances */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Initial Annual Leave Allocations (Days)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500">Casual (CL)</span>
                    <input
                      type="number"
                      min={0}
                      value={formCasual}
                      onChange={(e) => setFormCasual(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Sick (SL)</span>
                    <input
                      type="number"
                      min={0}
                      value={formSick}
                      onChange={(e) => setFormSick(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Compensatory (CO)</span>
                    <input
                      type="number"
                      min={0}
                      value={formEarned}
                      onChange={(e) => setFormEarned(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Account Access & Initial Password Setup */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>Portal Access &amp; Password</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Initial Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormPassword(`Dbica@${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="text-[10.5px] text-[#0F5C97] hover:underline font-medium cursor-pointer"
                      >
                        Generate Random
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="e.g. dbica@2026"
                        className="w-full px-3 py-1.5 pr-10 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={formMustChangePassword}
                      onChange={(e) => setFormMustChangePassword(e.target.checked)}
                      className="rounded text-[#0F5C97]"
                    />
                    <span>Prompt staff member to personalize their password on first login</span>
                  </label>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed">
                    The account is created immediately. Staff can sign in with their email and this password.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isAddingStaff}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingStaff}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingStaff ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isAddingStaff ? 'Creating Staff Account...' : 'Onboard & Generate Access Slip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Login Credentials & Share Slip Modal */}
      {invitationModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0F5C97]">
                <Key className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Staff Login Credentials &amp; Share Slip</h3>
                  <p className="text-[11px] text-slate-500">Ready to share directly with the staff member via WhatsApp, Email, or SMS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvitationModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              {/* Staff Profile Header Card */}
              <div className="p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{invitationModalData.staff.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {invitationModalData.staff.role}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    {invitationModalData.staff.designation} • {invitationModalData.staff.department}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] text-slate-400 block">Staff ID</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{invitationModalData.staff.id}</span>
                </div>
              </div>

              {/* 1-Click Direct Login Link (Primary Feature) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                    <ExternalLink className="w-4 h-4 text-blue-700" />
                    <span>Direct 1-Click Login Link (Email Pre-filled)</span>
                  </label>
                  <span className="text-[10.5px] text-blue-700 font-medium bg-blue-100/70 px-2 py-0.5 rounded">
                    Easiest for Staff
                  </span>
                </div>
                <p className="text-[11px] text-blue-900/80 leading-relaxed">
                  When the staff member clicks this link, the login screen automatically opens with their email filled in so they only enter their password!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={invitationModalData.directLoginLink}
                    className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs text-blue-950 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(invitationModalData.directLoginLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      addToast('Direct Link Copied', '1-Click login link copied to clipboard.', 'success');
                    }}
                    className="px-3 py-2 rounded-xl bg-[#0F5C97] hover:bg-[#0c4b7b] text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={invitationModalData.directLoginLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    title="Open in new window to verify"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                </div>
              </div>

              {/* Login Credentials Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Identifier */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 block">
                    Login Email
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate font-mono text-xs">
                      {invitationModalData.staff.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(invitationModalData.staff.email);
                        addToast('Email Copied', 'Staff email copied to clipboard.', 'info');
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded cursor-pointer shrink-0"
                      title="Copy Email"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Password Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 block">
                      Portal Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="text-[10.5px] text-[#0F5C97] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showModalPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showModalPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {showModalPassword ? (invitationModalData.password || 'dbica@2026') : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const pass = invitationModalData.password || 'dbica@2026';
                          navigator.clipboard.writeText(pass);
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 2000);
                          addToast('Password Copied', 'Password copied to clipboard.', 'info');
                        }}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded cursor-pointer shrink-0"
                        title="Copy Password"
                      >
                        {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instant 1-Click Sharing Center */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Instant Share with {invitationModalData.staff.name.split(' ')[0]}</span>
                  </span>
                  <span className="text-[10.5px] text-slate-400">Pre-formatted slip</span>
                </div>

                {(() => {
                  const pass = invitationModalData.password || 'dbica@2026';
                  const shareText = `🏛️ *Don Bosco Institute of Communication Arts (DBICA)*\n*Staff Leave Portal - Account Credentials*\n\nDear ${invitationModalData.staff.name},\nYour staff leave management portal account has been configured.\n\n🔗 *Direct Login Link (1-Click):*\n${invitationModalData.directLoginLink}\n\n👤 *Login Email:* ${invitationModalData.staff.email}\n🆔 *Staff ID:* ${invitationModalData.staff.id}\n🔑 *Temporary Password:* ${pass}\n\nPlease click the link above to sign in and submit or review leave requests.`;
                  const cleanPhone = (invitationModalData.staff.phone || '').replace(/[^0-9]/g, '');
                  const waUrl = cleanPhone.length >= 10
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`
                    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                  const mailtoUrl = `mailto:${invitationModalData.staff.email}?subject=${encodeURIComponent('DBICA Staff Portal - Your Login Credentials')}&body=${encodeURIComponent(shareText)}`;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {/* WhatsApp Share */}
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send WhatsApp</span>
                      </a>

                      {/* Email Share */}
                      <a
                        href={mailtoUrl}
                        className="py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Send Email</span>
                      </a>

                      {/* Copy All Slip */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareText);
                          setCopiedAll(true);
                          setTimeout(() => setCopiedAll(false), 2000);
                          addToast('Welcome Slip Copied', 'Full WhatsApp / Email slip copied to clipboard!', 'success');
                        }}
                        className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors text-center border border-slate-700 cursor-pointer"
                      >
                        {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedAll ? 'Slip Copied!' : 'Copy Full Slip'}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Staff member can log in at any time with these credentials.
                </span>
                <button
                  type="button"
                  onClick={() => setInvitationModalData(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <Edit2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Edit Staff Profile</h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {roles.map((r) => (
                      <option
                        key={r}
                        value={r}
                        disabled={
                          r === 'Super Admin' &&
                          !isSuperAdmin &&
                          editingStaff.role !== 'Super Admin'
                        }
                      >
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/30"
                >
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance & Thresholds Modal */}
      {balanceStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-600">
                <Sliders className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Manage Leave Thresholds & Balance</h3>
              </div>
              <button
                disabled={isSavingBalance}
                onClick={() => setBalanceStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Configure annual threshold entitlement and remaining available days for <strong className="text-slate-800">{balanceStaff.name}</strong> ({balanceStaff.department}).
            </p>

            <form onSubmit={handleBalanceSubmit} className="mt-4 space-y-3.5 text-xs">
              {/* Casual Leave */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-blue-900">Casual Leave (CL)</span>
                  <span className="text-[10px] text-slate-500">Global Quota: {globalThresholds.casual}d</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Annual Threshold (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formQuotaCasual}
                      onChange={(e) => setFormQuotaCasual(Number(e.target.value))}
                      className="w-full text-xs font-bold text-center py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Remaining Balance (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formCasual}
                      onChange={(e) => setFormCasual(Number(e.target.value))}
                      className="w-full text-xs font-bold text-center py-1.5 border border-slate-300 rounded-lg bg-white text-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Sick Leave */}
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-rose-900">Sick Leave (SL)</span>
                  <span className="text-[10px] text-slate-500">Global Quota: {globalThresholds.sick}d</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Annual Threshold (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formQuotaSick}
                      onChange={(e) => setFormQuotaSick(Number(e.target.value))}
                      className="w-full text-xs font-bold text-center py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Remaining Balance (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formSick}
                      onChange={(e) => setFormSick(Number(e.target.value))}
                      className="w-full text-xs font-bold text-center py-1.5 border border-slate-300 rounded-lg bg-white text-rose-700"
                    />
                  </div>
                </div>
              </div>

              {/* Compensatory Leave */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-amber-900">Compensatory Leave (CO)</span>
                  <span className="text-[10px] text-slate-500">Global Quota: {globalThresholds.compensatory ?? globalThresholds.earned}d</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Annual Threshold (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formQuotaEarned}
                      onChange={(e) => setFormQuotaEarned(Number(e.target.value))}
                      className="w-full text-xs font-bold text-center py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Remaining Balance (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formEarned}
                      onChange={(e) => setFormEarned(Number(e.target.value))}
                      className="w-full text-xs font-bold text-center py-1.5 border border-slate-300 rounded-lg bg-white text-amber-800"
                    />
                  </div>
                </div>
              </div>

              {/* Reason Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Adjustment / Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sabbatical adjustment, Senior faculty quota upgrade"
                  value={formThresholdReason}
                  onChange={(e) => setFormThresholdReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setBalanceStaff(null);
                      setActiveTab('settings');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Configure Global Defaults →
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={isSavingBalance}
                    onClick={() => setBalanceStaff(null)}
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBalance}
                    className="px-4 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingBalance ? 'Saving...' : 'Save Quotas & Balances'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Staff Profile?</h3>
                <p className="text-xs text-slate-500">Super Admin action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently remove <strong className="text-slate-900">{deletingStaff.name}</strong> ({deletingStaff.designation}, {deletingStaff.department}) from DBICA's staff registry?
            </p>

            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              First delete the matching Firebase Authentication user in Firebase Console, then delete this Firestore staff profile.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
