/**
 * Corper Wee: Request Logger Middleware
 */
import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    // Keep logs concise & clean
    if (!url.startsWith('/@') && !url.includes('node_modules')) {
      console.log(`[API] ${method} ${url} ${status} - ${duration}ms`);
    }
  });

  next();
}
