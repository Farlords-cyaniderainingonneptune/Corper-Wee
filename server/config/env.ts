/**
 * Corper Wee: Server Environment Configuration & Production Validation
 */
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_DEV_JWT_SECRET = 'corper-wee-nysc-iseyin-secret-key-2026';

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  releaseVersion: process.env.RELEASE_VERSION || '1.0.0',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  adminPortalOrigin: process.env.ADMIN_PORTAL_ORIGIN || 'http://localhost:3001',
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:3000,http://localhost:3001,capacitor://localhost,http://localhost'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET,
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL || '',
  pgPool: {
    min: parseInt(process.env.PG_POOL_MIN || '2', 10),
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    sslMode: process.env.PG_SSL_MODE || 'require',
  },
  retentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '90', 10),
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: process.env.REDIS_ENABLED === 'true' || Boolean(process.env.REDIS_URL),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'corperwee:prod:',
  },
  observability: {
    logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase(),
    sentryDsn: process.env.SENTRY_DSN || '',
    errorWebhookUrl: process.env.ERROR_WEBHOOK_URL || '',
    metricsBearerToken: process.env.METRICS_BEARER_TOKEN || '',
  },
  superadmin: {
    email: (process.env.SUPERADMIN_EMAIL || 'farlodunolusege@gmail.com').toLowerCase(),
    stateCode: (process.env.SUPERADMIN_STATE_CODE || 'OY/26C/5439').toUpperCase(),
    role: 'SUPERADMIN' as const,
  },
  economy: {
    defaultCpToNairaRate: {
      cp: 10,
      naira: 100,
    },
    defaultHydrationDrainPerSecIdle: 0.05,
    defaultHydrationDrainPerSecRun: 0.2,
  },
};

export interface ConfigValidationReport {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateProductionConfig(): ConfigValidationReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.isProduction) {
    if (config.jwtSecret === DEFAULT_DEV_JWT_SECRET || config.jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be overridden with a 32+ character secret in production.');
    }
    if (!config.databaseUrl) {
      warnings.push('DATABASE_URL is not set; server is using volatile in-memory storage.');
    }
    if (!config.redis.enabled) {
      warnings.push('REDIS_URL is not configured; rate limiting and WebSocket pub/sub are single-node only.');
    }
    if (!config.observability.sentryDsn && !config.observability.errorWebhookUrl) {
      warnings.push('Neither SENTRY_DSN nor ERROR_WEBHOOK_URL is set; errors are retained in local ring buffer only.');
    }
  } else {
    if (!config.databaseUrl) {
      warnings.push('Development mode: using resilient zero-config in-memory relational store.');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
