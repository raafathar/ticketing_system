import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'it-helpdesk-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5137',
  maxFileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024),
};

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TICKET_STATUS = {
  NEW: 'NEW',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export const SLA_STATUS = {
  ON_TRACK: 'ON_TRACK',
  WARNING: 'WARNING',
  BREACHED: 'BREACHED',
} as const;

export type SlaStatus = (typeof SLA_STATUS)[keyof typeof SLA_STATUS];

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/xml',
  'text/x-log',
  'application/octet-stream',
];
