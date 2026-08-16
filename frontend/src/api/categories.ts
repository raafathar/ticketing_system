import { api } from './client';

// ----------------------------------------------------------------------

export type TicketCategory = {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
  createdAt: string;
};

export type CreateCategoryPayload = {
  name: string;
  parentId?: number | null;
  isActive?: boolean;
};

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export const categoriesApi = {
  list: () => api.get<TicketCategory[]>('/categories/flat'),
  create: (data: CreateCategoryPayload) => api.post<TicketCategory>('/categories', data),
  update: (id: number, data: UpdateCategoryPayload) =>
    api.patch<TicketCategory>(`/categories/${id}`, data),
  remove: (id: number) => api.delete<null>(`/categories/${id}`),
};
