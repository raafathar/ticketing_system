import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger.js';
import { AppError } from '../utils/response.js';

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  const anyErr = err as { statusCode?: number; message?: string };
  logger.error('Unhandled error', { error: err });

  const statusCode = anyErr.statusCode && anyErr.statusCode < 500 ? anyErr.statusCode : 500;
  const message =
    statusCode >= 500 ? 'Internal server error' : anyErr.message || 'An error occurred';

  return res.status(statusCode).json({ success: false, message, errors: [] });
};
