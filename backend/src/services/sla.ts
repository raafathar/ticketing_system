import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { slaPolicies } from '../db/schema.js';
import { SLA_STATUS, TICKET_PRIORITY, type SlaStatus } from '../config/index.js';

const WARNING_RATIO = 0.25;

export const getSlaPolicyForPriority = async (priority: string) => {
  const policy = await db.query.slaPolicies.findFirst({
    where: eq(slaPolicies.priority, priority),
  });
  return policy ?? null;
};

export const getDefaultSlaPolicy = async () => {
  const policy = await db.query.slaPolicies.findFirst({
    where: eq(slaPolicies.priority, TICKET_PRIORITY.MEDIUM),
  });
  return policy ?? null;
};

export const calculateSlaDates = (
  createdAt: Date,
  priority: string,
  policy?: { responseMinutes: number; resolutionMinutes: number } | null
) => {
  if (!policy) return { slaResponseDueAt: null, slaDueAt: null };
  const responseDue = new Date(createdAt.getTime() + policy.responseMinutes * 60 * 1000);
  const resolutionDue = new Date(createdAt.getTime() + policy.resolutionMinutes * 60 * 1000);
  return { slaResponseDueAt: responseDue, slaDueAt: resolutionDue };
};

/**
 * SLA status computed against a due datetime.
 * - resolved / no due date => ON_TRACK
 * - overdue => BREACHED
 * - remaining time <= WARNING_RATIO of the total window => WARNING
 * - otherwise ON_TRACK
 */
export const getSlaStatus = (
  dueAt: Date | string | null | undefined,
  createdAt: Date | string | null | undefined,
  resolved = false
): SlaStatus => {
  if (resolved || !dueAt) return SLA_STATUS.ON_TRACK;
  const due = new Date(dueAt).getTime();
  const now = Date.now();

  if (now > due) return SLA_STATUS.BREACHED;

  const start = createdAt ? new Date(createdAt).getTime() : due;
  const total = Math.max(due - start, 1);
  const remaining = due - now;
  const ratio = remaining / total;

  if (ratio <= WARNING_RATIO) return SLA_STATUS.WARNING;
  return SLA_STATUS.ON_TRACK;
};
