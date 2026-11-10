/**
 * Corper Wee: Centralized Error Handler
 */
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const message = err.message || 'An internal server error occurred';

  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    details: err.details || undefined,
    timestamp: new Date().toISOString(),
  });
}
