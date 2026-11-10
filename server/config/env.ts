/**
 * Corper Wee: Server Environment Configuration
 */
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'corper-wee-nysc-iseyin-secret-key-2026',
  databaseUrl: process.env.DATABASE_URL || '',
  superadmin: {
    email: 'farlodunolusege@gmail.com',
    stateCode: 'OY/26C/5439',
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
