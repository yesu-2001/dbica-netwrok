import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DbicaLogo } from './DbicaLogo';
import { Role } from '../types';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  FileText,
  Phone,
  Building2,
  Calendar,
  Sparkles,
  LogIn,
  ChevronRight,
  X,
  AlertCircle,
  KeyRound,
  ExternalLink,
  Users,
  Briefcase,
  UserCheck,
} from 'lucide-react';

export const LoginLandingView: React.FC = () => {
  const { login, loginAsRole, staffList } = useApp();

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'presets'>('form');

  // Modals
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Please enter your DBICA email address or Staff ID.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = login(identifier, password, rememberMe);
      setIsSubmitting(false);
      if (!result.success && result.error) {
        setErrorMsg(result.error);
      }
    }, 350);
  };

  // Quick fill helper
  const handleQuickFill = (email: string) => {
    setIdentifier(email);
    setPassword('dbica@2026');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-[#0F5C97] selection:text-white relative overflow-x-hidden font-sans">
      {/* Decorative ambient gradients */}
      <div
        className="absolute top-0 left-1/4 -translate-x-1/2 w-[700px] h-[500px] bg-[#0F5C97]/15 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 translate-x-1/2 w-[600px] h-[450px] bg-[#EA4A2B]/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-[#62B534]/10 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Institutional Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Institute Title */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 shrink-0 flex items-center justify-center">
              <DbicaLogo size="sm" variant="icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-white text-base sm:text-lg">
                  DBICA
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0F5C97]/30 text-sky-300 border border-[#0F5C97]/50 hidden sm:inline-block">
                  Staff Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate max-w-md">
                Don Bosco Institute of Communication Arts • Chennai
              </p>
            </div>
          </div>

          {/* Quick Info & Help Actions */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition flex items-center gap-1.5 font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Leave Policy</span>
              <span className="md:hidden">Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRosterModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition flex items-center gap-1.5 font-medium"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Demo Roster</span>
              <span className="md:hidden">Roster</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition flex items-center gap-1.5 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Help</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Login Split Canvas */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-14 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full">
          
          {/* Left Column: Institutional Brand, Features & Trust */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            {/* Salesian Network Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs w-fit shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#62B534] animate-pulse" />
              <span className="font-semibold text-slate-200">Salesian Education Network</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Academic Year 2026–2027</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                Faculty &amp; Staff <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Leave Management System
                </span>
              </h1>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                Don Bosco Institute of Communication Arts centralized portal for streamlined leave applications, department head sanctions, Director authorizations, and real-time entitlement tracking.
              </p>
            </div>

            {/* Core Capability Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-sky-400" />
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">
                  Automated Quota Ledgers
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time deduction and rollover tracking for Casual, Sick, and Earned leaves with working-day calculation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">
                  Two-Tier Approvals
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Structured authorization chain ensuring Department Heads (HoD) and Director/HR approve requests smoothly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">
                  Department Customization
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Configurable departments and leave thresholds for Media Production, Audio, VFX, Journalism, and Administration.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">
                  Tamper-Proof Audit Trail
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete immutable logging of all approvals, policy updates, and quota adjustments for academic inspection.
                </p>
              </div>
            </div>

            {/* Trust and Stats Bar */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">6+</span>
                <span>Academic Depts</span>
              </div>
              <div className="h-3 w-px bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">20+</span>
                <span>Faculty Members</span>
              </div>
              <div className="h-3 w-px bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 text-base">100%</span>
                <span>Paperless Workflow</span>
              </div>
            </div>
          </div>

          {/* Right Column: Institutional Login Card & Demo Quick Access */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-slate-850/90 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
              {/* Subtle top brand bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0F5C97] via-[#EA4A2B] to-[#62B534]" />

              {/* Logo Presentation Header */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl p-2.5 shadow-md border border-slate-200 flex items-center justify-center mb-3 hover:scale-105 transition-transform">
                  <img
                    src="/dbica-logo.svg"
                    alt="DBICA Official Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  DBICA Staff Portal
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in to access your dashboard, requests &amp; leave quota
                </p>

                {/* Switch Between Form and 1-Click Presets */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mt-4 w-full text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('form');
                      setErrorMsg(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'form'
                        ? 'bg-[#0F5C97] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In Form
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('presets');
                      setErrorMsg(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'presets'
                        ? 'bg-[#0F5C97] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    1-Click Roles
                  </button>
                </div>
              </div>

              {/* TAB 1: Standard Credential Form */}
              {activeTab === 'form' && (
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-5">
                  {/* Error Alert */}
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Authentication Notice</p>
                        <p className="text-red-300/90 mt-0.5">{errorMsg}</p>
                      </div>
                    </div>
                  )}

                  {/* Identifier Input */}
                  <div className="space-y-1.5 text-left">
                    <label
                      htmlFor="identifier"
                      className="block text-xs font-semibold text-slate-300"
                    >
                      Institutional Email or Staff ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="identifier"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. director@dbica.org or dbica-001"
                        autoComplete="username"
                        className="w-full pl-9.5 pr-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-slate-300"
                      >
                        Portal Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-[11px] text-sky-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your portal password"
                        autoComplete="current-password"
                        className="w-full pl-9.5 pr-10 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Security Note */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-700 text-[#0F5C97] focus:ring-0 bg-slate-900"
                      />
                      <span>Keep me signed in</span>
                    </label>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      SSL Protected
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0F5C97] to-[#0A4775] hover:from-[#136EB0] hover:to-[#0F5C97] text-white font-semibold text-sm shadow-lg shadow-[#0F5C97]/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to DBICA Portal</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>

                  {/* Quick-fill shortcut buttons */}
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[11px] text-slate-400 text-center mb-2 font-medium">
                      Active Account Quick-Fill:
                    </p>
                    <div className="flex justify-center text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleQuickFill('director@dbica.org')}
                        className="px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-center font-medium transition"
                      >
                        Super Admin: Fr. Joseph Raj SDB (director@dbica.org)
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 2: 1-Click Instant Demo Roles */}
              {activeTab === 'presets' && (
                <div className="space-y-3 pt-5">
                  <p className="text-xs text-slate-300 mb-2">
                    Click any configured role below to authenticate:
                  </p>

                  {/* Super Admin Preset */}
                  {(() => {
                    const superAdmin = staffList.find((s) => s.role === 'Super Admin');
                    return (
                      <button
                        type="button"
                        onClick={() => loginAsRole('Super Admin')}
                        className="w-full text-left p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 hover:border-amber-500/50 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/30">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">
                                {superAdmin ? superAdmin.name : 'Super Admin'}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Super Admin
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {superAdmin ? `${superAdmin.designation} • Full Administrative Access` : 'Director Account'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })()}

                  {/* HR Admin Preset */}
                  {(() => {
                    const hrStaff = staffList.find((s) => s.role === 'HR');
                    return (
                      <button
                        type="button"
                        onClick={() => loginAsRole('HR')}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                          hrStaff
                            ? 'bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 hover:border-purple-500/50'
                            : 'bg-slate-800/40 border border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-500/30">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">
                                {hrStaff ? hrStaff.name : 'HR Administrator'}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                HR
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {hrStaff ? `${hrStaff.designation} • Staff Balances & Leaves` : 'No HR profile added yet (add via Super Admin)'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })()}

                  {/* Manager / HoD Preset */}
                  {(() => {
                    const mgrStaff = staffList.find((s) => s.role === 'Manager');
                    return (
                      <button
                        type="button"
                        onClick={() => loginAsRole('Manager')}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                          mgrStaff
                            ? 'bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 hover:border-blue-500/50'
                            : 'bg-slate-800/40 border border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/30">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">
                                {mgrStaff ? mgrStaff.name : 'Department Head / Manager'}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Manager
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {mgrStaff ? `${mgrStaff.designation} • Team Leaves & Approvals` : 'No HoD profile added yet (add via Super Admin)'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })()}

                  {/* Staff Member Preset */}
                  {(() => {
                    const facultyStaff = staffList.find((s) => s.role === 'Staff');
                    return (
                      <button
                        type="button"
                        onClick={() => loginAsRole('Staff')}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                          facultyStaff
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50'
                            : 'bg-slate-800/40 border border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/30">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">
                                {facultyStaff ? facultyStaff.name : 'Faculty & Academic Staff'}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Staff
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {facultyStaff ? `${facultyStaff.designation} • Apply Leaves & Track Status` : 'No faculty staff added yet (add via Super Admin)'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Bottom Institutional Disclaimer */}
              <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Enterprise single sign-on powered by DBICA IT Services</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 px-4 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DbicaLogo size="sm" variant="horizontal" lightText />
            <span className="text-slate-400">|</span>
            <span>Don Bosco Institute of Communication Arts</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span>Campus: Nungambakkam, Chennai 600034</span>
            <span className="hidden md:inline">•</span>
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-slate-300 transition"
            >
              Contact IT Cell
            </button>
            <span>•</span>
            <button
              onClick={() => setShowPolicyModal(true)}
              className="hover:text-slate-300 transition"
            >
              Leave Rules
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Leave Policy Quick Summary */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-lg">DBICA Leave Regulations &amp; Policy</h3>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-2">
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <h4 className="font-bold text-white text-sm mb-1 text-sky-300">1. Casual Leave (CL) — 12 Days/Year</h4>
                <p className="text-slate-400 leading-relaxed">
                  Granted for unforeseen personal engagements. Maximum 3 consecutive days at a time. Advance notification of at least 24 hours is recommended except in emergencies.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <h4 className="font-bold text-white text-sm mb-1 text-emerald-300">2. Sick Leave (SL) — 10 Days/Year</h4>
                <p className="text-slate-400 leading-relaxed">
                  Applicable for illness and medical recovery. Applications extending beyond 2 consecutive working days require a registered medical practitioner certificate submitted to the HR office.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <h4 className="font-bold text-white text-sm mb-1 text-amber-300">3. Compensatory Leave (CO)</h4>
                <p className="text-slate-400 leading-relaxed">
                  Claimable for extra hours or days worked after office hours, on weekends, or on institutional holidays. Key in prior worked date, hours, and duty details when applying.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <h4 className="font-bold text-white text-sm mb-1 text-purple-300">4. Approval Hierarchy</h4>
                <p className="text-slate-400 leading-relaxed">
                  All faculty leave requests are initially reviewed by the respective Department Head (HoD). Following departmental clearance, the final sanction is executed by the Director / HR Administrator.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Help & IT Support */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">DBICA IT &amp; HR Helpdesk</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400">
                If you forgot your password or need an account provisioned, please contact the campus IT &amp; Administration team:
              </p>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span className="font-medium">support@dbica.edu.in</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">+91 44 2817 8200 (Ext. 104)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Admin Block, DBICA Campus, Chennai</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px]">
                Tip: For immediate evaluation, switch to the <strong>&quot;1-Click Roles&quot;</strong> tab on the login card to sign in with pre-configured accounts.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Demo Roster Directory */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">DBICA Available Staff Directory</h3>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Click any staff member to populate their login credentials:
            </p>

            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {staffList.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    handleQuickFill(member.email);
                    setShowRosterModal(false);
                    setActiveTab('form');
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-750 hover:border-slate-600 border border-slate-700 transition flex items-center justify-between group text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                        member.avatarBg || 'bg-slate-700'
                      }`}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {member.designation} • {member.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        member.role === 'Super Admin'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : member.role === 'HR'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : member.role === 'Manager'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {member.role}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{member.id}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
