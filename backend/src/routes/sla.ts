import { Router } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { slaPolicies } from '../db/schema.js';
import { ROLES, TICKET_PRIORITY } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const slaSchema = z.object({
  priority: z.enum([TICKET_PRIORITY.LOW, TICKET_PRIORITY.MEDIUM, TICKET_PRIORITY.HIGH, TICKET_PRIORITY.CRITICAL]),
  responseMinutes: z.number().int().min(1, 'Response minimal 1 menit'),
  resolutionMinutes: z.number().int().min(1, 'Resolution minimal 1 menit'),
  isActive: z.boolean().optional(),
});

router.get('/', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db.select().from(slaPolicies).orderBy(asc(slaPolicies.priority));
    successResponse(res, 200, rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = slaSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    const exists = await db.query.slaPolicies.findFirst({
      where: eq(slaPolicies.priority, data.priority),
    });
    if (exists) throw new AppError(409, `SLA untuk prioritas ${data.priority} sudah ada`);

    const created = await db
      .insert(slaPolicies)
      .values({
        priority: data.priority,
        responseMinutes: data.responseMinutes,
        resolutionMinutes: data.resolutionMinutes,
        isActive: data.isActive ?? true,
      })
      .returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'sla',
      entityId: created[0].id,
      newValue: JSON.stringify(created[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 201, created[0], 'SLA berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.slaPolicies.findFirst({ where: eq(slaPolicies.id, id) });
    if (!existing) throw new AppError(404, 'SLA tidak ditemukan');

    const parsed = slaSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    if (data.priority && data.priority !== existing.priority) {
      const dup = await db.query.slaPolicies.findFirst({
        where: and(eq(slaPolicies.priority, data.priority), sql`${slaPolicies.id} != ${id}`),
      });
      if (dup) throw new AppError(409, `SLA untuk prioritas ${data.priority} sudah ada`);
    }

    const updated = await db
      .update(slaPolicies)
      .set({
        priority: data.priority ?? existing.priority,
        responseMinutes: data.responseMinutes ?? existing.responseMinutes,
        resolutionMinutes: data.resolutionMinutes ?? existing.resolutionMinutes,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      })
      .where(eq(slaPolicies.id, id))
      .returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'sla',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, updated[0], 'SLA berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.slaPolicies.findFirst({ where: eq(slaPolicies.id, id) });
    if (!existing) throw new AppError(404, 'SLA tidak ditemukan');

    await db.delete(slaPolicies).where(eq(slaPolicies.id, id));

    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'sla',
      entityId: id,
      newValue: JSON.stringify(existing),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'SLA berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
