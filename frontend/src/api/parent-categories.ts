import { api } from './client';

// ----------------------------------------------------------------------

export type ParentCategory = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateParentCategoryPayload = {
  name: string;
  isActive?: boolean;
};

export type UpdateParentCategoryPayload = Partial<CreateParentCategoryPayload>;

export const parentCategoriesApi = {
  list: () => api.get<ParentCategory[]>('/parent-categories'),
  create: (data: CreateParentCategoryPayload) =>
    api.post<ParentCategory>('/parent-categories', data),
  update: (id: number, data: UpdateParentCategoryPayload) =>
    api.patch<ParentCategory>(`/parent-categories/${id}`, data),
  remove: (id: number) => api.delete<null>(`/parent-categories/${id}`),
};
