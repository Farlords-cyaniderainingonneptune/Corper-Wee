/**
 * Corper Wee: Admin & Superadmin Operations Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { User, AdminInvitation, AuditLog, UserRole } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthorizationService } from './authorizationService.js';

export class AdminService {
  /**
   * Get Admin Dashboard Telemetry
   */
  static getDashboardMetrics() {
    let totalPlayers = 0;
    let activePlayers = 0;
    let suspendedPlayers = 0;
    let totalAdmins = 0;

    for (const u of db.users.values()) {
      if (u.role === 'PLAYER') totalPlayers += 1;
      if (u.role === 'ADMIN' || u.role === 'SUPERADMIN') totalAdmins += 1;
      if (u.status === 'ACTIVE') activePlayers += 1;
      if (u.status === 'SUSPENDED') suspendedPlayers += 1;
    }

    const platoons = Array.from(db.platoons.values()).sort((a, b) => b.totalPoints - a.totalPoints);
    const recentActivitySessions = db.activitySessions.slice(-15).reverse();
    const recentAuditLogs = db.auditLogs.slice(-20).reverse();
    const rateSetting = db.gameSettings.get('cp_to_naira_rate');

    return {
      telemetry: {
        totalRegisteredCorpers: db.users.size,
        activePlayers,
        suspendedPlayers,
        totalAdmins,
        totalPlatoons: platoons.length,
        totalMarketProducts: db.products.size,
        conversionRate: rateSetting?.value || { cp: 10, naira: 100 },
      },
      platoonStandings: platoons,
      recentActivitySessions,
      recentAuditLogs,
    };
  }

  /**
   * Search and filter corpers
   */
  static listPlayers(query = '', platoonId?: number) {
    const list: any[] = [];
    const q = query.toLowerCase().trim();

    for (const u of db.users.values()) {
      const profile = db.playerProfiles.get(u.id);
      const wallet = db.wallets.get(u.id);
      const water = db.waterMeters.get(u.id);
      const platoon = profile?.platoonId ? db.platoons.get(profile.platoonId) : undefined;

      if (platoonId && profile?.platoonId !== platoonId) {
        continue;
      }

      if (
        !q ||
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.stateCode && u.stateCode.toLowerCase().includes(q))
      ) {
        list.push({
          id: u.id,
          displayName: u.displayName,
          email: u.email,
          stateCode: u.stateCode || 'Pending Onboarding',
          role: u.role,
          status: u.status,
          isProtected: u.isProtected,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name } : null,
          wallet: {
            corperPoints: wallet?.corperPoints || 0,
            virtualNaira: wallet?.virtualNaira || 0,
          },
          waterLevel: water?.currentLevel || 100,
          level: profile?.level || 1,
          paradeRank: profile?.paradeRank || 'Recruit Corper',
        });
      }
    }

    return list;
  }

  /**
   * Suspend / Reactivate a player
   */
  static setPlayerStatus(actorUserId: string, targetUserId: string, newStatus: 'ACTIVE' | 'SUSPENDED') {
    const targetUser = db.users.get(targetUserId);
    if (!targetUser) {
      throw new AppError('Target player not found.', 404);
    }

    // Guard using AuthorizationService
    const actor = db.users.get(actorUserId) || {
      id: actorUserId,
      role: 'SUPERADMIN' as const,
      isProtected: true,
      status: 'ACTIVE' as const,
      email: '',
      displayName: '',
      createdAt: '',
      updatedAt: '',
      googleSub: '',
    };
    AuthorizationService.assertStatusChangeAllowed(actor, targetUser, newStatus);

    const oldStatus = targetUser.status;
    targetUser.status = newStatus;
    targetUser.updatedAt = new Date().toISOString();
    db.users.set(targetUserId, targetUser);

    // Invalidate refresh tokens if suspended
    if (newStatus === 'SUSPENDED') {
      for (const [hash, token] of db.refreshTokens.entries()) {
        if (token.userId === targetUserId) {
          token.isRevoked = true;
          db.refreshTokens.set(hash, token);
        }
      }
    }

    // Audit log
    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: `PLAYER_${newStatus}`,
      targetEntity: 'USER',
      targetId: targetUserId,
      metadata: { targetEmail: targetUser.email, stateCode: targetUser.stateCode, oldStatus, newStatus },
      createdAt: new Date().toISOString(),
    });

    return {
      userId: targetUserId,
      email: targetUser.email,
      status: targetUser.status,
    };
  }

  /**
   * Set user role (Superadmin only, protected against modifying Superadmin)
   */
  static setPlayerRole(actorUserId: string, targetUserId: string, newRole: UserRole) {
    const targetUser = db.users.get(targetUserId);
    if (!targetUser) throw new AppError('Target player not found.', 404);

    const actor = db.users.get(actorUserId) || {
      id: actorUserId,
      role: 'ADMIN' as const,
      isProtected: false,
      status: 'ACTIVE' as const,
      email: 'staff@camp.gov.ng',
      displayName: 'Staff Officer',
      createdAt: '',
      updatedAt: '',
      googleSub: '',
    };

    AuthorizationService.assertRoleChangeAllowed(actor, targetUser, newRole);

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    targetUser.updatedAt = new Date().toISOString();
    db.users.set(targetUserId, targetUser);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'USER_ROLE_CHANGED',
      targetEntity: 'USER',
      targetId: targetUserId,
      metadata: { targetEmail: targetUser.email, oldRole, newRole },
      createdAt: new Date().toISOString(),
    });

    return {
      userId: targetUserId,
      email: targetUser.email,
      role: targetUser.role,
    };
  }

  /**
   * Superadmin Only: Generate single-use Admin Invitation Token
   */
  static createAdminInvitation(actorUserId: string, inviteeEmail: string, assignedRole: UserRole = 'ADMIN') {
    const actor = db.users.get(actorUserId);
    if (!actor || actor.role !== 'SUPERADMIN') {
      throw new AppError('Only the Superadmin can issue administrator invitations.', 403);
    }

    const token = 'invite_' + uuidv4().replace(/-/g, '');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    const invitation: AdminInvitation = {
      id: uuidv4(),
      email: inviteeEmail.toLowerCase().trim(),
      token,
      invitedByUserId: actorUserId,
      assignedRole,
      isConsumed: false,
      expiresAt,
      createdAt: now.toISOString(),
    };

    db.adminInvitations.set(token, invitation);

    // Audit log
    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'ADMIN_INVITATION_CREATED',
      targetEntity: 'ADMIN_INVITATION',
      targetId: invitation.id,
      metadata: { inviteeEmail: invitation.email, assignedRole, expiresAt },
      createdAt: now.toISOString(),
    });

    return {
      invitationId: invitation.id,
      email: invitation.email,
      token: invitation.token,
      assignedRole: invitation.assignedRole,
      expiresAt: invitation.expiresAt,
      invitationUrl: `/admin/join?token=${token}`,
    };
  }

  /**
   * Update CP-to-Naira conversion rate
   */
  static updateConversionRate(actorUserId: string, cp: number, naira: number) {
    if (cp <= 0 || naira <= 0) {
      throw new AppError('Conversion rate values must be strictly greater than 0.', 400);
    }

    const now = new Date().toISOString();
    const newValue = { cp, naira };

    db.gameSettings.set('cp_to_naira_rate', {
      key: 'cp_to_naira_rate',
      value: newValue,
      description: 'Corper Points to Virtual Naira conversion rate',
      updatedAt: now,
    });

    // Audit log
    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'UPDATE_CONVERSION_RATE',
      targetEntity: 'GAME_SETTINGS',
      targetId: 'cp_to_naira_rate',
      metadata: { newRate: newValue },
      createdAt: now,
    });

    return newValue;
  }

  /**
   * Superadmin Only: Get full audit logs
   */
  static getAuditLogs(limit = 100) {
    return db.auditLogs.slice(-limit).reverse();
  }
}
