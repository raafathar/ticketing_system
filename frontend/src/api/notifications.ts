import { api } from './client';

// ----------------------------------------------------------------------

export type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  ticketId: number | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  items: Notification[];
  unreadCount: number;
};

// ----------------------------------------------------------------------

export const notificationsApi = {
  list: () => api.get<NotificationsResponse>('/notifications'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};