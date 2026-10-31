import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DbicaLogo } from './DbicaLogo';
import {
  CalendarDays,
  FileCheck2,
  Users2,
  BarChart3,
  History,
  PlaneTakeoff,
  ShieldCheck,
  Building2,
  Lock,
  UserCog,
  Sliders,
  LogOut,
  Send,
  Cloud,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { EditProfileModal } from './EditProfileModal';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    leaveRequests,
    dispatchedNotifications,
    isCloudConnected,
    logout,
  } = useApp();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Calculate pending count relevant to active user
  const relevantPendingCount = leaveRequests.filter((req) => {
    if (req.status !== 'Pending') return false;
    if (currentUser.role === 'Super Admin' || currentUser.role === 'HR') return true;
    if (currentUser.role === 'Manager') {
      return req.department === currentUser.department;
    }
    return false;
  }).length;

  // Personal pending count for staff
  const myPendingCount = leaveRequests.filter(
    (req) => req.staffId === currentUser.id && req.status === 'Pending'
  ).length;

  const canReviewLeaves = currentUser.role !== 'Staff';
  const canManageStaff = currentUser.role === 'Super Admin' || currentUser.role === 'HR';
  const canViewAnalytics = currentUser.role === 'Super Admin' || currentUser.role === 'HR';
  const canViewAudit = currentUser.role === 'Super Admin' || currentUser.role === 'HR';
  const canCustomizeSettings = currentUser.role === 'Super Admin';

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    visible: boolean;
    description: string;
  }[] = [
    {
      id: 'overview',
      label: 'Leave Calendar & Overview',
      icon: <CalendarDays className="w-4 h-4" />,
      visible: true,
      description: 'Monthly schedule & team presence',
    },
    {
      id: 'my-leaves',
      label: 'My Leaves & Apply',
      icon: <PlaneTakeoff className="w-4 h-4" />,
      badge: myPendingCount > 0 ? myPendingCount : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      visible: true,
      description: 'Balances & personal applications',
    },
    {
      id: 'requests',
      label: 'Leave Approvals',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: relevantPendingCount > 0 ? relevantPendingCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold',
      visible: canReviewLeaves,
      description: currentUser.role === 'Manager' ? `${currentUser.department} approvals` : 'Organization approvals',
    },
    {
      id: 'notifications',
      label: 'Dispatch Center (WhatsApp & Email)',
      icon: <Send className="w-4 h-4 text-emerald-400" />,
      badge: dispatchedNotifications.length > 0 ? dispatchedNotifications.length : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold',
      visible: true,
      description: 'Live delivery logs & direct messaging',
    },
    {
      id: 'staff',
      label: 'Staff Directory (CRUD)',
      icon: <Users2 className="w-4 h-4" />,
      visible: canManageStaff,
      description: 'Staff records & leave balances',
    },
    {
      id: 'settings',
      label: 'Super Admin Policy & Settings',
      icon: <Sliders className="w-4 h-4" />,
      visible: canCustomizeSettings,
      description: 'Departments & leave thresholds',
    },
    {
      id: 'analytics',
      label: 'Leave Analytics & Reports',
      icon: <BarChart3 className="w-4 h-4" />,
      visible: canViewAnalytics,
      description: 'Department usage & trends',
    },
    {
      id: 'audit',
      label: 'System Audit Trail',
      icon: <History className="w-4 h-4" />,
      visible: canViewAudit,
      description: 'Security & activity log',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Organization Brand Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-slate-800/80 border border-slate-700/80 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
              <DbicaLogo size="sm" variant="icon" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                DBICA
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-medium">
                  Portal
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Leave Management</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 truncate">
            Don Bosco Institute of Communication Arts
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (!item.visible) return null;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                      {item.icon}
                    </span>
                    <div>
                      <div>{item.label}</div>
                    </div>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Access-restricted info badge for staff */}
          {currentUser.role === 'Staff' && (
            <div className="mt-6 mx-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px]">
              <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Staff Role Permissions
              </div>
              <p className="text-slate-400 leading-relaxed text-[10.5px]">
                Administrative panels (Staff CRUD, Approvals, Analytics) are hidden for Staff role. Use the Quick Switcher above to test as Manager, HR, or Super Admin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Card at Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        {/* Cloud Status Indicator */}
        <div className="flex items-center justify-between px-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-400' : 'text-blue-400 animate-pulse'}`} />
            <span className="font-medium">
              {isCloudConnected ? 'Cloud Firestore Active' : 'Connecting Cloud DB...'}
            </span>
          </div>
          <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-blue-400 animate-ping'}`} />
        </div>

        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                currentUser.avatarBg || 'bg-blue-600'
              }`}
            >
              {currentUser.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
              <div className="text-[10.5px] text-slate-400 truncate">{currentUser.department}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors"
              title="Edit your personal profile information"
              aria-label="Edit Profile"
            >
              <UserCog className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign Out / Return to Login Page"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <span
              className={`text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                currentUser.role === 'Super Admin'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : currentUser.role === 'HR'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : currentUser.role === 'Manager'
                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal from Sidebar */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </aside>
  );
};
