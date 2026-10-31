import { StaffMember, LeaveRequest, AuditLog, DepartmentItem, GlobalLeaveThresholds } from '../types';

export const INITIAL_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept-001',
    name: 'Media Production',
    code: 'MP',
    description: 'Broadcast television, film directing, cinematography & studio lighting operations',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'dept-002',
    name: 'Design & Visual Arts',
    code: 'DVA',
    description: 'Visual identity, graphic communication, UI/UX aesthetics & digital publication',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'dept-003',
    name: 'Audio Engineering',
    code: 'AE',
    description: 'Soundtrack design, acoustic engineering, multitrack mixing & music mastering',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'dept-004',
    name: 'Administration',
    code: 'ADM',
    description: 'Institutional management, human resources, admissions & academic governance',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'dept-005',
    name: 'Animation & VFX',
    code: 'AVFX',
    description: '3D character modeling, rigging, kinetic motion design, CGI & visual effects',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'dept-006',
    name: 'Journalism & Broadcasting',
    code: 'JB',
    description: 'Electronic news gathering, investigative journalism, podcasting & documentary',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

export const INITIAL_GLOBAL_THRESHOLDS: GlobalLeaveThresholds = {
  casual: 12,
  sick: 10,
  compensatory: 15,
  earned: 15,
  compensatoryMax: 5,
  updatedAt: '2026-09-01T09:00:00.000Z',
  updatedBy: 'Fr. Joseph Raj SDB (Super Admin)',
};

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'dbica-001',
    userId: 'director@dbica.org',
    name: 'Fr. Joseph Raj SDB',
    email: 'director@dbica.org',
    phone: '+91 98401 22341',
    department: 'Administration',
    role: 'Super Admin',
    designation: 'Rector & Director',
    leaveBalance: { casual: 12, sick: 10, compensatory: 20, earned: 20 },
    portalPassword: 'dbica@2026',
    status: 'Active',
    joinedDate: '2018-06-01',
    avatarBg: 'bg-amber-600',
  },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
