/**
 * Corper Wee: Centralized Error Handler & Telemetry Reporter
 */
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { TelemetryService } from '../services/telemetryService.js';

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

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const requestId = (req as any).requestId as string | undefined;
  const isServerError = statusCode >= 500;
  const message =
    isServerError && config.isProduction
      ? 'An internal server error occurred. Reference your requestId if contacting support.'
      : err.message || 'An internal server error occurred';

  if (isServerError) {
    const report = TelemetryService.captureException(err, {
      source: 'SERVER',
      level: 'CRITICAL',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      userId: (req as any).user?.id,
    });
    console.error(
      JSON.stringify({
        timestamp: report.timestamp,
        level: 'error',
        errorId: report.id,
        requestId,
        method: req.method,
        path: req.originalUrl,
        message: err.message,
      })
    );
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    requestId,
    details: isServerError && config.isProduction ? undefined : err.details || undefined,
    timestamp: new Date().toISOString(),
  });
}
