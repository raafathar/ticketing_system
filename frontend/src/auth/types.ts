export type Role = 'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  departmentId: number | null;
  locationId: number | null;
  isActive: boolean;
  department?: { id: number; name: string; createdAt: string } | null;
  location?: { id: number; name: string; createdAt: string } | null;
};

export type LoginPayload = {
  accessToken: string;
  user: User;
};
