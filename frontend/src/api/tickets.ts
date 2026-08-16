import { api } from './client';

// ----------------------------------------------------------------------

export type TicketUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type TicketCategoryRef = {
  id: number;
  name: string;
  parentId: number | null;
};

export type TicketMasterRef = {
  id: number;
  name: string;
};

export type TicketComment = {
  id: number;
  comment: string;
  isInternal: boolean;
  userId: number;
  user: TicketUser | null;
  createdAt: string;
};

export type TicketAttachment = {
  id: number;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  fileSize: number;
  userId: number;
  user: { id: number; name: string } | null;
  createdAt: string;
};

export type TicketActivityLog = {
  id: number;
  action: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  userId: number;
  user: TicketUser | null;
  createdAt: string;
};

export type Ticket = {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  categoryId: number | null;
  category: TicketCategoryRef | null;
  priority: string;
  status: string;
  requesterId: number;
  requester: TicketUser | null;
  assigneeId: number | null;
  assignee: TicketUser | null;
  departmentId: number | null;
  department: TicketMasterRef | null;
  locationId: number | null;
  location: TicketMasterRef | null;
  slaDueAt: string | null;
  slaResponseDueAt: string | null;
  firstResponseAt: string | null;
  slaStatus: string;
  responseSlaStatus: string;
  responseTimeSeconds: number | null;
  resolutionTimeSeconds: number | null;
  dueDate: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  activityLogs: TicketActivityLog[];
};

export type TicketListResponse = {
  items: Ticket[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type TicketListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  categoryId?: number;
  assigneeId?: number;
  departmentId?: number;
  locationId?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  view?: string;
};

export type CreateTicketPayload = {
  title: string;
  description: string;
  categoryId?: number | null;
  priority?: string;
  departmentId?: number | null;
  locationId?: number | null;
  dueDate?: string | null;
};

export type UpdateTicketPayload = Partial<CreateTicketPayload>;

export type ChangeStatusPayload = {
  status: string;
  note?: string;
};

const buildQuery = (params?: TicketListParams): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const ticketsApi = {
  list: (params?: TicketListParams) =>
    api.get<TicketListResponse>(`/tickets${buildQuery(params)}`),
  get: (id: number) => api.get<Ticket>(`/tickets/${id}`),
  create: (data: CreateTicketPayload) => api.post<Ticket>('/tickets', data),
  update: (id: number, data: UpdateTicketPayload) =>
    api.patch<Ticket>(`/tickets/${id}`, data),
  remove: (id: number) => api.delete<null>(`/tickets/${id}`),
  addComment: (id: number, data: { comment: string; isInternal?: boolean }) =>
    api.post<Ticket>(`/tickets/${id}/comments`, data),
  changeStatus: (id: number, data: ChangeStatusPayload) =>
    api.post<Ticket>(`/tickets/${id}/status`, data),
  assign: (id: number, data: { assigneeId: number }) =>
    api.post<Ticket>(`/tickets/${id}/assign`, data),
};
