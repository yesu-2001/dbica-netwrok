import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LeaveType } from './types';
import { QuickRoleSwitcher } from './components/QuickRoleSwitcher';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { MyLeaveView } from './components/MyLeaveView';
import { LeaveRequestsView } from './components/LeaveRequestsView';
import { StaffManagementView } from './components/StaffManagementView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuditTrailView } from './components/AuditTrailView';
import { CustomizationSettingsView } from './components/CustomizationSettingsView';
import { NotificationDispatchCenter } from './components/NotificationDispatchCenter';
import { ApplyLeaveModal } from './components/ApplyLeaveModal';
import { ToastContainer } from './components/ToastContainer';
import { LoginLandingView } from './components/LoginLandingView';
import { X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyModalType, setApplyModalType] = useState<LeaveType>('Casual');

  const handleOpenApplyModal = (type: LeaveType = 'Casual') => {
    setApplyModalType(type);
    setIsApplyModalOpen(true);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView onApplyLeave={() => handleOpenApplyModal('Casual')} />;
      case 'my-leaves':
        return <MyLeaveView onApplyLeave={handleOpenApplyModal} />;
      case 'requests':
        return <LeaveRequestsView />;
      case 'notifications':
        return <NotificationDispatchCenter />;
      case 'staff':
        return <StaffManagementView />;
      case 'settings':
        return <CustomizationSettingsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'audit':
        return <AuditTrailView />;
      default:
        return <OverviewView onApplyLeave={() => handleOpenApplyModal('Casual')} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Floating Quick Role Switcher */}
      <QuickRoleSwitcher />

      {/* Main Shell Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-2xl z-10">
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div onClick={() => setIsMobileMenuOpen(false)}>
                <Sidebar />
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Navbar
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenApplyModal={() => handleOpenApplyModal('Casual')}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderActiveView()}
          </main>

          {/* Simple Clean Institutional Footer */}
          <footer className="py-4 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
            Don Bosco Institute of Communication Arts (DBICA) • Staff Leave Management System • Developed with Role-Based Access Control
          </footer>
        </div>
      </div>

      {/* Global Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        initialType={applyModalType}
      />

      {/* System Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

const RootApp: React.FC = () => {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <>
        <LoginLandingView />
        <ToastContainer />
      </>
    );
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <RootApp />
    </AppProvider>
  );
}
