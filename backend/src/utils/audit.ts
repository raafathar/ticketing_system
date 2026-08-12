import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

interface AuditParams {
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const writeAuditLog = async (params: AuditParams) => {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch {
    // audit logging must never break the main flow
  }
};
