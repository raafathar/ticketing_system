import { Router } from 'express';
import { desc, eq, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const [countRows] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(notifications)
      .where(sql`${notifications.userId} = ${user.id} AND ${notifications.isRead} = false`);
    successResponse(res, 200, { items: rows, unreadCount: countRows?.c ?? 0 });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(sql`${notifications.id} = ${Number(req.params.id)} AND ${notifications.userId} = ${user.id}`);
    successResponse(res, 200, null, 'Notifikasi ditandai dibaca');
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(sql`${notifications.userId} = ${user.id} AND ${notifications.isRead} = false`);
    successResponse(res, 200, null, 'Semua notifikasi ditandai dibaca');
  } catch (error) {
    next(error);
  }
});

export default router;
