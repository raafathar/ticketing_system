import { api } from './client';

// ----------------------------------------------------------------------

export type SlaPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SlaPolicy = {
  id: number;
  priority: SlaPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive: boolean;
  createdAt: string;
};

export type CreateSlaPayload = {
  priority: SlaPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive?: boolean;
};

export type UpdateSlaPayload = Partial<CreateSlaPayload>;

export const slaApi = {
  list: () => api.get<SlaPolicy[]>('/sla'),
  create: (data: CreateSlaPayload) => api.post<SlaPolicy>('/sla', data),
  update: (id: number, data: UpdateSlaPayload) => api.patch<SlaPolicy>(`/sla/${id}`, data),
  remove: (id: number) => api.delete<null>(`/sla/${id}`),
};
