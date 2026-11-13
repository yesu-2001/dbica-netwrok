import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Menu, PlusCircle, Calendar, ShieldCheck, Mail, LogOut, Cloud } from 'lucide-react';
import { ActiveTab } from '../types';
import { getVisibleNotifications } from '../utils/notificationUtils';

const READ_NOTIFICATIONS_KEY = 'dbica_read_notifications_v1';

type ReadNotificationsByUser = Record<string, string[]>;

function loadReadNotifications(): ReadNotificationsByUser {
  try {
    const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) as ReadNotificationsByUser : {};
  } catch {
    return {};
  }
}

function getNotificationKey(notification: {
  type: string;
  referenceId?: string;
  metadata?: { requestId?: string };
  id: string;
}): string {
  return `${notification.type}:${notification.referenceId || notification.metadata?.requestId || notification.id}`;
}

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenApplyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, onOpenApplyModal }) => {
  const { currentUser, activeTab, dispatchedNotifications, isCloudConnected, logout } = useApp();
  const canApplyForLeave = currentUser.role !== 'Super Admin';
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationsByUser, setReadNotificationsByUser] = useState<ReadNotificationsByUser>(loadReadNotifications);

  const tabTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Leave Calendar & Attendance Overview',
      subtitle: 'Track team availability and operational scheduling at DBICA',
    },
    'my-leaves': {
      title: 'My Leaves & Balance Portfolio',
      subtitle: `Personal leave balances and application status for ${currentUser.name}`,
    },
    'my-attendance': {
      title: 'My Attendance',
      subtitle: `Attendance records and summary for ${currentUser.name}`,
    },
    'staff-attendance': {
      title: currentUser.role === 'Manager' ? 'Department Attendance' : 'Staff Attendance Report',
      subtitle: currentUser.role === 'Manager'
        ? `Attendance summaries for ${currentUser.department}`
        : 'Attendance summaries and daily records by staff member',
    },
    'staff-timesheets': {
      title: currentUser.role === 'Super Admin' || currentUser.role === 'HR'
        ? 'Staff Timesheets'
        : currentUser.role === 'Manager'
        ? 'Department Timesheets'
        : 'Staff Timesheets',
      subtitle:
        currentUser.role === 'Super Admin'
          ? 'Review task updates submitted by staff across DBICA'
          : currentUser.role === 'HR'
          ? 'Review task updates submitted by staff across DBICA'
          : currentUser.role === 'Manager'
          ? `Review task updates submitted by staff in ${currentUser.department}`
          : 'Review staff task updates',
    },
    'my-timesheet': {
      title: 'My Timesheet',
      subtitle: `Record and manage tasks you worked on, ${currentUser.name}`,
    },
    requests: {
      title: 'Leave Request Approvals',
      subtitle:
        currentUser.role === 'Manager'
          ? `Review and approve leave requests for ${currentUser.department}`
          : 'Organization-wide leave review & authorization center',
    },
    notifications: {
      title:
        currentUser.role === 'Staff'
          ? 'My Notifications & Delivery Receipts'
          : currentUser.role === 'Manager'
          ? `Department Notification & Dispatch Center (${currentUser.department})`
          : 'Multi-Channel Notification & Dispatch Center',
      subtitle:
        currentUser.role === 'Staff'
          ? `Approval and rejection updates for ${currentUser.name}`
          : currentUser.role === 'Manager'
          ? `Live delivery logs and dispatch for ${currentUser.department} staff`
          : 'Real-time WhatsApp and Email delivery logs, instant acknowledgement, and direct dispatch',
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
  const visibleNotifications = useMemo(
    () => getVisibleNotifications(dispatchedNotifications, currentUser),
    [dispatchedNotifications, currentUser]
  );
  const notificationMessages = useMemo(() => {
    const uniqueMessages = new Map<string, (typeof visibleNotifications)[number]>();
    visibleNotifications
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .forEach((notification) => {
        const eventKey = getNotificationKey(notification);
        if (!uniqueMessages.has(eventKey)) uniqueMessages.set(eventKey, notification);
      });
    return [...uniqueMessages.values()];
  }, [visibleNotifications]);
  const readNotificationIds = readNotificationsByUser[currentUser.id] || [];
  const readNotificationSet = useMemo(() => new Set(readNotificationIds), [readNotificationIds]);
  const unreadNotifications = notificationMessages.filter(
    (notification) => !readNotificationSet.has(getNotificationKey(notification))
  );
  const today = new Date();
  const todayNotifications = notificationMessages.filter((notification) => {
    const notificationDate = new Date(notification.timestamp);
    return !Number.isNaN(notificationDate.getTime()) &&
      notificationDate.getFullYear() === today.getFullYear() &&
      notificationDate.getMonth() === today.getMonth() &&
      notificationDate.getDate() === today.getDate();
  });
  const displayedNotifications = notificationMessages.filter((notification) =>
    !readNotificationSet.has(getNotificationKey(notification)) ||
    todayNotifications.includes(notification)
  );

  const markNotificationAsRead = (notificationKey: string) => {
    const updated = {
      ...readNotificationsByUser,
      [currentUser.id]: [...new Set([...(readNotificationsByUser[currentUser.id] || []), notificationKey])],
    };
    setReadNotificationsByUser(updated);
    try {
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[Navbar] Could not save notification read status:', error);
    }
  };

  const markAllNotificationsAsRead = () => {
    const updated = {
      ...readNotificationsByUser,
      [currentUser.id]: [...new Set([
        ...(readNotificationsByUser[currentUser.id] || []),
        ...notificationMessages.map(getNotificationKey),
      ])],
    };
    setReadNotificationsByUser(updated);
    try {
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[Navbar] Could not save notification read status:', error);
    }
  };

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
          {/* Cloud Firestore Live Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
              isCloudConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
            }`}
            title={isCloudConnected ? 'Cloud Firestore database connected & synchronized in real time' : 'Connecting to Cloud Firestore...'}
          >
            <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>{isCloudConnected ? 'Cloud DB Active' : 'Connecting DB...'}</span>
          </div>

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

          <div className="relative">
            <button
              id="navbar-notifications-btn"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
              title={unreadNotifications.length > 0 ? `${unreadNotifications.length} new notifications` : 'View notifications'}
              aria-label={unreadNotifications.length > 0 ? `${unreadNotifications.length} new notifications` : 'View notifications'}
              aria-expanded={isNotificationsOpen}
            >
              <Mail className="w-4 h-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-blue-600 text-white text-[9.5px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                  {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {unreadNotifications.length > 0 ? `${unreadNotifications.length} new` : 'All caught up'}
                      </p>
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button type="button" onClick={markAllNotificationsAsRead}
                        className="text-xs font-medium text-blue-700 hover:text-blue-900">
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {displayedNotifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-500">No new notifications.</p>
                  ) : displayedNotifications.map((notification) => {
                    const notificationKey = getNotificationKey(notification);
                    const isUnread = !readNotificationSet.has(notificationKey);
                    const staffName = notification.metadata?.staffName || notification.recipientName;
                    const leaveType = notification.metadata?.leaveType || 'leave';
                    const isOwnRequest =
                      notification.metadata?.staffId === currentUser.id ||
                      notification.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase();
                    const message = notification.type === 'LEAVE_SUBMITTED'
                      ? `${staffName} submitted a ${leaveType} request.`
                      : notification.type === 'LEAVE_APPROVED'
                      ? isOwnRequest
                        ? `Your ${leaveType} request was approved.`
                        : `${staffName}'s ${leaveType} request was approved.`
                      : notification.type === 'LEAVE_REJECTED'
                      ? `Your ${leaveType} request was not approved.`
                      : notification.message;
                    return (
                      <button key={notificationKey} type="button"
                        onClick={() => markNotificationAsRead(notificationKey)}
                        className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${isUnread ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm ${isUnread ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{message}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isUnread ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isUnread ? 'New' : 'Seen'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {Number.isNaN(new Date(notification.timestamp).getTime()) ? '' : new Date(notification.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Primary Quick Apply Button */}
          {canApplyForLeave && (
            <button
              id="global-apply-leave-btn"
              onClick={onOpenApplyModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Apply Leave</span>
            </button>
          )}

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

    </header>
  );
};
