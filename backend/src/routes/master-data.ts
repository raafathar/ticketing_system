import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { departments, locations } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const nameSchema = z.object({ name: z.string().min(2, 'Nama minimal 2 karakter') });

router.get('/departments', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db.select().from(departments).orderBy(asc(departments.name));
    successResponse(res, 200, rows);
  } catch (error) {
    next(error);
  }
});

router.post('/departments', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = nameSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const created = await db.insert(departments).values({ name: parsed.data.name }).returning();
    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'department',
      entityId: created[0].id,
      newValue: created[0].name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, created[0], 'Department berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.delete('/departments/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.departments.findFirst({ where: eq(departments.id, id) });
    if (!existing) throw new AppError(404, 'Department tidak ditemukan');
    await db.delete(departments).where(eq(departments.id, id));
    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'department',
      entityId: id,
      newValue: existing.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, null, 'Department berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

router.get('/locations', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db.select().from(locations).orderBy(asc(locations.name));
    successResponse(res, 200, rows);
  } catch (error) {
    next(error);
  }
});

router.post('/locations', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = nameSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const created = await db.insert(locations).values({ name: parsed.data.name }).returning();
    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'location',
      entityId: created[0].id,
      newValue: created[0].name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    successResponse(res, 201, created[0], 'Location berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.delete('/locations/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.locations.findFirst({ where: eq(locations.id, id) });
    if (!existing) throw new AppError(404, 'Location tidak ditemukan');
    await db.delete(locations).where(eq(locations.id, id));
    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'location',
      entityId: id,
      newValue: existing.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    successResponse(res, 200, null, 'Location berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
