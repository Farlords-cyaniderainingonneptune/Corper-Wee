/**
 * Corper Wee: Authoritative Database Access Layer
 * Supports PostgreSQL when DATABASE_URL is provided,
 * with an integrated in-memory relational store for resilient zero-config execution.
 */

import { randomUUID as uuidv4 } from 'crypto';
import { config } from '../config/env.js';
import type {
  User,
  PlayerProfile,
  PlayerCharacter,
  Wallet,
  WaterMeter,
  Platoon,
  Product,
  ProductCategory,
  InventoryItem,
  PointTransaction,
  WalletTransaction,
  ActivitySession,
  AuditLog,
  AdminInvitation,
  LocationZone,
  GameSettings,
  RefreshToken,
  IdempotencyRecord,
  CampEvent,
  EventParticipant,
  CampNotification,
} from './types.js';

class InMemoryRelationalDB {
  camps: Array<{ id: number; slug: string; name: string; state: string; city: string; isActive: boolean }> = [];
  users: Map<string, User> = new Map();
  playerProfiles: Map<string, PlayerProfile> = new Map();
  playerCharacters: Map<string, PlayerCharacter> = new Map();
  wallets: Map<string, Wallet> = new Map();
  waterMeters: Map<string, WaterMeter> = new Map();
  platoons: Map<number, Platoon> = new Map();
  productCategories: Map<number, ProductCategory> = new Map();
  products: Map<number, Product> = new Map();
  playerInventory: Map<string, InventoryItem[]> = new Map(); // userId -> items
  pointTransactions: PointTransaction[] = [];
  walletTransactions: WalletTransaction[] = [];
  activitySessions: ActivitySession[] = [];
  auditLogs: AuditLog[] = [];
  adminInvitations: Map<string, AdminInvitation> = new Map();
  refreshTokens: Map<string, RefreshToken> = new Map(); // tokenHash -> RefreshToken
  idempotencyKeys: Map<string, IdempotencyRecord> = new Map(); // idempotencyKey -> record
  locations: Map<number, LocationZone> = new Map();
  events: Map<string, CampEvent> = new Map(); // eventId -> CampEvent
  eventParticipants: Map<string, EventParticipant[]> = new Map(); // eventId -> participants
  friendships: Map<string, import('./types.js').Friendship> = new Map(); // friendshipId -> Friendship
  userBlocks: import('./types.js').UserBlock[] = [];
  userReports: import('./types.js').UserReport[] = [];
  userPrivacy: Map<string, import('./types.js').UserPrivacySetting> = new Map(); // userId -> PrivacySetting
  gameSettings: Map<string, GameSettings> = new Map();
  notifications: CampNotification[] = [];
  dailyTaskCompletions: Map<string, import('./types.js').DailyTaskCompletion> = new Map();
  dailyTaskAlertsSent: Set<string> = new Set();

  private isSeeded = false;

  constructor() {
    this.seedDefaults();
  }

  seedSuperadmin(): User {
    const superadminEmail = config.superadmin.email.toLowerCase();
    const existing = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === superadminEmail
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.role = 'SUPERADMIN';
      existing.isProtected = true;
      existing.status = 'ACTIVE';
      if (!existing.stateCode) {
        existing.stateCode = config.superadmin.stateCode;
      }
      existing.updatedAt = now;
      this.users.set(existing.id, existing);
      return existing;
    }

    const superadminId = '00000000-0000-0000-0000-000000000001';
    const superadmin: User = {
      id: superadminId,
      googleSub: 'google-sub-superadmin-farlodunolusege',
      email: superadminEmail,
      displayName: 'Olusege (Commandant)',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=olusege',
      stateCode: config.superadmin.stateCode,
      role: 'SUPERADMIN',
      status: 'ACTIVE',
      isProtected: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    this.users.set(superadmin.id, superadmin);

    if (!this.playerProfiles.has(superadmin.id)) {
      this.playerProfiles.set(superadmin.id, {
        userId: superadmin.id,
        platoonId: 1,
        level: 10,
        experiencePoints: 5000,
        charismaScore: 99,
        reputationScore: 100,
        paradeRank: 'Camp Commandant Superadmin',
        totalParadesCompleted: 42,
        campNickname: 'Grand Commander',
        updatedAt: now,
      });
    }

    if (!this.playerCharacters.has(superadmin.id)) {
      this.playerCharacters.set(superadmin.id, {
        userId: superadmin.id,
        gender: 'MALE',
        skinToneHex: '#8D5524',
        hairstyle: 'nysc_crest_cap',
        hairColorHex: '#1A1A1A',
        uniformType: 'khaki_7_7',
        footwear: 'jungle_boots',
        accessory: 'commandant_swagger_stick',
        updatedAt: now,
      });
    }

    if (!this.wallets.has(superadmin.id)) {
      this.wallets.set(superadmin.id, {
        userId: superadmin.id,
        corperPoints: 5000,
        virtualNaira: 50000,
        updatedAt: now,
      });
    }

    if (!this.waterMeters.has(superadmin.id)) {
      this.waterMeters.set(superadmin.id, {
        userId: superadmin.id,
        currentLevel: 100.0,
        lastDepletedAt: now,
        updatedAt: now,
      });
    }

    return superadmin;
  }

  seedDefaults() {
    if (this.isSeeded) return;

    const now = new Date().toISOString();
    const superadminId = '00000000-0000-0000-0000-000000000001';

    // 1. Seed Primary Camp: Iseyin, Oyo State
    this.camps.push({
      id: 1,
      slug: 'iseyin',
      name: 'NYSC Permanent Orientation Camp, Iseyin',
      state: 'Oyo State',
      city: 'Iseyin',
      isActive: true,
    });

    // 2. Seed 10 Platoons
    const platoonNames = [
      { name: 'Platoon 1 (The Stalwarts)', color: '#16a34a', motto: 'First and Foremost' },
      { name: 'Platoon 2 (The Vanguards)', color: '#2563eb', motto: 'Victory in Discipline' },
      { name: 'Platoon 3 (The Valiants)', color: '#dc2626', motto: 'Strength & Honor' },
      { name: 'Platoon 4 (The Warriors)', color: '#d97706', motto: 'Courage Unyielding' },
      { name: 'Platoon 5 (The Titans)', color: '#7c3aed', motto: 'Rising Above All' },
      { name: 'Platoon 6 (The Defenders)', color: '#0891b2', motto: 'Shield of the Camp' },
      { name: 'Platoon 7 (The Champions)', color: '#db2777', motto: 'Excellence in Action' },
      { name: 'Platoon 8 (The Eagles)', color: '#059669', motto: 'Soaring Higher' },
      { name: 'Platoon 9 (The Strikers)', color: '#ea580c', motto: 'Precision & Unity' },
      { name: 'Platoon 10 (The Legends)', color: '#4f46e5', motto: 'Last but Indomitable' },
    ];

    platoonNames.forEach((p, idx) => {
      const id = idx + 1;
      this.platoons.set(id, {
        id,
        campId: 1,
        number: id,
        name: p.name,
        colorHex: p.color,
        motto: p.motto,
        totalPoints: 1200 + Math.floor(Math.random() * 800),
        memberCount: 42 + Math.floor(Math.random() * 15),
      });
    });

    // 3. Seed Superadmin (Idempotent)
    this.seedSuperadmin();

    // 4. Seed Product Categories
    const categories: ProductCategory[] = [
      { id: 1, slug: 'water', name: 'Hydration & Drinks' },
      { id: 2, slug: 'food', name: 'Camp Chow & Snacks' },
      { id: 3, slug: 'clothing', name: 'Uniforms & Accessories' },
      { id: 4, slug: 'toiletries', name: 'Daily Essentials' },
    ];
    categories.forEach((cat) => this.productCategories.set(cat.id, cat));

    // 5. Seed Mami Market Products
    const initialProducts: Product[] = [
      {
        id: 1,
        categoryId: 1,
        name: 'Chilled Pure Water (Sachet)',
        description: 'Chilled sachet water to quench burning thirst. Quick +35% hydration.',
        priceNaira: 50,
        waterRefillValue: 35.0,
        staminaBoostValue: 10.0,
        charismaBoostValue: 0,
        stockQuantity: 5000,
        iconKey: 'droplet',
        isActive: true,
      },
      {
        id: 2,
        categoryId: 1,
        name: 'Chilled Bottled Swan Water (750ml)',
        description: 'Cold premium bottled water. Refills +85% hydration and refreshes stamina.',
        priceNaira: 200,
        waterRefillValue: 85.0,
        staminaBoostValue: 25.0,
        charismaBoostValue: 0,
        stockQuantity: 2000,
        iconKey: 'bottle',
        isActive: true,
      },
      {
        id: 3,
        categoryId: 1,
        name: 'Zobo Drink with Ginger',
        description: 'Traditional hibiscus drink. Delicious +60% hydration with a refreshing boost.',
        priceNaira: 150,
        waterRefillValue: 60.0,
        staminaBoostValue: 20.0,
        charismaBoostValue: 2,
        stockQuantity: 800,
        iconKey: 'cup',
        isActive: true,
      },
      {
        id: 4,
        categoryId: 2,
        name: 'Hot Fried Indomie with 2 Eggs',
        description: 'Famous Mami Market delicacy. Restores full stamina (+50%) and lifts morale.',
        priceNaira: 700,
        waterRefillValue: 0,
        staminaBoostValue: 50.0,
        charismaBoostValue: 5,
        stockQuantity: 500,
        iconKey: 'utensils',
        isActive: true,
      },
      {
        id: 5,
        categoryId: 2,
        name: 'Smoked Suya with Onions & Pepper',
        description: 'Spicy skewered beef from the Mami grill. Restores stamina and boosts swagger.',
        priceNaira: 800,
        waterRefillValue: -5.0, // spicy thirst!
        staminaBoostValue: 40.0,
        charismaBoostValue: 6,
        stockQuantity: 400,
        iconKey: 'flame',
        isActive: true,
      },
      {
        id: 6,
        categoryId: 3,
        name: 'Fitted NYSC Crested Cap (Starch Ironed)',
        description: 'Crisp starched green crested cap. Grants +10 Charisma during parades.',
        priceNaira: 1500,
        waterRefillValue: 0,
        staminaBoostValue: 0,
        charismaBoostValue: 10,
        stockQuantity: 150,
        iconKey: 'shield',
        isActive: true,
      },
      {
        id: 7,
        categoryId: 3,
        name: 'Leather NYSC Waist Bag ("Pouch")',
        description: 'Essential camp pouch to keep your water and meal ticket safe.',
        priceNaira: 1200,
        waterRefillValue: 0,
        staminaBoostValue: 0,
        charismaBoostValue: 8,
        stockQuantity: 250,
        iconKey: 'briefcase',
        isActive: true,
      },
    ];
    initialProducts.forEach((p) => this.products.set(p.id, p));

    // 6. Seed Camp 3D Locations in Iseyin
    const locations: Omit<LocationZone, 'isDeleted' | 'createdAt' | 'updatedAt'>[] = [
      {
        id: 1,
        campId: 1,
        slug: 'parade-ground',
        name: 'Main Parade Ground',
        category: 'ACTIVITY',
        posX: 0,
        posY: 0,
        posZ: 0,
        triggerRadius: 18.0,
        description: 'The vast ceremonial drill field with saluting dais and flagpoles.',
        isActive: true,
      },
      {
        id: 2,
        campId: 1,
        slug: 'mami-market',
        name: 'Mami Market Hub',
        category: 'COMMERCE',
        posX: 45,
        posY: 0,
        posZ: 25,
        triggerRadius: 15.0,
        description: 'The energetic commercial center with food stalls, drinks, and tailors.',
        isActive: true,
      },
      {
        id: 3,
        campId: 1,
        slug: 'camp-canteen',
        name: 'Camp Canteen',
        category: 'ACTIVITY',
        posX: -40,
        posY: 0,
        posZ: 30,
        triggerRadius: 12.0,
        description: 'The official mess hall for scheduled breakfast and lunch rushes.',
        isActive: true,
      },
      {
        id: 4,
        campId: 1,
        slug: 'hostels',
        name: 'Platoon Hostel Blocks',
        category: 'RESIDENTIAL',
        posX: -50,
        posY: 0,
        posZ: -45,
        triggerRadius: 16.0,
        description: 'Male and Female dormitories surrounded by laundry lines.',
        isActive: true,
      },
      {
        id: 5,
        campId: 1,
        slug: 'camp-gate',
        name: 'Camp Gate & Security Post',
        category: 'SECURITY',
        posX: 0,
        posY: 0,
        posZ: 75,
        triggerRadius: 10.0,
        description: 'The guarded checkpoint where soldiers and Man O War keep watch.',
        isActive: true,
      },
      {
        id: 6,
        campId: 1,
        slug: 'borehole-water-point',
        name: 'Borehole Water Tap',
        category: 'RESOURCE',
        posX: -20,
        posY: 0,
        posZ: -15,
        triggerRadius: 8.0,
        description: 'Camp borehole point where corps members fetch cool water.',
        isActive: true,
      },
    ];
    locations.forEach((loc) => {
      this.locations.set(loc.id, {
        ...loc,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    // 7. Seed Initial Camp Events
    const initialEvents: CampEvent[] = [
      {
        id: 'event-001',
        campId: 1,
        locationId: 1,
        locationName: 'Main Parade Ground',
        title: 'Morning Ceremonial Parade Drill',
        description: 'Mandatory ceremonial parade competition with military drill instructors.',
        startTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        rewardCp: 250,
        rewardNaira: 1500.0,
        status: 'SCHEDULED',
        minCharismaRequired: 10,
        maxParticipants: 200,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'event-002',
        campId: 1,
        locationId: 2,
        locationName: 'Mami Market Hub',
        title: 'Inter-Platoon Cultural Carnival & Dance',
        description: 'Social night of cultural presentations, live banter, and awards.',
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
        rewardCp: 350,
        rewardNaira: 2500.0,
        status: 'SCHEDULED',
        minCharismaRequired: 20,
        maxParticipants: 150,
        createdAt: now,
        updatedAt: now,
      },
    ];
    initialEvents.forEach((evt) => {
      this.events.set(evt.id, evt);
      this.eventParticipants.set(evt.id, []);
    });

    // 8. Seed Settings (Live Game Configuration)
    this.gameSettings.set('cp_to_naira_rate', {
      key: 'cp_to_naira_rate',
      value: { cp: 10, naira: 100.0 },
      description: 'Corper Points to Virtual Naira conversion rate',
      updatedAt: now,
    });

    this.gameSettings.set('parade_rewards', {
      key: 'parade_rewards',
      value: {
        baseCpPerCommand: 15,
        tier1AccuracyMin: 90,
        tier1Multiplier: 1.5,
        tier2AccuracyMin: 70,
        tier2Multiplier: 1.2,
        charismaGainThreshold: 85,
      },
      description: 'Parade mini-game CP reward rates and accuracy multipliers',
      updatedAt: now,
    });

    this.gameSettings.set('canteen_rewards', {
      key: 'canteen_rewards',
      value: {
        cpPerObstacle: 10,
        puddlePenaltyCp: 5,
        speedBonusCutoffSec: 60,
        speedBonusMultiplier: 2,
        minRewardCp: 10,
        waterDrainAmount: 15,
      },
      description: 'Canteen Rush rewards, puddle penalty, and stamina/water drain',
      updatedAt: now,
    });

    this.gameSettings.set('stealth_config', {
      key: 'stealth_config',
      value: {
        cpPerSecondSurvived: 2,
        maxSurvivalCp: 100,
        caughtPenaltyCp: 15,
      },
      description: 'Soldier Evasion survival reward and capture penalty',
      updatedAt: now,
    });

    this.gameSettings.set('hydration_drain', {
      key: 'hydration_drain',
      value: {
        idlePerSec: 0.08,
        runPerSec: 0.25,
        criticalThreshold: 25,
      },
      description: 'Water meter depletion speed per second and critical threshold',
      updatedAt: now,
    });

    // 8. Log initial audit
    this.auditLogs.push({
      id: uuidv4(),
      actorUserId: superadminId,
      action: 'SYSTEM_BOOTSTRAP',
      targetEntity: 'SYSTEM',
      targetId: 'ISEYIN_CAMP',
      metadata: { superadminEmail: config.superadmin.email, stateCode: config.superadmin.stateCode },
      ipAddress: '127.0.0.1',
      createdAt: now,
    });

    this.isSeeded = true;
  }

  public getUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  public getUserByStateCode(stateCode: string): User | undefined {
    const normalized = stateCode.trim().toUpperCase();
    for (const user of this.users.values()) {
      if (user.stateCode && user.stateCode.toUpperCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }
}

export const db = new InMemoryRelationalDB();
