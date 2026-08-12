import path from 'node:path';
import { Router } from 'express';
import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import {
  ticketActivityLogs,
  ticketAttachments,
  ticketCategories,
  ticketComments,
  tickets,
  users,
} from '../db/schema.js';
import { ROLES, TICKET_PRIORITY, TICKET_STATUS } from '../config/index.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError, successResponse } from '../utils/response.js';
import { upload } from '../utils/upload.js';
import { generateTicketNumber } from '../services/ticketNumber.js';
import { calculateSlaDates, getSlaPolicyForPriority } from '../services/sla.js';
import { createNotification } from '../services/notifications.js';
import { logTicketActivity } from '../services/ticketActivity.js';
import { serializeTicket, type TicketWithRelations } from '../services/ticketSerialize.js';

const router = Router();

router.use(authenticate);

const TICKET_RELATIONS = {
  requester: { columns: { id: true, name: true, email: true, role: true } },
  assignee: { columns: { id: true, name: true, email: true, role: true } },
  category: { columns: { id: true, name: true, parentId: true } },
  department: { columns: { id: true, name: true } },
  location: { columns: { id: true, name: true } },
} as const;

const createTicketSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  description: z.string().min(5, 'Deskripsi minimal 5 karakter'),
  categoryId: z.number().optional(),
  priority: z.enum([TICKET_PRIORITY.LOW, TICKET_PRIORITY.MEDIUM, TICKET_PRIORITY.HIGH, TICKET_PRIORITY.CRITICAL]).default(TICKET_PRIORITY.MEDIUM),
  departmentId: z.number().nullable().optional(),
  locationId: z.number().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

const notifyAdminsAndTechs = async (ticket: { id: number; ticketNumber: string; title: string; requesterId: number }) => {
  const techs = await db.select({ id: users.id }).from(users).where(inArray(users.role, [ROLES.ADMIN, ROLES.TECHNICIAN]));
  for (const tech of techs) {
    await createNotification({
      userId: tech.id,
      type: 'TICKET_CREATED',
      title: 'Tiket Baru',
      message: `Tiket baru ${ticket.ticketNumber}: ${ticket.title}`,
      ticketId: ticket.id,
    });
  }
};

const getTicketOrThrow = async (id: number) => {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, id),
    with: {
      ...TICKET_RELATIONS,
      comments: {
        with: { user: { columns: { id: true, name: true, role: true } } },
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      },
      attachments: {
        with: { user: { columns: { id: true, name: true } } },
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      },
      activityLogs: {
        with: { user: { columns: { id: true, name: true, role: true } } },
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      },
    },
  });
  if (!ticket) throw new AppError(404, 'Tiket tidak ditemukan');
  return ticket as unknown as TicketWithRelations;
};

const canAccessTicket = (user: NonNullable<AuthRequest['user']>, ticket: TicketWithRelations) => {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.TECHNICIAN) return true;
  return ticket.requesterId === user.id;
};

const canManageTicket = (user: NonNullable<AuthRequest['user']>, ticket: TicketWithRelations) => {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.TECHNICIAN) return ticket.assigneeId === user.id;
  return ticket.requesterId === user.id;
};

const isValidTransition = (current: string, next: string) => {
  const allowed: Record<string, string[]> = {
    NEW: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
    OPEN: ['IN_PROGRESS', 'PENDING', 'RESOLVED', 'CANCELLED'],
    IN_PROGRESS: ['PENDING', 'RESOLVED', 'CANCELLED'],
    PENDING: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
    RESOLVED: ['CLOSED', 'IN_PROGRESS', 'CANCELLED'],
    CLOSED: ['IN_PROGRESS'],
    CANCELLED: ['NEW'],
  };
  return allowed[current]?.includes(next) ?? false;
};

// GET /api/tickets
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const {
      status,
      priority,
      categoryId,
      assigneeId,
      departmentId,
      locationId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      pageSize = '10',
      view,
    } = req.query as Record<string, string>;

    const conditions: any[] = [];

    if (user.role === ROLES.EMPLOYEE) {
      conditions.push(eq(tickets.requesterId, user.id));
    }
    if (view === 'assigned' && user.role !== ROLES.EMPLOYEE) {
      conditions.push(eq(tickets.assigneeId, user.id));
    }
    if (view === 'unassigned' && user.role !== ROLES.EMPLOYEE) {
      conditions.push(isNull(tickets.assigneeId));
    }
    if (status && status !== 'ALL') conditions.push(eq(tickets.status, status));
    if (priority && priority !== 'ALL') conditions.push(eq(tickets.priority, priority));
    if (categoryId) conditions.push(eq(tickets.categoryId, Number(categoryId)));
    if (assigneeId) conditions.push(eq(tickets.assigneeId, Number(assigneeId)));
    if (departmentId) conditions.push(eq(tickets.departmentId, Number(departmentId)));
    if (locationId) conditions.push(eq(tickets.locationId, Number(locationId)));

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        or(
          ilike(tickets.ticketNumber, q),
          ilike(tickets.title, q),
          ilike(tickets.description, q)
        )!
      );
    }

    const p = Math.max(1, Number(page));
    const ps = Math.min(100, Math.max(1, Number(pageSize)));

    const sortCol = (() => {
      if (sortBy === 'ticketNumber') return tickets.ticketNumber;
      if (sortBy === 'priority') return tickets.priority;
      if (sortBy === 'status') return tickets.status;
      if (sortBy === 'title') return tickets.title;
      return tickets.createdAt;
    })();

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db.query.tickets.findMany({
        where,
        with: {
          ...TICKET_RELATIONS,
        },
        orderBy: sortOrder === 'asc' ? [sql`${sortCol} asc`] : [sql`${sortCol} desc`],
        offset: (p - 1) * ps,
        limit: ps,
      }),
      db.select({ c: sql<number>`count(*)::int` }).from(tickets).where(where),
    ]);

    successResponse(res, 200, {
      items: rows.map((t) => serializeTicket(t as unknown as TicketWithRelations)),
      pagination: {
        page: p,
        pageSize: ps,
        total: countRows[0]?.c ?? 0,
        totalPages: Math.ceil((countRows[0]?.c ?? 0) / ps),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    const ticketNumber = await generateTicketNumber();
    const policy = await getSlaPolicyForPriority(data.priority);
    const slaDates = calculateSlaDates(new Date(), data.priority, policy);

    const requester = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: { department: true, location: true },
    });

    const [created] = await db
      .insert(tickets)
      .values({
        ticketNumber,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId ?? null,
        priority: data.priority,
        status: TICKET_STATUS.NEW,
        requesterId: user.id,
        departmentId: data.departmentId !== undefined ? data.departmentId : (requester?.departmentId ?? null),
        locationId: data.locationId !== undefined ? data.locationId : (requester?.locationId ?? null),
        slaResponseDueAt: slaDates.slaResponseDueAt,
        slaDueAt: slaDates.slaDueAt,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      })
      .returning();

    await logTicketActivity({
      ticketId: created.id,
      userId: user.id,
      action: 'CREATED',
      description: 'Tiket dibuat',
    });
    await writeAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'ticket',
      entityId: created.id,
      newValue: ticketNumber,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await notifyAdminsAndTechs(created);

    const ticket = await getTicketOrThrow(created.id);
    successResponse(res, 201, serializeTicket(ticket), 'Tiket berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const ticket = await getTicketOrThrow(Number(req.params.id));
    if (!canAccessTicket(user, ticket)) {
      throw new AppError(403, 'Anda tidak memiliki akses ke tiket ini');
    }
    successResponse(res, 200, serializeTicket(ticket));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    const ticket = await getTicketOrThrow(id);
    if (!canManageTicket(user, ticket)) throw new AppError(403, 'Anda tidak memiliki akses ke tiket ini');

    const patchSchema = z.object({
      title: z.string().min(3).optional(),
      description: z.string().min(5).optional(),
      categoryId: z.number().nullable().optional(),
      priority: z.enum([TICKET_PRIORITY.LOW, TICKET_PRIORITY.MEDIUM, TICKET_PRIORITY.HIGH, TICKET_PRIORITY.CRITICAL]).optional(),
      dueDate: z.string().datetime().nullable().optional(),
    });
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);
    const data = parsed.data;

    const changes: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) changes.title = data.title;
    if (data.description !== undefined) changes.description = data.description;
    if (data.categoryId !== undefined) changes.categoryId = data.categoryId;
    if (data.dueDate !== undefined) changes.dueDate = data.dueDate ? new Date(data.dueDate) : null;

    if (data.priority !== undefined && data.priority !== ticket.priority) {
      changes.priority = data.priority;
      const policy = await getSlaPolicyForPriority(data.priority);
      const slaDates = calculateSlaDates(new Date(ticket.createdAt), data.priority, policy);
      changes.slaResponseDueAt = slaDates.slaResponseDueAt;
      changes.slaDueAt = slaDates.slaDueAt;
      await logTicketActivity({
        ticketId: id,
        userId: user.id,
        action: 'PRIORITY_CHANGED',
        oldValue: ticket.priority,
        newValue: data.priority,
        description: `Prioritas diubah dari ${ticket.priority} menjadi ${data.priority}`,
      });
    }

    const updated = await db.update(tickets).set(changes).where(eq(tickets.id, id)).returning();
    const result = await getTicketOrThrow(id);

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entity: 'ticket',
      entityId: id,
      newValue: JSON.stringify(changes),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    void updated;

    successResponse(res, 200, serializeTicket(result), 'Tiket berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    const ticket = await getTicketOrThrow(id);

    const canDelete =
      user.role === ROLES.ADMIN || (ticket.requesterId === user.id && ticket.status === TICKET_STATUS.NEW);
    if (!canDelete) throw new AppError(403, 'Tidak dapat menghapus tiket ini');

    await db.delete(ticketComments).where(eq(ticketComments.ticketId, id));
    await db.delete(ticketActivityLogs).where(eq(ticketActivityLogs.ticketId, id));
    await db.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, id));
    await db.delete(tickets).where(eq(tickets.id, id));

    await writeAuditLog({
      userId: user.id,
      action: 'DELETE',
      entity: 'ticket',
      entityId: id,
      newValue: ticket.ticketNumber,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'Tiket berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    const ticket = await getTicketOrThrow(id);
    if (!canManageTicket(user, ticket)) throw new AppError(403, 'Anda tidak memiliki akses ke tiket ini');

    const commentSchema = z.object({
      comment: z.string().min(1, 'Komentar tidak boleh kosong'),
      isInternal: z.boolean().optional(),
    });
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);

    const isInternal = parsed.data.isInternal && user.role !== ROLES.EMPLOYEE;

    const [created] = await db
      .insert(ticketComments)
      .values({
        ticketId: id,
        userId: user.id,
        comment: parsed.data.comment,
        isInternal: !!isInternal,
      })
      .returning();

    const isFirstTechResponse =
      !ticket.firstResponseAt && user.role !== ROLES.EMPLOYEE;
    if (isFirstTechResponse) {
      await db.update(tickets).set({ firstResponseAt: new Date() }).where(eq(tickets.id, id));
    }

    await logTicketActivity({
      ticketId: id,
      userId: user.id,
      action: 'COMMENT',
      description: `${user.name} menambahkan komentar`,
    });

    // Notify the other party
    const recipient =
      user.id === ticket.requesterId
        ? ticket.assigneeId
        : ticket.requesterId;
    if (recipient) {
      await createNotification({
        userId: recipient,
        type: 'COMMENT',
        title: 'Komentar Baru',
        message: `${user.name} menambahkan komentar pada tiket ${ticket.ticketNumber}`,
        ticketId: id,
      });
    }

    const result = await getTicketOrThrow(id);
    successResponse(res, 201, serializeTicket(result), 'Komentar berhasil ditambahkan');
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/assign
router.post('/:id/assign', authorize(ROLES.ADMIN, ROLES.TECHNICIAN), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    const ticket = await getTicketOrThrow(id);

    const assignSchema = z.object({
      assigneeId: z.number().optional(),
    });
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);

    let targetAssignee: number | null;
    if (parsed.data.assigneeId) {
      if (user.role === ROLES.TECHNICIAN) {
        throw new AppError(403, 'Technician hanya dapat mengambil tiket untuk diri sendiri');
      }
      targetAssignee = parsed.data.assigneeId;
    } else {
      if (user.role === ROLES.TECHNICIAN) {
        if (ticket.assigneeId && ticket.assigneeId !== user.id) {
          throw new AppError(409, 'Tiket sudah ditugaskan ke teknisi lain');
        }
        targetAssignee = user.id;
      } else {
        throw new AppError(400, 'assigneeId wajib diisi');
      }
    }

    const assignee = await db.query.users.findFirst({ where: eq(users.id, targetAssignee) });
    if (!assignee) throw new AppError(404, 'Teknisi tidak ditemukan');
    if (assignee.role === ROLES.EMPLOYEE) throw new AppError(400, 'Assignee harus berperan TECHNICIAN atau ADMIN');

    await db
      .update(tickets)
      .set({
        assigneeId: targetAssignee,
        status: ticket.status === TICKET_STATUS.NEW ? TICKET_STATUS.OPEN : ticket.status,
        firstResponseAt: ticket.firstResponseAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id));

    await logTicketActivity({
      ticketId: id,
      userId: user.id,
      action: 'ASSIGNED',
      oldValue: ticket.assigneeId ? String(ticket.assigneeId) : null,
      newValue: String(targetAssignee),
      description: `Ditugaskan ke ${assignee.name}`,
    });
    await writeAuditLog({
      userId: user.id,
      action: 'ASSIGN',
      entity: 'ticket',
      entityId: id,
      newValue: assignee.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await createNotification({
      userId: targetAssignee,
      type: 'ASSIGNED',
      title: 'Tiket Ditugaskan',
      message: `Tiket ${ticket.ticketNumber}: ${ticket.title} ditugaskan kepada Anda`,
      ticketId: id,
    });

    const result = await getTicketOrThrow(id);
    successResponse(res, 200, serializeTicket(result), 'Tiket berhasil ditugaskan');
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/status
router.post('/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    const ticket = await getTicketOrThrow(id);
    if (!canManageTicket(user, ticket)) throw new AppError(403, 'Anda tidak memiliki akses ke tiket ini');

    const statusSchema = z.object({
      status: z.enum([
        TICKET_STATUS.NEW,
        TICKET_STATUS.OPEN,
        TICKET_STATUS.IN_PROGRESS,
        TICKET_STATUS.PENDING,
        TICKET_STATUS.RESOLVED,
        TICKET_STATUS.CLOSED,
        TICKET_STATUS.CANCELLED,
      ]),
      note: z.string().optional(),
    });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validasi gagal', parsed.error.errors);

    const nextStatus = parsed.data.status;
    if (nextStatus === ticket.status) {
      throw new AppError(400, 'Status sudah dalam kondisi tersebut');
    }
    if (ticket.status !== nextStatus && !isValidTransition(ticket.status, nextStatus)) {
      throw new AppError(400, `Transisi status tidak valid: ${ticket.status} -> ${nextStatus}`);
    }

    const values: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: new Date(),
    };
    if (nextStatus === TICKET_STATUS.RESOLVED) {
      values.resolvedAt = ticket.resolvedAt ?? new Date();
      if (parsed.data.note) values.resolutionNotes = parsed.data.note;
    }
    if (nextStatus === TICKET_STATUS.CLOSED) {
      values.closedAt = ticket.closedAt ?? new Date();
      values.resolvedAt = ticket.resolvedAt ?? new Date();
      if (parsed.data.note) values.resolutionNotes = parsed.data.note;
    }
    if (nextStatus === TICKET_STATUS.IN_PROGRESS) {
      values.resolvedAt = null;
      values.closedAt = null;
    }

    await db.update(tickets).set(values).where(eq(tickets.id, id));

    await logTicketActivity({
      ticketId: id,
      userId: user.id,
      action: 'STATUS_CHANGED',
      oldValue: ticket.status,
      newValue: nextStatus,
      description: `Status berubah dari ${ticket.status} menjadi ${nextStatus}`,
    });
    await writeAuditLog({
      userId: user.id,
      action: 'CHANGE_STATUS',
      entity: 'ticket',
      entityId: id,
      oldValue: ticket.status,
      newValue: nextStatus,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const notifyUser = ticket.requesterId === user.id ? ticket.assigneeId : ticket.requesterId;
    if (notifyUser) {
      await createNotification({
        userId: notifyUser,
        type: 'STATUS_CHANGED',
        title: 'Status Tiket Berubah',
        message: `Status tiket ${ticket.ticketNumber} menjadi ${nextStatus}`,
        ticketId: id,
      });
    }
    if (nextStatus === TICKET_STATUS.RESOLVED) {
      await createNotification({
        userId: ticket.requesterId,
        type: 'RESOLVED',
        title: 'Tiket Diselesaikan',
        message: `Tiket ${ticket.ticketNumber}: ${ticket.title} telah diselesaikan. Mohon konfirmasi.`,
        ticketId: id,
      });
    }

    const result = await getTicketOrThrow(id);
    successResponse(res, 200, serializeTicket(result), 'Status tiket berhasil diubah');
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/attachments
router.post('/:id/attachments', upload.array('files', 10), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const id = Number(req.params.id);
    const ticket = await getTicketOrThrow(id);
    if (!canManageTicket(user, ticket)) throw new AppError(403, 'Anda tidak memiliki akses ke tiket ini');

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw new AppError(400, 'Tidak ada file yang diunggah');

    const inserted = [];
    for (const file of files) {
      const [row] = await db
        .insert(ticketAttachments)
        .values({
          ticketId: id,
          userId: user.id,
          originalFilename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          fileSize: file.size,
        })
        .returning();
      inserted.push(row);
    }

    await logTicketActivity({
      ticketId: id,
      userId: user.id,
      action: 'ATTACHMENT_UPLOADED',
      description: `${inserted.length} attachment diunggah`,
    });

    const result = await getTicketOrThrow(id);
    successResponse(res, 201, serializeTicket(result), `${inserted.length} file berhasil diunggah`);
  } catch (error) {
    next(error);
  }
});

export default router;
