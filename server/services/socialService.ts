/**
 * Corper Wee: Charisma & Social Interaction Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { InteractionOutcome } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export class SocialService {
  /**
   * Process a charisma interaction between corps members
   */
  static processInteraction(
    initiatorUserId: string,
    targetUserId: string,
    interactionType: string
  ) {
    if (initiatorUserId === targetUserId) {
      throw new AppError('You cannot test your charisma on yourself, corper!', 400);
    }

    const initiatorProfile = db.playerProfiles.get(initiatorUserId);
    const targetUser = db.users.get(targetUserId);

    if (!initiatorProfile) {
      throw new AppError('Initiator corper profile not found.', 404);
    }

    const charisma = initiatorProfile.charismaScore;
    // Probabilistic roll based on charisma score
    const roll = Math.random() * 100;
    let outcome: InteractionOutcome;
    let dialogue = '';
    let reactionAnimation = '';
    let charismaDelta = 0;

    if (roll < charisma * 0.7) {
      outcome = 'GREAT_SUCCESS';
      dialogue = 'Hahaha! O boy, you be real vibe! Let us exchange contacts, Platoon mate!';
      reactionAnimation = 'CHEER_AND_HIGH_FIVE';
      charismaDelta = 2;
    } else if (roll < charisma) {
      outcome = 'MILD_SUCCESS';
      dialogue = 'Hehe, sharp corper! Respect.';
      reactionAnimation = 'THUMBS_UP';
      charismaDelta = 1;
    } else if (roll < 85) {
      outcome = 'REJECTED';
      dialogue = 'Abeg shift jare, sun too hot for this kind dry joke.';
      reactionAnimation = 'EYE_ROLL_WALK_AWAY';
      charismaDelta = -1;
    } else {
      // Slapstick cartoon reaction
      const isPunch = Math.random() > 0.5;
      outcome = isPunch ? 'COMEDIC_PUNCH' : 'COMEDIC_SLAP';
      dialogue = isPunch
        ? 'POW! Look at this mumu corper, who send you?!'
        : 'CLAP! *Cartoon Slap* Keep your hands in your pockets, corper!';
      reactionAnimation = isPunch ? 'CARTOON_PUNCH_PUFF' : 'CARTOON_SLAP_STARS';
      charismaDelta = -2;
    }

    // Update initiator charisma
    initiatorProfile.charismaScore = Math.max(1, Math.min(100, initiatorProfile.charismaScore + charismaDelta));
    initiatorProfile.updatedAt = new Date().toISOString();
    db.playerProfiles.set(initiatorUserId, initiatorProfile);

    return {
      outcome,
      reactionAnimation,
      dialogue,
      charismaDelta,
      newCharismaScore: initiatorProfile.charismaScore,
      targetCorper: {
        name: targetUser?.displayName || 'Fellow Corper',
        stateCode: targetUser?.stateCode || 'OY/26C/XXXX',
      },
    };
  }

  /**
   * Get public corper list for 3D exploration and social interactions
   */
  static getNearbyCorpers(excludeUserId: string) {
    const corpers: any[] = [];
    for (const user of db.users.values()) {
      if (user.id !== excludeUserId && user.status === 'ACTIVE' && user.stateCode) {
        const profile = db.playerProfiles.get(user.id);
        const character = db.playerCharacters.get(user.id);
        const platoon = profile?.platoonId ? db.platoons.get(profile.platoonId) : undefined;

        corpers.push({
          id: user.id,
          displayName: user.displayName,
          stateCode: user.stateCode,
          campNickname: profile?.campNickname || 'Corper',
          platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name, color: platoon.colorHex } : null,
          charismaScore: profile?.charismaScore || 15,
          gender: character?.gender || 'MALE',
          uniform: character?.uniformType || 'khaki_7_7',
          skinTone: character?.skinToneHex || '#8D5524',
        });
      }
    }
    return corpers;
  }
}
