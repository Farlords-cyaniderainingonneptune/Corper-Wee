/**
 * Corper Wee: PostgreSQL Production Configuration & Readiness Diagnostics
 * Pairs with server/db/migrations/001_initial_schema.sql and 002_production_social_events_security.sql.
 */
import { config } from '../config/env.js';

export interface PostgresReadinessStatus {
  mode: 'postgresql' | 'in-memory-fallback';
  configured: boolean;
  validConnectionString: boolean;
  poolMin: number;
  poolMax: number;
  sslMode: string;
  hostPreview: string | null;
  migrationsExpected: string[];
}

export function getPostgresStatus(): PostgresReadinessStatus {
  const rawUrl = config.databaseUrl;
  const configured = Boolean(rawUrl);
  let validConnectionString = !configured;
  let hostPreview: string | null = null;

  if (configured) {
    try {
      const parsed = new URL(rawUrl);
      validConnectionString =
        parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
      hostPreview = parsed.hostname ? `${parsed.hostname}:${parsed.port || '5432'}` : null;
    } catch {
      validConnectionString = false;
    }
  }

  return {
    mode: configured && validConnectionString ? 'postgresql' : 'in-memory-fallback',
    configured,
    validConnectionString,
    poolMin: config.pgPool.min,
    poolMax: config.pgPool.max,
    sslMode: config.pgPool.sslMode,
    hostPreview,
    migrationsExpected: [
      '001_initial_schema.sql',
      '002_production_social_events_security.sql',
    ],
  };
}
