/**
 * Corper Wee Admin Portal — Authenticated REST API Client
 * Communicates strictly with Express backend (/api/v1/*). Never connects directly to a database.
 */

export type UserRole = 'PLAYER' | 'ADMIN' | 'SUPERADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_REGISTRATION' | 'DELETED';
export type EventStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Permission =
  | 'MANAGE_PLAYERS'
  | 'SUSPEND_PLAYERS'
  | 'MANAGE_ECONOMY'
  | 'SCHEDULE_EVENTS'
  | 'VIEW_AUDIT_LOGS';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface GameConfigData {
  conversionRate: { cp: number; naira: number };
  paradeRewards: {
    baseCpPerCommand: number;
    tier1AccuracyMin: number;
    tier1Multiplier: number;
    tier2AccuracyMin: number;
    tier2Multiplier: number;
    charismaGainThreshold: number;
  };
  canteenRewards: {
    cpPerObstacle: number;
    puddlePenaltyCp: number;
    speedBonusCutoffSec: number;
    speedBonusMultiplier: number;
    minRewardCp: number;
    waterDrainAmount: number;
  };
  stealthConfig: {
    cpPerSecondSurvived: number;
    maxSurvivalCp: number;
    caughtPenaltyCp: number;
  };
  hydrationDrain: {
    idlePerSec: number;
    runPerSec: number;
    criticalThreshold: number;
  };
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  stateCode?: string | null;
  isProtected: boolean;
  permissions?: Permission[];
  createdAt?: string;
  lastLoginAt?: string | null;
  deletedAt?: string | null;
  retentionUntil?: string | null;
}

export interface PlatoonItem {
  id: number;
  campId: number;
  number: number;
  name: string;
  colorHex: string;
  motto: string;
  totalPoints: number;
  memberCount: number;
}

export interface AdminPlayerRow {
  id: string;
  displayName: string;
  email: string;
  stateCode: string;
  role: UserRole;
  status: AccountStatus;
  isProtected: boolean;
  createdAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
  retentionUntil?: string;
  platoon: { id: number; number: number; name: string; colorHex?: string } | null;
  wallet: { corperPoints: number; virtualNaira: number };
  waterLevel: number;
  level: number;
  experiencePoints: number;
  charismaScore: number;
  totalParadesCompleted: number;
  paradeRank: string;
}

export interface PlayerDetailResponse {
  user: AdminUser;
  profile: {
    userId: string;
    platoonId: number;
    level: number;
    experiencePoints: number;
    charismaScore: number;
    reputationScore: number;
    paradeRank: string;
    totalParadesCompleted: number;
    campNickname?: string;
    updatedAt: string;
    platoon: { id: number; number: number; name: string; colorHex: string } | null;
  } | null;
  character: {
    userId: string;
    gender: 'MALE' | 'FEMALE';
    skinToneHex: string;
    hairstyle: string;
    hairColorHex: string;
    uniformType: string;
    footwear: string;
    accessory?: string;
    updatedAt: string;
  } | null;
  wallet: {
    userId: string;
    corperPoints: number;
    virtualNaira: number;
    updatedAt: string;
  };
  water: {
    userId: string;
    currentLevel: number;
    lastDepletedAt: string;
    updatedAt: string;
  };
  gameplayStats: {
    totalSessions: number;
    paradeCount: number;
    canteenCount: number;
    stealthCount: number;
    avgAccuracy: number;
    totalPointsEarned: number;
    highestScore: number;
  };
  activitySessions: Array<{
    id: string;
    userId: string;
    activitySlug: string;
    score: number;
    pointsAwarded: number;
    accuracyPercentage: number;
    durationSeconds: number;
    completedAt: string;
  }>;
  pointTransactions: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    activityType: string;
    description: string;
    createdAt: string;
  }>;
  walletTransactions: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    transactionType: string;
    description: string;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    reporterUserId: string;
    reportedUserId: string;
    reason: string;
    details?: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    createdAt: string;
  }>;
  auditTrail: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorEmail?: string;
  actorDisplayName?: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CampLocation {
  id: number;
  campId: number;
  slug: string;
  name: string;
  category: string;
  posX: number;
  posY: number;
  posZ: number;
  triggerRadius: number;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampEventItem {
  id: string;
  campId: number;
  locationId?: number;
  locationName: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  rewardCp: number;
  rewardNaira: number;
  status: EventStatus;
  targetPlatoonId?: number;
  minCharismaRequired: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketProductItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  priceNaira: number;
  waterRefillValue: number;
  staminaBoostValue: number;
  charismaBoostValue: number;
  stockQuantity: number;
  iconKey: string;
  isActive: boolean;
}

export interface DashboardResponse {
  telemetry: {
    totalRegisteredCorpers: number;
    totalPlayers: number;
    activePlayers: number;
    suspendedPlayers: number;
    deletedPlayers: number;
    totalAdmins: number;
    totalPlatoons: number;
    totalMarketProducts: number;
    activeEvents: number;
    activeLocations: number;
    pendingReports: number;
    totalActivitySessions: number;
    totalPointsInCirculation: number;
    totalNairaInCirculation: number;
    conversionRate: { cp: number; naira: number };
  };
  platoonStandings: PlatoonItem[];
  recentActivitySessions: Array<{
    id: string;
    userId: string;
    userDisplayName?: string;
    userStateCode?: string;
    activitySlug: string;
    score: number;
    pointsAwarded: number;
    accuracyPercentage: number;
    durationSeconds: number;
    completedAt: string;
  }>;
  recentAuditLogs: AuditLogEntry[];
}

export interface ActivityMonitoringResponse {
  summary: {
    totalSessions: number;
    paradeSessions: number;
    canteenSessions: number;
    stealthSessions: number;
    avgAccuracy: number;
    pendingReports: number;
  };
  sessions: Array<{
    id: string;
    userId: string;
    userDisplayName: string;
    userEmail: string;
    userStateCode: string;
    platoonId: number | null;
    activitySlug: string;
    score: number;
    pointsAwarded: number;
    accuracyPercentage: number;
    durationSeconds: number;
    completedAt: string;
  }>;
  reports: Array<{
    id: string;
    reporterUserId: string;
    reportedUserId: string;
    reporterName: string;
    reporterStateCode: string;
    reportedName: string;
    reportedEmail: string;
    reportedStateCode: string;
    reportedStatus: string;
    reason: string;
    details?: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    resolvedAt?: string;
    resolutionNote?: string;
    createdAt: string;
  }>;
}

const ACCESS_KEY = 'cw_admin_access_token';
const REFRESH_KEY = 'cw_admin_refresh_token';

class AdminApiClient {
  private baseUrl = '/api/v1';

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  private async request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && allowRetry) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.request<T>(path, options, false);
      }
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.status !== 'success' && !json.success)) {
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }

    return json.data as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json();
      if (!res.ok || !json.data?.accessToken) {
        this.clearTokens();
        return false;
      }
      this.saveTokens(json.data.accessToken, json.data.newRefreshToken || refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async login(email: string, stateCode: string): Promise<{ accessToken: string; refreshToken: string; user: AdminUser }> {
    const res = await fetch(`${this.baseUrl}/auth/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, stateCode }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.status !== 'success' && !json.success)) {
      throw new Error(json.message || 'Authentication failed');
    }
    const data = json.data;
    if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPERADMIN') {
      throw new Error('Access denied: This account does not hold Camp Administrator or Superadmin privileges.');
    }
    this.saveTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async getCurrentSession(): Promise<{ user: AdminUser }> {
    return this.request<{ user: AdminUser }>('/players/me');
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore network error on logout
    } finally {
      this.clearTokens();
    }
  }

  // Dashboard
  getDashboard(): Promise<DashboardResponse> {
    return this.request<DashboardResponse>('/admin/dashboard');
  }

  // Users
  listUsers(params?: { q?: string; platoonId?: number; status?: string }): Promise<AdminPlayerRow[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.platoonId) search.set('platoonId', String(params.platoonId));
    if (params?.status && params.status !== 'ALL') search.set('status', params.status);
    const qs = search.toString();
    return this.request<AdminPlayerRow[]>(`/admin/players${qs ? `?${qs}` : ''}`);
  }

  getUserDetails(userId: string): Promise<PlayerDetailResponse> {
    return this.request<PlayerDetailResponse>(`/admin/players/${encodeURIComponent(userId)}`);
  }

  setUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    return this.request<{ userId: string; email: string; status: AccountStatus }>(
      `/admin/players/${encodeURIComponent(userId)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      }
    );
  }

  deleteUserWithRetention(userId: string, reason: string) {
    return this.request<{
      userId: string;
      status: AccountStatus;
      anonymizedEmail: string;
      deletedAt: string;
      retentionUntil: string;
      message: string;
    }>(`/admin/players/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  setUserRole(userId: string, role: 'PLAYER' | 'ADMIN') {
    return this.request<{ userId: string; email: string; role: UserRole }>(
      `/admin/players/${encodeURIComponent(userId)}/role`,
      {
        method: 'POST',
        body: JSON.stringify({ role }),
      }
    );
  }

  // Activities & Reports
  getActivityMonitoring(): Promise<ActivityMonitoringResponse> {
    return this.request<ActivityMonitoringResponse>('/admin/activities');
  }

  resolveReport(reportId: string, status: 'RESOLVED' | 'DISMISSED', resolutionNote?: string) {
    return this.request(`/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, resolutionNote }),
    });
  }

  // Events
  listEvents(): Promise<CampEventItem[]> {
    return this.request<CampEventItem[]>('/events');
  }

  createEvent(payload: {
    campId?: number;
    locationId?: number;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    rewardCp: number;
    rewardNaira: number;
    maxParticipants?: number;
    minCharismaRequired?: number;
    targetPlatoonId?: number;
  }): Promise<CampEventItem> {
    return this.request<CampEventItem>('/admin/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  cancelEvent(eventId: string, reason: string) {
    return this.request<{ eventId: string; status: EventStatus; message: string }>(
      `/admin/events/${encodeURIComponent(eventId)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  }

  getEventParticipants(eventId: string) {
    return this.request<{
      eventId: string;
      title: string;
      totalParticipants: number;
      maxParticipants: number;
      participants: Array<{
        id: string;
        userId: string;
        displayName: string;
        stateCode: string;
        platoon: { id: number; number: number; name: string } | null;
        registeredAt: string;
        attended: boolean;
        rewardClaimed: boolean;
        claimedAt?: string;
      }>;
    }>(`/admin/events/${encodeURIComponent(eventId)}/participants`);
  }

  // Locations
  listLocations(): Promise<CampLocation[]> {
    return this.request<CampLocation[]>('/world/locations?includeInactive=true');
  }

  createLocation(payload: {
    slug: string;
    name: string;
    category: string;
    posX: number;
    posY: number;
    posZ: number;
    triggerRadius?: number;
    description?: string;
  }): Promise<CampLocation> {
    return this.request<CampLocation>('/admin/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateLocation(
    locationId: number,
    payload: Partial<Pick<CampLocation, 'name' | 'category' | 'posX' | 'posY' | 'posZ' | 'triggerRadius' | 'description' | 'isActive'>>
  ): Promise<CampLocation> {
    return this.request<CampLocation>(`/admin/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  toggleLocationActive(locationId: number, isActive: boolean): Promise<CampLocation> {
    return this.request<CampLocation>(`/admin/locations/${locationId}/toggle-active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  softDeleteLocation(locationId: number) {
    return this.request<{ success: boolean; message: string; locationId: number }>(`/admin/locations/${locationId}`, {
      method: 'DELETE',
    });
  }

  // Platoons
  listPlatoons(): Promise<PlatoonItem[]> {
    return this.request<PlatoonItem[]>('/platoons');
  }

  getPlatoonDetails(platoonId: number) {
    return this.request<{
      platoon: PlatoonItem;
      totalMembers: number;
      members: Array<{
        userId: string;
        displayName: string;
        stateCode: string;
        paradeRank: string;
        level: number;
        experiencePoints: number;
        charismaScore: number;
      }>;
    }>(`/platoons/${platoonId}`);
  }

  createPlatoon(payload: { number: number; name: string; colorHex: string; motto: string }): Promise<PlatoonItem> {
    return this.request<PlatoonItem>('/admin/platoons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updatePlatoon(platoonId: number, payload: { name?: string; colorHex?: string; motto?: string }): Promise<PlatoonItem> {
    return this.request<PlatoonItem>(`/admin/platoons/${platoonId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  reassignPlayerPlatoon(targetUserId: string, newPlatoonId: number) {
    return this.request('/admin/platoons/assign', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, newPlatoonId }),
    });
  }

  // Market & Economy
  listMarketProducts(): Promise<{ products: MarketProductItem[]; conversionRate: { cp: number; naira: number } }> {
    return this.request('/admin/market/products');
  }

  createMarketProduct(payload: {
    categoryId: number;
    name: string;
    description: string;
    priceNaira: number;
    waterRefillValue?: number;
    staminaBoostValue?: number;
    charismaBoostValue?: number;
    stockQuantity?: number;
    iconKey?: string;
  }): Promise<MarketProductItem> {
    return this.request<MarketProductItem>('/admin/market/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateMarketProduct(
    productId: number,
    payload: Partial<Pick<MarketProductItem, 'name' | 'description' | 'priceNaira' | 'stockQuantity' | 'isActive' | 'waterRefillValue'>>
  ): Promise<MarketProductItem> {
    return this.request<MarketProductItem>(`/admin/market/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  updateConversionRate(cp: number, naira: number): Promise<{ cp: number; naira: number }> {
    return this.request<{ cp: number; naira: number }>('/admin/economy/rates', {
      method: 'PUT',
      body: JSON.stringify({ cp, naira }),
    });
  }

  getGameConfig(): Promise<GameConfigData> {
    return this.request<GameConfigData>('/admin/config');
  }

  updateGameConfig(payload: Partial<Omit<GameConfigData, 'updatedAt'>>): Promise<GameConfigData> {
    return this.request<GameConfigData>('/admin/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Audit & Staff
  getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    return this.request<AuditLogEntry[]>(`/admin/audit-logs?limit=${limit}`);
  }

  listStaffAndInvitations(): Promise<{
    staff: AdminUser[];
    invitations: Array<{
      id: string;
      email: string;
      token: string;
      invitedByUserId: string;
      assignedRole: UserRole;
      permissions: Permission[];
      status: InvitationStatus;
      isConsumed: boolean;
      consumedAt?: string;
      consumedByUserId?: string;
      revokedAt?: string;
      revokeReason?: string;
      expiresAt: string;
      createdAt: string;
    }>;
    assignablePermissions: Permission[];
  }> {
    return this.request('/admin/staff');
  }

  createAdminInvitation(
    email: string,
    role: 'ADMIN' | 'PLAYER' = 'ADMIN',
    permissions?: Permission[],
    expiresInHours = 48
  ) {
    return this.request<{
      invitationId: string;
      email: string;
      token: string;
      assignedRole: UserRole;
      permissions: Permission[];
      status: InvitationStatus;
      expiresAt: string;
      invitationUrl: string;
    }>('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify({ email, role, permissions, expiresInHours }),
    });
  }

  revokeAdminInvitation(invitationId: string, reason?: string) {
    return this.request<{ id: string; status: InvitationStatus }>(`/admin/invitations/${encodeURIComponent(invitationId)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  setAdminPermissions(userId: string, permissions: Permission[]) {
    return this.request<{ userId: string; email: string; role: UserRole; permissions: Permission[] }>(
      `/admin/staff/${encodeURIComponent(userId)}/permissions`,
      {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }
    );
  }

  async acceptAdminInvitation(
    token: string,
    email: string,
    stateCode: string,
    fullName?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: AdminUser }> {
    const res = await fetch(`${this.baseUrl}/auth/accept-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, stateCode, fullName }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.status !== 'success' && !json.success)) {
      throw new Error(json.message || 'Unable to redeem invitation token.');
    }
    const data = json.data;
    if (data.accessToken && data.refreshToken) {
      this.saveTokens(data.accessToken, data.refreshToken);
    }
    return data;
  }
}

export const adminApi = new AdminApiClient();
