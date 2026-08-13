import { api } from './client';

// ----------------------------------------------------------------------

export type Department = {
  id: number;
  name: string;
  createdAt: string;
};

export type CreateDepartmentPayload = {
  name: string;
};

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export const departmentsApi = {
  list: () => api.get<Department[]>('/departments'),
  create: (data: CreateDepartmentPayload) => api.post<Department>('/departments', data),
  update: (id: number, data: UpdateDepartmentPayload) =>
    api.patch<Department>(`/departments/${id}`, data),
  remove: (id: number) => api.delete<null>(`/departments/${id}`),
};
