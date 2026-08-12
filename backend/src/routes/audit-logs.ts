import { Router } from 'express';
import { desc, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const p = Math.max(1, Number(page));
    const ps = Math.min(100, Math.max(1, Number(pageSize)));

    const rows = await db.query.auditLogs.findMany({
      with: {
        user: { columns: { id: true, name: true, email: true } },
      },
      orderBy: (t, { desc: d }) => [d(t.createdAt)],
      limit: ps,
      offset: (p - 1) * ps,
    });

    const [countRows] = await db.select({ c: sql<number>`count(*)::int` }).from(auditLogs);

    successResponse(res, 200, {
      items: rows,
      pagination: {
        page: p,
        pageSize: ps,
        total: countRows?.c ?? 0,
        totalPages: Math.ceil((countRows?.c ?? 0) / ps),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
