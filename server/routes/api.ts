/**
 * Corper Wee: Master v1 API Router
 * Comprehensive endpoints for Auth, Players, Characters, Platoons,
 * Activities, Economy, Mami Market, Events, Locations, and Admin Portal.
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AuthController } from '../controllers/authController.js';
import { PlayerController } from '../controllers/playerController.js';
import { PlatoonController } from '../controllers/platoonController.js';
import { ActivityController } from '../controllers/activityController.js';
import { MarketController } from '../controllers/marketController.js';
import { WorldController } from '../controllers/worldController.js';
import { EventController } from '../controllers/eventController.js';
import { AdminController } from '../controllers/adminController.js';

export const apiRouter = Router();

// Validation Schemas
const googleAuthSchema = z.object({
  idToken: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
});

const stateCodeSchema = z.object({
  stateCode: z.string().min(8).max(20),
  campNickname: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const characterUpdateSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  skinToneHex: z.string().optional(),
  hairstyle: z.string().optional(),
  hairColorHex: z.string().optional(),
  uniformType: z.string().optional(),
  footwear: z.string().optional(),
  accessory: z.string().optional(),
});

const paradeSubmitSchema = z.object({
  sequenceId: z.string().optional(),
  results: z.array(
    z.object({
      command: z.string(),
      responseTimeMs: z.number(),
      isCorrect: z.boolean(),
    })
  ),
});

const canteenRushSchema = z.object({
  timeTakenSeconds: z.number().positive(),
  obstaclesCleared: z.number().nonnegative().optional(),
  puddlesHit: z.number().nonnegative().optional(),
  staminaRemaining: z.number().nonnegative().optional(),
});

const exchangeSchema = z.object({
  pointsToExchange: z.number().positive(),
  idempotencyKey: z.string().optional(),
});

const purchaseSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().optional(),
  idempotencyKey: z.string().optional(),
});

const adminCreateProductSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(2),
  description: z.string().min(3),
  priceNaira: z.number().nonnegative(),
  waterRefillValue: z.number().nonnegative().optional(),
  staminaBoostValue: z.number().nonnegative().optional(),
  charismaBoostValue: z.number().int().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  iconKey: z.string().optional(),
});

const adminCreatePlatoonSchema = z.object({
  campId: z.number().int().positive().optional(),
  number: z.number().int().positive(),
  name: z.string().min(3),
  colorHex: z.string().min(4),
  motto: z.string().min(3),
});

const adminReassignPlatoonSchema = z.object({
  targetUserId: z.string().min(1),
  newPlatoonId: z.number().int().positive(),
});

const adminCreateLocationSchema = z.object({
  campId: z.number().int().positive().optional(),
  slug: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  posX: z.number(),
  posY: z.number(),
  posZ: z.number(),
  triggerRadius: z.number().positive().optional(),
  description: z.string().optional(),
});

const adminCreateEventSchema = z.object({
  campId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  title: z.string().min(3),
  description: z.string().min(5),
  startTime: z.string().min(10),
  endTime: z.string().min(10),
  rewardCp: z.number().int().nonnegative(),
  rewardNaira: z.number().nonnegative(),
  maxParticipants: z.number().int().positive().optional(),
  minCharismaRequired: z.number().int().nonnegative().optional(),
  targetPlatoonId: z.number().int().positive().optional(),
});

// 1. HEALTH CHECK
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Corper Wee Authoritative API',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 2. AUTHENTICATION MODULE
apiRouter.post('/auth/google', validateBody(googleAuthSchema), AuthController.googleAuth);
apiRouter.post('/auth/register-state-code', authenticate, validateBody(stateCodeSchema), AuthController.registerStateCode);
apiRouter.post('/auth/refresh', validateBody(refreshTokenSchema), AuthController.refreshSession);
apiRouter.post('/auth/logout', AuthController.logout);

// 3. PLAYERS & CHARACTERS MODULE
apiRouter.get('/players/me', authenticate, PlayerController.getMe);
apiRouter.get('/players/:id', authenticate, PlayerController.getPublicProfile);
apiRouter.put('/players/character', authenticate, validateBody(characterUpdateSchema), PlayerController.updateCharacter);

// 4. PLATOONS & LEADERBOARDS MODULE
apiRouter.get('/platoons', authenticate, PlatoonController.listPlatoons);
apiRouter.get('/platoons/leaderboard', authenticate, PlatoonController.getLeaderboard);
apiRouter.get('/platoons/:id', authenticate, PlatoonController.getPlatoonDetails);

// 5. ACTIVITIES & MINI-GAMES MODULE
apiRouter.post('/activities/parade/submit', authenticate, validateBody(paradeSubmitSchema), ActivityController.submitParadeDrill);
apiRouter.post('/activities/canteen-rush/submit', authenticate, validateBody(canteenRushSchema), ActivityController.submitCanteenRush);
apiRouter.post('/activities/stealth/report', authenticate, ActivityController.reportStealth);
apiRouter.post('/activities/water/deplete', authenticate, ActivityController.depleteWater);
apiRouter.post('/activities/water/consume', authenticate, ActivityController.consumeWater);

// 6. ECONOMY, WALLET & MAMI MARKET MODULE
apiRouter.get('/market/products', authenticate, MarketController.getProducts);
apiRouter.post('/market/buy', authenticate, validateBody(purchaseSchema), MarketController.buyProduct);
apiRouter.get('/market/inventory', authenticate, MarketController.getInventory);
apiRouter.post('/economy/exchange', authenticate, validateBody(exchangeSchema), MarketController.exchangeCurrency);
apiRouter.get('/wallet/transactions', authenticate, MarketController.getTransactions);

// 7. WORLD & LOCATIONS MODULE
apiRouter.get('/world/locations', authenticate, WorldController.getLocations);
apiRouter.get('/world/locations/:id', authenticate, WorldController.getLocationById);
apiRouter.get('/world/corpers', authenticate, WorldController.getNearbyCorpers);
apiRouter.post('/social/interact', authenticate, WorldController.socialInteract);

// 8. CAMP EVENTS MODULE
apiRouter.get('/events', authenticate, EventController.listEvents);
apiRouter.get('/events/:id', authenticate, EventController.getEventDetails);
apiRouter.post('/events/:id/join', authenticate, EventController.joinEvent);
apiRouter.post('/events/:id/claim-reward', authenticate, EventController.claimReward);

// 9. ADMIN PORTAL OPERATIONS (Admin & Superadmin)
apiRouter.get('/admin/dashboard', authenticate, requireRole('ADMIN', 'SUPERADMIN'), AdminController.getDashboard);
apiRouter.get('/admin/players', authenticate, requireRole('ADMIN', 'SUPERADMIN'), AdminController.listPlayers);
apiRouter.post('/admin/players/:id/status', authenticate, requireRole('ADMIN', 'SUPERADMIN'), AdminController.setPlayerStatus);
apiRouter.put('/admin/economy/rates', authenticate, requireRole('ADMIN', 'SUPERADMIN'), AdminController.updateConversionRate);

// Admin Platoon Management
apiRouter.post('/admin/platoons', authenticate, requireRole('ADMIN', 'SUPERADMIN'), validateBody(adminCreatePlatoonSchema), PlatoonController.adminCreatePlatoon);
apiRouter.put('/admin/platoons/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), PlatoonController.adminUpdatePlatoon);
apiRouter.post('/admin/platoons/assign', authenticate, requireRole('ADMIN', 'SUPERADMIN'), validateBody(adminReassignPlatoonSchema), PlatoonController.adminReassignPlayer);

// Admin Market Controls
apiRouter.post('/admin/market/products', authenticate, requireRole('ADMIN', 'SUPERADMIN'), validateBody(adminCreateProductSchema), MarketController.adminCreateProduct);
apiRouter.put('/admin/market/products/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), MarketController.adminUpdateProduct);

// Admin Location Management
apiRouter.post('/admin/locations', authenticate, requireRole('ADMIN', 'SUPERADMIN'), validateBody(adminCreateLocationSchema), WorldController.adminCreateLocation);
apiRouter.put('/admin/locations/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), WorldController.adminUpdateLocation);
apiRouter.patch('/admin/locations/:id/toggle-active', authenticate, requireRole('ADMIN', 'SUPERADMIN'), WorldController.adminToggleLocationActive);
apiRouter.delete('/admin/locations/:id', authenticate, requireRole('ADMIN', 'SUPERADMIN'), WorldController.adminSoftDeleteLocation);

// Admin Event Management
apiRouter.post('/admin/events', authenticate, requireRole('ADMIN', 'SUPERADMIN'), validateBody(adminCreateEventSchema), EventController.adminCreateEvent);
apiRouter.post('/admin/events/:id/cancel', authenticate, requireRole('ADMIN', 'SUPERADMIN'), EventController.adminCancelEvent);
apiRouter.get('/admin/events/:id/participants', authenticate, requireRole('ADMIN', 'SUPERADMIN'), EventController.adminGetParticipants);

// 10. SUPERADMIN EXCLUSIVE MODULE
apiRouter.post('/admin/invitations', authenticate, requireRole('SUPERADMIN'), AdminController.createInvitation);
apiRouter.get('/admin/audit-logs', authenticate, requireRole('SUPERADMIN'), AdminController.getAuditLogs);
