import type { Role } from 'src/auth/types';

import { api } from './client';

// ----------------------------------------------------------------------

export type MasterDataItem = {
  id: number;
  name: string;
  createdAt: string;
};

export const masterDataApi = {
  departments: () => api.get<MasterDataItem[]>('/departments'),
  locations: () => api.get<MasterDataItem[]>('/locations'),
};

// ----------------------------------------------------------------------

export type CreateUserPayload = {
  name: string;
  email: string;
  password?: string;
  role: Role;
  departmentId?: number | null;
  locationId?: number | null;
  isActive?: boolean;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;
