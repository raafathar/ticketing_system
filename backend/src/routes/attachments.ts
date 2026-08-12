import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { ticketAttachments, tickets } from '../db/schema.js';
import { ROLES, config } from '../config/index.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../utils/audit.js';
import { logTicketActivity } from '../services/ticketActivity.js';
import { AppError, successResponse } from '../utils/response.js';

const router = Router();

router.use(authenticate);

router.get('/:id/download', async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const attachment = await db.query.ticketAttachments.findFirst({
      where: eq(ticketAttachments.id, id),
    });
    if (!attachment) throw new AppError(404, 'Attachment tidak ditemukan');

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, attachment.ticketId),
    });
    if (!ticket) throw new AppError(404, 'Tiket tidak ditemukan');

    const user = req.user!;
    const allowed =
      user.role === ROLES.ADMIN ||
      user.role === ROLES.TECHNICIAN ||
      ticket.requesterId === user.id ||
      ticket.assigneeId === user.id;
    if (!allowed) throw new AppError(403, 'Anda tidak memiliki akses ke file ini');

    const filePath = path.join(config.uploadDir, attachment.storedFilename);
    if (!fs.existsSync(filePath)) throw new AppError(404, 'File tidak ditemukan');

    res.download(filePath, attachment.originalFilename);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const attachment = await db.query.ticketAttachments.findFirst({
      where: eq(ticketAttachments.id, id),
    });
    if (!attachment) throw new AppError(404, 'Attachment tidak ditemukan');

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, attachment.ticketId),
    });
    if (!ticket) throw new AppError(404, 'Tiket tidak ditemukan');

    const user = req.user!;
    const allowed = user.role === ROLES.ADMIN || attachment.userId === user.id;
    if (!allowed) throw new AppError(403, 'Anda tidak memiliki akses ke file ini');

    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, id));

    const filePath = path.join(config.uploadDir, attachment.storedFilename);
    fs.rm(filePath, { force: true }, () => {});

    await logTicketActivity({
      ticketId: attachment.ticketId,
      userId: user.id,
      action: 'ATTACHMENT_DELETED',
      description: `Attachment ${attachment.originalFilename} dihapus`,
    });
    await writeAuditLog({
      userId: user.id,
      action: 'DELETE',
      entity: 'attachment',
      entityId: id,
      newValue: attachment.originalFilename,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    successResponse(res, 200, null, 'Attachment berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

export default router;
