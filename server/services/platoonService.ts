/**
 * Corper Wee: Platoon & Leaderboard Management Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { Platoon } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export class PlatoonService {
  /**
   * List all platoons with rankings
   */
  static listPlatoons(campId = 1) {
    return Array.from(db.platoons.values())
      .filter((p) => p.campId === campId)
      .sort((a, b) => a.number - b.number);
  }

  /**
   * Get Platoon details and roster
   */
  static getPlatoonDetails(platoonId: number) {
    const platoon = db.platoons.get(platoonId);
    if (!platoon) {
      throw new AppError(`Platoon #${platoonId} not found.`, 404);
    }

    // Retrieve active platoon members
    const members: any[] = [];
    for (const [userId, profile] of db.playerProfiles.entries()) {
      if (profile.platoonId === platoonId) {
        const user = db.users.get(userId);
        const character = db.playerCharacters.get(userId);
        if (user && user.status === 'ACTIVE') {
          members.push({
            userId,
            displayName: user.displayName,
            stateCode: user.stateCode || 'Pending',
            campNickname: profile.campNickname || 'Corper',
            paradeRank: profile.paradeRank,
            level: profile.level,
            experiencePoints: profile.experiencePoints,
            charismaScore: profile.charismaScore,
            gender: character?.gender || 'MALE',
            uniformType: character?.uniformType || 'khaki_7_7',
          });
        }
      }
    }

    return {
      platoon,
      totalMembers: members.length,
      members: members.sort((a, b) => b.experiencePoints - a.experiencePoints),
    };
  }

  /**
   * Get Live Platoon Leaderboard
   */
  static getLeaderboard(campId = 1) {
    const sorted = Array.from(db.platoons.values())
      .filter((p) => p.campId === campId)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const leaderPoints = sorted[0]?.totalPoints || 0;

    return sorted.map((platoon, index) => {
      const rank = index + 1;
      return {
        rank,
        platoonId: platoon.id,
        number: platoon.number,
        name: platoon.name,
        colorHex: platoon.colorHex,
        motto: platoon.motto,
        totalPoints: platoon.totalPoints,
        memberCount: platoon.memberCount,
        pointGap: leaderPoints - platoon.totalPoints,
        isChampion: rank === 1,
        isTopThree: rank <= 3,
      };
    });
  }

  /**
   * Admin: Create a new platoon
   */
  static createPlatoon(
    actorUserId: string,
    campId: number,
    number: number,
    name: string,
    colorHex: string,
    motto: string
  ) {
    for (const p of db.platoons.values()) {
      if (p.campId === campId && p.number === number) {
        throw new AppError(`Platoon #${number} already exists in camp #${campId}.`, 409);
      }
    }

    const nextId = db.platoons.size + 1;
    const newPlatoon: Platoon = {
      id: nextId,
      campId,
      number,
      name,
      colorHex,
      motto,
      totalPoints: 0,
      memberCount: 0,
    };
    db.platoons.set(newPlatoon.id, newPlatoon);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'PLATOON_CREATED',
      targetEntity: 'PLATOON',
      targetId: String(newPlatoon.id),
      metadata: { number, name, colorHex, motto },
      createdAt: new Date().toISOString(),
    });

    return newPlatoon;
  }

  /**
   * Admin: Update platoon configuration
   */
  static updatePlatoon(
    actorUserId: string,
    platoonId: number,
    updates: Partial<Pick<Platoon, 'name' | 'colorHex' | 'motto'>>
  ) {
    const platoon = db.platoons.get(platoonId);
    if (!platoon) {
      throw new AppError(`Platoon #${platoonId} not found.`, 404);
    }

    if (updates.name) platoon.name = updates.name;
    if (updates.colorHex) platoon.colorHex = updates.colorHex;
    if (updates.motto) platoon.motto = updates.motto;

    db.platoons.set(platoonId, platoon);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'PLATOON_UPDATED',
      targetEntity: 'PLATOON',
      targetId: String(platoonId),
      metadata: updates,
      createdAt: new Date().toISOString(),
    });

    return platoon;
  }

  /**
   * Admin: Move player between platoons
   */
  static reassignPlayerPlatoon(actorUserId: string, targetUserId: string, newPlatoonId: number) {
    const profile = db.playerProfiles.get(targetUserId);
    const targetUser = db.users.get(targetUserId);
    if (!profile || !targetUser) {
      throw new AppError('Player profile not found.', 404);
    }

    const newPlatoon = db.platoons.get(newPlatoonId);
    if (!newPlatoon) {
      throw new AppError(`Target Platoon #${newPlatoonId} does not exist.`, 404);
    }

    const oldPlatoonId = profile.platoonId;
    if (oldPlatoonId === newPlatoonId) {
      return { targetUserId, platoonId: newPlatoonId, message: 'Already assigned to this platoon.' };
    }

    // Decrement old platoon member count
    const oldPlatoon = db.platoons.get(oldPlatoonId);
    if (oldPlatoon && oldPlatoon.memberCount > 0) {
      oldPlatoon.memberCount -= 1;
      db.platoons.set(oldPlatoonId, oldPlatoon);
    }

    // Increment new platoon member count
    newPlatoon.memberCount += 1;
    db.platoons.set(newPlatoonId, newPlatoon);

    profile.platoonId = newPlatoonId;
    profile.updatedAt = new Date().toISOString();
    db.playerProfiles.set(targetUserId, profile);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'PLAYER_PLATOON_REASSIGNED',
      targetEntity: 'PLAYER_PROFILE',
      targetId: targetUserId,
      metadata: { targetEmail: targetUser.email, oldPlatoonId, newPlatoonId },
      createdAt: new Date().toISOString(),
    });

    return {
      targetUserId,
      targetEmail: targetUser.email,
      oldPlatoonId,
      newPlatoonId,
      newPlatoonName: newPlatoon.name,
    };
  }
}
