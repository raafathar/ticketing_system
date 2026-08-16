import { Router } from 'express';
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { slaPolicies, ticketActivityLogs, ticketCategories, tickets, users } from '../db/schema.js';
import { ROLES } from '../config/index.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { successResponse } from '../utils/response.js';
import { getSlaStatus } from '../services/sla.js';

const router = Router();

router.use(authenticate);

const ACTIVE = ['NEW', 'OPEN', 'IN_PROGRESS', 'PENDING'];
const RESOLVED_STATUSES = ['RESOLVED', 'CLOSED'];

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

const getRecentActivity = async (ticketWhere?: any) => {
  const conditions = ticketWhere ? [ticketWhere] : [];
  const rows = await db
    .select({
      id: ticketActivityLogs.id,
      action: ticketActivityLogs.action,
      description: ticketActivityLogs.description,
      createdAt: ticketActivityLogs.createdAt,
      user: {
        id: users.id,
        name: users.name,
        role: users.role,
      },
      ticket: {
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
      },
    })
    .from(ticketActivityLogs)
    .innerJoin(tickets, eq(ticketActivityLogs.ticketId, tickets.id))
    .leftJoin(users, eq(ticketActivityLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ticketActivityLogs.createdAt))
    .limit(10);

  return rows;
};

const formatDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

    const [activity] = await Promise.all([getRecentActivity(where)]);

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
      activity,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/technician', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const assignedWhere = eq(tickets.assigneeId, user.id);
    const [assigned, unassigned, resolvedToday, slaBreached, avgResolution, activity] =
      await Promise.all([
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
          .where(and(eq(tickets.assigneeId, user.id), inArray(tickets.status, RESOLVED_STATUSES))),
        getRecentActivity(assignedWhere),
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
      activity,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin', async (req: AuthRequest, res, next) => {
  try {
    const stats = await countByStatus(undefined);
    const [
      slaBreached,
      avgResolution,
      avgResponse,
      byCategory,
      byPriority,
      byTechnician,
      trend,
      resolvedTrend,
      activity,
      atRisk,
      workload,
      slaRows,
    ] = await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(tickets)
        .where(and(inArray(tickets.status, ACTIVE), lt(tickets.slaDueAt, new Date()))),
      db
        .select({ avg: averageSeconds(tickets.resolvedAt, undefined) })
        .from(tickets)
        .where(inArray(tickets.status, RESOLVED_STATUSES)),
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
      db
        .select({
          date: sql<string>`TO_CHAR(${tickets.resolvedAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(tickets)
        .where(
          and(
            gte(tickets.resolvedAt, sql`CURRENT_DATE - INTERVAL '6 days'`),
            isNotNull(tickets.resolvedAt)
          )
        )
        .groupBy(sql`TO_CHAR(${tickets.resolvedAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${tickets.resolvedAt}, 'YYYY-MM-DD')`),
      getRecentActivity(),
      db.query.tickets.findMany({
        where: and(inArray(tickets.status, ACTIVE), isNotNull(tickets.slaDueAt)),
        orderBy: (t, { asc }) => [asc(t.slaDueAt)],
        limit: 8,
        with: {
          requester: { columns: { id: true, name: true } },
          assignee: { columns: { id: true, name: true } },
          category: { columns: { id: true, name: true } },
        },
      }),
      db
        .select({
          assigneeId: tickets.assigneeId,
          status: tickets.status,
          count: sql<number>`count(*)::int`,
        })
        .from(tickets)
        .where(sql`${tickets.assigneeId} IS NOT NULL`)
        .groupBy(tickets.assigneeId, tickets.status),
      db
        .select({ createdAt: tickets.createdAt, slaDueAt: tickets.slaDueAt })
        .from(tickets)
        .where(and(inArray(tickets.status, ACTIVE), isNotNull(tickets.slaDueAt))),
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

    // Merge created + resolved into a continuous 7-day series
    const createdMap = new Map(trend.map((r) => [r.date, r.count]));
    const resolvedMap = new Map(resolvedTrend.map((r) => [r.date, r.count]));
    const trend7: { date: string; created: number; resolved: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      trend7.push({
        date: key,
        created: createdMap.get(key) ?? 0,
        resolved: resolvedMap.get(key) ?? 0,
      });
    }

    // Technician workload: open vs completed
    const workloadByTech = new Map<number, { open: number; completed: number }>();
    workload.forEach((r) => {
      const entry = workloadByTech.get(r.assigneeId as number) ?? { open: 0, completed: 0 };
      if (ACTIVE.includes(r.status)) entry.open += r.count;
      if (RESOLVED_STATUSES.includes(r.status)) entry.completed += r.count;
      workloadByTech.set(r.assigneeId as number, entry);
    });
    const technicianWorkload = [...workloadByTech.entries()]
      .map(([id, counts]) => ({
        id,
        name: techs.find((t) => t.id === id)?.name ?? 'Unknown',
        ...counts,
      }))
      .sort((a, b) => b.open + b.completed - (a.open + a.completed));

    // SLA performance: actual vs target per priority
    const policies = await db.select().from(slaPolicies);
    const policyMap = new Map(policies.map((p) => [p.priority, p]));

    const perfRows = await db
      .select({
        priority: tickets.priority,
        avgResponse: sql<number | null>`ROUND(AVG(EXTRACT(EPOCH FROM (${tickets.firstResponseAt} - ${tickets.createdAt}))))`,
        avgResolution: sql<number | null>`ROUND(AVG(EXTRACT(EPOCH FROM (${tickets.resolvedAt} - ${tickets.createdAt}))))`,
      })
      .from(tickets)
      .groupBy(tickets.priority);

    const slaPerformance = perfRows.map((r) => {
      const policy = policyMap.get(r.priority);
      return {
        priority: r.priority,
        responseTargetSeconds: policy ? policy.responseMinutes * 60 : null,
        resolutionTargetSeconds: policy ? policy.resolutionMinutes * 60 : null,
        avgResponseSeconds: r.avgResponse,
        avgResolutionSeconds: r.avgResolution,
      };
    });

    // SLA status distribution for active tickets
    const bySlaStatus = { ON_TRACK: 0, WARNING: 0, BREACHED: 0 };
    slaRows.forEach((r) => {
      bySlaStatus[getSlaStatus(r.slaDueAt, r.createdAt)] += 1;
    });

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
      trend: trend7,
      bySlaStatus,
      slaPerformance,
      technicianWorkload,
      atRisk: atRisk.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        slaStatus: getSlaStatus(t.slaDueAt, t.createdAt),
        slaDueAt: t.slaDueAt,
        createdAt: t.createdAt,
        requester: t.requester,
        assignee: t.assignee,
        category: t.category,
      })),
      activity,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
