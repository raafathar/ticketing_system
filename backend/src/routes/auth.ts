import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import type { Role } from '../config/index.js';
import { authenticate, signToken, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const publicUser = (u: typeof users.$inferSelect) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  departmentId: u.departmentId,
  locationId: u.locationId,
  isActive: u.isActive,
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    }
    const { email, password } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: { department: true, location: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await writeAuditLog({
        userId: 0,
        action: 'LOGIN_FAILED',
        entity: 'auth',
        newValue: email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw new AppError(401, 'Email atau password salah');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Akun Anda dinonaktifkan. Hubungi IT Admin.');
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role as Role });

    await writeAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, {
      accessToken: token,
      user: {
        ...publicUser(user),
        department: user.department,
        location: user.location,
      },
    }, 'Login berhasil');
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user) {
      await writeAuditLog({
        userId: req.user.id,
        action: 'LOGOUT',
        entity: 'auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    successResponse(res, 200, null, 'Logout berhasil');
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
      with: { department: true, location: true },
    });
    if (!user) throw new AppError(404, 'User tidak ditemukan');
    successResponse(res, 200, {
      ...publicUser(user),
      department: user.department,
      location: user.location,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
