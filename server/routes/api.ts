/**
 * Corper Wee: Master v1 API Router
 * Comprehensive endpoints for Auth, Players, Characters, Platoons,
 * Activities, Economy, Mami Market, Events, Locations, Live Game Config, and Admin Portal.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { AuthController } from '../controllers/authController.js';
import { PlayerController } from '../controllers/playerController.js';
import { PlatoonController } from '../controllers/platoonController.js';
import { ActivityController } from '../controllers/activityController.js';
import { MarketController } from '../controllers/marketController.js';
import { WorldController } from '../controllers/worldController.js';
import { EventController } from '../controllers/eventController.js';
import { AdminController } from '../controllers/adminController.js';
import { config, validateProductionConfig } from '../config/env.js';
import { getPostgresStatus } from '../db/postgresPool.js';
import { getRedisStatus } from '../config/redis.js';
import { TelemetryService } from '../services/telemetryService.js';
import { MultiplayerGateway } from '../multiplayerGateway.js';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './legalContent.js';

export const apiRouter = Router();

// Rate limiters protecting sensitive endpoints against brute-force & API abuse
const authRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 60, keyPrefix: 'auth' });
const mutationRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 120, keyPrefix: 'mutation' });

// Validation Schemas
const demoAuthSchema = z.object({
  email: z.string().email('A valid email address is required').max(160),
  stateCode: z.string().min(8, 'NYSC State Code is required').max(20),
  fullName: z.string().max(100).optional(),
  displayName: z.string().max(100).optional(),
});

const acceptInviteSchema = z.object({
  token: z.string().min(10).max(128),
  email: z.string().email().max(160),
  stateCode: z.string().min(8).max(20),
  fullName: z.string().max(100).optional(),
});

const googleAuthSchema = z.object({
  idToken: z.string().optional(),
  email: z.string().optional(),
  stateCode: z.string().optional(),
  displayName: z.string().optional(),
  fullName: z.string().optional(),
});

const stateCodeSchema = z.object({
  stateCode: z.string().min(8).max(20),
  campNickname: z.string().max(60).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const characterUpdateSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  skinToneHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  hairstyle: z.string().min(1).max(60).optional(),
  hairColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  uniformType: z.string().min(1).max(60).optional(),
  footwear: z.string().min(1).max(60).optional(),
  accessory: z.string().max(60).optional(),
});

const paradeSubmitSchema = z.object({
  sequenceId: z.string().max(80).optional(),
  difficulty: z.enum(['EASY', 'NORMAL', 'HARD']).optional(),
  results: z
    .array(
      z.object({
        command: z.string().max(60),
        responseTimeMs: z.number().min(0).max(60000),
        isCorrect: z.boolean(),
      })
    )
    .max(50, 'Maximum 50 commands allowed per drill submission')
    .optional(),
  commandsTotal: z.number().int().positive().max(50).optional(),
  commandsSuccessful: z.number().int().nonnegative().max(50).optional(),
});

const canteenRushSchema = z.object({
  timeTakenSeconds: z.number().min(3).max(600),
  obstaclesCleared: z.number().int().min(0).max(50).optional(),
  puddlesHit: z.number().int().min(0).max(100).optional(),
  staminaRemaining: z.number().min(0).max(100).optional(),
});

const stealthReportSchema = z.object({
  survived: z.boolean(),
  timeInZoneSec: z.number().min(1).max(300).optional(),
});

const waterDepleteSchema = z.object({
  deltaSeconds: z.number().positive().max(120).optional(),
  isRunning: z.boolean().optional(),
  weather: z.enum(['SUNNY', 'CLOUDY', 'LIGHT_RAIN']).optional(),
});

const waterConsumeSchema = z.object({
  productId: z.number().int().positive(),
});

const dailyTaskAlertSchema = z.object({
  timeOfDay: z.enum(['MORNING', 'DAY', 'NIGHT']).optional(),
  force: z.boolean().optional(),
});

const dailyTaskCompleteSchema = z.object({
  taskType: z.enum(['MORNING_DRILL', 'EVENING_PARADE']),
  accuracy: z.number().min(0).max(100).optional(),
});

const exchangeSchema = z.object({
  pointsToExchange: z.number().int().positive().max(1_000_000),
  idempotencyKey: z.string().max(128).optional(),
});

const purchaseSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(100).optional(),
  idempotencyKey: z.string().max(128).optional(),
});

const socialInteractSchema = z.object({
  targetUserId: z.string().min(1).max(80),
  interactionType: z.string().max(40).optional(),
  dialogueOptionId: z.string().max(60).optional(),
});

const friendRequestSchema = z.object({
  targetUserId: z.string().min(1).max(80),
});

const friendRespondSchema = z.object({
  friendshipId: z.string().min(1).max(80),
  accept: z.boolean(),
});

const blockUserSchema = z.object({
  targetUserId: z.string().min(1).max(80),
  reason: z.string().max(200).optional(),
});

const reportUserSchema = z.object({
  targetUserId: z.string().min(1).max(80),
  reason: z.string().min(2).max(120),
  details: z.string().max(500).optional(),
});

const privacyUpdateSchema = z.object({
  allowInteractions: z.boolean().optional(),
  allowFriendRequests: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
});

const adminCreateProductSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(2).max(120),
  description: z.string().min(3).max(400),
  priceNaira: z.number().nonnegative().max(10_000_000),
  waterRefillValue: z.number().min(-50).max(100).optional(),
  staminaBoostValue: z.number().nonnegative().max(100).optional(),
  charismaBoostValue: z.number().int().min(0).max(100).optional(),
  stockQuantity: z.number().int().nonnegative().max(1_000_000).optional(),
  iconKey: z.string().max(40).optional(),
});

const adminUpdateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(3).max(400).optional(),
  priceNaira: z.number().nonnegative().max(10_000_000).optional(),
  stockQuantity: z.number().int().nonnegative().max(1_000_000).optional(),
  isActive: z.boolean().optional(),
  waterRefillValue: z.number().min(-50).max(100).optional(),
});

const adminCreatePlatoonSchema = z.object({
  campId: z.number().int().positive().optional(),
  number: z.number().int().positive(),
  name: z.string().min(3).max(80),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  motto: z.string().min(3).max(160),
});

const adminUpdatePlatoonSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  motto: z.string().min(3).max(160).optional(),
});

const adminReassignPlatoonSchema = z.object({
  targetUserId: z.string().min(1),
  newPlatoonId: z.number().int().positive(),
});

const adminCreateLocationSchema = z.object({
  campId: z.number().int().positive().optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(40),
  posX: z.number().min(-5000).max(5000),
  posY: z.number().min(-500).max(500),
  posZ: z.number().min(-5000).max(5000),
  triggerRadius: z.number().positive().max(500).optional(),
  description: z.string().max(400).optional(),
});

const adminUpdateLocationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  category: z.string().min(2).max(40).optional(),
  posX: z.number().min(-5000).max(5000).optional(),
  posY: z.number().min(-500).max(500).optional(),
  posZ: z.number().min(-5000).max(5000).optional(),
  triggerRadius: z.number().positive().max(500).optional(),
  description: z.string().max(400).optional(),
  isActive: z.boolean().optional(),
});

const adminCreateEventSchema = z.object({
  campId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(500),
  startTime: z.string().min(10),
  endTime: z.string().min(10),
  rewardCp: z.number().int().nonnegative().max(100_000),
  rewardNaira: z.number().nonnegative().max(1_000_000),
  maxParticipants: z.number().int().positive().max(10_000).optional(),
  minCharismaRequired: z.number().int().nonnegative().max(100).optional(),
  targetPlatoonId: z.number().int().positive().optional(),
});

const adminSetStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().max(300).optional(),
});

const adminDeleteUserSchema = z.object({
  reason: z.string().min(3, 'A deletion reason is required for the audit log').max(300).optional(),
});

const adminSetRoleSchema = z.object({
  role: z.enum(['PLAYER', 'ADMIN']),
});

const permissionEnum = z.enum([
  'MANAGE_PLAYERS',
  'SUSPEND_PLAYERS',
  'MANAGE_ECONOMY',
  'SCHEDULE_EVENTS',
  'VIEW_AUDIT_LOGS',
]);

const adminAssignPermissionsSchema = z.object({
  permissions: z.array(permissionEnum),
});

const adminCreateInviteSchema = z.object({
  email: z.string().email('Valid invitee email address is required').max(160),
  role: z.enum(['ADMIN', 'PLAYER']).optional(),
  permissions: z.array(permissionEnum).optional(),
  expiresInHours: z.number().int().min(1).max(168).optional(),
});

const adminRevokeInviteSchema = z.object({
  reason: z.string().max(300).optional(),
});

const adminUpdateRateSchema = z.object({
  cp: z.number().positive().max(100_000),
  naira: z.number().positive().max(10_000_000),
});

const adminUpdateGameConfigSchema = z.object({
  conversionRate: adminUpdateRateSchema.optional(),
  paradeRewards: z
    .object({
      baseCpPerCommand: z.number().int().min(1).max(500),
      tier1AccuracyMin: z.number().min(50).max(100),
      tier1Multiplier: z.number().min(1).max(5),
      tier2AccuracyMin: z.number().min(30).max(99),
      tier2Multiplier: z.number().min(1).max(5),
      charismaGainThreshold: z.number().min(50).max(100),
    })
    .optional(),
  canteenRewards: z
    .object({
      cpPerObstacle: z.number().int().min(1).max(200),
      puddlePenaltyCp: z.number().int().min(0).max(200),
      speedBonusCutoffSec: z.number().min(10).max(300),
      speedBonusMultiplier: z.number().min(0).max(20),
      minRewardCp: z.number().int().min(0).max(500),
      waterDrainAmount: z.number().min(0).max(80),
    })
    .optional(),
  stealthConfig: z
    .object({
      cpPerSecondSurvived: z.number().min(0).max(50),
      maxSurvivalCp: z.number().int().min(10).max(2000),
      caughtPenaltyCp: z.number().int().min(0).max(500),
    })
    .optional(),
  hydrationDrain: z
    .object({
      idlePerSec: z.number().min(0).max(5),
      runPerSec: z.number().min(0).max(10),
      criticalThreshold: z.number().min(5).max(80),
    })
    .optional(),
});

const adminResolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  resolutionNote: z.string().max(400).optional(),
});

// 1. HEALTH, OBSERVABILITY & LEGAL COMPLIANCE
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Corper Wee Authoritative API',
    version: config.releaseVersion,
    environment: config.env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

apiRouter.get('/health/ready', (_req, res) => {
  const configReport = validateProductionConfig();
  const postgres = getPostgresStatus();
  const redis = getRedisStatus();
  const ready =
    configReport.valid &&
    postgres.validConnectionString &&
    redis.validUrl;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    environment: config.env,
    version: config.releaseVersion,
    checks: {
      config: configReport,
      database: postgres,
      redis,
      websocket: {
        connectedPlayers: MultiplayerGateway.getConnectedPlayerCount(),
      },
    },
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/metrics', (req, res) => {
  const expectedToken = config.observability.metricsBearerToken;
  if (config.isProduction && expectedToken && expectedToken !== 'REPLACE_WITH_PROMETHEUS_SCRAPE_TOKEN') {
    const authHeader = req.header('authorization') || '';
    if (authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ status: 'error', message: 'Metrics bearer token required' });
    }
  }
  res
    .status(200)
    .set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    .send(TelemetryService.toPrometheusMetrics(MultiplayerGateway.getConnectedPlayerCount()));
});

const clientErrorSchema = z.object({
  message: z.string().min(1).max(600),
  name: z.string().max(100).optional(),
  stack: z.string().max(2000).optional(),
  path: z.string().max(200).optional(),
  platform: z.string().max(80).optional(),
});

apiRouter.post(
  '/telemetry/client-error',
  createRateLimiter({ windowMs: 60_000, maxRequests: 30, keyPrefix: 'client-err' }),
  validateBody(clientErrorSchema),
  (req, res) => {
    const report = TelemetryService.captureClientError({
      ...req.body,
      userId: (req as any).user?.id,
    });
    res.status(202).json({
      status: 'success',
      data: { errorId: report.id, recordedAt: report.timestamp },
    });
  }
);

apiRouter.get('/legal/privacy', (_req, res) => {
  res.status(200).json({ status: 'success', data: PRIVACY_POLICY });
});

apiRouter.get('/legal/terms', (_req, res) => {
  res.status(200).json({ status: 'success', data: TERMS_OF_SERVICE });
});

// 2. AUTHENTICATION MODULE
apiRouter.post('/auth/login', authRateLimit, validateBody(demoAuthSchema), AuthController.loginOrSignup);
apiRouter.post('/auth/signup', authRateLimit, validateBody(demoAuthSchema), AuthController.loginOrSignup);
apiRouter.post('/auth/authenticate', authRateLimit, validateBody(demoAuthSchema), AuthController.loginOrSignup);
apiRouter.post('/auth/accept-invitation', authRateLimit, validateBody(acceptInviteSchema), AuthController.acceptInvitation);
apiRouter.post('/auth/google', authRateLimit, validateBody(googleAuthSchema), AuthController.googleAuth);
apiRouter.post('/auth/register-state-code', authenticate, validateBody(stateCodeSchema), AuthController.registerStateCode);
apiRouter.post('/auth/refresh', authRateLimit, validateBody(refreshTokenSchema), AuthController.refreshSession);
apiRouter.post('/auth/logout', AuthController.logout);

// 3. LIVE GAME CONFIGURATION (Zero-Release Dynamic Sync for Web & Mobile)
apiRouter.get('/config/game', authenticate, AdminController.getClientLiveGameConfig);

// 4. PLAYERS & CHARACTERS MODULE
apiRouter.get('/players/me', authenticate, PlayerController.getMe);
apiRouter.get('/players/:id', authenticate, PlayerController.getPublicProfile);
apiRouter.put('/players/character', authenticate, validateBody(characterUpdateSchema), PlayerController.updateCharacter);

// 5. PLATOONS & LEADERBOARDS MODULE
apiRouter.get('/platoons', authenticate, PlatoonController.listPlatoons);
apiRouter.get('/platoons/leaderboard', authenticate, PlatoonController.getLeaderboard);
apiRouter.get('/platoons/:id', authenticate, PlatoonController.getPlatoonDetails);

// 6. ACTIVITIES & MINI-GAMES MODULE
apiRouter.get('/activities/daily-tasks', authenticate, ActivityController.getDailyTasks);
apiRouter.post('/activities/daily-tasks/alert', authenticate, mutationRateLimit, validateBody(dailyTaskAlertSchema), ActivityController.triggerDailyTaskAlert);
apiRouter.post('/activities/daily-tasks/complete', authenticate, mutationRateLimit, validateBody(dailyTaskCompleteSchema), ActivityController.completeDailyTask);
apiRouter.post('/activities/parade/submit', authenticate, mutationRateLimit, validateBody(paradeSubmitSchema), ActivityController.submitParadeDrill);
apiRouter.post('/activities/canteen-rush/submit', authenticate, mutationRateLimit, validateBody(canteenRushSchema), ActivityController.submitCanteenRush);
apiRouter.post('/activities/stealth/report', authenticate, mutationRateLimit, validateBody(stealthReportSchema), ActivityController.reportStealth);
apiRouter.post('/activities/water/deplete', authenticate, mutationRateLimit, validateBody(waterDepleteSchema), ActivityController.depleteWater);
apiRouter.post('/activities/water/consume', authenticate, mutationRateLimit, validateBody(waterConsumeSchema), ActivityController.consumeWater);

// 7. ECONOMY, WALLET & MAMI MARKET MODULE
apiRouter.get('/market/products', authenticate, MarketController.getProducts);
apiRouter.post('/market/buy', authenticate, mutationRateLimit, validateBody(purchaseSchema), MarketController.buyProduct);
apiRouter.get('/market/inventory', authenticate, MarketController.getInventory);
apiRouter.post('/economy/exchange', authenticate, mutationRateLimit, validateBody(exchangeSchema), MarketController.exchangeCurrency);
apiRouter.get('/wallet/transactions', authenticate, MarketController.getTransactions);

// 8. WORLD, LOCATIONS & SOCIAL MODULE
apiRouter.get('/world/locations', authenticate, WorldController.getLocations);
apiRouter.get('/world/locations/:id', authenticate, WorldController.getLocationById);
apiRouter.get('/world/corpers', authenticate, WorldController.getNearbyCorpers);
apiRouter.get('/world/notifications', authenticate, WorldController.getNotifications);
apiRouter.post('/social/interact', authenticate, mutationRateLimit, validateBody(socialInteractSchema), WorldController.socialInteract);
apiRouter.get('/social/friends', authenticate, WorldController.getFriends);
apiRouter.post('/social/friends/request', authenticate, mutationRateLimit, validateBody(friendRequestSchema), WorldController.sendFriendRequest);
apiRouter.post('/social/friends/respond', authenticate, mutationRateLimit, validateBody(friendRespondSchema), WorldController.respondFriendRequest);
apiRouter.post('/social/block', authenticate, mutationRateLimit, validateBody(blockUserSchema), WorldController.blockUser);
apiRouter.post('/social/report', authenticate, mutationRateLimit, validateBody(reportUserSchema), WorldController.reportUser);
apiRouter.get('/social/privacy', authenticate, WorldController.getPrivacy);
apiRouter.put('/social/privacy', authenticate, validateBody(privacyUpdateSchema), WorldController.updatePrivacy);

// 9. CAMP EVENTS MODULE
apiRouter.get('/events', authenticate, EventController.listEvents);
apiRouter.get('/events/:id', authenticate, EventController.getEventDetails);
apiRouter.post('/events/:id/join', authenticate, mutationRateLimit, EventController.joinEvent);
apiRouter.post('/events/:id/claim-reward', authenticate, mutationRateLimit, EventController.claimReward);

// 10. ADMIN PORTAL OPERATIONS (Admin & Superadmin + Granular Permission Enforcement)
apiRouter.get('/admin/dashboard', authenticate, requireRole('ADMIN', 'SUPERADMIN'), AdminController.getDashboard);
apiRouter.get('/admin/players', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), AdminController.listPlayers);
apiRouter.get('/admin/players/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), AdminController.getPlayerDetails);
apiRouter.post('/admin/players/:id/status', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SUSPEND_PLAYERS'), validateBody(adminSetStatusSchema), AdminController.setPlayerStatus);
apiRouter.delete('/admin/players/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SUSPEND_PLAYERS'), validateBody(adminDeleteUserSchema), AdminController.deletePlayerWithRetention);
apiRouter.get('/admin/activities', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), AdminController.getActivityMonitoring);
apiRouter.post('/admin/reports/:id/resolve', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), validateBody(adminResolveReportSchema), AdminController.resolveReport);
apiRouter.get('/admin/config', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_ECONOMY'), AdminController.getAdminConfig);
apiRouter.put('/admin/config', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_ECONOMY'), validateBody(adminUpdateGameConfigSchema), AdminController.updateGameConfig);
apiRouter.put('/admin/economy/rates', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_ECONOMY'), validateBody(adminUpdateRateSchema), AdminController.updateConversionRate);
apiRouter.get('/admin/audit-logs', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('VIEW_AUDIT_LOGS'), AdminController.getAuditLogs);

// Admin Platoon Management
apiRouter.post('/admin/platoons', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), validateBody(adminCreatePlatoonSchema), PlatoonController.adminCreatePlatoon);
apiRouter.put('/admin/platoons/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), validateBody(adminUpdatePlatoonSchema), PlatoonController.adminUpdatePlatoon);
apiRouter.post('/admin/platoons/assign', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_PLAYERS'), validateBody(adminReassignPlatoonSchema), PlatoonController.adminReassignPlayer);

// Admin Market Controls
apiRouter.get('/admin/market/products', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_ECONOMY'), MarketController.adminGetAllProducts);
apiRouter.post('/admin/market/products', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_ECONOMY'), validateBody(adminCreateProductSchema), MarketController.adminCreateProduct);
apiRouter.put('/admin/market/products/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('MANAGE_ECONOMY'), validateBody(adminUpdateProductSchema), MarketController.adminUpdateProduct);

// Admin Location Management
apiRouter.post('/admin/locations', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), validateBody(adminCreateLocationSchema), WorldController.adminCreateLocation);
apiRouter.put('/admin/locations/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), validateBody(adminUpdateLocationSchema), WorldController.adminUpdateLocation);
apiRouter.patch('/admin/locations/:id/toggle-active', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), WorldController.adminToggleLocationActive);
apiRouter.delete('/admin/locations/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), WorldController.adminSoftDeleteLocation);

// Admin Event Management
apiRouter.post('/admin/events', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), validateBody(adminCreateEventSchema), EventController.adminCreateEvent);
apiRouter.post('/admin/events/:id/cancel', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), EventController.adminCancelEvent);
apiRouter.get('/admin/events/:id/participants', authenticate, requireRole('ADMIN', 'SUPERADMIN'), requirePermission('SCHEDULE_EVENTS'), EventController.adminGetParticipants);

// 11. SUPERADMIN EXCLUSIVE MODULE
apiRouter.get('/admin/staff', authenticate, requireRole('SUPERADMIN'), AdminController.listStaff);
apiRouter.post('/admin/players/:id/role', authenticate, requireRole('SUPERADMIN'), validateBody(adminSetRoleSchema), AdminController.setPlayerRole);
apiRouter.put('/admin/staff/:id/permissions', authenticate, requireRole('SUPERADMIN'), validateBody(adminAssignPermissionsSchema), AdminController.setAdminPermissions);
apiRouter.post('/admin/invitations', authenticate, requireRole('SUPERADMIN'), validateBody(adminCreateInviteSchema), AdminController.createInvitation);
apiRouter.post('/admin/invitations/:id/revoke', authenticate, requireRole('SUPERADMIN'), validateBody(adminRevokeInviteSchema), AdminController.revokeInvitation);

apiRouter.get('/admin/monitoring', authenticate, requireRole('ADMIN', 'SUPERADMIN'), (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));
  res.status(200).json({
    status: 'success',
    data: {
      telemetry: TelemetryService.getSnapshot(MultiplayerGateway.getConnectedPlayerCount()),
      database: getPostgresStatus(),
      redis: getRedisStatus(),
      recentErrors: TelemetryService.getRecentErrors(limit),
    },
  });
});
