/**
 * Corper Wee: Admin & Superadmin Operations Service
 */
import { randomUUID as uuidv4, timingSafeEqual } from 'crypto';
import { db } from '../db/index.js';
import type { User, AdminInvitation, UserRole, Permission, InvitationStatus } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthorizationService, ADMIN_ASSIGNABLE_PERMISSIONS, ROLE_PERMISSIONS } from './authorizationService.js';
import { AuthService, STATE_CODE_REGEX } from './authService.js';
import { signAccessToken, createRefreshToken } from '../middleware/auth.js';

export interface GameConfigPayload {
  conversionRate?: { cp: number; naira: number };
  paradeRewards?: {
    baseCpPerCommand: number;
    tier1AccuracyMin: number;
    tier1Multiplier: number;
    tier2AccuracyMin: number;
    tier2Multiplier: number;
    charismaGainThreshold: number;
  };
  canteenRewards?: {
    cpPerObstacle: number;
    puddlePenaltyCp: number;
    speedBonusCutoffSec: number;
    speedBonusMultiplier: number;
    minRewardCp: number;
    waterDrainAmount: number;
  };
  stealthConfig?: {
    cpPerSecondSurvived: number;
    maxSurvivalCp: number;
    caughtPenaltyCp: number;
  };
  hydrationDrain?: {
    idlePerSec: number;
    runPerSec: number;
    criticalThreshold: number;
  };
}

export class AdminService {
  /**
   * Get Admin Dashboard Telemetry
   */
  static getDashboardMetrics() {
    let totalPlayers = 0;
    let activePlayers = 0;
    let suspendedPlayers = 0;
    let deletedPlayers = 0;
    let totalAdmins = 0;
    let totalPointsInCirculation = 0;
    let totalNairaInCirculation = 0;

    for (const u of db.users.values()) {
      if (u.role === 'PLAYER') totalPlayers += 1;
      if (u.role === 'ADMIN' || u.role === 'SUPERADMIN') totalAdmins += 1;
      if (u.status === 'ACTIVE') activePlayers += 1;
      if (u.status === 'SUSPENDED') suspendedPlayers += 1;
      if (u.status === 'DELETED') deletedPlayers += 1;
    }

    for (const w of db.wallets.values()) {
      totalPointsInCirculation += w.corperPoints;
      totalNairaInCirculation += w.virtualNaira;
    }

    const platoons = Array.from(db.platoons.values()).sort((a, b) => b.totalPoints - a.totalPoints);
    const recentActivitySessions = db.activitySessions.slice(-15).reverse().map((s) => {
      const u = db.users.get(s.userId);
      return {
        ...s,
        userDisplayName: u?.displayName || 'Corper',
        userStateCode: u?.stateCode || '—',
      };
    });
    const recentAuditLogs = this.getAuditLogs(20);
    const rateSetting = db.gameSettings.get('cp_to_naira_rate');
    const activeEvents = Array.from(db.events.values()).filter((e) => e.status === 'SCHEDULED' || e.status === 'IN_PROGRESS').length;
    const activeLocations = Array.from(db.locations.values()).filter((l) => !l.isDeleted && l.isActive).length;
    const pendingReports = db.userReports.filter((r) => r.status === 'PENDING').length;

    return {
      telemetry: {
        totalRegisteredCorpers: db.users.size,
        totalPlayers,
        activePlayers,
        suspendedPlayers,
        deletedPlayers,
        totalAdmins,
        totalPlatoons: platoons.length,
        totalMarketProducts: db.products.size,
        activeEvents,
        activeLocations,
        pendingReports,
        totalActivitySessions: db.activitySessions.length,
        totalPointsInCirculation,
        totalNairaInCirculation: +totalNairaInCirculation.toFixed(2),
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
  static listPlayers(query = '', platoonId?: number, statusFilter?: string) {
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

      if (statusFilter && statusFilter !== 'ALL' && u.status !== statusFilter) {
        continue;
      }

      if (
        !q ||
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.stateCode && u.stateCode.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
      ) {
        list.push({
          id: u.id,
          displayName: u.displayName,
          email: u.email,
          stateCode: u.stateCode || (u.status === 'DELETED' ? 'Redacted' : 'Pending Onboarding'),
          role: u.role,
          status: u.status,
          isProtected: u.isProtected,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          deletedAt: u.deletedAt,
          retentionUntil: u.retentionUntil,
          platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name, colorHex: platoon.colorHex } : null,
          wallet: {
            corperPoints: wallet?.corperPoints || 0,
            virtualNaira: wallet?.virtualNaira || 0,
          },
          waterLevel: water?.currentLevel ?? 100,
          level: profile?.level || 1,
          experiencePoints: profile?.experiencePoints || 0,
          charismaScore: profile?.charismaScore || 0,
          totalParadesCompleted: profile?.totalParadesCompleted || 0,
          paradeRank: profile?.paradeRank || 'Recruit Corper',
        });
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Detailed single-user profile, gameplay statistics, wallet & activity history (Prompt 21)
   */
  static getPlayerDetails(targetUserId: string) {
    const user = db.users.get(targetUserId);
    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    const profile = db.playerProfiles.get(targetUserId) || null;
    const platoon = profile?.platoonId ? db.platoons.get(profile.platoonId) || null : null;
    const character = db.playerCharacters.get(targetUserId) || null;
    const wallet = db.wallets.get(targetUserId) || {
      userId: targetUserId,
      corperPoints: 0,
      virtualNaira: 0,
      updatedAt: user.updatedAt,
    };
    const water = db.waterMeters.get(targetUserId) || {
      userId: targetUserId,
      currentLevel: 100,
      lastDepletedAt: user.updatedAt,
      updatedAt: user.updatedAt,
    };

    const userSessions = db.activitySessions
      .filter((s) => s.userId === targetUserId)
      .slice()
      .reverse();

    const totalSessions = userSessions.length;
    const paradeCount = userSessions.filter((s) => s.activitySlug.includes('parade')).length;
    const canteenCount = userSessions.filter((s) => s.activitySlug.includes('canteen')).length;
    const stealthCount = userSessions.filter((s) => s.activitySlug.includes('stealth')).length;
    const avgAccuracy =
      totalSessions > 0
        ? +(userSessions.reduce((sum, s) => sum + s.accuracyPercentage, 0) / totalSessions).toFixed(1)
        : 0;
    const totalPointsEarned = userSessions.reduce((sum, s) => sum + Math.max(0, s.pointsAwarded), 0);
    const highestScore = userSessions.reduce((max, s) => Math.max(max, s.score), 0);

    const pointTransactions = db.pointTransactions
      .filter((t) => t.userId === targetUserId)
      .slice(-50)
      .reverse();

    const walletTransactions = db.walletTransactions
      .filter((t) => t.userId === targetUserId)
      .slice(-50)
      .reverse();

    const reports = db.userReports
      .filter((r) => r.reportedUserId === targetUserId || r.reporterUserId === targetUserId)
      .slice()
      .reverse();

    const auditTrail = db.auditLogs
      .filter((l) => l.targetId === targetUserId || l.actorUserId === targetUserId)
      .slice(-30)
      .reverse();

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        stateCode: user.stateCode || null,
        role: user.role,
        status: user.status,
        isProtected: user.isProtected,
        permissions: AuthorizationService.getEffectivePermissions(user),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || null,
        deletedAt: user.deletedAt || null,
        retentionUntil: user.retentionUntil || null,
      },
      profile: profile
        ? {
            ...profile,
            platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name, colorHex: platoon.colorHex } : null,
          }
        : null,
      character,
      wallet,
      water,
      gameplayStats: {
        totalSessions,
        paradeCount,
        canteenCount,
        stealthCount,
        avgAccuracy,
        totalPointsEarned,
        highestScore,
      },
      activitySessions: userSessions.slice(0, 50),
      pointTransactions,
      walletTransactions,
      reports,
      auditTrail,
    };
  }

  /**
   * Suspend / Reactivate a player or admin
   */
  static setPlayerStatus(
    actorUserId: string,
    targetUserId: string,
    newStatus: 'ACTIVE' | 'SUSPENDED',
    reason?: string
  ) {
    const targetUser = db.users.get(targetUserId);
    if (!targetUser) {
      throw new AppError('Target player not found.', 404);
    }

    if (targetUser.status === 'DELETED') {
      throw new AppError('Cannot change status of an account already deleted under retention policy.', 400);
    }

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

    if (newStatus === 'SUSPENDED') {
      for (const [hash, token] of db.refreshTokens.entries()) {
        if (token.userId === targetUserId) {
          token.isRevoked = true;
          db.refreshTokens.set(hash, token);
        }
      }
    }

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: newStatus === 'ACTIVE' ? 'PLAYER_REACTIVATED' : 'PLAYER_SUSPENDED',
      targetEntity: 'USER',
      targetId: targetUserId,
      metadata: {
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        stateCode: targetUser.stateCode,
        oldStatus,
        newStatus,
        reason: reason || (newStatus === 'SUSPENDED' ? 'Suspended by camp administration' : 'Reactivated by camp administration'),
      },
      createdAt: new Date().toISOString(),
    });

    return {
      userId: targetUserId,
      email: targetUser.email,
      status: targetUser.status,
    };
  }

  /**
   * Retention-policy account deletion (Prompt 21)
   */
  static deletePlayerWithRetention(actorUserId: string, targetUserId: string, reason?: string) {
    const targetUser = db.users.get(targetUserId);
    if (!targetUser) {
      throw new AppError('Target user account not found.', 404);
    }

    if (targetUser.status === 'DELETED') {
      throw new AppError('This account has already been deleted under retention policy.', 400);
    }

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

    AuthorizationService.assertDeleteAllowed(actor, targetUser);

    const now = new Date();
    const retentionUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const formerEmail = targetUser.email;
    const formerStateCode = targetUser.stateCode;

    const profile = db.playerProfiles.get(targetUserId);
    if (profile?.platoonId) {
      const platoon = db.platoons.get(profile.platoonId);
      if (platoon && platoon.memberCount > 0) {
        platoon.memberCount -= 1;
        db.platoons.set(platoon.id, platoon);
      }
      profile.campNickname = 'Redacted Corper';
      profile.updatedAt = now.toISOString();
      db.playerProfiles.set(targetUserId, profile);
    }

    targetUser.displayName = 'Deleted Account';
    targetUser.email = `deleted_${targetUserId.slice(0, 8)}@anonymized.local`;
    targetUser.stateCode = undefined;
    targetUser.avatarUrl = undefined;
    targetUser.status = 'DELETED';
    targetUser.deletedAt = now.toISOString();
    targetUser.retentionUntil = retentionUntil;
    targetUser.updatedAt = now.toISOString();
    db.users.set(targetUserId, targetUser);

    for (const [hash, token] of db.refreshTokens.entries()) {
      if (token.userId === targetUserId) {
        token.isRevoked = true;
        db.refreshTokens.set(hash, token);
      }
    }

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'PLAYER_DELETED_RETENTION',
      targetEntity: 'USER',
      targetId: targetUserId,
      metadata: {
        formerEmail,
        formerStateCode,
        anonymizedEmail: targetUser.email,
        retentionDays: 90,
        retentionUntil,
        ledgerPreserved: true,
        reason: reason || 'Administrative retention deletion',
      },
      createdAt: now.toISOString(),
    });

    return {
      userId: targetUserId,
      status: targetUser.status,
      anonymizedEmail: targetUser.email,
      deletedAt: targetUser.deletedAt,
      retentionUntil: targetUser.retentionUntil,
      message: 'Account PII anonymized and scheduled under 90-day retention policy. Financial & activity ledgers preserved.',
    };
  }

  /**
   * Set user role (Superadmin only, protected against modifying Superadmin)
   */
  static setPlayerRole(actorUserId: string, targetUserId: string, newRole: UserRole) {
    const targetUser = db.users.get(targetUserId);
    if (!targetUser) throw new AppError('Target player not found.', 404);
    if (targetUser.status === 'DELETED') {
      throw new AppError('Cannot change role of a deleted account.', 400);
    }

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
    if (newRole === 'PLAYER') {
      targetUser.customPermissions = undefined;
    } else if (newRole === 'ADMIN' && !targetUser.customPermissions) {
      targetUser.customPermissions = [...ADMIN_ASSIGNABLE_PERMISSIONS];
    }
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
   * Superadmin Only: Assign granular permissions to an Admin account (Prompt 23)
   */
  static setAdminPermissions(actorUserId: string, targetUserId: string, permissions: Permission[]) {
    const targetUser = db.users.get(targetUserId);
    if (!targetUser) {
      throw new AppError('Target administrator account not found.', 404);
    }

    const actor = db.users.get(actorUserId);
    if (!actor) {
      throw new AppError('Actor account not found.', 401);
    }

    AuthorizationService.assertPermissionChangeAllowed(actor, targetUser);

    const sanitized = permissions.filter((p) => ADMIN_ASSIGNABLE_PERMISSIONS.includes(p));
    targetUser.customPermissions = sanitized;
    targetUser.updatedAt = new Date().toISOString();
    db.users.set(targetUserId, targetUser);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'ADMIN_PERMISSIONS_UPDATED',
      targetEntity: 'USER',
      targetId: targetUserId,
      metadata: { targetEmail: targetUser.email, assignedPermissions: sanitized },
      createdAt: targetUser.updatedAt,
    });

    return {
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      permissions: AuthorizationService.getEffectivePermissions(targetUser),
    };
  }

  /**
   * Activity Monitoring & Moderation Feed (Prompt 20)
   */
  static getActivityMonitoring() {
    const allSessions = db.activitySessions.slice().reverse();
    const totalSessions = allSessions.length;
    const paradeSessions = allSessions.filter((s) => s.activitySlug.includes('parade')).length;
    const canteenSessions = allSessions.filter((s) => s.activitySlug.includes('canteen')).length;
    const stealthSessions = allSessions.filter((s) => s.activitySlug.includes('stealth')).length;
    const avgAccuracy =
      totalSessions > 0
        ? +(allSessions.reduce((acc, s) => acc + s.accuracyPercentage, 0) / totalSessions).toFixed(1)
        : 0;

    const sessions = allSessions.slice(0, 100).map((s) => {
      const user = db.users.get(s.userId);
      const profile = db.playerProfiles.get(s.userId);
      return {
        ...s,
        userDisplayName: user?.displayName || 'Unknown Corper',
        userEmail: user?.email || '—',
        userStateCode: user?.stateCode || '—',
        platoonId: profile?.platoonId || null,
      };
    });

    const reports = db.userReports
      .slice()
      .reverse()
      .map((r) => {
        const reporter = db.users.get(r.reporterUserId);
        const reported = db.users.get(r.reportedUserId);
        return {
          ...r,
          reporterName: reporter?.displayName || 'Unknown',
          reporterStateCode: reporter?.stateCode || '—',
          reportedName: reported?.displayName || 'Unknown',
          reportedEmail: reported?.email || '—',
          reportedStateCode: reported?.stateCode || '—',
          reportedStatus: reported?.status || 'UNKNOWN',
        };
      });

    return {
      summary: {
        totalSessions,
        paradeSessions,
        canteenSessions,
        stealthSessions,
        avgAccuracy,
        pendingReports: reports.filter((r) => r.status === 'PENDING').length,
      },
      sessions,
      reports,
    };
  }

  /**
   * Resolve or Dismiss a Player Report
   */
  static resolveUserReport(
    actorUserId: string,
    reportId: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolutionNote?: string
  ) {
    const report = db.userReports.find((r) => r.id === reportId);
    if (!report) {
      throw new AppError('User report not found.', 404);
    }

    const now = new Date().toISOString();
    report.status = status;
    report.resolvedAt = now;
    report.resolvedByUserId = actorUserId;
    report.resolutionNote = resolutionNote;

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: `USER_REPORT_${status}`,
      targetEntity: 'USER_REPORT',
      targetId: reportId,
      metadata: { reportedUserId: report.reportedUserId, reason: report.reason, resolutionNote },
      createdAt: now,
    });

    return report;
  }

  /**
   * Superadmin Only: List Admin/Superadmin staff & issued invitations with computed status
   */
  static listStaffAndInvitations() {
    const staff: Array<{
      id: string;
      displayName: string;
      email: string;
      stateCode?: string;
      role: UserRole;
      status: string;
      isProtected: boolean;
      permissions: Permission[];
      lastLoginAt?: string;
      createdAt: string;
    }> = [];

    for (const u of db.users.values()) {
      if ((u.role === 'ADMIN' || u.role === 'SUPERADMIN') && u.status !== 'DELETED') {
        staff.push({
          id: u.id,
          displayName: u.displayName,
          email: u.email,
          stateCode: u.stateCode,
          role: u.role,
          status: u.status,
          isProtected: u.isProtected,
          permissions: AuthorizationService.getEffectivePermissions(u),
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        });
      }
    }

    const nowMs = Date.now();
    const invitations = Array.from(db.adminInvitations.values())
      .map((inv) => {
        let computedStatus: InvitationStatus = inv.status;
        if (computedStatus === 'PENDING' && new Date(inv.expiresAt).getTime() <= nowMs) {
          computedStatus = 'EXPIRED';
          inv.status = 'EXPIRED';
          db.adminInvitations.set(inv.token, inv);
        }
        return {
          ...inv,
          status: computedStatus,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      staff: staff.sort((a, b) => (a.role === 'SUPERADMIN' ? -1 : b.role === 'SUPERADMIN' ? 1 : 0)),
      invitations,
      assignablePermissions: ADMIN_ASSIGNABLE_PERMISSIONS,
    };
  }

  /**
   * Superadmin Only: Generate single-use Admin Invitation Token with permissions & expiration (Prompt 23)
   */
  static createAdminInvitation(
    actorUserId: string,
    inviteeEmail: string,
    assignedRole: UserRole = 'ADMIN',
    permissions?: Permission[],
    expiresInHours = 48
  ) {
    const actor = db.users.get(actorUserId);
    if (!actor || actor.role !== 'SUPERADMIN') {
      throw new AppError('Only the Superadmin can issue administrator invitations.', 403);
    }

    if (!inviteeEmail || typeof inviteeEmail !== 'string' || !inviteeEmail.includes('@')) {
      throw new AppError('A valid invitee email address is required.', 400);
    }

    if (assignedRole === 'SUPERADMIN') {
      throw new AppError('Cannot issue invitations for secondary SUPERADMIN roles.', 403);
    }

    const boundedHours = Math.max(1, Math.min(168, Math.round(expiresInHours)));
    const token = 'invite_' + uuidv4().replace(/-/g, '');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + boundedHours * 60 * 60 * 1000).toISOString();

    const grantedPermissions =
      assignedRole === 'ADMIN'
        ? permissions && permissions.length > 0
          ? permissions.filter((p) => ADMIN_ASSIGNABLE_PERMISSIONS.includes(p))
          : [...ADMIN_ASSIGNABLE_PERMISSIONS]
        : [...ROLE_PERMISSIONS.PLAYER];

    const invitation: AdminInvitation = {
      id: uuidv4(),
      email: inviteeEmail.toLowerCase().trim(),
      token,
      invitedByUserId: actorUserId,
      assignedRole,
      permissions: grantedPermissions,
      status: 'PENDING',
      isConsumed: false,
      expiresAt,
      createdAt: now.toISOString(),
    };

    db.adminInvitations.set(token, invitation);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'ADMIN_INVITATION_CREATED',
      targetEntity: 'ADMIN_INVITATION',
      targetId: invitation.id,
      metadata: {
        inviteeEmail: invitation.email,
        assignedRole,
        permissions: grantedPermissions,
        expiresAt,
      },
      createdAt: now.toISOString(),
    });

    return {
      invitationId: invitation.id,
      email: invitation.email,
      token: invitation.token,
      assignedRole: invitation.assignedRole,
      permissions: invitation.permissions,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      invitationUrl: `/admin/accept-invite?token=${token}`,
    };
  }

  /**
   * Superadmin Only: Revoke an active/pending Admin Invitation (Prompt 23)
   */
  static revokeAdminInvitation(actorUserId: string, invitationId: string, reason?: string) {
    const actor = db.users.get(actorUserId);
    if (!actor || actor.role !== 'SUPERADMIN') {
      throw new AppError('Only the Superadmin can revoke administrator invitations.', 403);
    }

    let found: AdminInvitation | undefined;
    for (const inv of db.adminInvitations.values()) {
      if (inv.id === invitationId) {
        found = inv;
        break;
      }
    }

    if (!found) {
      throw new AppError('Invitation record not found.', 404);
    }

    if (found.isConsumed || found.status === 'ACCEPTED') {
      throw new AppError('Cannot revoke an invitation that has already been accepted.', 400);
    }

    if (found.status === 'REVOKED') {
      return found;
    }

    const now = new Date().toISOString();
    found.status = 'REVOKED';
    found.revokedAt = now;
    found.revokedByUserId = actorUserId;
    found.revokeReason = reason || 'Revoked by Superadmin';
    db.adminInvitations.set(found.token, found);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'ADMIN_INVITATION_REVOKED',
      targetEntity: 'ADMIN_INVITATION',
      targetId: found.id,
      metadata: { inviteeEmail: found.email, reason: found.revokeReason },
      createdAt: now,
    });

    return found;
  }

  /**
   * Redeem & validate an Admin Invitation Token (Single-use, constant-time, email-bound, expiry-checked)
   */
  static async acceptAdminInvitation(rawToken: string, rawEmail: string, rawStateCode: string, fullName?: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new AppError('Invitation token is required.', 400);
    }
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new AppError('Email address is required.', 400);
    }
    if (!rawStateCode || typeof rawStateCode !== 'string') {
      throw new AppError('NYSC State Code is required.', 400);
    }

    const cleanToken = rawToken.trim();
    const email = rawEmail.trim().toLowerCase();
    const stateCode = rawStateCode.trim().toUpperCase();

    if (!STATE_CODE_REGEX.test(stateCode)) {
      throw new AppError('Invalid NYSC State Code format. Expected format like OY/26C/5439.', 422);
    }

    // Constant-time search across invitations
    let matched: AdminInvitation | undefined;
    const providedBuf = Buffer.from(cleanToken, 'utf8');
    for (const inv of db.adminInvitations.values()) {
      const targetBuf = Buffer.from(inv.token, 'utf8');
      if (providedBuf.length === targetBuf.length && timingSafeEqual(providedBuf, targetBuf)) {
        matched = inv;
        break;
      }
    }

    if (!matched) {
      throw new AppError('Invalid administrator invitation token.', 404);
    }

    if (matched.status === 'REVOKED') {
      throw new AppError('This administrator invitation has been revoked by the Superadmin.', 403);
    }

    if (matched.isConsumed || matched.status === 'ACCEPTED') {
      throw new AppError('Security notice: This single-use invitation token has already been redeemed.', 409);
    }

    if (new Date(matched.expiresAt).getTime() <= Date.now()) {
      matched.status = 'EXPIRED';
      db.adminInvitations.set(matched.token, matched);
      throw new AppError('This administrator invitation token has expired.', 410);
    }

    if (matched.email.toLowerCase() !== email) {
      throw new AppError('Invitation email mismatch: this token was issued for a different email address.', 403);
    }

    // Ensure account exists / registers with strict 1-to-1 email/stateCode uniqueness
    const authResult = await AuthService.authenticateWithEmailAndStateCode(email, stateCode, fullName);
    const user = db.users.get(authResult.user.id);
    if (!user) {
      throw new AppError('Failed to provision invited user account.', 500);
    }

    const now = new Date().toISOString();
    user.role = matched.assignedRole;
    if (matched.assignedRole === 'ADMIN') {
      user.customPermissions = [...matched.permissions];
    }
    user.updatedAt = now;
    db.users.set(user.id, user);

    // Burn token immediately
    matched.isConsumed = true;
    matched.status = 'ACCEPTED';
    matched.consumedAt = now;
    matched.consumedByUserId = user.id;
    db.adminInvitations.set(matched.token, matched);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId: user.id,
      action: 'ADMIN_INVITATION_ACCEPTED',
      targetEntity: 'ADMIN_INVITATION',
      targetId: matched.id,
      metadata: {
        email: user.email,
        assignedRole: user.role,
        permissions: AuthorizationService.getEffectivePermissions(user),
      },
      createdAt: now,
    });

    const accessToken = signAccessToken(user);
    const { rawToken: refreshToken } = createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        stateCode: user.stateCode,
        isProtected: user.isProtected,
        permissions: AuthorizationService.getEffectivePermissions(user),
      },
    };
  }

  /**
   * Read full live Game Configuration (Prompt 22)
   */
  static getGameConfiguration() {
    return {
      conversionRate: db.gameSettings.get('cp_to_naira_rate')?.value || { cp: 10, naira: 100 },
      paradeRewards: db.gameSettings.get('parade_rewards')?.value || {
        baseCpPerCommand: 15,
        tier1AccuracyMin: 90,
        tier1Multiplier: 1.5,
        tier2AccuracyMin: 70,
        tier2Multiplier: 1.2,
        charismaGainThreshold: 85,
      },
      canteenRewards: db.gameSettings.get('canteen_rewards')?.value || {
        cpPerObstacle: 10,
        puddlePenaltyCp: 5,
        speedBonusCutoffSec: 60,
        speedBonusMultiplier: 2,
        minRewardCp: 10,
        waterDrainAmount: 15,
      },
      stealthConfig: db.gameSettings.get('stealth_config')?.value || {
        cpPerSecondSurvived: 2,
        maxSurvivalCp: 100,
        caughtPenaltyCp: 15,
      },
      hydrationDrain: db.gameSettings.get('hydration_drain')?.value || {
        idlePerSec: 0.08,
        runPerSec: 0.25,
        criticalThreshold: 25,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Admin: Update live Game Configuration (Prompt 22) — reflects immediately without app release
   */
  static updateGameConfiguration(actorUserId: string, payload: GameConfigPayload) {
    const now = new Date().toISOString();
    const updatedKeys: string[] = [];

    if (payload.conversionRate) {
      const { cp, naira } = payload.conversionRate;
      if (cp <= 0 || naira <= 0) {
        throw new AppError('Conversion rate values must be strictly positive.', 400);
      }
      db.gameSettings.set('cp_to_naira_rate', {
        key: 'cp_to_naira_rate',
        value: { cp, naira },
        description: 'Corper Points to Virtual Naira conversion rate',
        updatedAt: now,
      });
      updatedKeys.push('cp_to_naira_rate');
    }

    if (payload.paradeRewards) {
      db.gameSettings.set('parade_rewards', {
        key: 'parade_rewards',
        value: payload.paradeRewards,
        description: 'Parade mini-game CP reward rates and accuracy multipliers',
        updatedAt: now,
      });
      updatedKeys.push('parade_rewards');
    }

    if (payload.canteenRewards) {
      db.gameSettings.set('canteen_rewards', {
        key: 'canteen_rewards',
        value: payload.canteenRewards,
        description: 'Canteen Rush rewards, puddle penalty, and stamina/water drain',
        updatedAt: now,
      });
      updatedKeys.push('canteen_rewards');
    }

    if (payload.stealthConfig) {
      db.gameSettings.set('stealth_config', {
        key: 'stealth_config',
        value: payload.stealthConfig,
        description: 'Soldier Evasion survival reward and capture penalty',
        updatedAt: now,
      });
      updatedKeys.push('stealth_config');
    }

    if (payload.hydrationDrain) {
      db.gameSettings.set('hydration_drain', {
        key: 'hydration_drain',
        value: payload.hydrationDrain,
        description: 'Water meter depletion speed per second and critical threshold',
        updatedAt: now,
      });
      updatedKeys.push('hydration_drain');
    }

    if (updatedKeys.length > 0) {
      db.auditLogs.push({
        id: uuidv4(),
        actorUserId,
        action: 'GAME_CONFIG_UPDATED',
        targetEntity: 'GAME_SETTINGS',
        targetId: updatedKeys.join(','),
        metadata: payload as Record<string, unknown>,
        createdAt: now,
      });
    }

    return this.getGameConfiguration();
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
   * Superadmin / Admin: Get audit logs enriched with actor info
   */
  static getAuditLogs(limit = 100) {
    return db.auditLogs
      .slice(-limit)
      .reverse()
      .map((log) => {
        const actor = db.users.get(log.actorUserId);
        return {
          ...log,
          actorEmail: actor?.email || log.actorUserId,
          actorDisplayName: actor?.displayName || 'System',
        };
      });
  }
}
