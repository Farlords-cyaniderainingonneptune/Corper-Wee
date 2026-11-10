/**
 * Corper Wee: Player Profile & Character Controller
 */
import type { Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export class PlayerController {
  static getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const profile = db.playerProfiles.get(user.id);
      const character = db.playerCharacters.get(user.id);
      const wallet = db.wallets.get(user.id);
      const waterMeter = db.waterMeters.get(user.id);
      const platoon = profile?.platoonId ? db.platoons.get(profile.platoonId) : undefined;

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            stateCode: user.stateCode,
            role: user.role,
            status: user.status,
            isProtected: user.isProtected,
          },
          profile: profile
            ? {
                ...profile,
                platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name, color: platoon.colorHex } : null,
              }
            : null,
          character: character || null,
          wallet: wallet || { corperPoints: 0, virtualNaira: 0 },
          waterMeter: waterMeter || { currentLevel: 100.0 },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static getPublicProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id;
      const user = db.users.get(targetUserId);
      if (!user || user.status !== 'ACTIVE') {
        throw new AppError('Corps member profile not found.', 404);
      }

      const profile = db.playerProfiles.get(targetUserId);
      const character = db.playerCharacters.get(targetUserId);
      const platoon = profile?.platoonId ? db.platoons.get(profile.platoonId) : undefined;

      res.status(200).json({
        status: 'success',
        data: {
          id: user.id,
          displayName: user.displayName,
          stateCode: user.stateCode || 'Pending',
          campNickname: profile?.campNickname || 'Corper',
          paradeRank: profile?.paradeRank || 'Recruit Corper',
          level: profile?.level || 1,
          charismaScore: profile?.charismaScore || 15,
          totalParadesCompleted: profile?.totalParadesCompleted || 0,
          platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name, color: platoon.colorHex } : null,
          character: character || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static updateCharacter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Strictly enforced: player can only update their own character from req.user!.id
      const userId = req.user!.id;
      const { gender, skinToneHex, hairstyle, hairColorHex, uniformType, footwear, accessory } = req.body;

      let character = db.playerCharacters.get(userId);
      const now = new Date().toISOString();

      if (!character) {
        character = {
          userId,
          gender: gender || 'MALE',
          skinToneHex: skinToneHex || '#8D5524',
          hairstyle: hairstyle || 'nysc_crest_cap',
          hairColorHex: hairColorHex || '#1A1A1A',
          uniformType: uniformType || 'khaki_7_7',
          footwear: footwear || 'jungle_boots',
          accessory: accessory || 'waist_bag',
          updatedAt: now,
        };
      } else {
        if (gender) character.gender = gender;
        if (skinToneHex) character.skinToneHex = skinToneHex;
        if (hairstyle) character.hairstyle = hairstyle;
        if (hairColorHex) character.hairColorHex = hairColorHex;
        if (uniformType) character.uniformType = uniformType;
        if (footwear) character.footwear = footwear;
        if (accessory !== undefined) character.accessory = accessory;
        character.updatedAt = now;
      }

      db.playerCharacters.set(userId, character);

      res.status(200).json({
        status: 'success',
        message: 'Character appearance updated successfully.',
        data: character,
      });
    } catch (error) {
      next(error);
    }
  }
}
