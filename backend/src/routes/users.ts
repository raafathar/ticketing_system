import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { departments, locations, users } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const userSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z.enum([ROLES.EMPLOYEE, ROLES.TECHNICIAN, ROLES.ADMIN]).default(ROLES.EMPLOYEE),
  departmentId: z.number().nullable().optional(),
  locationId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

const publicUser = (u: typeof users.$inferSelect) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  departmentId: u.departmentId,
  locationId: u.locationId,
  isActive: u.isActive,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

router.get('/', authorize(ROLES.ADMIN, ROLES.TECHNICIAN), async (req: AuthRequest, res, next) => {
  try {
    const role = req.query.role as string | undefined;
    const active = req.query.active as string | undefined;
    const where = [];
    if (role && role !== 'ALL') where.push(eq(users.role, role));
    if (active !== undefined && active !== '') where.push(eq(users.isActive, active === 'true'));

    const list = await db.query.users.findMany({
      where: where.length ? and(...where) : undefined,
      with: { department: true, location: true },
      orderBy: [asc(users.name)],
    });

    const data = list.map((u) => ({
      ...publicUser(u),
      department: u.department,
      location: u.location,
    }));
    successResponse(res, 200, data);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const parsed = userSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    const exists = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });
    if (exists) throw new AppError(409, 'Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(data.password || 'password123', 10);
    const created = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        departmentId: data.departmentId ?? null,
        locationId: data.locationId ?? null,
        isActive: data.isActive ?? true,
      })
      .returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'user',
      entityId: created[0].id,
      newValue: JSON.stringify({ email: created[0].email, role: created[0].role }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 201, publicUser(created[0]), 'User berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) throw new AppError(404, 'User tidak ditemukan');

    const schema = userSchema.partial();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    if (data.email) {
      const dup = await db.query.users.findFirst({
        where: and(eq(users.email, data.email.toLowerCase()), sql`${users.id} != ${id}`),
      });
      if (dup) throw new AppError(409, 'Email sudah terdaftar');
    }

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) values.name = data.name;
    if (data.email !== undefined) values.email = data.email.toLowerCase();
    if (data.role !== undefined) values.role = data.role;
    if (data.departmentId !== undefined) values.departmentId = data.departmentId;
    if (data.locationId !== undefined) values.locationId = data.locationId;
    if (data.isActive !== undefined) values.isActive = data.isActive;
    if (data.password) values.passwordHash = await bcrypt.hash(data.password, 10);

    const updated = await db.update(users).set(values).where(eq(users.id, id)).returning();

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'user',
      entityId: id,
      newValue: JSON.stringify(values),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, publicUser(updated[0]), 'User berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize(ROLES.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (req.user!.id === id) throw new AppError(400, 'Tidak dapat menghapus akun sendiri');

    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) throw new AppError(404, 'User tidak ditemukan');

    await db.delete(users).where(eq(users.id, id));

    await writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'user',
      entityId: id,
      newValue: JSON.stringify({ email: existing.email }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'User berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
