import type { Ticket } from '../db/schema.js';
import { getSlaStatus } from './sla.js';

const RESOLVED_STATUSES = new Set(['RESOLVED', 'CLOSED']);

export interface TicketWithRelations extends Ticket {
  requester?: { id: number; name: string; email: string; role: string } | null;
  assignee?: { id: number; name: string; email: string; role: string } | null;
  category?: { id: number; name: string; parentId: number | null } | null;
  department?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  comments?: any[];
  attachments?: any[];
  activityLogs?: any[];
}

export const serializeTicket = (ticket: TicketWithRelations) => {
  const resolved = RESOLVED_STATUSES.has(ticket.status);
  const slaStatus = getSlaStatus(ticket.slaDueAt, ticket.createdAt, resolved);
  const responseSlaStatus = getSlaStatus(ticket.slaResponseDueAt, ticket.createdAt, !!ticket.firstResponseAt);

  let responseTimeSeconds: number | null = null;
  if (ticket.firstResponseAt) {
    responseTimeSeconds = Math.max(
      0,
      Math.floor((new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime()) / 1000)
    );
  }

  let resolutionTimeSeconds: number | null = null;
  if (ticket.resolvedAt) {
    resolutionTimeSeconds = Math.max(
      0,
      Math.floor((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / 1000)
    );
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    categoryId: ticket.categoryId,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    requesterId: ticket.requesterId,
    requester: ticket.requester,
    assigneeId: ticket.assigneeId,
    assignee: ticket.assignee,
    departmentId: ticket.departmentId,
    department: ticket.department,
    locationId: ticket.locationId,
    location: ticket.location,
    slaDueAt: ticket.slaDueAt,
    slaResponseDueAt: ticket.slaResponseDueAt,
    firstResponseAt: ticket.firstResponseAt,
    slaStatus,
    responseSlaStatus,
    responseTimeSeconds,
    resolutionTimeSeconds,
    dueDate: ticket.dueDate,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    resolutionNotes: ticket.resolutionNotes,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    comments: ticket.comments ?? [],
    attachments: ticket.attachments ?? [],
    activityLogs: ticket.activityLogs ?? [],
  };
};

export const isActiveStatus = (status: string) =>
  !['CLOSED', 'CANCELLED'].includes(status);
