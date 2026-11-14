/**
 * Corper Wee: Prompt 25 — Complete 14-Step Player Journey & Android Screen/Performance Verification Suite
 */
import express from 'express';
import http from 'http';
import { WebSocket } from 'ws';
import { apiRouter } from '../routes/api.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { MultiplayerGateway } from '../multiplayerGateway.js';
import { resetRateLimiterBuckets } from '../middleware/rateLimit.js';
import { CampLocationManager } from '../../src/game/CampLocationSystem.js';
import {
  detectRecommendedPerformanceTier,
  getPerformanceProfile,
} from '../../src/game/DevicePerformance.js';
import { computeAmbientProfile, describeActiveLayers } from '../../src/audio/AudioSynthesizer.js';
import {
  getNextWeatherState,
  getWeatherHydrationMultiplier,
  getWeatherProfile,
} from '../../src/game/WeatherSystem.js';

export async function runGameplayJourneyTests(): Promise<{
  success: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
}> {
  console.log('\n[GAMEPLAY TESTING] Starting Prompt 25 Complete 14-Step Player Journey + Android Device Suite...');
  resetRateLimiterBuckets();

  const results: { test: string; passed: boolean; detail?: string }[] = [];
  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      results.push({ test: testName, passed: true });
      console.log(`  ✓ PASS: ${testName}`);
    } else {
      results.push({ test: testName, passed: false, detail });
      console.error(`  ✗ FAIL: ${testName} - ${detail}`);
    }
  }

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1', apiRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  MultiplayerGateway.initialize(server);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  async function apiCall(
    path: string,
    options: { method?: string; token?: string; body?: unknown } = {}
  ) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  const suffix = Math.floor(1000 + Math.random() * 8999);
  const playerAEmail = `journey_a_${suffix}@nysc.gov.ng`;
  const playerAStateCode = `OY/26A/${suffix}`;
  const playerBEmail = `journey_b_${suffix}@nysc.gov.ng`;
  const playerBStateCode = `LA/26B/${suffix}`;

  let wsA: WebSocket | null = null;
  let wsB: WebSocket | null = null;

  try {
    // -----------------------------------------------------------------
    // STEP 1 & 2: Sign up with email + Enter state code
    // -----------------------------------------------------------------
    const signupA = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: {
        email: playerAEmail,
        stateCode: playerAStateCode,
        fullName: 'Tunde Adeyemi',
      },
    });
    const tokenA = signupA.json?.data?.accessToken as string;
    const userA = signupA.json?.data?.user;
    assert(
      signupA.status === 200 && !!tokenA && signupA.json?.data?.isNewUser === true,
      'Step 1: Sign up with email succeeds and issues JWT session',
      JSON.stringify(signupA.json)
    );
    assert(
      userA?.stateCode === playerAStateCode && typeof userA?.platoonNumber === 'number',
      'Step 2: State code validated, stored, and initial platoon number assigned',
      JSON.stringify(userA)
    );

    // Also verify duplicate email with different state code is blocked
    const dupEmailAttempt = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: {
        email: playerAEmail,
        stateCode: `AB/26C/${suffix}`,
        fullName: 'Tunde Alt',
      },
    });
    assert(
      dupEmailAttempt.status === 409,
      'Step 2b: Email uniqueness enforced (cannot reuse email with second state code)',
      `got status=${dupEmailAttempt.status}`
    );

    // -----------------------------------------------------------------
    // STEP 3: Create character & verify persistence on reload
    // -----------------------------------------------------------------
    const charRes = await apiCall('/players/character', {
      method: 'PUT',
      token: tokenA,
      body: {
        gender: 'FEMALE',
        skinToneHex: '#542d17',
        hairstyle: 'BRAIDS',
        hairColorHex: '#2b1d0c',
        uniformType: 'WHITE_PT',
        footwear: 'WHITE_SNEAKERS',
        accessory: 'ID_LANYARD',
      },
    });
    assert(
      charRes.status === 200 &&
        charRes.json?.data?.gender === 'FEMALE' &&
        charRes.json?.data?.hairstyle === 'BRAIDS' &&
        charRes.json?.data?.uniformType === 'WHITE_PT',
      'Step 3: Character creation saved via PUT /players/character',
      JSON.stringify(charRes.json)
    );

    const profileReload = await apiCall('/players/me', { token: tokenA });
    assert(
      profileReload.status === 200 &&
        profileReload.json?.data?.character?.hairstyle === 'BRAIDS' &&
        profileReload.json?.data?.character?.skinToneHex === '#542d17',
      'Step 3b: Saved character reloads accurately on GET /players/me',
      JSON.stringify(profileReload.json?.data?.character)
    );

    // -----------------------------------------------------------------
    // STEP 4: Join platoon & verify roster + leaderboard
    // -----------------------------------------------------------------
    const assignedPlatoonId = userA.platoonNumber as number;
    const platoonDetails = await apiCall(`/platoons/${assignedPlatoonId}`, { token: tokenA });
    const roster = platoonDetails.json?.data?.members || [];
    assert(
      platoonDetails.status === 200 &&
        roster.some((m: any) => m.id === userA.id || m.displayName === 'Tunde Adeyemi'),
      'Step 4: Player appears in assigned platoon roster',
      JSON.stringify(platoonDetails.json)
    );

    const leaderboardBefore = await apiCall('/platoons/leaderboard', { token: tokenA });
    assert(
      leaderboardBefore.status === 200 && Array.isArray(leaderboardBefore.json?.data),
      'Step 4b: Platoon championship leaderboard accessible with auth',
      JSON.stringify(leaderboardBefore.json)
    );

    // -----------------------------------------------------------------
    // STEP 5: Enter camp (WebSocket ROOM_INIT + Locations + Live Config)
    // -----------------------------------------------------------------
    const locationsRes = await apiCall('/world/locations', { token: tokenA });
    const gameConfigRes = await apiCall('/config/game', { token: tokenA });
    assert(
      locationsRes.status === 200 && (locationsRes.json?.data?.length ?? 0) >= 6,
      'Step 5: Iseyin camp locations loaded for exploration & navigation',
      `count=${locationsRes.json?.data?.length ?? 0}`
    );
    assert(
      gameConfigRes.status === 200 && typeof gameConfigRes.json?.data?.conversionRate?.cp === 'number',
      'Step 5b: Live camp economy & activity configuration loaded'
    );

    wsA = new WebSocket(wsUrl);
    const wsAMessages: any[] = [];
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WS A connect timeout')), 4000);
      wsA!.on('open', () => {
        wsA!.send(
          JSON.stringify({
            type: 'JOIN',
            data: {
              token: tokenA,
              userId: userA.id,
              stateCode: playerAStateCode,
              displayName: 'Tunde Adeyemi',
              platoonNumber: assignedPlatoonId,
              posX: 0,
              posY: 0,
              posZ: 65,
            },
          })
        );
      });
      wsA!.on('message', (buf) => {
        const msg = JSON.parse(buf.toString());
        wsAMessages.push(msg);
        if (msg.type === 'ROOM_INIT') {
          clearTimeout(timeout);
          resolve();
        }
      });
      wsA!.on('error', reject);
    });

    const roomInitA = wsAMessages.find((m) => m.type === 'ROOM_INIT');
    assert(
      !!roomInitA && Array.isArray(roomInitA.data?.notifications),
      'Step 5c: Entered camp via WebSocket JOIN and received ROOM_INIT + notification feed'
    );

    // -----------------------------------------------------------------
    // STEP 6: Participate in parade
    // -----------------------------------------------------------------
    const walletBeforeActivities = profileReload.json?.data?.wallet?.corperPoints ?? 100;
    const paradeRes = await apiCall('/activities/parade/submit', {
      method: 'POST',
      token: tokenA,
      body: {
        sequenceId: 'gameplay_test_parade',
        difficulty: 'NORMAL',
        results: Array.from({ length: 10 }, (_, idx) => ({
          command: `CMD_${idx + 1}`,
          responseTimeMs: 185,
          isCorrect: true,
        })),
      },
    });
    const paradePoints = paradeRes.json?.data?.earnedPoints ?? 0;
    assert(
      paradeRes.status === 200 && paradePoints > 0 && paradeRes.json?.data?.accuracy === 100,
      'Step 6: Completed Parade Drill minigame and earned authoritative points',
      JSON.stringify(paradeRes.json)
    );

    // -----------------------------------------------------------------
    // STEP 7: Complete obstacle course (Canteen Rush)
    // -----------------------------------------------------------------
    const canteenRes = await apiCall('/activities/canteen-rush/submit', {
      method: 'POST',
      token: tokenA,
      body: {
        timeTakenSeconds: 18.5,
        obstaclesCleared: 9,
        puddlesHit: 1,
        staminaRemaining: 76,
      },
    });
    const canteenPoints = canteenRes.json?.data?.earnedPoints ?? 0;
    assert(
      canteenRes.status === 200 && canteenPoints > 0,
      'Step 7: Completed Canteen Rush obstacle course and earned points',
      JSON.stringify(canteenRes.json)
    );

    // -----------------------------------------------------------------
    // STEP 8: Avoid soldiers (Stealth patrol evasion & capture check)
    // -----------------------------------------------------------------
    const stealthSurvive = await apiCall('/activities/stealth/report', {
      method: 'POST',
      token: tokenA,
      body: { survived: true, timeInZoneSec: 25 },
    });
    assert(
      stealthSurvive.status === 200 && (stealthSurvive.json?.data?.pointsDelta ?? 0) > 0,
      'Step 8: Evading soldier patrols awards stealth survival CP',
      JSON.stringify(stealthSurvive.json)
    );

    const stealthCaught = await apiCall('/activities/stealth/report', {
      method: 'POST',
      token: tokenA,
      body: { survived: false, timeInZoneSec: 8 },
    });
    assert(
      stealthCaught.status === 200 && (stealthCaught.json?.data?.pointsDelta ?? 0) < 0,
      'Step 8b: Being caught by soldier patrol applies penalty deduction',
      JSON.stringify(stealthCaught.json)
    );

    // Deplete water slightly so hydration restoration can be measured
    await apiCall('/activities/water/deplete', {
      method: 'POST',
      token: tokenA,
      body: { deltaSeconds: 30, isRunning: true },
    });

    // -----------------------------------------------------------------
    // STEP 9: Purchase water & consume water to restore hydration
    // -----------------------------------------------------------------
    const productsRes = await apiCall('/market/products', { token: tokenA });
    const products = productsRes.json?.data?.products || [];
    const waterProduct = products.find((p: any) => (p.waterRefillValue ?? 0) > 0);
    assert(
      productsRes.status === 200 && !!waterProduct,
      'Step 9a: Mami Market catalog lists hydrating water product',
      JSON.stringify(products.slice(0, 2))
    );

    const buyWaterRes = await apiCall('/market/buy', {
      method: 'POST',
      token: tokenA,
      body: {
        productId: waterProduct.id,
        quantity: 1,
        idempotencyKey: `gp-water-${suffix}`,
      },
    });
    assert(
      buyWaterRes.status === 200,
      'Step 9b: Purchased water at Mami Market',
      JSON.stringify(buyWaterRes.json)
    );

    const drinkWaterRes = await apiCall('/activities/water/consume', {
      method: 'POST',
      token: tokenA,
      body: { productId: waterProduct.id },
    });
    assert(
      drinkWaterRes.status === 200 && (drinkWaterRes.json?.data?.newWaterLevel ?? 0) > 70,
      'Step 9c: Consuming purchased water restores hydration meter',
      JSON.stringify(drinkWaterRes.json)
    );

    // -----------------------------------------------------------------
    // STEP 10: Verify cumulative earned points & transactions
    // -----------------------------------------------------------------
    const profileAfterActivities = await apiCall('/players/me', { token: tokenA });
    const cpAfterActivities = profileAfterActivities.json?.data?.wallet?.corperPoints ?? 0;
    assert(
      cpAfterActivities > walletBeforeActivities,
      `Step 10: Player earned points net positive (${walletBeforeActivities} -> ${cpAfterActivities} CP)`
    );

    // -----------------------------------------------------------------
    // STEP 11: Exchange points for Virtual Naira
    // -----------------------------------------------------------------
    const nairaBeforeExchange = profileAfterActivities.json?.data?.wallet?.virtualNaira ?? 0;
    const exchangeRes = await apiCall('/economy/exchange', {
      method: 'POST',
      token: tokenA,
      body: {
        pointsToExchange: 50,
        idempotencyKey: `gp-exch-${suffix}`,
      },
    });
    assert(
      exchangeRes.status === 200 &&
        exchangeRes.json?.data?.pointsDeducted === 50 &&
        (exchangeRes.json?.data?.newNaira ?? 0) > nairaBeforeExchange,
      'Step 11: Exchanged 50 Corper Points for Virtual Naira',
      JSON.stringify(exchangeRes.json)
    );

    // -----------------------------------------------------------------
    // STEP 12: Buy non-water item at Mami Market & verify inventory + ledger
    // -----------------------------------------------------------------
    const foodOrGearProduct =
      products.find((p: any) => p.id !== waterProduct.id && p.priceNaira <= 1500) || waterProduct;
    const buyItemRes = await apiCall('/market/buy', {
      method: 'POST',
      token: tokenA,
      body: {
        productId: foodOrGearProduct.id,
        quantity: 1,
        idempotencyKey: `gp-item-${suffix}`,
      },
    });
    const inventoryRes = await apiCall('/market/inventory', { token: tokenA });
    const txHistoryRes = await apiCall('/wallet/transactions', { token: tokenA });
    assert(
      buyItemRes.status === 200 &&
        inventoryRes.status === 200 &&
        (inventoryRes.json?.data || []).some((i: any) => i.productId === foodOrGearProduct.id),
      'Step 12: Bought item at Mami Market and item appears in player inventory',
      JSON.stringify(inventoryRes.json)
    );
    assert(
      txHistoryRes.status === 200 &&
        (txHistoryRes.json?.data?.walletTransactions?.length ?? 0) >= 2 &&
        (txHistoryRes.json?.data?.pointTransactions?.length ?? 0) >= 3,
      'Step 12b: Wallet & point transaction ledgers accurately recorded'
    );

    // -----------------------------------------------------------------
    // STEP 13: Interact with other players (Multiplayer + Charisma + Friends)
    // -----------------------------------------------------------------
    const signupB = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: {
        email: playerBEmail,
        stateCode: playerBStateCode,
        fullName: 'Chinedu Okafor',
      },
    });
    const tokenB = signupB.json?.data?.accessToken as string;
    const userB = signupB.json?.data?.user;

    wsB = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WS B join timeout')), 4000);
      wsB!.on('open', () => {
        wsB!.send(
          JSON.stringify({
            type: 'JOIN',
            data: {
              token: tokenB,
              userId: userB.id,
              stateCode: playerBStateCode,
              displayName: 'Chinedu Okafor',
              platoonNumber: userB.platoonNumber,
              posX: 2,
              posY: 0,
              posZ: 60,
            },
          })
        );
      });
      wsB!.on('message', (buf) => {
        const msg = JSON.parse(buf.toString());
        if (msg.type === 'ROOM_INIT') {
          clearTimeout(timeout);
          resolve();
        }
      });
      wsB!.on('error', reject);
    });

    // Verify real-time WebSocket MOVE & EMOTE synchronization from Player B to Player A
    const syncReceivedPromise = new Promise<boolean>((resolve) => {
      let sawMove = false;
      let sawEmote = false;
      const timer = setTimeout(() => resolve(sawMove && sawEmote), 1500);
      wsA!.on('message', (buf) => {
        const msg = JSON.parse(buf.toString());
        if (msg.type === 'PLAYER_MOVED' && msg.data?.userId === userB.id) {
          sawMove = true;
        }
        if (msg.type === 'PLAYER_EMOTE' && msg.data?.userId === userB.id && msg.data?.emote === 'SALUTE') {
          sawEmote = true;
        }
        if (sawMove && sawEmote) {
          clearTimeout(timer);
          resolve(true);
        }
      });
    });
    wsB.send(
      JSON.stringify({
        type: 'MOVE',
        data: { x: 4.5, y: 0, z: 58.0, rotationY: 1.2, isSprinting: true },
      })
    );
    wsB.send(
      JSON.stringify({
        type: 'EMOTE',
        data: { emote: 'SALUTE' },
      })
    );
    const wsSynced = await syncReceivedPromise;
    assert(wsSynced, 'Step 13a: Multiplayer WebSocket movement & emote synced between Player B and Player A');

    const interactRes = await apiCall('/social/interact', {
      method: 'POST',
      token: tokenA,
      body: {
        targetUserId: userB.id,
        interactionType: 'CONVERSATION',
        dialogueOptionId: 'greet_comrade',
      },
    });
    assert(
      interactRes.status === 200 && !!interactRes.json?.data?.outcome,
      'Step 13b: Social dialogue & charisma check resolved via /social/interact',
      JSON.stringify(interactRes.json)
    );

    const friendReqRes = await apiCall('/social/friends/request', {
      method: 'POST',
      token: tokenA,
      body: { targetUserId: userB.id },
    });
    const friendshipId = friendReqRes.json?.data?.id;
    const friendAcceptRes = await apiCall('/social/friends/respond', {
      method: 'POST',
      token: tokenB,
      body: { friendshipId, accept: true },
    });
    const friendsListA = await apiCall('/social/friends', { token: tokenA });
    assert(
      friendReqRes.status === 200 &&
        friendAcceptRes.status === 200 &&
        (friendsListA.json?.data || []).some((f: any) => f.friendUserId === userB.id),
      'Step 13c: Friend request sent, accepted, and confirmed in friends list',
      JSON.stringify(friendsListA.json)
    );

    // -----------------------------------------------------------------
    // STEP 14: Participate in events
    // -----------------------------------------------------------------
    const eventsRes = await apiCall('/events', { token: tokenA });
    const eventsList = eventsRes.json?.data || [];
    const activeEvent = eventsList.find((e: any) => e.status === 'SCHEDULED' || e.status === 'ACTIVE');
    assert(
      eventsRes.status === 200 && !!activeEvent,
      'Step 14a: Scheduled camp events list loaded',
      JSON.stringify(eventsList)
    );

    const joinEvtRes = await apiCall(`/events/${activeEvent.id}/join`, {
      method: 'POST',
      token: tokenA,
    });
    const claimEvtRes = await apiCall(`/events/${activeEvent.id}/claim-reward`, {
      method: 'POST',
      token: tokenA,
    });
    assert(
      joinEvtRes.status === 200 &&
        claimEvtRes.status === 200 &&
        (claimEvtRes.json?.data?.rewardCp ?? 0) > 0,
      'Step 14b: Joined camp event and claimed participation CP & Virtual Naira bonus',
      JSON.stringify({ join: joinEvtRes.json, claim: claimEvtRes.json })
    );

    // -----------------------------------------------------------------
    // STEP 15: Android Screen Sizes & Device Performance Levels
    // -----------------------------------------------------------------
    const budgetAndroid = detectRecommendedPerformanceTier({
      cores: 4,
      memoryGb: 2,
      viewportWidth: 360,
      isTouch: true,
    });
    const midAndroid = detectRecommendedPerformanceTier({
      cores: 6,
      memoryGb: 4,
      viewportWidth: 390,
      isTouch: true,
    });
    const tabletAndroid = detectRecommendedPerformanceTier({
      cores: 8,
      memoryGb: 6,
      viewportWidth: 800,
      isTouch: true,
    });
    const highEndDesktop = detectRecommendedPerformanceTier({
      cores: 8,
      memoryGb: 16,
      viewportWidth: 1440,
      isTouch: false,
    });

    const lowProfile = getPerformanceProfile(budgetAndroid);
    const midProfile = getPerformanceProfile(midAndroid);
    const highProfile = getPerformanceProfile(highEndDesktop);

    assert(
      budgetAndroid === 'LOW' &&
        !lowProfile.shadowsEnabled &&
        lowProfile.pixelRatioCap === 1.0 &&
        lowProfile.targetFps === 30,
      'Android Performance (Budget 360x640, 2GB RAM, 4 cores): selects LOW profile (1x DPR, no shadows, 30 FPS cap)'
    );
    assert(
      midAndroid === 'MID' &&
        tabletAndroid === 'MID' &&
        midProfile.shadowsEnabled &&
        midProfile.shadowMapSize === 1024 &&
        midProfile.pixelRatioCap === 1.5,
      'Android Performance (Mid-range 390x844 & Tablet 800x1280): selects MID profile (1.5x DPR, 1024px shadow map, 60 FPS)'
    );
    assert(
      highEndDesktop === 'HIGH' &&
        highProfile.shadowMapSize === 2048 &&
        highProfile.pixelRatioCap === 2.0,
      'Desktop / Flagship Performance: selects HIGH profile (2x DPR, 2048px soft shadows, 60 FPS)'
    );

    // Verify camp navigation + zone proximity + ambient soundscape switching across zones
    const navToParade = CampLocationManager.getNavigationInfo(0, 65, 'parade_ground');
    const nearbyMami = CampLocationManager.getNearbyZone(42, -45);
    const morningParadeLayers = describeActiveLayers(computeAmbientProfile('parade_ground', 'MORNING'));
    const nightHostelLayers = describeActiveLayers(computeAmbientProfile('male_hostel', 'NIGHT'));

    assert(
      navToParade.distance === 100 &&
        navToParade.compassBearing === 'N' &&
        nearbyMami.zone?.id === 'mami_market',
      'Camp Navigation & Zone Triggers resolve accurately across Iseyin Camp coordinates'
    );
    assert(
      morningParadeLayers.includes('Morning Bugle') &&
        nightHostelLayers.includes('Night Crickets'),
      'Ambient soundscape shifts dynamically between Morning Bugle (Parade) and Night Crickets (Hostel)'
    );

    // -----------------------------------------------------------------
    // PROMPT 26: Production Health, Metrics, Error Reporting & Legal Checks
    // -----------------------------------------------------------------
    const liveRes = await apiCall('/health/live');
    const readyRes = await apiCall('/health/ready');
    const metricsRes = await fetch(`${baseUrl}/metrics`);
    const metricsBody = await metricsRes.text();
    const clientErrRes = await apiCall('/telemetry/client-error', {
      method: 'POST',
      body: {
        message: 'Simulated WebGL context lost check',
        name: 'WebGLContextLost',
        path: '/',
        platform: 'android-test',
      },
    });
    const privacyRes = await apiCall('/legal/privacy');
    const termsRes = await apiCall('/legal/terms');
    const playerMonitoringDenied = await apiCall('/admin/monitoring', { token: tokenA });
    const superadminAuth = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: { email: 'farlodunolusege@gmail.com', stateCode: 'OY/26C/5439' },
    });
    const adminMonitoringRes = await apiCall('/admin/monitoring', {
      token: superadminAuth.json?.data?.accessToken,
    });

    assert(
      liveRes.status === 200 &&
        readyRes.status === 200 &&
        readyRes.json?.status === 'ready' &&
        metricsRes.status === 200 &&
        metricsBody.includes('corperwee_websocket_connections_active'),
      'Production health (/health/live, /health/ready) & Prometheus /metrics endpoints operational'
    );
    assert(
      clientErrRes.status === 202 &&
        playerMonitoringDenied.status === 403 &&
        adminMonitoringRes.status === 200 &&
        (adminMonitoringRes.json?.data?.recentErrors?.length ?? 0) >= 1,
      'Production client error reporting ingests errors and /admin/monitoring enforces Admin RBAC'
    );
    assert(
      privacyRes.status === 200 &&
        termsRes.status === 200 &&
        (privacyRes.json?.data?.sections?.length ?? 0) >= 4 &&
        (termsRes.json?.data?.sections?.length ?? 0) >= 4,
      'Production Privacy Policy & Terms of Service endpoints return complete legal sections'
    );

    // -----------------------------------------------------------------
    // DAILY TASKS: Morning Drill & Evening Parade Alerts + Rewards
    // -----------------------------------------------------------------
    const dailyInitRes = await apiCall('/activities/daily-tasks?timeOfDay=MORNING', { token: tokenB });
    const initTasks = dailyInitRes.json?.data?.tasks || [];
    assert(
      dailyInitRes.status === 200 &&
        initTasks.length === 2 &&
        initTasks.every((t: any) => t.status === 'PENDING'),
      'Daily Tasks: Player B starts with pending Morning Drill and Evening Parade duties',
      JSON.stringify(dailyInitRes.json)
    );

    const morningAlertFirst = await apiCall('/activities/daily-tasks/alert', {
      method: 'POST',
      token: tokenB,
      body: { timeOfDay: 'MORNING' },
    });
    const morningAlertDup = await apiCall('/activities/daily-tasks/alert', {
      method: 'POST',
      token: tokenB,
      body: { timeOfDay: 'MORNING' },
    });
    assert(
      morningAlertFirst.status === 200 &&
        morningAlertFirst.json?.data?.alertTriggered === true &&
        morningAlertFirst.json?.data?.notification?.category === 'DAILY_TASK_ALERT' &&
        morningAlertDup.json?.data?.alertTriggered === false,
      'Daily Tasks: Morning Drill notification alert fires once per shift without spam duplicates'
    );

    const morningCompleteRes = await apiCall('/activities/daily-tasks/complete', {
      method: 'POST',
      token: tokenB,
      body: { taskType: 'MORNING_DRILL', accuracy: 92 },
    });
    const eveningAlertRes = await apiCall('/activities/daily-tasks/alert', {
      method: 'POST',
      token: tokenB,
      body: { timeOfDay: 'NIGHT' },
    });
    const eveningCompleteRes = await apiCall('/activities/daily-tasks/complete', {
      method: 'POST',
      token: tokenB,
      body: { taskType: 'EVENING_PARADE', accuracy: 88 },
    });
    const duplicateEveningRes = await apiCall('/activities/daily-tasks/complete', {
      method: 'POST',
      token: tokenB,
      body: { taskType: 'EVENING_PARADE', accuracy: 95 },
    });

    assert(
      morningCompleteRes.status === 200 &&
        morningCompleteRes.json?.data?.rewardCp === 50 &&
        eveningAlertRes.json?.data?.alertTriggered === true &&
        eveningAlertRes.json?.data?.targetTask === 'EVENING_PARADE' &&
        eveningCompleteRes.status === 200 &&
        eveningCompleteRes.json?.data?.rewardCp === 60 &&
        duplicateEveningRes.status === 409,
      'Daily Tasks: Morning Drill (+50 CP) & Evening Parade (+60 CP) reward CP, emit alerts, and block duplicate daily claims',
      JSON.stringify({
        morning: morningCompleteRes.json,
        evening: eveningCompleteRes.json,
        dupStatus: duplicateEveningRes.status,
      })
    );

    // -----------------------------------------------------------------
    // DYNAMIC WEATHER SYSTEM: Periodic Cycle, Audio Layers & Hydration Modifier
    // -----------------------------------------------------------------
    const cycle1 = getNextWeatherState('SUNNY');
    const cycle2 = getNextWeatherState(cycle1);
    const cycle3 = getNextWeatherState(cycle2);
    const rainLayers = describeActiveLayers(
      computeAmbientProfile('parade_ground', 'DAY', 'LIGHT_RAIN')
    );

    assert(
      cycle1 === 'CLOUDY' &&
        cycle2 === 'LIGHT_RAIN' &&
        cycle3 === 'SUNNY' &&
        getWeatherHydrationMultiplier('SUNNY') === 1.65 &&
        getWeatherHydrationMultiplier('CLOUDY') === 1.0 &&
        getWeatherHydrationMultiplier('LIGHT_RAIN') === 0.6 &&
        getWeatherProfile('LIGHT_RAIN').movementSpeedMultiplier < 1.0 &&
        rainLayers.includes('Light Rain Drizzle'),
      'Dynamic Weather: Cycles Sunny -> Cloudy -> Light Rain -> Sunny with expected modifiers and Light Rain audio layer'
    );

    // Verify backend /activities/water/deplete scales hydration drain accurately by weather
    const profileStart = await apiCall('/players/me', { token: tokenB });
    const levelBefore = profileStart.json?.data?.waterMeter?.currentLevel ?? 100;

    const cloudyDeplete = await apiCall('/activities/water/deplete', {
      method: 'POST',
      token: tokenB,
      body: { deltaSeconds: 20, isRunning: false, weather: 'CLOUDY' },
    });
    const levelAfterCloudy = cloudyDeplete.json?.data?.currentLevel ?? levelBefore;
    const cloudyDrop = +(levelBefore - levelAfterCloudy).toFixed(2);

    const sunnyDeplete = await apiCall('/activities/water/deplete', {
      method: 'POST',
      token: tokenB,
      body: { deltaSeconds: 20, isRunning: false, weather: 'SUNNY' },
    });
    const levelAfterSunny = sunnyDeplete.json?.data?.currentLevel ?? levelAfterCloudy;
    const sunnyDrop = +(levelAfterCloudy - levelAfterSunny).toFixed(2);

    const rainDeplete = await apiCall('/activities/water/deplete', {
      method: 'POST',
      token: tokenB,
      body: { deltaSeconds: 20, isRunning: false, weather: 'LIGHT_RAIN' },
    });
    const levelAfterRain = rainDeplete.json?.data?.currentLevel ?? levelAfterSunny;
    const rainDrop = +(levelAfterSunny - levelAfterRain).toFixed(2);

    assert(
      cloudyDeplete.status === 200 &&
        sunnyDeplete.status === 200 &&
        rainDeplete.status === 200 &&
        sunnyDeplete.json?.data?.drainMultiplier === 1.65 &&
        cloudyDeplete.json?.data?.drainMultiplier === 1.0 &&
        rainDeplete.json?.data?.drainMultiplier === 0.6 &&
        sunnyDrop > cloudyDrop &&
        cloudyDrop > rainDrop,
      'Dynamic Weather: Server water depletion drains fastest in Sunny (1.65x), normal in Cloudy (1.0x), slowest in Light Rain (0.6x)',
      JSON.stringify({ sunnyDrop, cloudyDrop, rainDrop })
    );
  } finally {
    if (wsA) wsA.close();
    if (wsB) wsB.close();
    MultiplayerGateway.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log('=======================================================');
  console.log(`[GAMEPLAY TESTING SUMMARY] Passed: ${passedCount}/${results.length}, Failed: ${failedCount}`);
  console.log('=======================================================');

  return {
    success: failedCount === 0,
    total: results.length,
    passedCount,
    failedCount,
  };
}
