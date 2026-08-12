import { Router } from 'express';
import { and, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { ticketCategories, tickets, users } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

const ACTIVE = ['NEW', 'OPEN', 'IN_PROGRESS', 'PENDING'];

const sumCase = (when: any) => sql<number>`COALESCE(SUM(CASE WHEN ${when} THEN 1 ELSE 0 END), 0)::int`;

const countByStatus = async (where: any) => {
  const [row] = await db
    .select({
      new: sumCase(eq(tickets.status, 'NEW')),
      open: sumCase(eq(tickets.status, 'OPEN')),
      inProgress: sumCase(eq(tickets.status, 'IN_PROGRESS')),
      pending: sumCase(eq(tickets.status, 'PENDING')),
      resolved: sumCase(eq(tickets.status, 'RESOLVED')),
      closed: sumCase(eq(tickets.status, 'CLOSED')),
      cancelled: sumCase(eq(tickets.status, 'CANCELLED')),
      total: sql<number>`count(*)::int`,
    })
    .from(tickets)
    .where(where);
  return row;
};

const averageSeconds = (col: any, where: any) => {
  return sql<number | null>`ROUND(AVG(EXTRACT(EPOCH FROM (${col} - ${tickets.createdAt}))))`;
};

router.get('/employee', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const where = eq(tickets.requesterId, user.id);
    const stats = await countByStatus(where);

    const recent = await db.query.tickets.findMany({
      where,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 5,
      with: {
        category: { columns: { id: true, name: true } },
        assignee: { columns: { id: true, name: true } },
      },
    });

    successResponse(res, 200, {
      stats: {
        total: stats.total,
        open: stats.open,
        inProgress: stats.inProgress,
        pending: stats.pending,
        resolved: stats.resolved,
        closed: stats.closed,
        new: stats.new,
      },
      recentTickets: recent,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/technician', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const assignedWhere = eq(tickets.assigneeId, user.id);
    const [assigned, unassigned, resolvedToday, slaBreached, avgResolution] = await Promise.all([
      countByStatus(assignedWhere),
      countByStatus(isNull(tickets.assigneeId)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(tickets)
        .where(
          and(
            eq(tickets.assigneeId, user.id),
            eq(tickets.status, 'RESOLVED'),
            sql`${tickets.resolvedAt}::date = CURRENT_DATE`
          )
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(tickets)
        .where(
          and(
            eq(tickets.assigneeId, user.id),
            inArray(tickets.status, ACTIVE),
            lt(tickets.slaDueAt, new Date())
          )
        ),
      db
        .select({ avg: averageSeconds(tickets.resolvedAt, eq(tickets.assigneeId, user.id)) })
        .from(tickets)
        .where(and(eq(tickets.assigneeId, user.id), inArray(tickets.status, ['RESOLVED', 'CLOSED']))),
    ]);

    const actionNeeded = await db.query.tickets.findMany({
      where: or(
        and(isNull(tickets.assigneeId), inArray(tickets.status, ['NEW', 'OPEN'])),
        and(eq(tickets.assigneeId, user.id), inArray(tickets.status, ACTIVE))
      ),
      orderBy: (t, { asc }) => [asc(t.slaDueAt)],
      limit: 8,
      with: {
        requester: { columns: { id: true, name: true } },
        category: { columns: { id: true, name: true } },
      },
    });

    successResponse(res, 200, {
      stats: {
        totalAssigned: assigned.total,
        open: assigned.open,
        inProgress: assigned.inProgress,
        pending: assigned.pending,
        resolved: assigned.resolved,
        unassigned: unassigned.total,
        resolvedToday: resolvedToday[0]?.c ?? 0,
        slaBreached: slaBreached[0]?.c ?? 0,
        overdue: slaBreached[0]?.c ?? 0,
        avgResolutionSeconds: avgResolution[0]?.avg ?? null,
      },
      actionNeeded,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin', async (req: AuthRequest, res, next) => {
  try {
    const stats = await countByStatus(undefined);
    const [slaBreached, avgResolution, avgResponse, byCategory, byPriority, byTechnician, trend] =
      await Promise.all([
        db
          .select({ c: sql<number>`count(*)::int` })
          .from(tickets)
          .where(and(inArray(tickets.status, ACTIVE), lt(tickets.slaDueAt, new Date()))),
        db
          .select({ avg: averageSeconds(tickets.resolvedAt, undefined) })
          .from(tickets)
          .where(inArray(tickets.status, ['RESOLVED', 'CLOSED'])),
        db
          .select({ avg: averageSeconds(tickets.firstResponseAt, undefined) })
          .from(tickets)
          .where(sql`${tickets.firstResponseAt} IS NOT NULL`),
        db
          .select({
            categoryId: tickets.categoryId,
            count: sql<number>`count(*)::int`,
          })
          .from(tickets)
          .groupBy(tickets.categoryId),
        db
          .select({
            priority: tickets.priority,
            count: sql<number>`count(*)::int`,
          })
          .from(tickets)
          .groupBy(tickets.priority),
        db
          .select({
            assigneeId: tickets.assigneeId,
            count: sql<number>`count(*)::int`,
          })
          .from(tickets)
          .where(sql`${tickets.assigneeId} IS NOT NULL`)
          .groupBy(tickets.assigneeId),
        db
          .select({
            date: sql<string>`TO_CHAR(${tickets.createdAt}, 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
          })
          .from(tickets)
          .where(gte(tickets.createdAt, sql`CURRENT_DATE - INTERVAL '6 days'`))
          .groupBy(sql`TO_CHAR(${tickets.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(sql`TO_CHAR(${tickets.createdAt}, 'YYYY-MM-DD')`),
      ]);

    const categories = await db.query.ticketCategories.findMany();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const techIds = byTechnician.map((r) => r.assigneeId);
    const techs = techIds.length
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, techIds as number[]))
      : [];

    successResponse(res, 200, {
      stats: {
        total: stats.total,
        new: stats.new,
        open: stats.open,
        inProgress: stats.inProgress,
        pending: stats.pending,
        resolved: stats.resolved,
        closed: stats.closed,
        cancelled: stats.cancelled,
        slaBreached: slaBreached[0]?.c ?? 0,
        avgResolutionSeconds: avgResolution[0]?.avg ?? null,
        avgResponseSeconds: avgResponse[0]?.avg ?? null,
      },
      byCategory: byCategory.map((r) => ({
        categoryId: r.categoryId,
        name: r.categoryId ? catMap.get(r.categoryId) ?? 'Tanpa Kategori' : 'Tanpa Kategori',
        count: r.count,
      })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r.count })),
      byTechnician: byTechnician.map((r) => ({
        assigneeId: r.assigneeId,
        name: techs.find((t) => t.id === r.assigneeId)?.name ?? 'Unknown',
        count: r.count,
      })),
      trend: trend.map((r) => ({ date: r.date, count: r.count })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
