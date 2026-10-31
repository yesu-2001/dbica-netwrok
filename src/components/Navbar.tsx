import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Menu, PlusCircle, Calendar, ShieldCheck, Mail, LogOut } from 'lucide-react';
import { ActiveTab } from '../types';
import { EmailLogModal } from './EmailLogModal';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenApplyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, onOpenApplyModal }) => {
  const { currentUser, activeTab, emailHistory, logout } = useApp();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const tabTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Leave Calendar & Attendance Overview',
      subtitle: 'Track team availability and operational scheduling at DBICA',
    },
    'my-leaves': {
      title: 'My Leaves & Balance Portfolio',
      subtitle: `Personal leave balances and application status for ${currentUser.name}`,
    },
    requests: {
      title: 'Leave Request Approvals',
      subtitle:
        currentUser.role === 'Manager'
          ? `Review and approve leave requests for ${currentUser.department}`
          : 'Organization-wide leave review & authorization center',
    },
    notifications: {
      title: 'Multi-Channel Notification & Dispatch Center',
      subtitle: 'Real-time WhatsApp and Email delivery logs, instant acknowledgement, and direct dispatch',
    },
    staff: {
      title: 'Staff Directory & Roster Management',
      subtitle: 'Directory of up to 20 DBICA staff profiles, roles, and leave allocations',
    },
    settings: {
      title: 'Institution Policy & Department Customization',
      subtitle: 'Manage departments, global annual leave thresholds, and staff-specific quotas',
    },
    analytics: {
      title: 'Leave Analytics & Reports',
      subtitle: 'Department-wise leave patterns, category distribution, and metrics',
    },
    audit: {
      title: 'System Audit Trail',
      subtitle: 'Immutable record of staff actions, approvals, rejections, and profile updates',
    },
  };

  const currentTabInfo = tabTitles[activeTab] || tabTitles.overview;

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile menu trigger & Tab info */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-toggle-btn"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {currentTabInfo.title}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right action items */}
        <div className="flex items-center gap-3">
          {/* Today indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-medium border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Today: {todayFormatted}</span>
          </div>

          {/* Role badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-slate-50 text-slate-700 border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentUser.role}</span>
          </div>

          {/* Email Notification Logs Trigger */}
          <button
            id="navbar-email-logs-btn"
            onClick={() => setIsEmailModalOpen(true)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
            title="View System Email Notifications (Console Logs Active)"
            aria-label="View System Email Notifications"
          >
            <Mail className="w-4 h-4" />
            {emailHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-blue-600 text-white text-[9.5px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                {emailHistory.length > 99 ? '99+' : emailHistory.length}
              </span>
            )}
          </button>

          {/* Primary Quick Apply Button */}
          <button
            id="global-apply-leave-btn"
            onClick={onOpenApplyModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>

          {/* Sign Out Button */}
          <button
            id="navbar-logout-btn"
            onClick={logout}
            className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="Sign out & return to Login Landing Page"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mock Email Notifications Logs Modal */}
      <EmailLogModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />
    </header>
  );
};
