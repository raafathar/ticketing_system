import { Router } from 'express';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { ticketCategories } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const categorySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  parentId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

type CategoryNode = typeof ticketCategories.$inferSelect & { children: CategoryNode[] };

const buildTree = (rows: (typeof ticketCategories.$inferSelect)[]) => {
  const map = new Map<number, CategoryNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: CategoryNode[] = [];
  rows.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

router.get('/', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db
      .select()
      .from(ticketCategories)
      .orderBy(asc(ticketCategories.name));
    const count = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ticketCategories);
    successResponse(res, 200, { items: buildTree(rows), total: count[0]?.c ?? 0 });
  } catch (error) {
    next(error);
  }
});

router.get('/flat', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await db
      .select()
      .from(ticketCategories)
      .orderBy(asc(ticketCategories.name));
    successResponse(res, 200, rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    if (data.parentId) {
      const parent = await db.query.ticketCategories.findFirst({
        where: eq(ticketCategories.id, data.parentId),
      });
      if (!parent) throw new AppError(404, 'Kategori induk tidak ditemukan');
      if (parent.parentId) throw new AppError(400, 'Kategori induk tidak boleh berupa subkategori');
    }

    const created = await db.insert(ticketCategories).values({
      name: data.name,
      parentId: data.parentId ?? null,
      isActive: data.isActive ?? true,
    }).returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'category',
      entityId: created[0].id,
      newValue: JSON.stringify(created[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 201, created[0], 'Kategori berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, id) });
    if (!existing) throw new AppError(404, 'Kategori tidak ditemukan');

    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    const updated = await db
      .update(ticketCategories)
      .set({
        name: data.name ?? existing.name,
        parentId: data.parentId !== undefined ? data.parentId : existing.parentId,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      })
      .where(eq(ticketCategories.id, id))
      .returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'category',
      entityId: id,
      newValue: JSON.stringify(updated[0]),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, updated[0], 'Kategori berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const children = await db.select().from(ticketCategories).where(eq(ticketCategories.parentId, id));
    if (children.length) throw new AppError(400, 'Kategori memiliki subkategori. Hapus subkategori terlebih dahulu.');

    const existing = await db.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, id) });
    if (!existing) throw new AppError(404, 'Kategori tidak ditemukan');

    await db.delete(ticketCategories).where(eq(ticketCategories.id, id));

    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'category',
      entityId: id,
      newValue: JSON.stringify(existing),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'Kategori berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
