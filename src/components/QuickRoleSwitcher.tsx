import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Users, Briefcase, UserCheck, ChevronDown, RotateCcw, Sparkles, LogOut } from 'lucide-react';
import { Role } from '../types';

export const QuickRoleSwitcher: React.FC = () => {
  const { currentUser, staffList, switchUser, quickSwitchRole, resetToDefaultSeedData, logout } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const rolePresets: { role: Role; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    {
      role: 'Super Admin',
      label: 'Super Admin',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      color: 'hover:border-amber-400/50 hover:bg-amber-500/10',
      desc: 'Fr. Joseph (Full Privileges & Overrides)',
    },
    {
      role: 'HR',
      label: 'HR Admin',
      icon: <Users className="w-4 h-4 text-purple-400" />,
      color: 'hover:border-purple-400/50 hover:bg-purple-500/10',
      desc: 'Maria Theresa (Policy, Balances, Leaves)',
    },
    {
      role: 'Manager',
      label: 'Manager',
      icon: <Briefcase className="w-4 h-4 text-blue-400" />,
      color: 'hover:border-blue-400/50 hover:bg-blue-500/10',
      desc: 'David Anthony (Team Leaves & Schedule)',
    },
    {
      role: 'Staff',
      label: 'Staff Member',
      icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      color: 'hover:border-emerald-400/50 hover:bg-emerald-500/10',
      desc: 'Kavitha Raman (Apply & Track Leaves)',
    },
  ];

  return (
    <>
      <div className="bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2.5 shadow-md relative z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Label & Active User Identity */}
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Demo Role Switcher
            </span>
            <span className="text-slate-400 hidden sm:inline">Active Persona:</span>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${
                currentUser.role === 'Super Admin' ? 'bg-amber-400' :
                currentUser.role === 'HR' ? 'bg-purple-400' :
                currentUser.role === 'Manager' ? 'bg-blue-400' : 'bg-emerald-400'
              }`} />
              <strong className="text-white font-medium">{currentUser.name}</strong>
              <span className="text-slate-400 text-[11px]">({currentUser.role} • {currentUser.department})</span>
            </div>
          </div>

            {/* Quick Buttons for 4 main roles */}
            <div className="flex items-center flex-wrap gap-1.5">
              {rolePresets.map((preset) => {
                const isActive = currentUser.role === preset.role;
                const roleExists = staffList.some((s) => s.role === preset.role);
                return (
                  <button
                    key={preset.role}
                    id={`role-switch-${preset.role.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => quickSwitchRole(preset.role)}
                    title={roleExists ? preset.desc : `${preset.label} (Not yet created in staff list)`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white border-slate-600 shadow-sm ring-1 ring-white/20'
                        : roleExists
                        ? 'bg-slate-950/60 text-slate-300 border-slate-800 ' + preset.color
                        : 'bg-slate-950/30 text-slate-400 border-slate-800/60 opacity-60'
                    }`}
                  >
                    {preset.icon}
                    <span>{preset.label}</span>
                    {!roleExists && <span className="text-[10px] text-slate-400 font-normal">(-)</span>}
                  </button>
                );
              })}

            {/* Switch to any individual staff member dropdown */}
            <div className="relative">
              <button
                id="all-staff-dropdown-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                <span>All Staff ({staffList.length})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 divide-y divide-slate-800 text-xs"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/50">
                    Switch to any staff member
                  </div>
                  {staffList.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => {
                        switchUser(staff.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                        staff.id === currentUser.id ? 'bg-slate-800/90 text-amber-300' : 'text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {staff.department} • {staff.designation}
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        staff.role === 'Super Admin' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        staff.role === 'HR' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                        staff.role === 'Manager' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {staff.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset to Default Seed Data */}
            <button
              id="reset-seed-data-btn"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white transition-colors"
              title="Reset test data back to default DBICA initial records"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Reset Seed Data</span>
            </button>

            {/* Sign Out / Return to Login Landing Page */}
            <button
              id="logout-header-btn"
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Sign out and return to Login Landing Page"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset System Seed Data?</h3>
                <p className="text-xs text-slate-500">Restore factory defaults for DBICA</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              This will clear temporary browser state and restore the system to its clean operational state with only the Super Admin account (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">director@dbica.org</code>) and configured departments.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToDefaultSeedData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
