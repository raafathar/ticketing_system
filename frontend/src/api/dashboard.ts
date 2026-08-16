import { api } from './client';

// ----------------------------------------------------------------------

export type DashboardStats = {
  total: number;
  new: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  cancelled: number;
  totalAssigned: number;
  unassigned: number;
  resolvedToday: number;
  slaBreached: number;
  overdue: number;
  avgResolutionSeconds: number | null;
  avgResponseSeconds: number | null;
};

export type DashboardRecentTicket = {
  id: number;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  slaStatus: string;
  createdAt: string;
  slaDueAt: string | null;
  category: { id: number; name: string } | null;
  assignee: { id: number; name: string } | null;
};

export type DashboardActionTicket = DashboardRecentTicket & {
  requester: { id: number; name: string } | null;
};

export type DashboardCategoryStat = {
  categoryId: number | null;
  name: string;
  count: number;
};

export type DashboardPriorityStat = {
  priority: string;
  count: number;
};

export type DashboardTechnicianStat = {
  assigneeId: number | null;
  name: string;
  count: number;
};

export type DashboardTrendPoint = {
  date: string;
  count: number;
};

export type DashboardTrend30Point = {
  date: string;
  created: number;
  resolved: number;
};

export type DashboardSlaPerformance = {
  priority: string;
  responseTargetSeconds: number | null;
  resolutionTargetSeconds: number | null;
  avgResponseSeconds: number | null;
  avgResolutionSeconds: number | null;
};

export type DashboardWorkload = {
  id: number;
  name: string;
  open: number;
  completed: number;
};

export type DashboardActivity = {
  id: number;
  action: string;
  description: string | null;
  createdAt: string;
  user: { id: number; name: string; role: string } | null;
  ticket: {
    id: number;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
  };
};

export type EmployeeDashboard = {
  stats: DashboardStats;
  recentTickets: DashboardRecentTicket[];
  activity: DashboardActivity[];
};

export type TechnicianDashboard = {
  stats: DashboardStats;
  actionNeeded: DashboardActionTicket[];
  activity: DashboardActivity[];
};

export type DashboardSlaStatus = {
  ON_TRACK: number;
  WARNING: number;
  BREACHED: number;
};

export type AdminDashboard = {
  stats: DashboardStats;
  byCategory: DashboardCategoryStat[];
  byPriority: DashboardPriorityStat[];
  byTechnician: DashboardTechnicianStat[];
  trend: DashboardTrend30Point[];
  bySlaStatus: DashboardSlaStatus;
  slaPerformance: DashboardSlaPerformance[];
  technicianWorkload: DashboardWorkload[];
  atRisk: DashboardActionTicket[];
  activity: DashboardActivity[];
};

export const dashboardApi = {
  employee: () => api.get<EmployeeDashboard>('/dashboard/employee'),
  technician: () => api.get<TechnicianDashboard>('/dashboard/technician'),
  admin: () => api.get<AdminDashboard>('/dashboard/admin'),
};
