import { api } from './client';

// ----------------------------------------------------------------------

export type Location = {
  id: number;
  name: string;
  createdAt: string;
};

export type CreateLocationPayload = {
  name: string;
};

export type UpdateLocationPayload = Partial<CreateLocationPayload>;

export const locationsApi = {
  list: () => api.get<Location[]>('/locations'),
  create: (data: CreateLocationPayload) => api.post<Location>('/locations', data),
  update: (id: number, data: UpdateLocationPayload) =>
    api.patch<Location>(`/locations/${id}`, data),
  remove: (id: number) => api.delete<null>(`/locations/${id}`),
};
