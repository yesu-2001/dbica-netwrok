import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Building,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Department } from '../types';

export const AnalyticsView: React.FC = () => {
  const { staffList, leaveRequests, currentUser, departments: appDepartments } = useApp();

  // Permission check
  if (currentUser.role !== 'Super Admin' && currentUser.role !== 'HR') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Restricted Report</h3>
        <p className="text-xs text-slate-500 mt-1">
          Global analytics are accessible exclusively to Super Admin and HR administrators.
        </p>
      </div>
    );
  }

  const departments: string[] = appDepartments.map((d) => d.name);

  // Approved leave days by department
  const departmentStats = useMemo(() => {
    return departments.map((dept) => {
      const deptStaff = staffList.filter((s) => s.department === dept);
      const deptApprovedLeaves = leaveRequests.filter(
        (r) => r.department === dept && r.status === 'Approved'
      );
      const totalDaysTaken = deptApprovedLeaves.reduce((sum, r) => sum + r.totalDays, 0);

      return {
        department: dept,
        staffCount: deptStaff.length,
        approvedRequests: deptApprovedLeaves.length,
        totalDaysTaken,
      };
    });
  }, [departments, staffList, leaveRequests]);

  // Leave category breakdown
  const categoryStats = useMemo(() => {
    const types = ['Casual', 'Sick', 'Compensatory', 'Leave Without Pay (LWP)'] as const;
    return types.map((type) => {
      const matching = leaveRequests.filter((r) => r.leaveType === type && r.status === 'Approved');
      const totalDays = matching.reduce((sum, r) => sum + r.totalDays, 0);
      return {
        type,
        count: matching.length,
        totalDays,
      };
    });
  }, [leaveRequests]);

  const maxDeptDays = Math.max(...departmentStats.map((d) => d.totalDaysTaken), 1);
  const totalApprovedDaysAll = categoryStats.reduce((sum, c) => sum + c.totalDays, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Institutional Leave Analytics & Attendance Reports
            </h2>
            <p className="text-xs text-slate-500">
              Organization-wide metrics across {staffList.length} staff members at DBICA
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 block">Total Days Consumed</span>
          <span className="text-xl font-bold text-slate-900">{totalApprovedDaysAll} Days</span>
        </div>
      </div>

      {/* Grid: Department Utilization & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Usage Bars */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              Department-Wise Leave Utilization
            </h3>
            <span className="text-[11px] text-slate-400">Approved Leave Days</span>
          </div>

          <div className="space-y-4">
            {departmentStats.map((stat) => {
              const percent = Math.round((stat.totalDaysTaken / maxDeptDays) * 100);
              return (
                <div key={stat.department} className="text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-800">{stat.department}</span>
                    <span className="text-slate-500">
                      <strong>{stat.totalDaysTaken} days</strong> ({stat.approvedRequests} requests • {stat.staffCount} staff)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-500" />
              Leave Category Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Total Consumption</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {categoryStats.map((cat) => {
              const bgColors = {
                Casual: 'border-blue-200 bg-blue-50/50 text-blue-900',
                Sick: 'border-rose-200 bg-rose-50/50 text-rose-900',
                Earned: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
                Compensatory: 'border-purple-200 bg-purple-50/50 text-purple-900',
                'Leave Without Pay (LWP)': 'border-slate-200 bg-slate-50 text-slate-900',
              };

              return (
                <div
                  key={cat.type}
                  className={`p-4 rounded-xl border text-xs ${
                    bgColors[cat.type as keyof typeof bgColors]
                  }`}
                >
                  <div className="font-semibold truncate">{cat.type}</div>
                  <div className="text-2xl font-black mt-2">{cat.totalDays}</div>
                  <div className="text-[10.5px] opacity-75 mt-0.5">
                    {cat.count} approved applications
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">HR Attendance Policy Note:</strong> Staff leave balances
            reset annually on June 1st in alignment with DBICA's academic calendar. Unused Compensatory Leaves
            may carry forward up to the departmental ceiling.
          </div>
        </div>
      </div>
    </div>
  );
};
