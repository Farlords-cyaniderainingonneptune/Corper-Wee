/**
 * Corper Wee: Comprehensive Social, Friendship, Charisma & Moderation Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { InteractionOutcome, Friendship, UserPrivacySetting } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';
import { NotificationService } from './notificationService.js';

export interface DialogueOption {
  id: string;
  label: string;
  dialogueText: string;
  requiredCharisma: number;
  category: 'FRIENDLY' | 'HUMOROUS' | 'FLIRTATIOUS' | 'CONFIDENT';
}

export const DIALOGUE_OPTIONS: DialogueOption[] = [
  {
    id: 'greet_comrade',
    label: 'Salute & Greet',
    dialogueText: 'Corper Wee! Which platoon are you in, comrade?',
    requiredCharisma: 5,
    category: 'FRIENDLY'
  },
  {
    id: 'joke_mami_jollof',
    label: 'Mama Put Humor',
    dialogueText: 'Abeg you know the exact time Mama Put is dropping that hot smoky jollof?',
    requiredCharisma: 15,
    category: 'HUMOROUS'
  },
  {
    id: 'drill_bonding',
    label: 'Drill Sergeant Banter',
    dialogueText: 'That Sergeant is shouting like he wants to contest for Governor! You survivng the heat?',
    requiredCharisma: 25,
    category: 'CONFIDENT'
  },
  {
    id: 'smooth_compliment',
    label: 'Compliment Jungle Boots',
    dialogueText: 'Your white sneakers and khaki fit sharp pass everybody here. What is your name?',
    requiredCharisma: 35,
    category: 'FLIRTATIOUS'
  }
];

export class SocialService {
  /**
   * Process a charisma interaction between corps members with dialogue choices
   */
  static processInteraction(
    initiatorUserId: string,
    targetUserId: string,
    interactionType: string = 'GREETING',
    dialogueOptionId?: string
  ) {
    if (initiatorUserId === targetUserId) {
      throw new AppError('You cannot test your charisma on yourself, corper!', 400);
    }

    // Check if target has blocked initiator
    const isBlocked = db.userBlocks.some(
      (b) => b.blockerUserId === targetUserId && b.blockedUserId === initiatorUserId
    );
    if (isBlocked) {
      throw new AppError('This corps member is currently not accepting interactions from you.', 403);
    }

    // Check target privacy settings
    const targetPrivacy = db.userPrivacy.get(targetUserId);
    if (targetPrivacy && !targetPrivacy.allowInteractions) {
      throw new AppError('This corps member has disabled incoming social interactions in their privacy settings.', 403);
    }

    const initiatorProfile = db.playerProfiles.get(initiatorUserId);
    const targetUser = db.users.get(targetUserId);

    if (!initiatorProfile) {
      throw new AppError('Initiator corper profile not found.', 404);
    }

    const selectedDialogue = DIALOGUE_OPTIONS.find((d) => d.id === dialogueOptionId) || DIALOGUE_OPTIONS[0];

    const charisma = initiatorProfile.charismaScore;
    const charismaDifficulty = selectedDialogue.requiredCharisma;

    // Charisma check formula
    const successProbability = Math.min(95, Math.max(15, (charisma - charismaDifficulty) * 2 + 50));
    const roll = Math.random() * 100;

    let outcome: InteractionOutcome;
    let dialogue = '';
    let reactionAnimation = '';
    let charismaDelta = 0;
    let relationshipDelta = 0;

    if (roll < successProbability * 0.45) {
      outcome = 'GREAT_SUCCESS';
      dialogue = `Hahaha! "${selectedDialogue.dialogueText}" O boy, you be real vibe! Let us exchange phone numbers, platoon mate!`;
      reactionAnimation = 'CHEER_AND_HIGH_FIVE';
      charismaDelta = 3;
      relationshipDelta = 15;
    } else if (roll < successProbability) {
      outcome = 'MILD_SUCCESS';
      dialogue = `Hehe, sharp corper! "${selectedDialogue.dialogueText}" — I respect your energy. Let's link up at Mami Market!`;
      reactionAnimation = 'THUMBS_UP';
      charismaDelta = 1;
      relationshipDelta = 8;
    } else if (roll < 85) {
      outcome = 'REJECTED';
      dialogue = 'Abeg shift jare, sun too hot in Iseyin for this kind dry joke.';
      reactionAnimation = 'EYE_ROLL_WALK_AWAY';
      charismaDelta = -1;
      relationshipDelta = -3;
    } else {
      // Slapstick cartoon failure reaction
      const isPunch = Math.random() > 0.5;
      outcome = isPunch ? 'COMEDIC_PUNCH' : 'COMEDIC_SLAP';
      dialogue = isPunch
        ? 'POW! *Cartoon Boxing Glove* Look at this mumu corper, who send you?!'
        : 'CLAP! *Cartoon Slap with Flying Stars* Keep your hands in your khaki pockets, corper!';
      reactionAnimation = isPunch ? 'CARTOON_PUNCH_PUFF' : 'CARTOON_SLAP_STARS';
      charismaDelta = -2;
      relationshipDelta = -10;
    }

    // Update initiator charisma
    initiatorProfile.charismaScore = Math.max(1, Math.min(100, initiatorProfile.charismaScore + charismaDelta));
    initiatorProfile.updatedAt = new Date().toISOString();
    db.playerProfiles.set(initiatorUserId, initiatorProfile);

    // Update relationship score if friendship exists
    const friendship = this.getOrCreateFriendship(initiatorUserId, targetUserId);
    friendship.relationshipScore = Math.max(0, Math.min(100, friendship.relationshipScore + relationshipDelta));
    friendship.updatedAt = new Date().toISOString();
    db.friendships.set(friendship.id, friendship);

    return {
      outcome,
      reactionAnimation,
      dialogue,
      charismaDelta,
      relationshipScore: friendship.relationshipScore,
      newCharismaScore: initiatorProfile.charismaScore,
      targetCorper: {
        id: targetUserId,
        name: targetUser?.displayName || 'Fellow Corper',
        stateCode: targetUser?.stateCode || 'OY/26C/XXXX',
      },
    };
  }

  /**
   * Retrieve or create a bidirectional friendship tracking record
   */
  private static getOrCreateFriendship(userId1: string, userId2: string): Friendship {
    const existing = Array.from(db.friendships.values()).find(
      (f) => (f.userId === userId1 && f.friendUserId === userId2) ||
             (f.userId === userId2 && f.friendUserId === userId1)
    );

    if (existing) return existing;

    const newFriendship: Friendship = {
      id: uuidv4(),
      userId: userId1,
      friendUserId: userId2,
      status: 'PENDING',
      relationshipScore: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.friendships.set(newFriendship.id, newFriendship);
    return newFriendship;
  }

  /**
   * Send a Friend Request
   */
  static sendFriendRequest(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new AppError('You cannot add yourself as a friend.', 400);
    }

    const targetPrivacy = db.userPrivacy.get(targetUserId);
    if (targetPrivacy && !targetPrivacy.allowFriendRequests) {
      throw new AppError('This corps member is not currently accepting friend requests.', 403);
    }

    const friendship = this.getOrCreateFriendship(userId, targetUserId);
    friendship.status = 'PENDING';
    friendship.userId = userId;
    friendship.friendUserId = targetUserId;
    friendship.updatedAt = new Date().toISOString();
    db.friendships.set(friendship.id, friendship);

    return friendship;
  }

  /**
   * Accept or Reject a Friend Request
   */
  static respondToFriendRequest(userId: string, friendshipId: string, accept: boolean) {
    const friendship = db.friendships.get(friendshipId);
    if (!friendship) {
      throw new AppError('Friend request not found.', 404);
    }
    if (friendship.friendUserId !== userId) {
      throw new AppError('Forbidden: You are not the intended recipient of this friend request.', 403);
    }

    friendship.status = accept ? 'ACCEPTED' : 'REJECTED';
    if (accept) {
      friendship.relationshipScore = Math.max(friendship.relationshipScore, 25);
      const recipient = db.users.get(userId);
      const sender = db.users.get(friendship.userId);
      const profile = db.playerProfiles.get(userId);
      if (recipient && sender) {
        NotificationService.publish({
          category: 'SOCIAL_MILESTONE',
          actorUserId: userId,
          actorName: recipient.displayName,
          actorStateCode: recipient.stateCode,
          platoonNumber: profile?.platoonId,
          message: `${recipient.displayName} and ${sender.displayName} became camp friends`,
        });
      }
    }
    friendship.updatedAt = new Date().toISOString();
    db.friendships.set(friendship.id, friendship);

    return friendship;
  }

  /**
   * List confirmed friends and pending requests for user
   */
  static listFriends(userId: string) {
    const userBlocks = new Set(
      db.userBlocks.filter((b) => b.blockerUserId === userId).map((b) => b.blockedUserId)
    );

    const friends: any[] = [];
    for (const f of db.friendships.values()) {
      if ((f.userId === userId || f.friendUserId === userId) && f.status === 'ACCEPTED') {
        const friendId = f.userId === userId ? f.friendUserId : f.userId;
        if (userBlocks.has(friendId)) continue;

        const friendUser = db.users.get(friendId);
        const friendProfile = db.playerProfiles.get(friendId);
        const friendPlatoon = friendProfile?.platoonId ? db.platoons.get(friendProfile.platoonId) : null;

        friends.push({
          friendshipId: f.id,
          friendUserId: friendId,
          displayName: friendUser?.displayName || 'Fellow Corper',
          stateCode: friendUser?.stateCode || 'OY/26C/XXXX',
          platoonNumber: friendPlatoon?.number || 1,
          relationshipScore: f.relationshipScore,
          updatedAt: f.updatedAt,
        });
      }
    }

    return friends;
  }

  /**
   * Block a user
   */
  static blockUser(blockerUserId: string, blockedUserId: string, reason?: string) {
    if (blockerUserId === blockedUserId) {
      throw new AppError('You cannot block yourself.', 400);
    }

    const existing = db.userBlocks.find(
      (b) => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId
    );
    if (existing) return existing;

    const block = {
      id: uuidv4(),
      blockerUserId,
      blockedUserId,
      reason: reason || 'Blocked by user',
      createdAt: new Date().toISOString(),
    };

    db.userBlocks.push(block);
    return block;
  }

  /**
   * Unblock a user
   */
  static unblockUser(blockerUserId: string, blockedUserId: string) {
    const idx = db.userBlocks.findIndex(
      (b) => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId
    );
    if (idx !== -1) {
      db.userBlocks.splice(idx, 1);
      return { success: true };
    }
    return { success: false, message: 'Block not found' };
  }

  /**
   * Report a user for misconduct (camp commandant review)
   */
  static reportUser(reporterUserId: string, reportedUserId: string, reason: string, details?: string) {
    if (reporterUserId === reportedUserId) {
      throw new AppError('You cannot report yourself.', 400);
    }

    const report = {
      id: uuidv4(),
      reporterUserId,
      reportedUserId,
      reason,
      details,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    };

    db.userReports.push(report);
    return report;
  }

  /**
   * Manage user privacy settings
   */
  static updatePrivacy(userId: string, settings: Partial<UserPrivacySetting>) {
    const existing: UserPrivacySetting = db.userPrivacy.get(userId) || {
      userId,
      allowInteractions: true,
      allowFriendRequests: true,
      showOnlineStatus: true,
      updatedAt: new Date().toISOString(),
    };

    const updated: UserPrivacySetting = {
      ...existing,
      ...settings,
      userId,
      updatedAt: new Date().toISOString(),
    };

    db.userPrivacy.set(userId, updated);
    return updated;
  }

  static getPrivacy(userId: string): UserPrivacySetting {
    return db.userPrivacy.get(userId) || {
      userId,
      allowInteractions: true,
      allowFriendRequests: true,
      showOnlineStatus: true,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get public corper list for 3D exploration and social interactions
   */
  static getNearbyCorpers(excludeUserId: string) {
    const corpers: any[] = [];
    const userBlocks = new Set(
      db.userBlocks.filter((b) => b.blockerUserId === excludeUserId).map((b) => b.blockedUserId)
    );

    for (const user of db.users.values()) {
      if (user.id !== excludeUserId && user.status === 'ACTIVE' && user.stateCode) {
        if (userBlocks.has(user.id)) continue;

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
