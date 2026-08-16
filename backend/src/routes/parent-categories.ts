import { Router } from 'express';
import { asc, eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { parentCategories, ticketCategories } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const parentCategorySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  isActive: z.boolean().optional(),
});

router.get('/', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db.select().from(parentCategories).orderBy(asc(parentCategories.name));
    successResponse(res, 200, rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = parentCategorySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    const dup = await db.query.parentCategories.findFirst({
      where: sql`lower(${parentCategories.name}) = ${data.name.toLowerCase()}`,
    });
    if (dup) throw new AppError(409, 'Parent kategori dengan nama tersebut sudah ada');

    const created = await db
      .insert(parentCategories)
      .values({ name: data.name, isActive: data.isActive ?? true })
      .returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'parent_category',
      entityId: created[0].id,
      newValue: JSON.stringify(created[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 201, created[0], 'Parent kategori berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.parentCategories.findFirst({
      where: eq(parentCategories.id, id),
    });
    if (!existing) throw new AppError(404, 'Parent kategori tidak ditemukan');

    const parsed = parentCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    if (data.name) {
      const dup = await db.query.parentCategories.findFirst({
        where: and(
          sql`lower(${parentCategories.name}) = ${data.name.toLowerCase()}`,
          sql`${parentCategories.id} != ${id}`
        ),
      });
      if (dup) throw new AppError(409, 'Parent kategori dengan nama tersebut sudah ada');
    }

    const updated = await db
      .update(parentCategories)
      .set({
        name: data.name ?? existing.name,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      })
      .where(eq(parentCategories.id, id))
      .returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'parent_category',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, updated[0], 'Parent kategori berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.parentCategories.findFirst({
      where: eq(parentCategories.id, id),
    });
    if (!existing) throw new AppError(404, 'Parent kategori tidak ditemukan');

    const children = await db
      .select()
      .from(ticketCategories)
      .where(eq(ticketCategories.parentId, id));
    if (children.length)
      throw new AppError(
        400,
        'Parent kategori memiliki subkategori. Hapus atau pindahkan subkategori terlebih dahulu.'
      );

    await db.delete(parentCategories).where(eq(parentCategories.id, id));

    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'parent_category',
      entityId: id,
      newValue: JSON.stringify(existing),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'Parent kategori berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
