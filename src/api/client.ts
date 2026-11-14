/**
 * Typesafe API client for the frontend connecting to Express on Port 3000.
 */
import type { CharacterAppearance } from '../game/ProceduralModels';

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    stateCode: string;
    platoonNumber: number;
    accountStatus: string;
  };
  character: CharacterAppearance | null;
  wallet: {
    corperPoints: number;
    virtualNaira: string;
  };
  water: {
    waterLevel: number;
    isDehydrated: boolean;
  };
  isNewUser: boolean;
  requiresOnboarding: boolean;
}

export interface PlatoonLeaderboardItem {
  platoonNumber: number;
  name: string;
  totalPoints: number;
  memberCount: number;
  rank: number;
}

export interface MarketProduct {
  id: string;
  name: string;
  category: string;
  priceNaira: string;
  waterRestoration: number;
  staminaBoost: number;
  description: string;
}

export interface CampNotificationItem {
  id: string;
  category:
    | 'CAMP_JOIN'
    | 'MEDAL_EARNED'
    | 'ACTIVITY_RECORD'
    | 'EVENT_UPDATE'
    | 'SOCIAL_MILESTONE'
    | 'DAILY_TASK_ALERT'
    | 'WEATHER_UPDATE';
  actorUserId: string;
  actorName: string;
  actorStateCode?: string;
  platoonNumber?: number;
  message: string;
  createdAt: string;
}

export type DailyDutyType = 'MORNING_DRILL' | 'EVENING_PARADE';

export interface DailyCampTask {
  taskType: DailyDutyType;
  title: string;
  scheduleWindow: string;
  description: string;
  locationZoneId: 'parade_ground';
  locationLabel: string;
  rewardCp: number;
  xpAwarded: number;
  minAccuracy: number;
  preferredTimeOfDay: 'MORNING' | 'DAY' | 'NIGHT';
  dateKey: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt: string | null;
  isActiveWindow: boolean;
}

export interface DailyTasksSummary {
  dateKey: string;
  tasks: DailyCampTask[];
  completedCount: number;
  totalCount: number;
  pendingCount: number;
  totalBonusCpEarned: number;
}

export interface CampEventItem {
  id: string;
  title: string;
  description: string;
  locationName?: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  rewardCp: number;
  rewardNaira: number;
  maxParticipants: number;
  currentParticipantsCount: number;
  minCharismaRequired: number;
}

const SKIN_TO_HEX: Record<string, string> = {
  LIGHT: '#b57850',
  WARM_BROWN: '#824b2b',
  DEEP_BROWN: '#542d17',
  DARK_EBONY: '#30180a',
};

const HEX_TO_SKIN: Record<string, CharacterAppearance['skinTone']> = {
  '#b57850': 'LIGHT',
  '#8d5524': 'WARM_BROWN',
  '#824b2b': 'WARM_BROWN',
  '#542d17': 'DEEP_BROWN',
  '#30180a': 'DARK_EBONY',
};

const HAIR_TO_HEX: Record<string, string> = {
  BLACK: '#111111',
  DARK_BROWN: '#2b1d0c',
  GOLDEN_BLONDE: '#8c6d2d',
};

const HEX_TO_HAIR: Record<string, CharacterAppearance['hairColor']> = {
  '#111111': 'BLACK',
  '#1a1a1a': 'BLACK',
  '#2b1d0c': 'DARK_BROWN',
  '#8c6d2d': 'GOLDEN_BLONDE',
};

function isApiOk(res: Response, data: any): boolean {
  return res.ok && (data?.status === 'success' || data?.success === true);
}

function normalizeCharacter(raw: any): CharacterAppearance | null {
  if (!raw) return null;
  const skinKey = raw.skinTone && SKIN_TO_HEX[raw.skinTone]
    ? raw.skinTone
    : HEX_TO_SKIN[String(raw.skinToneHex || raw.skinTone || '').toLowerCase()] || 'WARM_BROWN';
  const hairKey = raw.hairColor && HAIR_TO_HEX[raw.hairColor]
    ? raw.hairColor
    : HEX_TO_HAIR[String(raw.hairColorHex || raw.hairColor || '').toLowerCase()] || 'BLACK';
  const validStyles = ['BUZZ_CUT', 'AFRO_FADE', 'BRAIDS', 'CORNROWS', 'LOW_TAPER'] as const;
  const styleUpper = String(raw.hairstyle || 'BUZZ_CUT').toUpperCase();
  const hairstyle = (validStyles as readonly string[]).includes(styleUpper)
    ? (styleUpper as CharacterAppearance['hairstyle'])
    : 'BUZZ_CUT';

  const validUniforms = ['KHAKI_FULL', 'WHITE_PT', 'PLATOON_JERSEY'] as const;
  const uniUpper = String(raw.uniformType || 'KHAKI_FULL').toUpperCase();
  const uniformType = (validUniforms as readonly string[]).includes(uniUpper)
    ? (uniUpper as CharacterAppearance['uniformType'])
    : 'KHAKI_FULL';

  const validFootwear = ['JUNGLE_BOOTS', 'WHITE_SNEAKERS'] as const;
  const footUpper = String(raw.footwear || 'JUNGLE_BOOTS').toUpperCase();
  const footwear = (validFootwear as readonly string[]).includes(footUpper)
    ? (footUpper as CharacterAppearance['footwear'])
    : 'JUNGLE_BOOTS';

  const validAcc = ['WAIST_BAG', 'ID_LANYARD', 'BOTH', 'NONE'] as const;
  const accUpper = String(raw.accessories || raw.accessory || 'WAIST_BAG').toUpperCase();
  const accessories = (validAcc as readonly string[]).includes(accUpper)
    ? (accUpper as CharacterAppearance['accessories'])
    : 'WAIST_BAG';

  return {
    gender: raw.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
    skinTone: skinKey as CharacterAppearance['skinTone'],
    hairstyle,
    hairColor: hairKey as CharacterAppearance['hairColor'],
    facialFeature: raw.facialFeature || 'NONE',
    uniformType,
    footwear,
    accessories,
  };
}

class ApiService {
  private baseUrl = '/api/v1';

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('cw_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  public saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('cw_access_token', accessToken);
    localStorage.setItem('cw_refresh_token', refreshToken);
  }

  public clearTokens() {
    localStorage.removeItem('cw_access_token');
    localStorage.removeItem('cw_refresh_token');
  }

  public async authenticate(email: string, stateCode: string, fullName?: string): Promise<UserSession> {
    const res = await fetch(`${this.baseUrl}/auth/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, stateCode, fullName })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Authentication failed');
    }

    const payload = data.data;
    this.saveTokens(payload.accessToken, payload.refreshToken);
    return {
      ...payload,
      user: {
        ...payload.user,
        fullName: payload.user?.fullName || payload.user?.displayName || 'Corper',
        platoonNumber: payload.user?.platoonNumber ?? 1,
        accountStatus: payload.user?.accountStatus || payload.user?.status || 'ACTIVE',
      },
      character: normalizeCharacter(payload.character),
    };
  }

  public async loginWithGoogle(idToken: string, stateCode?: string): Promise<UserSession> {
    const res = await fetch(`${this.baseUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, stateCode })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Login failed');
    }

    this.saveTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  }

  public async updateCharacter(character: NonNullable<UserSession['character']>) {
    const payload = {
      gender: character.gender,
      skinToneHex: SKIN_TO_HEX[character.skinTone] || '#824b2b',
      hairstyle: character.hairstyle,
      hairColorHex: HAIR_TO_HEX[character.hairColor] || '#111111',
      uniformType: character.uniformType,
      footwear: character.footwear,
      accessory: character.accessories,
    };

    const res = await fetch(`${this.baseUrl}/players/character`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to update character');
    }
    return data.data;
  }

  public async getMyProfile(): Promise<UserSession | null> {
    if (!localStorage.getItem('cw_access_token')) return null;
    const res = await fetch(`${this.baseUrl}/players/me`, {
      headers: this.getAuthHeader()
    });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.data;
    if (!d?.user) return null;

    const token = localStorage.getItem('cw_access_token') || '';
    const refreshToken = localStorage.getItem('cw_refresh_token') || '';
    const waterLevel = d.waterMeter?.currentLevel ?? 100;

    return {
      accessToken: token,
      refreshToken,
      user: {
        id: d.user.id,
        email: d.user.email,
        fullName: d.user.displayName || d.user.email,
        role: d.user.role,
        stateCode: d.user.stateCode || '',
        platoonNumber: d.profile?.platoon?.number ?? d.profile?.platoonId ?? 1,
        accountStatus: d.user.status || 'ACTIVE',
      },
      character: normalizeCharacter(d.character),
      wallet: {
        corperPoints: d.wallet?.corperPoints ?? 0,
        virtualNaira: Number(d.wallet?.virtualNaira ?? 0).toFixed(2),
      },
      water: {
        waterLevel,
        isDehydrated: waterLevel < 20,
      },
      isNewUser: false,
      requiresOnboarding: !d.user.stateCode,
    };
  }

  public async getLeaderboard(): Promise<PlatoonLeaderboardItem[]> {
    const res = await fetch(`${this.baseUrl}/platoons/leaderboard`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to load platoon leaderboard');
    const data = await res.json();
    const raw = data.data?.leaderboards || data.data || [];
    return (Array.isArray(raw) ? raw : []).map((p: any, idx: number) => ({
      platoonNumber: p.number ?? p.platoonNumber ?? idx + 1,
      name: p.name || `Platoon ${p.number ?? idx + 1}`,
      totalPoints: p.totalPoints ?? 0,
      memberCount: p.memberCount ?? 0,
      rank: p.rank ?? idx + 1,
    }));
  }

  public async getProducts(): Promise<MarketProduct[]> {
    const res = await fetch(`${this.baseUrl}/market/products`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to load market products');
    const data = await res.json();
    const raw = data.data?.products || data.data || [];
    return (Array.isArray(raw) ? raw : []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      category: p.category || (p.waterRefillValue > 0 ? 'DRINK' : 'FOOD'),
      priceNaira: Number(p.priceNaira ?? 0).toFixed(2),
      waterRestoration: p.waterRefillValue ?? p.waterRestoration ?? 0,
      staminaBoost: p.staminaBoostValue ?? p.staminaBoost ?? 0,
      description: p.description || '',
    }));
  }

  public async purchaseProduct(productId: string | number, quantity: number = 1) {
    const idempotencyKey = `buy-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const numericId = typeof productId === 'number' ? productId : parseInt(String(productId), 10);
    const res = await fetch(`${this.baseUrl}/market/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ productId: numericId, quantity, idempotencyKey })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Purchase failed');
    }
    return {
      ...data.data,
      remainingNaira: Number(data.data?.wallet?.virtualNaira ?? 0).toFixed(2),
    };
  }

  public async convertPointsToNaira(pointsToExchange: number) {
    const idempotencyKey = `conv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const res = await fetch(`${this.baseUrl}/economy/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ pointsToExchange, idempotencyKey })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Conversion failed');
    }
    return {
      ...data.data,
      remainingCP: data.data?.newPoints ?? 0,
      newBalanceNaira: Number(data.data?.newNaira ?? 0).toFixed(2),
      nairaCredited: Number(data.data?.nairaCredited ?? 0).toFixed(2),
    };
  }

  public async submitParadeDrill(
    commandsTotalOrResults: number | Array<{ command: string; responseTimeMs: number; isCorrect: boolean }>,
    commandsSuccessfulOrDifficulty?: number | 'EASY' | 'NORMAL' | 'HARD',
    difficultyParam?: 'EASY' | 'NORMAL' | 'HARD',
    sequenceId?: string
  ) {
    let payload: Record<string, unknown>;
    if (Array.isArray(commandsTotalOrResults)) {
      payload = {
        sequenceId,
        results: commandsTotalOrResults,
        commandsTotal: commandsTotalOrResults.length,
        commandsSuccessful: commandsTotalOrResults.filter((r) => r.isCorrect).length,
        difficulty: typeof commandsSuccessfulOrDifficulty === 'string' ? commandsSuccessfulOrDifficulty : difficultyParam || 'NORMAL'
      };
    } else {
      payload = {
        sequenceId,
        commandsTotal: commandsTotalOrResults,
        commandsSuccessful: typeof commandsSuccessfulOrDifficulty === 'number' ? commandsSuccessfulOrDifficulty : commandsTotalOrResults,
        difficulty: difficultyParam || 'NORMAL'
      };
    }

    const res = await fetch(`${this.baseUrl}/activities/parade/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Drill submission failed');
    }
    return data.data;
  }

  public async submitCanteenRush(
    timeTakenSeconds: number,
    obstaclesCleared: number,
    puddlesHit: number,
    staminaRemaining: number = 50
  ) {
    const res = await fetch(`${this.baseUrl}/activities/canteen-rush/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({
        timeTakenSeconds: Math.max(3, Math.min(600, timeTakenSeconds)),
        obstaclesCleared,
        puddlesHit,
        staminaRemaining
      })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Canteen rush submission failed');
    }
    return data.data;
  }

  public async reportStealth(survived: boolean, timeInZoneSec: number = 10) {
    const res = await fetch(`${this.baseUrl}/activities/stealth/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ survived, timeInZoneSec: Math.max(1, timeInZoneSec) })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Stealth report failed');
    }
    return data.data;
  }

  public async getNearbyCorpers() {
    const res = await fetch(`${this.baseUrl}/world/corpers`, {
      headers: this.getAuthHeader()
    });
    const data = await res.json();
    return data.data || [];
  }

  public async socialInteract(targetUserId: string, interactionType: string = 'GREETING', dialogueOptionId?: string) {
    const res = await fetch(`${this.baseUrl}/social/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ targetUserId, interactionType, dialogueOptionId })
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Social interaction failed');
    }
    return data.data;
  }

  public async getFriends() {
    const res = await fetch(`${this.baseUrl}/social/friends`, {
      headers: this.getAuthHeader()
    });
    const data = await res.json();
    return data.data || [];
  }

  public async sendFriendRequest(targetUserId: string) {
    const res = await fetch(`${this.baseUrl}/social/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ targetUserId })
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to send friend request');
    }
    return data.data;
  }

  public async respondFriendRequest(friendshipId: string, accept: boolean) {
    const res = await fetch(`${this.baseUrl}/social/friends/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ friendshipId, accept })
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to respond to friend request');
    }
    return data.data;
  }

  public async blockUser(targetUserId: string, reason?: string) {
    const res = await fetch(`${this.baseUrl}/social/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ targetUserId, reason })
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to block user');
    }
    return data.data;
  }

  public async reportUser(targetUserId: string, reason: string, details?: string) {
    const res = await fetch(`${this.baseUrl}/social/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ targetUserId, reason, details })
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to submit report');
    }
    return data.data;
  }

  public async getPrivacy() {
    const res = await fetch(`${this.baseUrl}/social/privacy`, {
      headers: this.getAuthHeader()
    });
    const data = await res.json();
    return data.data;
  }

  public async updatePrivacy(settings: { allowInteractions?: boolean; allowFriendRequests?: boolean; showOnlineStatus?: boolean }) {
    const res = await fetch(`${this.baseUrl}/social/privacy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    return data.data;
  }

  public async depleteWater(
    deltaSeconds: number = 30,
    isRunning: boolean = false,
    weather?: 'SUNNY' | 'CLOUDY' | 'LIGHT_RAIN'
  ): Promise<{
    currentLevel: number;
    isCritical: boolean;
    isZero: boolean;
    weather: 'SUNNY' | 'CLOUDY' | 'LIGHT_RAIN';
    drainMultiplier: number;
  } | null> {
    if (!localStorage.getItem('cw_access_token')) return null;
    const res = await fetch(`${this.baseUrl}/activities/water/deplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ deltaSeconds, isRunning, weather })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  }

  public async consumeWater(productId: number = 1) {
    const res = await fetch(`${this.baseUrl}/activities/water/consume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ productId })
    });

    const data = await res.json();
    return data.data;
  }

  public async getEvents(): Promise<CampEventItem[]> {
    const res = await fetch(`${this.baseUrl}/events`, {
      headers: this.getAuthHeader(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  }

  public async joinEvent(eventId: string) {
    const res = await fetch(`${this.baseUrl}/events/${encodeURIComponent(eventId)}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to join event');
    }
    return data.data;
  }

  public async getDailyTasks(timeOfDay: 'MORNING' | 'DAY' | 'NIGHT' = 'MORNING'): Promise<DailyTasksSummary> {
    const res = await fetch(`${this.baseUrl}/activities/daily-tasks?timeOfDay=${timeOfDay}`, {
      headers: this.getAuthHeader(),
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to load daily duties');
    }
    return data.data;
  }

  public async triggerDailyTaskAlert(
    timeOfDay: 'MORNING' | 'DAY' | 'NIGHT',
    force: boolean = false
  ): Promise<{
    alertTriggered: boolean;
    targetTask: DailyDutyType;
    notification: CampNotificationItem | null;
    summary: DailyTasksSummary;
  }> {
    const res = await fetch(`${this.baseUrl}/activities/daily-tasks/alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ timeOfDay, force }),
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to trigger daily shift alert');
    }
    return data.data;
  }

  public async completeDailyTask(taskType: DailyDutyType, accuracy: number = 100) {
    const res = await fetch(`${this.baseUrl}/activities/daily-tasks/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ taskType, accuracy }),
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to complete daily task');
    }
    return data.data as {
      taskType: DailyDutyType;
      title: string;
      rewardCp: number;
      xpAwarded: number;
      newCorperPoints: number;
      completedAt: string;
      notification: CampNotificationItem;
      summary: DailyTasksSummary;
    };
  }

  public async claimEventReward(eventId: string) {
    const res = await fetch(`${this.baseUrl}/events/${encodeURIComponent(eventId)}/claim-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });
    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to claim event reward');
    }
    return data.data;
  }

  public async getAdminDashboard() {
    const res = await fetch(`${this.baseUrl}/admin/dashboard`, {
      headers: this.getAuthHeader()
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to load admin dashboard');
    }
    return data.data;
  }

  public async generateAdminInvite(email: string, role: 'ADMIN' | 'PLAYER' = 'ADMIN') {
    const res = await fetch(`${this.baseUrl}/admin/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ email, role })
    });

    const data = await res.json();
    if (!isApiOk(res, data)) {
      throw new Error(data.message || 'Failed to create invite');
    }
    return data.data;
  }

  public async getLiveGameConfig(): Promise<{
    conversionRate: { cp: number; naira: number };
    paradeRewards: Record<string, number>;
    canteenRewards: Record<string, number>;
    stealthConfig: Record<string, number>;
    hydrationDrain: { idlePerSec: number; runPerSec: number; criticalThreshold: number };
    updatedAt: string;
  } | null> {
    const res = await fetch(`${this.baseUrl}/config/game`, {
      headers: this.getAuthHeader()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  }

  public async getCampNotifications(limit: number = 20): Promise<CampNotificationItem[]> {
    const res = await fetch(`${this.baseUrl}/world/notifications?limit=${limit}`, {
      headers: this.getAuthHeader()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  }

  public async logout() {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeader()
      });
    } catch {
      // ignore
    } finally {
      this.clearTokens();
    }
  }
}

export const api = new ApiService();
