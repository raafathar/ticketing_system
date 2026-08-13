import { Router } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { locations, tickets, users } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const locationSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
});

router.get('/', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db.select().from(locations).orderBy(asc(locations.name));
    successResponse(res, 200, rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const name = parsed.data.name.trim();

    const exists = await db.query.locations.findFirst({
      where: sql`lower(${locations.name}) = ${name.toLowerCase()}`,
    });
    if (exists) throw new AppError(409, 'Location dengan nama tersebut sudah ada');

    const created = await db.insert(locations).values({ name }).returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'location',
      entityId: created[0].id,
      newValue: JSON.stringify(created[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 201, created[0], 'Location berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.locations.findFirst({ where: eq(locations.id, id) });
    if (!existing) throw new AppError(404, 'Location tidak ditemukan');

    const schema = locationSchema.partial();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const name = parsed.data.name?.trim();
    if (name === undefined) throw new AppError(400, 'Tidak ada data yang diupdate');

    const dup = await db.query.locations.findFirst({
      where: and(sql`lower(${locations.name}) = ${name.toLowerCase()}`, sql`${locations.id} != ${id}`),
    });
    if (dup) throw new AppError(409, 'Location dengan nama tersebut sudah ada');

    const updated = await db.update(locations).set({ name }).where(eq(locations.id, id)).returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'location',
      entityId: id,
      oldValue: JSON.stringify({ name: existing.name }),
      newValue: JSON.stringify({ name: updated[0].name }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, updated[0], 'Location berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.locations.findFirst({ where: eq(locations.id, id) });
    if (!existing) throw new AppError(404, 'Location tidak ditemukan');

    const userCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.locationId, id));
    const ticketCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.locationId, id));
    if (userCount[0]?.c || ticketCount[0]?.c) {
      throw new AppError(400, 'Location masih digunakan oleh user/tiket. Tidak dapat dihapus.');
    }

    await db.delete(locations).where(eq(locations.id, id));

    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'location',
      entityId: id,
      newValue: JSON.stringify({ name: existing.name }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'Location berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
