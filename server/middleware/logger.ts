/**
 * Corper Wee: Request Logger & Correlation ID Middleware
 * Emits structured JSON logs in production and concise line logs in development,
 * while feeding TelemetryService latency & status histograms.
 */
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { TelemetryService } from '../services/telemetryService.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url } = req;
  const existingId = req.header('x-request-id');
  const requestId = existingId && existingId.length <= 64 ? existingId : randomUUID();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const status = res.statusCode;

    if (url.startsWith('/api/')) {
      TelemetryService.recordHttpRequest(status, durationMs);
    }

    if (
      !url.startsWith('/api/') &&
      !url.startsWith('/legal/')
    ) {
      return;
    }

    if (config.isProduction) {
      const logLine = {
        timestamp: new Date().toISOString(),
        level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        requestId,
        method,
        path: url.split('?')[0],
        status,
        durationMs,
        userId: (req as any).user?.id || null,
      };
      console.log(JSON.stringify(logLine));
    } else {
      console.log(`[API] ${method} ${url} ${status} - ${durationMs}ms`);
    }
  });

  next();
}
