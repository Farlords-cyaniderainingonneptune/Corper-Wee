/**
 * Corper Wee: Sliding-Window Rate Limiter Middleware (API Abuse Protection)
 */
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const buckets = new Map<string, Bucket>();

export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Allow explicit bypass in unit test mode unless rate limit test header is passed
    if (process.env.DISABLE_RATE_LIMIT === 'true' && req.headers['x-test-rate-limit'] !== 'enforce') {
      return next();
    }

    const authReq = req as AuthenticatedRequest;
    const identity = authReq.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
    const bucketKey = `${options.keyPrefix}:${identity}`;
    const now = Date.now();

    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 1, resetAt: now + options.windowMs };
      buckets.set(bucketKey, bucket);
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please slow down and try again shortly.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    next();
  };
}

export function resetRateLimiterBuckets() {
  buckets.clear();
}
