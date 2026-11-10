/**
 * Corper Wee: Authorization & Granular Permissions System
 */
import type { User, UserRole, Permission, AccountStatus } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PLAYER: [
    'ACCESS_GAMEPLAY',
    'MANAGE_OWN_PROFILE',
    'TRADE_ECONOMY',
    'VIEW_LEADERBOARDS',
  ],
  ADMIN: [
    'ACCESS_GAMEPLAY',
    'MANAGE_OWN_PROFILE',
    'TRADE_ECONOMY',
    'VIEW_LEADERBOARDS',
    'MANAGE_PLAYERS',
    'SUSPEND_PLAYERS',
    'MANAGE_ECONOMY',
    'SCHEDULE_EVENTS',
    'VIEW_AUDIT_LOGS',
  ],
  SUPERADMIN: [
    'ACCESS_GAMEPLAY',
    'MANAGE_OWN_PROFILE',
    'TRADE_ECONOMY',
    'VIEW_LEADERBOARDS',
    'MANAGE_PLAYERS',
    'SUSPEND_PLAYERS',
    'MANAGE_ECONOMY',
    'SCHEDULE_EVENTS',
    'VIEW_AUDIT_LOGS',
    'INVITE_ADMINS',
    'MANAGE_ADMIN_ROLES',
    'SYSTEM_CONFIGURATION',
  ],
};

export class AuthorizationService {
  /**
   * Check if a role possesses a specific permission
   */
  static hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Get all permissions granted to a role
   */
  static getPermissions(role: UserRole): Permission[] {
    return [...(ROLE_PERMISSIONS[role] || [])];
  }

  /**
   * Protect Superadmin from unauthorized role modification
   */
  static assertRoleChangeAllowed(actor: User, target: User, desiredRole: UserRole): void {
    if (target.isProtected || target.role === 'SUPERADMIN') {
      throw new AppError(
        'FORBIDDEN: The primary Superadmin account is immutable and protected from role modification or demotion.',
        403
      );
    }

    if (actor.role !== 'SUPERADMIN') {
      throw new AppError(
        'FORBIDDEN: Only the Superadmin can modify staff or administrative roles.',
        403
      );
    }

    if (desiredRole === 'SUPERADMIN') {
      throw new AppError(
        'FORBIDDEN: Cannot assign secondary SUPERADMIN roles. Only the initial Superadmin holds this role.',
        403
      );
    }
  }

  /**
   * Protect Superadmin from suspension or banning
   */
  static assertStatusChangeAllowed(actor: User, target: User, desiredStatus: AccountStatus): void {
    if (target.isProtected || target.role === 'SUPERADMIN') {
      if (desiredStatus === 'SUSPENDED' || desiredStatus === 'BANNED') {
        throw new AppError(
          'FORBIDDEN: The primary Superadmin account is immutable and cannot be suspended or banned.',
          403
        );
      }
    }

    if (actor.id === target.id && desiredStatus === 'SUSPENDED') {
      throw new AppError('Cannot suspend your own account.', 400);
    }
  }
}
