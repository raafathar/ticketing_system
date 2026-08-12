import { db } from '../db/index.js';
import { ticketActivityLogs } from '../db/schema.js';

interface ActivityParams {
  ticketId: number;
  userId?: number | null;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  description?: string | null;
}

export const logTicketActivity = async (params: ActivityParams) => {
  try {
    await db.insert(ticketActivityLogs).values({
      ticketId: params.ticketId,
      userId: params.userId ?? null,
      action: params.action,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      description: params.description ?? null,
    });
  } catch {
    // activity logging must not break the main flow
  }
};
