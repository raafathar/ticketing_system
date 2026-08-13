import type { User } from 'src/auth/types';

import { api } from './client';

import type { CreateUserPayload, UpdateUserPayload } from './master-data';

// ----------------------------------------------------------------------

export type AdminUser = User & {
  createdAt: string;
  updatedAt: string;
};

export const usersApi = {
  list: () => api.get<AdminUser[]>('/users'),
  create: (data: CreateUserPayload) => api.post<AdminUser>('/users', data),
  update: (id: number, data: UpdateUserPayload) => api.patch<AdminUser>(`/users/${id}`, data),
  remove: (id: number) => api.delete<null>(`/users/${id}`),
};
