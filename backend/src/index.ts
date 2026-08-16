import fs from 'node:fs';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from './config/index.js';
import { errorHandler, requestLogger } from './middleware/error.js';
import { notFoundHandler } from './utils/response.js';
import { logger } from './utils/logger.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import parentCategoryRoutes from './routes/parent-categories.js';
import slaRoutes from './routes/sla.js';
import departmentRoutes from './routes/departments.js';
import locationRoutes from './routes/locations.js';
import ticketRoutes from './routes/tickets.js';
import attachmentRoutes from './routes/attachments.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import auditLogRoutes from './routes/audit-logs.js';

fs.mkdirSync(config.uploadDir, { recursive: true });
fs.mkdirSync('logs', { recursive: true });

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.', errors: [] },
});
app.use('/api', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() }, message: 'Healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/parent-categories', parentCategoryRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Ticketing System APP runing on di http://localhost:${config.port}`);
});
