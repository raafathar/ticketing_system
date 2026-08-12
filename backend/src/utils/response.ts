import type { Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  errors: unknown[];

  constructor(statusCode: number, message: string, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const successResponse = (res: Response, statusCode: number, data: unknown, message = 'Success') => {
  res.status(statusCode).json({ success: true, data, message });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, errors: [] });
};
