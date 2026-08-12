import { and, eq, lt, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export const createNotification = async (params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  ticketId?: number | null;
}) => {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      ticketId: params.ticketId ?? null,
    });
  } catch (error) {
    logger.error('Failed to create notification', { error });
  }
};

export const markSlaNotifications = async () => {
  // Simple approach: for now notifications are created on demand.
  void markSlaNotifications;
};

export const createSlaBreachNotification = async (ticket: {
  id: number;
  ticketNumber: string;
  assigneeId?: number | null;
  requesterId: number;
  title: string;
}) => {
  await createNotification({
    userId: ticket.assigneeId ?? ticket.requesterId,
    type: 'SLA_BREACH',
    title: 'SLA Breached',
    message: `SLA untuk tiket ${ticket.ticketNumber} (${ticket.title}) telah terlampaui.`,
    ticketId: ticket.id,
  });
};

export const createSlaWarningNotification = async (ticket: {
  id: number;
  ticketNumber: string;
  assigneeId?: number | null;
  requesterId: number;
  title: string;
}) => {
  await createNotification({
    userId: ticket.assigneeId ?? ticket.requesterId,
    type: 'SLA_WARNING',
    title: 'SLA Warning',
    message: `SLA untuk tiket ${ticket.ticketNumber} (${ticket.title}) akan segera berakhir.`,
    ticketId: ticket.id,
  });
};

export const countUnreadNotifications = async (userId: number) => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows[0]?.count ?? 0;
};

export const findUnreadNotifications = async (userId: number) => {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .orderBy(sql`${notifications.createdAt} desc`);
  return rows;
};
