import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 20 }).notNull().default('EMPLOYEE'),
    departmentId: integer('department_id').references(() => departments.id),
    locationId: integer('location_id').references(() => locations.id),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)]
);

export const departments = pgTable('departments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const locations = pgTable('locations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ticketCategories = pgTable(
  'ticket_categories',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 255 }).notNull(),
    parentId: integer('parent_id').references((): AnyPgColumn => ticketCategories.id),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ticket_categories_parent_idx').on(table.parentId)]
);

export const slaPolicies = pgTable('sla_policies', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  priority: varchar('priority', { length: 20 }).notNull().unique(),
  responseMinutes: integer('response_minutes').notNull(),
  resolutionMinutes: integer('resolution_minutes').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable(
  'tickets',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketNumber: varchar('ticket_number', { length: 30 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    categoryId: integer('category_id').references(() => ticketCategories.id),
    priority: varchar('priority', { length: 20 }).notNull().default('MEDIUM'),
    status: varchar('status', { length: 20 }).notNull().default('NEW'),
    requesterId: integer('requester_id').references(() => users.id).notNull(),
    assigneeId: integer('assignee_id').references(() => users.id),
    departmentId: integer('department_id').references(() => departments.id),
    locationId: integer('location_id').references(() => locations.id),
    slaDueAt: timestamp('sla_due_at', { withTimezone: true }),
    slaResponseDueAt: timestamp('sla_response_due_at', { withTimezone: true }),
    firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    resolutionNotes: text('resolution_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tickets_ticket_number_unique').on(table.ticketNumber),
    index('tickets_requester_idx').on(table.requesterId),
    index('tickets_assignee_idx').on(table.assigneeId),
    index('tickets_status_idx').on(table.status),
    index('tickets_priority_idx').on(table.priority),
  ]
);

export const ticketComments = pgTable(
  'ticket_comments',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer('ticket_id').references(() => tickets.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    comment: text('comment').notNull(),
    isInternal: boolean('is_internal').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ticket_comments_ticket_idx').on(table.ticketId)]
);

export const ticketAttachments = pgTable(
  'ticket_attachments',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer('ticket_id').references(() => tickets.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    originalFilename: varchar('original_filename', { length: 500 }).notNull(),
    storedFilename: varchar('stored_filename', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 200 }).notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ticket_attachments_ticket_idx').on(table.ticketId)]
);

export const ticketActivityLogs = pgTable(
  'ticket_activity_logs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer('ticket_id').references(() => tickets.id).notNull(),
    userId: integer('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ticket_activity_logs_ticket_idx').on(table.ticketId)]
);

export const notifications = pgTable(
  'notifications',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').references(() => users.id).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    ticketId: integer('ticket_id').references(() => tickets.id),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notifications_user_idx').on(table.userId)]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 100 }).notNull(),
    entityId: integer('entity_id'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    ipAddress: varchar('ip_address', { length: 100 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_logs_user_idx').on(table.userId), index('audit_logs_entity_idx').on(table.entity)]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
  ticketsCreated: many(tickets, { relationName: 'requester' }),
  ticketsAssigned: many(tickets, { relationName: 'assignee' }),
}));

export const ticketCategoriesRelations = relations(ticketCategories, ({ many, one }) => ({
  parent: one(ticketCategories, {
    fields: [ticketCategories.parentId],
    references: [ticketCategories.id],
    relationName: 'parent',
  }),
  children: many(ticketCategories, { relationName: 'parent' }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  requester: one(users, {
    fields: [tickets.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  category: one(ticketCategories, {
    fields: [tickets.categoryId],
    references: [ticketCategories.id],
  }),
  department: one(departments, {
    fields: [tickets.departmentId],
    references: [departments.id],
  }),
  location: one(locations, {
    fields: [tickets.locationId],
    references: [locations.id],
  }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  activityLogs: many(ticketActivityLogs),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketComments.userId], references: [users.id] }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAttachments.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketAttachments.userId], references: [users.id] }),
}));

export const ticketActivityLogsRelations = relations(ticketActivityLogs, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketActivityLogs.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketActivityLogs.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketCategory = typeof ticketCategories.$inferSelect;
export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type TicketComment = typeof ticketComments.$inferSelect;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type TicketActivityLog = typeof ticketActivityLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Location = typeof locations.$inferSelect;
