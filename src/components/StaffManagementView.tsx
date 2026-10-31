import React, { useState } from 'react';
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
    departments: appDepartments,
    globalThresholds,
    setActiveTab,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [balanceStaff, setBalanceStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

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
          Please switch role to Super Admin or HR in the role switcher.
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
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Handle Add Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Staff name and official email are required.');
      return;
    }

    const res = addStaff({
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
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
    });

    if (res.success) {
      setIsAddModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to add staff member.');
    }
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
    if (!balanceStaff) return;

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
              {staffList.length} registered staff members • Authorized role: {currentUser.role}
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

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleStaffStatus(staff.id)}
                        disabled={staff.role === 'Super Admin' && !isSuperAdmin}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-colors ${
                          staff.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {staff.status}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Adjust Balance & Thresholds */}
                        <button
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
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Adjust Leave Quotas & Balances"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Staff Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Profile - Strictly Super Admin Only */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeletingStaff(staff)}
                            disabled={staff.role === 'Super Admin' && staffList.filter((s) => s.role === 'Super Admin').length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Add New DBICA Staff Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/30"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-600">
                <Sliders className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Manage Leave Thresholds & Balance</h3>
              </div>
              <button
                onClick={() => setBalanceStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
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
                    onClick={() => setBalanceStaff(null)}
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm"
                  >
                    Save Quotas & Balances
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
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
              Are you sure you want to permanently remove <strong className="text-slate-900">{deletingStaff.name}</strong> ({deletingStaff.designation}, {deletingStaff.department}) from DBICA's active registry?
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
