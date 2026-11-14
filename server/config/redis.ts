/**
 * Corper Wee: Production Redis Configuration & Readiness Helper
 *
 * When deployed across multiple Node.js instances behind a load balancer:
 *   1. Rate limiting buckets synchronize under `${keyPrefix}rl:*`
 *   2. Revoked JWT access/refresh tokens replicate under `${keyPrefix}revoked:*`
 *   3. MultiplayerGateway WebSocket broadcasts fan out over Pub/Sub channel `${keyPrefix}ws:broadcast`
 *
 * When REDIS_URL is unset (single-instance / preview mode), the backend runs cleanly
 * with in-memory buckets without failing startup.
 */
import { config } from './env.js';

export interface RedisReadinessStatus {
  enabled: boolean;
  configured: boolean;
  mode: 'distributed-redis' | 'single-instance-memory';
  keyPrefix: string;
  tlsEnabled: boolean;
  validUrl: boolean;
}

export function getRedisStatus(): RedisReadinessStatus {
  const rawUrl = config.redis.url;
  const configured = Boolean(rawUrl);
  let validUrl = !configured;
  let tlsEnabled = false;

  if (configured) {
    try {
      const parsed = new URL(rawUrl);
      validUrl = parsed.protocol === 'redis:' || parsed.protocol === 'rediss:';
      tlsEnabled = parsed.protocol === 'rediss:';
    } catch {
      validUrl = false;
    }
  }

  return {
    enabled: config.redis.enabled,
    configured,
    mode: config.redis.enabled && validUrl ? 'distributed-redis' : 'single-instance-memory',
    keyPrefix: config.redis.keyPrefix,
    tlsEnabled,
    validUrl,
  };
}

export const REDIS_CHANNELS = {
  wsBroadcast: `${config.redis.keyPrefix}ws:broadcast`,
  campNotifications: `${config.redis.keyPrefix}camp:notifications`,
  configSync: `${config.redis.keyPrefix}config:sync`,
} as const;
