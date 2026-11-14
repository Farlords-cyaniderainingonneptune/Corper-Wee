/**
 * Corper Wee: Authentication, HMAC-SHA256 Token Signing & Authorization Middleware
 * Supports Access Tokens (15m, HMAC-SHA256 verified), Refresh Tokens with Family Rotation & Reuse Detection,
 * Account Status Validation (ACTIVE only), and Granular Permission Enforcement.
 */
import type { Request, Response, NextFunction } from 'express';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { db } from '../db/index.js';
import { config } from '../config/env.js';
import type { User, UserRole, Permission, RefreshToken } from '../db/types.js';
import { AuthorizationService } from '../services/authorizationService.js';
import { AppError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  tokenPayload?: {
    userId: string;
    role: UserRole;
    type: 'ACCESS';
  };
}

// Token durations
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function computeTokenSignature(payloadB64: string): string {
  return createHmac('sha256', config.jwtSecret).update(payloadB64).digest('base64url');
}

/**
 * Sign an Access Token with HMAC-SHA256 integrity protection
 */
export function signAccessToken(user: User): string {
  const payload = {
    userId: user.id,
    role: user.role,
    type: 'ACCESS',
    jti: randomUUID(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureB64 = computeTokenSignature(payloadB64);
  return `${payloadB64}.${signatureB64}`;
}

/**
 * Create a new Refresh Token in the database with rotation family
 */
export function createRefreshToken(userId: string, familyId?: string): { rawToken: string; refreshToken: RefreshToken } {
  const rawToken = 'cwrf_' + randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS).toISOString();

  const refreshToken: RefreshToken = {
    id: randomUUID(),
    userId,
    tokenHash,
    isRevoked: false,
    expiresAt,
    createdAt: now.toISOString(),
    familyId: familyId || randomUUID(),
  };

  db.refreshTokens.set(tokenHash, refreshToken);
  return { rawToken, refreshToken };
}

/**
 * Rotate Refresh Token with Automatic Reuse Detection
 */
export function rotateRefreshToken(rawToken: string): { accessToken: string; newRefreshToken: string; user: User } {
  const tokenHash = hashToken(rawToken);
  const existing = db.refreshTokens.get(tokenHash);

  if (!existing) {
    throw new AppError('Invalid refresh token.', 401);
  }

  // REUSE DETECTION: If this refresh token was already revoked / replaced,
  // invalidate all tokens in the entire rotation family.
  if (existing.isRevoked) {
    for (const [hash, token] of db.refreshTokens.entries()) {
      if (token.familyId === existing.familyId) {
        token.isRevoked = true;
        db.refreshTokens.set(hash, token);
      }
    }
    throw new AppError('Security alert: Token reuse detected. All active sessions have been invalidated.', 401);
  }

  // Check expiration
  if (new Date(existing.expiresAt).getTime() < Date.now()) {
    existing.isRevoked = true;
    db.refreshTokens.set(tokenHash, existing);
    throw new AppError('Refresh token has expired. Please log in again.', 401);
  }

  const user = db.users.get(existing.userId);
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('User account not found or is currently not active.', 403);
  }

  // Issue new pair & invalidate old token
  const { rawToken: newRawToken, refreshToken: newRefToken } = createRefreshToken(user.id, existing.familyId);

  existing.isRevoked = true;
  existing.replacedByTokenHash = newRefToken.tokenHash;
  db.refreshTokens.set(tokenHash, existing);

  const accessToken = signAccessToken(user);

  return {
    accessToken,
    newRefreshToken: newRawToken,
    user,
  };
}

/**
 * Revoke a Refresh Token (Logout)
 */
export function revokeRefreshToken(rawToken: string): boolean {
  const tokenHash = hashToken(rawToken);
  const existing = db.refreshTokens.get(tokenHash);
  if (existing) {
    existing.isRevoked = true;
    db.refreshTokens.set(tokenHash, existing);
    return true;
  }
  return false;
}

/**
 * Parse & cryptographically verify an Access Token
 */
export function parseAccessToken(token: string): { userId: string; role: UserRole } | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadB64, providedSig] = parts;
    if (!payloadB64 || !providedSig) return null;

    const expectedSig = computeTokenSignature(payloadB64);
    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }

    const raw = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.userId || !parsed.expiresAt || parsed.expiresAt < Date.now() || parsed.type !== 'ACCESS') {
      return null;
    }
    return { userId: parsed.userId, role: parsed.role };
  } catch {
    return null;
  }
}

/**
 * Authentication Middleware
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401));
  }

  const token = authHeader.substring(7).trim();
  const decoded = parseAccessToken(token);
  if (!decoded) {
    return next(new AppError('Invalid or expired authentication token. Please refresh your session.', 401));
  }

  const user = db.users.get(decoded.userId);
  if (!user) {
    return next(new AppError('User account not found.', 401));
  }

  // Account status verification (always authoritative from DB, preventing suspension/deletion bypass)
  if (user.status === 'SUSPENDED') {
    return next(new AppError('This corper account has been suspended by camp administration.', 403));
  }

  if (user.status === 'BANNED') {
    return next(new AppError('This account is permanently banned.', 403));
  }

  if (user.status === 'DELETED') {
    return next(new AppError('This account has been deleted under camp retention policies.', 403));
  }

  req.user = user;
  req.tokenPayload = { userId: user.id, role: user.role, type: 'ACCESS' };
  next();
}

/**
 * Authorization Middleware: Role Guard
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: requires elevated privileges (${allowedRoles.join(' or ')}). Current role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Authorization Middleware: Granular Permission Guard
 */
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!AuthorizationService.hasPermissionForUser(req.user, permission)) {
      return next(
        new AppError(
          `Access forbidden: lacking required permission '${permission}'.`,
          403
        )
      );
    }

    next();
  };
}
