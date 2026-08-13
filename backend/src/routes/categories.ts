import { Router } from 'express';
import { asc, eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { parentCategories, ticketCategories, tickets } from '../db/schema.js';
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

type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
  createdAt: Date;
  children: CategoryNode[];
};

const buildTree = async (): Promise<CategoryNode[]> => {
  const parents = await db.select().from(parentCategories).orderBy(asc(parentCategories.name));
  const categories = await db.select().from(ticketCategories).orderBy(asc(ticketCategories.name));

  const roots: CategoryNode[] = parents.map((p) => ({
    ...p,
    parentId: null,
    children: categories
      .filter((c) => c.parentId === p.id)
      .map((c) => ({ ...c, children: [] as CategoryNode[] })),
  }));

  categories
    .filter((c) => c.parentId === null)
    .forEach((c) => roots.push({ ...c, children: [] as CategoryNode[] }));

  return roots;
};

router.get('/', async (_req: AuthRequest, res, next) => {
  try {
    const items = await buildTree();
    const count = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ticketCategories);
    successResponse(res, 200, { items, total: count[0]?.c ?? 0 });
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
      const parent = await db.query.parentCategories.findFirst({
        where: eq(parentCategories.id, data.parentId),
      });
      if (!parent) throw new AppError(404, 'Parent kategori tidak ditemukan');
    }

    const dup = await db.query.ticketCategories.findFirst({
      where: sql`lower(${ticketCategories.name}) = ${data.name.toLowerCase()}`,
    });
    if (dup) throw new AppError(409, 'Kategori dengan nama tersebut sudah ada');

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

    if (data.parentId !== undefined && data.parentId !== null) {
      const parent = await db.query.parentCategories.findFirst({
        where: eq(parentCategories.id, data.parentId),
      });
      if (!parent) throw new AppError(404, 'Parent kategori tidak ditemukan');
    }

    if (data.name) {
      const dup = await db.query.ticketCategories.findFirst({
        where: and(
          sql`lower(${ticketCategories.name}) = ${data.name.toLowerCase()}`,
          sql`${ticketCategories.id} != ${id}`
        ),
      });
      if (dup) throw new AppError(409, 'Kategori dengan nama tersebut sudah ada');
    }

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
      oldValue: JSON.stringify(existing),
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
    const existing = await db.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, id) });
    if (!existing) throw new AppError(404, 'Kategori tidak ditemukan');

    const usedByTickets = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.categoryId, id));
    if (usedByTickets[0]?.c) {
      throw new AppError(400, 'Kategori masih digunakan oleh tiket. Tidak dapat dihapus.');
    }

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
