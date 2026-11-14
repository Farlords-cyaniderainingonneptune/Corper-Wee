/**
 * Corper Wee: Database Entity Types & Definitions
 */

export type UserRole = 'PLAYER' | 'ADMIN' | 'SUPERADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_REGISTRATION' | 'DELETED';
export type Gender = 'MALE' | 'FEMALE';
export type TransactionType = 'EARN_ACTIVITY' | 'PENALTY_ACTIVITY' | 'CP_EXCHANGE' | 'MARKET_PURCHASE' | 'ADMIN_ADJUSTMENT';
export type InteractionOutcome = 'GREAT_SUCCESS' | 'MILD_SUCCESS' | 'REJECTED' | 'COMEDIC_SLAP' | 'COMEDIC_PUNCH';
export type Permission =
  | 'ACCESS_GAMEPLAY'
  | 'MANAGE_OWN_PROFILE'
  | 'TRADE_ECONOMY'
  | 'VIEW_LEADERBOARDS'
  | 'MANAGE_PLAYERS'
  | 'SUSPEND_PLAYERS'
  | 'MANAGE_ECONOMY'
  | 'SCHEDULE_EVENTS'
  | 'INVITE_ADMINS'
  | 'MANAGE_ADMIN_ROLES'
  | 'VIEW_AUDIT_LOGS'
  | 'SYSTEM_CONFIGURATION';

export interface IdempotencyRecord {
  key: string;
  userId: string;
  action: string;
  responsePayload: any;
  createdAt: string;
  expiresAt: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
  replacedByTokenHash?: string;
  familyId: string;
}
export interface User {
  id: string;
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  stateCode?: string;
  role: UserRole;
  status: AccountStatus;
  isProtected: boolean; // Immutable superadmin protection
  customPermissions?: Permission[]; // Optional Superadmin-assigned permission subset for ADMINs
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
  retentionUntil?: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface AdminInvitation {
  id: string;
  email: string;
  token: string;
  invitedByUserId: string;
  assignedRole: UserRole;
  permissions: Permission[];
  status: InvitationStatus;
  isConsumed: boolean;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
  consumedByUserId?: string;
  revokedAt?: string;
  revokedByUserId?: string;
  revokeReason?: string;
}

export interface Platoon {
  id: number;
  campId: number;
  number: number;
  name: string;
  colorHex: string;
  motto: string;
  totalPoints: number;
  memberCount: number;
}

export interface PlayerProfile {
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
}

export interface PlayerCharacter {
  userId: string;
  gender: Gender;
  skinToneHex: string;
  hairstyle: string;
  hairColorHex: string;
  uniformType: string;
  footwear: string;
  accessory?: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  corperPoints: number;
  virtualNaira: number;
  updatedAt: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  activityType: string;
  description: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  transactionType: TransactionType;
  description: string;
  createdAt: string;
}

export interface WaterMeter {
  userId: string;
  currentLevel: number; // 0.0 - 100.0%
  lastDepletedAt: string;
  updatedAt: string;
}

export type EventStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface LocationZone {
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
  isDeleted: boolean; // Soft deletion to protect historical references
  createdAt: string;
  updatedAt: string;
}

export interface CampEvent {
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

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  registeredAt: string;
  attended: boolean;
  rewardClaimed: boolean;
  claimedAt?: string;
}

export interface ProductCategory {
  id: number;
  slug: string;
  name: string;
  description?: string;
}

export interface Product {
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

export interface InventoryItem {
  id: string;
  userId: string;
  productId: number;
  quantity: number;
  isEquipped: boolean;
  acquiredAt: string;
}

export interface ActivitySession {
  id: string;
  userId: string;
  activitySlug: string;
  score: number;
  pointsAwarded: number;
  accuracyPercentage: number;
  durationSeconds: number;
  completedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface Friendship {
  id: string;
  userId: string;
  friendUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  relationshipScore: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export interface UserBlock {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface UserPrivacySetting {
  userId: string;
  allowInteractions: boolean;
  allowFriendRequests: boolean;
  showOnlineStatus: boolean;
  updatedAt: string;
}

export interface GameSettings {
  key: string;
  value: any;
  description: string;
  updatedAt: string;
}

export type NotificationCategory =
  | 'CAMP_JOIN'
  | 'MEDAL_EARNED'
  | 'ACTIVITY_RECORD'
  | 'EVENT_UPDATE'
  | 'SOCIAL_MILESTONE'
  | 'DAILY_TASK_ALERT';

export type DailyDutyType = 'MORNING_DRILL' | 'EVENING_PARADE';

export interface DailyTaskCompletion {
  id: string;
  userId: string;
  dateKey: string;
  taskType: DailyDutyType;
  rewardCp: number;
  xpAwarded: number;
  accuracy?: number;
  completedAt: string;
}

export interface CampNotification {
  id: string;
  category: NotificationCategory;
  actorUserId: string;
  actorName: string;
  actorStateCode?: string;
  platoonNumber?: number;
  message: string;
  createdAt: string;
}
