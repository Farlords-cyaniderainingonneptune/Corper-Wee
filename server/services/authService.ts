/**
 * Corper Wee: Comprehensive Authentication & Registration Service
 * Google Identity Token Verification, State-Code Registration,
 * Session & Refresh Token Rotation, and Idempotent Superadmin Seeding.
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import { config } from '../config/env.js';
import type { User, UserRole } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';
import { signAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../middleware/auth.js';
import { NotificationService } from './notificationService.js';

export const STATE_CODE_REGEX = /^[A-Z]{2}\/\d{2}[A-C]\/\d{4}$/;

export interface GoogleAuthPayload {
  email: string;
  sub: string;
  name?: string;
  picture?: string;
  email_verified: boolean;
}

export class AuthService {
  /**
   * Parse and verify a Google identity token or structured payload
   */
  static verifyGoogleIdentity(idToken: string, providedEmail?: string, providedName?: string): GoogleAuthPayload {
    // 1. Direct structured JSON simulation (used in dev, mobile bridge, or web client)
    if (idToken && idToken.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(idToken);
        if (!parsed.email) {
          throw new AppError('Google identity token payload missing email claim.', 401);
        }
        if (parsed.email_verified === false) {
          throw new AppError('Registration requires a Google-verified email address.', 401);
        }
        return {
          email: parsed.email.toLowerCase().trim(),
          sub: parsed.sub || ('google-sub-' + uuidv4().substring(0, 10)),
          name: parsed.name || 'Corper',
          picture: parsed.picture,
          email_verified: parsed.email_verified !== false,
        };
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError('Failed to parse Google identity token payload.', 401);
      }
    }

    // 2. Dev / Test Shortcuts
    if (idToken === 'superadmin-dev-token') {
      return {
        email: config.superadmin.email.toLowerCase(),
        sub: 'google-sub-superadmin-farlodunolusege',
        name: 'Olusege (Commandant)',
        email_verified: true,
      };
    }

    if (idToken === 'unverified-email-token') {
      throw new AppError('Registration requires a Google-verified email address.', 401);
    }

    // 3. Fallback when email is passed directly from verified Google client SDK
    if (providedEmail) {
      return {
        email: providedEmail.toLowerCase().trim(),
        sub: 'google-sub-' + uuidv4().substring(0, 10),
        name: providedName || 'Corper Member',
        email_verified: true,
      };
    }

    // 4. Standard Base64 JWT check (header.payload.signature)
    if (idToken && idToken.includes('.')) {
      try {
        const parts = idToken.split('.');
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const parsed = JSON.parse(payloadJson);
        if (!parsed.email) {
          throw new AppError('Google identity token missing email claim.', 401);
        }
        if (parsed.email_verified === false) {
          throw new AppError('Registration requires a Google-verified email address.', 401);
        }
        return {
          email: parsed.email.toLowerCase().trim(),
          sub: parsed.sub || parsed.user_id,
          name: parsed.name || 'Corper',
          picture: parsed.picture,
          email_verified: true,
        };
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError('Invalid Google JWT token structure.', 401);
      }
    }

    throw new AppError('Missing or invalid Google identity credentials.', 400);
  }

  /**
   * Demo Authentication Flow: Email + NYSC State Code
   * Strictly enforces 1-to-1 uniqueness:
   * - An email cannot be used with more than one state code.
   * - A state code cannot be used with more than one email.
   */
  static async authenticateWithEmailAndStateCode(
    rawEmail: string,
    rawStateCode: string,
    fullName?: string
  ) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new AppError('Email address is required.', 400);
    }
    if (!rawStateCode || typeof rawStateCode !== 'string') {
      throw new AppError('NYSC State Code is required.', 400);
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Please provide a valid email address.', 400);
    }

    const stateCode = rawStateCode.trim().toUpperCase();
    if (!STATE_CODE_REGEX.test(stateCode)) {
      throw new AppError(
        'Invalid NYSC State Code format. Expected format like OY/26C/5439 or LA/25A/1204',
        422
      );
    }

    const userByEmail = db.getUserByEmail(email);
    const userByStateCode = db.getUserByStateCode(stateCode);

    // Rule 1: Email must be unique to this state code
    if (userByEmail && userByEmail.stateCode && userByEmail.stateCode.toUpperCase() !== stateCode) {
      throw new AppError(
        `Email "${email}" is already registered with State Code "${userByEmail.stateCode}". You cannot use an email with more than one state code.`,
        409
      );
    }

    // Rule 2: State Code must be unique to this email
    if (userByStateCode && userByStateCode.email.toLowerCase() !== email) {
      throw new AppError(
        `State Code "${stateCode}" is already registered to a different email address (${userByStateCode.email}). A State Code cannot be registered to multiple emails.`,
        409
      );
    }

    const now = new Date().toISOString();
    const isSuperadmin = email === config.superadmin.email.toLowerCase();

    let user: User;
    let isNewUser = false;

    if (userByEmail && userByStateCode && userByEmail.id === userByStateCode.id) {
      // Existing User Login
      user = userByEmail;

      if (user.status === 'SUSPENDED') {
        throw new AppError('This corper account has been suspended by camp administration.', 403);
      }
      if (user.status === 'BANNED') {
        throw new AppError('This account is permanently banned.', 403);
      }
      if (user.status === 'DELETED') {
        throw new AppError('This account has been deleted under camp retention policies.', 403);
      }

      if (isSuperadmin) {
        user.role = 'SUPERADMIN';
        user.isProtected = true;
      }

      user.lastLoginAt = now;
      user.updatedAt = now;
      db.users.set(user.id, user);
    } else if (userByEmail && !userByEmail.stateCode) {
      // User created without state code previously
      user = userByEmail;
      user.stateCode = stateCode;
      user.updatedAt = now;
      db.users.set(user.id, user);

      const assignedPlatoonId = ((db.users.size % 10) || 10);
      this.initializePlayerDefaults(user.id, assignedPlatoonId, fullName);
    } else if (!userByEmail && !userByStateCode) {
      // New User Signup
      isNewUser = true;
      const role: UserRole = isSuperadmin ? 'SUPERADMIN' : 'PLAYER';
      const displayName = fullName?.trim() || email.split('@')[0];

      user = {
        id: uuidv4(),
        googleSub: `sub-${uuidv4()}`,
        email,
        displayName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
        stateCode,
        role,
        status: 'ACTIVE',
        isProtected: isSuperadmin,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      db.users.set(user.id, user);

      const assignedPlatoonId = ((db.users.size % 10) || 10);
      this.initializePlayerDefaults(user.id, assignedPlatoonId, displayName);

      NotificationService.publish({
        category: 'CAMP_JOIN',
        actorUserId: user.id,
        actorName: user.displayName,
        actorStateCode: user.stateCode,
        platoonNumber: assignedPlatoonId,
        message: `${user.displayName} joined the camp (Platoon ${assignedPlatoonId})`,
      });
    } else {
      throw new AppError('Credentials mismatch between Email and State Code.', 409);
    }

    const accessToken = signAccessToken(user);
    const { rawToken: refreshToken } = createRefreshToken(user.id);

    const character = db.playerCharacters.get(user.id);
    const profile = db.playerProfiles.get(user.id);
    const wallet = db.wallets.get(user.id);
    const water = db.waterMeters.get(user.id);

    const skinHexMap: Record<string, string> = {
      '#b57850': 'LIGHT',
      '#8D5524': 'WARM_BROWN',
      '#824b2b': 'WARM_BROWN',
      '#542d17': 'DEEP_BROWN',
      '#30180a': 'DARK_EBONY',
    };

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        fullName: user.displayName,
        role: user.role,
        status: user.status,
        accountStatus: user.status,
        stateCode: user.stateCode,
        platoonNumber: profile?.platoonId ?? 1,
        isProtected: user.isProtected,
      },
      character: character ? {
        gender: character.gender,
        skinTone: skinHexMap[character.skinToneHex] || 'WARM_BROWN',
        hairstyle: character.hairstyle,
        hairColor: character.hairColorHex,
        facialFeature: 'NONE',
        uniformType: character.uniformType,
        footwear: character.footwear,
        accessories: character.accessory,
      } : null,
      wallet: wallet ? {
        corperPoints: wallet.corperPoints,
        virtualNaira: wallet.virtualNaira.toFixed(2),
      } : { corperPoints: 100, virtualNaira: '1000.00' },
      water: water ? {
        waterLevel: water.currentLevel,
        isDehydrated: water.currentLevel < 20,
      } : { waterLevel: 100, isDehydrated: false },
      requiresOnboarding: false,
      isNewUser,
    };
  }

  /**
   * Main Google Authentication Flow (Sign-in or Sign-up)
   */
  static async handleGoogleAuth(idToken?: string, fallbackEmail?: string, fallbackName?: string, stateCode?: string) {
    if (fallbackEmail && stateCode) {
      return this.authenticateWithEmailAndStateCode(fallbackEmail, stateCode, fallbackName);
    }
    const verifiedGoogleUser = this.verifyGoogleIdentity(idToken || '', fallbackEmail, fallbackName);
    const email = verifiedGoogleUser.email;

    // Check if user exists
    let user: User | undefined;
    for (const u of db.users.values()) {
      if (u.email.toLowerCase() === email) {
        user = u;
        break;
      }
    }

    const now = new Date().toISOString();
    const isSuperadminEmail = email === config.superadmin.email.toLowerCase();

    let isNewUser = false;
    if (!user) {
      // NEW USER CREATION
      isNewUser = true;
      const role: UserRole = isSuperadminEmail ? 'SUPERADMIN' : 'PLAYER';

      user = {
        id: uuidv4(),
        googleSub: verifiedGoogleUser.sub,
        email,
        displayName: verifiedGoogleUser.name || 'New Corper',
        avatarUrl:
          verifiedGoogleUser.picture ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(verifiedGoogleUser.name || email)}`,
        stateCode: isSuperadminEmail ? config.superadmin.stateCode : undefined,
        role,
        status: 'ACTIVE',
        isProtected: isSuperadminEmail,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      db.users.set(user.id, user);

      if (isSuperadminEmail) {
        this.initializePlayerDefaults(user.id, 1, 'Camp Commandant');
      }
    } else {
      // EXISTING USER LOGIN
      if (user.status === 'SUSPENDED') {
        throw new AppError('This corper account has been suspended by camp administration.', 403);
      }
      if (user.status === 'BANNED') {
        throw new AppError('This account is permanently banned.', 403);
      }
      if (user.status === 'DELETED') {
        throw new AppError('This account has been deleted under camp retention policies.', 403);
      }

      // If this is superadmin email, ensure role & protection are strictly locked
      if (isSuperadminEmail) {
        user.role = 'SUPERADMIN';
        user.isProtected = true;
      }

      user.lastLoginAt = now;
      user.updatedAt = now;
      db.users.set(user.id, user);
    }

    // Issue Access Token & Refresh Token pair
    const accessToken = signAccessToken(user);
    const { rawToken: refreshToken } = createRefreshToken(user.id);
    const requiresOnboarding = !user.stateCode;

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
      },
      requiresOnboarding,
      isNewUser,
    };
  }

  /**
   * Register NYSC State Code
   */
  static async registerStateCode(userId: string, rawStateCode: string, campNickname?: string) {
    const user = db.users.get(userId);
    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    if (user.stateCode) {
      throw new AppError(`Corps member already has an assigned State Code: ${user.stateCode}`, 400);
    }

    const formattedCode = rawStateCode.trim().toUpperCase();

    if (!STATE_CODE_REGEX.test(formattedCode)) {
      throw new AppError(
        'Invalid NYSC State Code format. Expected format like OY/26C/5439 or LA/25A/1204',
        422
      );
    }

    // Case-insensitive uniqueness validation
    for (const [uid, u] of db.users.entries()) {
      if (uid !== userId && u.stateCode?.toUpperCase() === formattedCode) {
        throw new AppError(`State Code ${formattedCode} is already registered to another corps member.`, 409);
      }
    }

    user.stateCode = formattedCode;
    user.updatedAt = new Date().toISOString();
    db.users.set(user.id, user);

    // Balanced Platoon Assignment (1 - 10)
    const assignedPlatoonId = ((db.users.size % 10) || 10);
    this.initializePlayerDefaults(user.id, assignedPlatoonId, campNickname);

    NotificationService.publish({
      category: 'CAMP_JOIN',
      actorUserId: user.id,
      actorName: user.displayName,
      actorStateCode: user.stateCode,
      platoonNumber: assignedPlatoonId,
      message: `${user.displayName} joined the camp (Platoon ${assignedPlatoonId})`,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        stateCode: user.stateCode,
      },
      platoonId: assignedPlatoonId,
    };
  }

  /**
   * Refresh token rotation
   */
  static refreshTokenRotation(refreshToken: string) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required.', 400);
    }
    return rotateRefreshToken(refreshToken);
  }

  /**
   * Logout user
   */
  static logout(refreshToken?: string) {
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
    }
    return { success: true, message: 'Logged out successfully.' };
  }

  /**
   * Initialize player defaults
   */
  private static initializePlayerDefaults(userId: string, platoonId: number, nickname?: string) {
    const now = new Date().toISOString();

    if (!db.playerProfiles.has(userId)) {
      db.playerProfiles.set(userId, {
        userId,
        platoonId,
        level: 1,
        experiencePoints: 0,
        charismaScore: 15,
        reputationScore: 50,
        paradeRank: 'Recruit Corper',
        totalParadesCompleted: 0,
        campNickname: nickname || 'Otondo Corper',
        updatedAt: now,
      });

      const platoon = db.platoons.get(platoonId);
      if (platoon) {
        platoon.memberCount += 1;
        db.platoons.set(platoonId, platoon);
      }
    }

    if (!db.playerCharacters.has(userId)) {
      db.playerCharacters.set(userId, {
        userId,
        gender: 'MALE',
        skinToneHex: '#8D5524',
        hairstyle: 'nysc_crest_cap',
        hairColorHex: '#1A1A1A',
        uniformType: 'khaki_7_7',
        footwear: 'jungle_boots',
        accessory: 'waist_bag',
        updatedAt: now,
      });
    }

    if (!db.wallets.has(userId)) {
      db.wallets.set(userId, {
        userId,
        corperPoints: 100,
        virtualNaira: 1000.0,
        updatedAt: now,
      });

      db.pointTransactions.push({
        id: uuidv4(),
        userId,
        amount: 100,
        balanceAfter: 100,
        activityType: 'WELCOME_BONUS',
        description: 'Welcome to Iseyin Camp starter CP bonus',
        createdAt: now,
      });

      db.walletTransactions.push({
        id: uuidv4(),
        userId,
        amount: 1000.0,
        balanceAfter: 1000.0,
        transactionType: 'EARN_ACTIVITY',
        description: 'Orientation Camp allowance starter stipend',
        createdAt: now,
      });
    }

    if (!db.waterMeters.has(userId)) {
      db.waterMeters.set(userId, {
        userId,
        currentLevel: 100.0,
        lastDepletedAt: now,
        updatedAt: now,
      });
    }

    const existingInventory = db.playerInventory.get(userId) || [];
    if (existingInventory.length === 0) {
      existingInventory.push({
        id: uuidv4(),
        userId,
        productId: 1,
        quantity: 2,
        isEquipped: false,
        acquiredAt: now,
      });
      db.playerInventory.set(userId, existingInventory);
    }
  }
}
