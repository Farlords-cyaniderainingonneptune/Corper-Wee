/**
 * Corper Wee: Authorization & Granular Permissions System
 */
import type { User, UserRole, Permission, AccountStatus } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export const ADMIN_ASSIGNABLE_PERMISSIONS: Permission[] = [
  'MANAGE_PLAYERS',
  'SUSPEND_PLAYERS',
  'MANAGE_ECONOMY',
  'SCHEDULE_EVENTS',
  'VIEW_AUDIT_LOGS',
];

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
   * Check effective permission for a specific user (respecting Superadmin-assigned customPermissions for ADMINs)
   */
  static hasPermissionForUser(user: User, permission: Permission): boolean {
    if (user.status !== 'ACTIVE') return false;
    if (user.role === 'SUPERADMIN') return true;
    if (user.role === 'ADMIN' && Array.isArray(user.customPermissions)) {
      const basePlayer = ROLE_PERMISSIONS.PLAYER;
      return basePlayer.includes(permission) || user.customPermissions.includes(permission);
    }
    return this.hasPermission(user.role, permission);
  }

  /**
   * Get all effective permissions granted to a user
   */
  static getEffectivePermissions(user: User): Permission[] {
    if (user.role === 'SUPERADMIN') return [...ROLE_PERMISSIONS.SUPERADMIN];
    if (user.role === 'ADMIN' && Array.isArray(user.customPermissions)) {
      return Array.from(new Set([...ROLE_PERMISSIONS.PLAYER, ...user.customPermissions]));
    }
    return [...(ROLE_PERMISSIONS[user.role] || [])];
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
   * Protect Superadmin from unauthorized permission modification
   */
  static assertPermissionChangeAllowed(actor: User, target: User): void {
    if (actor.role !== 'SUPERADMIN') {
      throw new AppError('FORBIDDEN: Only the Superadmin can modify administrator permissions.', 403);
    }
    if (target.isProtected || target.role === 'SUPERADMIN') {
      throw new AppError('FORBIDDEN: The primary Superadmin permissions are immutable.', 403);
    }
    if (target.role !== 'ADMIN') {
      throw new AppError('Granular admin permissions can only be configured for ADMIN accounts.', 400);
    }
  }

  /**
   * Protect Superadmin from suspension, banning, or deletion
   */
  static assertStatusChangeAllowed(actor: User, target: User, desiredStatus: AccountStatus): void {
    if (target.isProtected || target.role === 'SUPERADMIN') {
      if (desiredStatus === 'SUSPENDED' || desiredStatus === 'BANNED' || desiredStatus === 'DELETED') {
        throw new AppError(
          'FORBIDDEN: The primary Superadmin account is immutable and cannot be suspended, banned, or deleted.',
          403
        );
      }
    }

    if (actor.id === target.id && (desiredStatus === 'SUSPENDED' || desiredStatus === 'DELETED')) {
      throw new AppError('Cannot suspend or delete your own account.', 400);
    }
  }

  /**
   * Protect Superadmin and current actor from account deletion
   */
  static assertDeleteAllowed(actor: User, target: User): void {
    if (target.isProtected || target.role === 'SUPERADMIN') {
      throw new AppError(
        'FORBIDDEN: The primary Superadmin account is immutable and cannot be deleted.',
        403
      );
    }

    if (actor.id === target.id) {
      throw new AppError('Cannot delete your own active administrative account.', 400);
    }
  }
}
