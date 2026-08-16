import { api } from './client';

// ----------------------------------------------------------------------

export type AuditLog = {
  id: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: number | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
};

export type AuditLogListResponse = {
  items: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AuditLogListParams = {
  page?: number;
  pageSize?: number;
};

const buildQuery = (params?: AuditLogListParams): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const auditLogsApi = {
  list: (params?: AuditLogListParams) =>
    api.get<AuditLogListResponse>(`/audit-logs${buildQuery(params)}`),
};
