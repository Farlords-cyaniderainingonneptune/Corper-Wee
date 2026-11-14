/**
 * Corper Wee: End-to-End HTTP & WebSocket Security Audit + Prompt 22/23/24 Verification Suite
 */
import express from 'express';
import http from 'http';
import { WebSocket } from 'ws';
import { apiRouter } from '../routes/api.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { MultiplayerGateway } from '../multiplayerGateway.js';
import { db } from '../db/index.js';
import { config } from '../config/env.js';
import { SocialService } from '../services/socialService.js';

export async function runSecurityAuditTests(): Promise<{
  success: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
}> {
  console.log('\n[SECURITY AUDIT] Starting HTTP & WebSocket Penetration + Prompt 22/23/24 Suite...');

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

  // Spin up isolated Express + WebSocket instance on ephemeral port
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
    options: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}
  ) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, headers: res.headers, json };
  }

  try {
    // Sign in seeded Superadmin
    const superLogin = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: { email: config.superadmin.email, stateCode: config.superadmin.stateCode },
    });
    assert(superLogin.status === 200 && !!superLogin.json.data?.accessToken, 'Superadmin signs in via HTTP API');
    const superToken = superLogin.json.data.accessToken as string;
    const superId = superLogin.json.data.user.id as string;

    // Create 3 test players over HTTP
    const ts = Date.now().toString().slice(-4);
    const playerAEmail = `sec_a_${ts}@nysc.gov.ng`;
    const playerACode = `OY/26C/1${ts.slice(0, 3)}`;
    const playerBEmail = `sec_b_${ts}@nysc.gov.ng`;
    const playerBCode = `OY/26C/2${ts.slice(0, 3)}`;
    const playerCEmail = `sec_c_${ts}@nysc.gov.ng`;
    const playerCCode = `OY/26C/3${ts.slice(0, 3)}`;

    // ------------------------------------------------------------------------
    // 1. AUTHENTICATION BYPASS & TOKEN FORGERY TESTS
    // ------------------------------------------------------------------------
    const noTokenRes = await apiCall('/players/me');
    assert(noTokenRes.status === 401, 'Auth bypass blocked: missing Bearer token returns 401');

    const garbageTokenRes = await apiCall('/players/me', { token: 'not.a.valid.jwt' });
    assert(garbageTokenRes.status === 401, 'Auth bypass blocked: malformed token returns 401');

    // Unsigned base64url JSON payload forgery (old vulnerability regression test)
    const unsignedForgedPayload = Buffer.from(
      JSON.stringify({
        userId: superId,
        email: config.superadmin.email,
        role: 'SUPERADMIN',
        exp: Date.now() + 600_000,
      })
    ).toString('base64url');
    const unsignedForgeRes = await apiCall('/admin/dashboard', { token: unsignedForgedPayload });
    assert(unsignedForgeRes.status === 401, 'Auth bypass blocked: unsigned base64url SUPERADMIN token rejected with 401');

    // Tampered HMAC signature
    const tamperedSigToken = `${superToken.slice(0, -4)}XXXX`;
    const tamperedRes = await apiCall('/admin/dashboard', { token: tamperedSigToken });
    assert(tamperedRes.status === 401, 'Auth bypass blocked: tampered HMAC-SHA256 signature rejected with 401');

    // ------------------------------------------------------------------------
    // 2. PRIVILEGE ESCALATION & UNAUTHORIZED ADMIN ACCESS
    // ------------------------------------------------------------------------
    const signupA = await apiCall('/auth/signup', {
      method: 'POST',
      body: {
        email: playerAEmail,
        stateCode: playerACode,
        fullName: 'Corper Alpha',
        role: 'SUPERADMIN', // Malicious mass-assignment attempt
      },
    });
    assert(signupA.status === 200, 'Player A signed up cleanly');
    assert(
      signupA.json.data.user.role === 'PLAYER',
      'Privilege escalation blocked: role=SUPERADMIN in signup payload is ignored (remains PLAYER)'
    );
    const tokenA = signupA.json.data.accessToken as string;
    const idA = signupA.json.data.user.id as string;

    const signupB = await apiCall('/auth/signup', {
      method: 'POST',
      body: { email: playerBEmail, stateCode: playerBCode, fullName: 'Corper Beta' },
    });
    const tokenB = signupB.json.data.accessToken as string;
    const idB = signupB.json.data.user.id as string;

    const signupC = await apiCall('/auth/signup', {
      method: 'POST',
      body: { email: playerCEmail, stateCode: playerCCode, fullName: 'Corper Gamma' },
    });
    const tokenC = signupC.json.data.accessToken as string;

    const playerDashRes = await apiCall('/admin/dashboard', { token: tokenA });
    assert(playerDashRes.status === 403, 'Unauthorized admin access blocked: PLAYER rejected on /admin/dashboard (403)');

    const playerConfigRes = await apiCall('/admin/config', { token: tokenA });
    assert(playerConfigRes.status === 403, 'Unauthorized admin access blocked: PLAYER rejected on /admin/config (403)');

    const selfEscalateRes = await apiCall(`/admin/players/${idA}/role`, {
      method: 'POST',
      token: tokenA,
      body: { role: 'ADMIN' },
    });
    assert(selfEscalateRes.status === 403, 'Privilege escalation blocked: PLAYER cannot promote self to ADMIN (403)');

    const demoteSuperRes = await apiCall(`/admin/players/${superId}/role`, {
      method: 'POST',
      token: superToken,
      body: { role: 'PLAYER' },
    });
    assert(demoteSuperRes.status === 403, 'Protected invariant: Superadmin cannot be demoted (403)');

    // ------------------------------------------------------------------------
    // 3. STATE-CODE & EMAIL DUPLICATION
    // ------------------------------------------------------------------------
    const dupEmailRes = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: { email: playerAEmail, stateCode: 'OY/26C/9999' },
    });
    assert(dupEmailRes.status === 409, 'Duplication prevented: existing email with second state code rejected (409)');

    const dupCodeRes = await apiCall('/auth/authenticate', {
      method: 'POST',
      body: { email: `other_${ts}@nysc.gov.ng`, stateCode: playerACode },
    });
    assert(dupCodeRes.status === 409, 'Duplication prevented: existing state code with different email rejected (409)');

    // ------------------------------------------------------------------------
    // 4. REWARD MANIPULATION & LIVE GAME CONFIG (PROMPT 22 + 24)
    // ------------------------------------------------------------------------
    const overCommandsRes = await apiCall('/activities/parade/submit', {
      method: 'POST',
      token: tokenA,
      body: {
        results: Array.from({ length: 51 }, () => ({ command: 'ATTENTION', responseTimeMs: 500, isCorrect: true })),
      },
    });
    assert(overCommandsRes.status === 422, 'Reward manipulation blocked: >50 parade commands rejected (422)');

    const negTimeRes = await apiCall('/activities/parade/submit', {
      method: 'POST',
      token: tokenA,
      body: {
        results: [{ command: 'ATTENTION', responseTimeMs: -250, isCorrect: true }],
      },
    });
    assert(negTimeRes.status === 422, 'Reward manipulation blocked: negative responseTimeMs rejected (422)');

    const cheatCanteenRes = await apiCall('/activities/canteen-rush/submit', {
      method: 'POST',
      token: tokenA,
      body: { timeTakenSeconds: 1, obstaclesCleared: 999, puddlesHit: 0, staminaRemaining: 100 },
    });
    assert(cheatCanteenRes.status === 422, 'Reward manipulation blocked: impossible Canteen Rush time/obstacles rejected (422)');

    const negWaterRes = await apiCall('/activities/water/deplete', {
      method: 'POST',
      token: tokenA,
      body: { deltaSeconds: -50, isRunning: false },
    });
    assert(negWaterRes.status === 422, 'Reward/hydration manipulation blocked: negative water deltaSeconds rejected (422)');

    // Live Game Config update reflects immediately without release (Prompt 22)
    const initialCfg = await apiCall('/config/game', { token: tokenA });
    assert(initialCfg.status === 200 && initialCfg.json.data.paradeRewards.baseCpPerCommand === 15, 'Player reads live game config (default 15 CP/cmd)');

    const updateCfgRes = await apiCall('/admin/config', {
      method: 'PUT',
      token: superToken,
      body: {
        conversionRate: { cp: 10, naira: 200 },
        paradeRewards: {
          baseCpPerCommand: 25,
          tier1AccuracyMin: 90,
          tier1Multiplier: 1.5,
          tier2AccuracyMin: 70,
          tier2Multiplier: 1.2,
          charismaGainThreshold: 85,
        },
      },
    });
    assert(updateCfgRes.status === 200, 'Superadmin updated live Game Configuration via /admin/config');

    const refreshedCfg = await apiCall('/config/game', { token: tokenA });
    assert(
      refreshedCfg.json.data.paradeRewards.baseCpPerCommand === 25 && refreshedCfg.json.data.conversionRate.naira === 200,
      'Live Game Config reflects updated parade CP & exchange rate immediately in game client'
    );

    // Earn legitimate CP under updated config (10/10 commands * 25 * 1.5 = 375 CP)
    const legitDrill = await apiCall('/activities/parade/submit', {
      method: 'POST',
      token: tokenA,
      body: { commandsTotal: 10, commandsSuccessful: 10, difficulty: 'NORMAL' },
    });
    assert(
      legitDrill.status === 200 && legitDrill.json.data.earnedPoints === 375,
      'Parade reward calculation uses live admin-configured baseCpPerCommand=25 (375 CP)'
    );

    // Restore default config values after verifying live sync
    await apiCall('/admin/config', {
      method: 'PUT',
      token: superToken,
      body: {
        conversionRate: { cp: 10, naira: 100 },
        paradeRewards: {
          baseCpPerCommand: 15,
          tier1AccuracyMin: 90,
          tier1Multiplier: 1.5,
          tier2AccuracyMin: 70,
          tier2Multiplier: 1.2,
          charismaGainThreshold: 85,
        },
      },
    });

    // ------------------------------------------------------------------------
    // 5. WALLET MANIPULATION & DUPLICATE TRANSACTIONS (IDEMPOTENCY)
    // ------------------------------------------------------------------------
    const negExchange = await apiCall('/economy/exchange', {
      method: 'POST',
      token: tokenA,
      body: { pointsToExchange: -50, idempotencyKey: `neg_${ts}` },
    });
    assert(negExchange.status === 422, 'Wallet manipulation blocked: negative pointsToExchange rejected (422)');

    const overExchange = await apiCall('/economy/exchange', {
      method: 'POST',
      token: tokenA,
      body: { pointsToExchange: 999_999, idempotencyKey: `over_${ts}` },
    });
    assert(overExchange.status === 400, 'Wallet manipulation blocked: insufficient CP exchange rejected (400)');

    const negQtyBuy = await apiCall('/market/buy', {
      method: 'POST',
      token: tokenA,
      body: { productId: 1, quantity: -5, idempotencyKey: `negbuy_${ts}` },
    });
    assert(negQtyBuy.status === 422, 'Wallet manipulation blocked: negative market quantity rejected (422)');

    const exchKey = `idemp_ex_${ts}`;
    const ex1 = await apiCall('/economy/exchange', {
      method: 'POST',
      token: tokenA,
      body: { pointsToExchange: 100, idempotencyKey: exchKey },
    });
    const ex2 = await apiCall('/economy/exchange', {
      method: 'POST',
      token: tokenA,
      body: { pointsToExchange: 100, idempotencyKey: exchKey },
    });
    assert(
      ex1.status === 200 &&
        ex2.status === 200 &&
        ex1.json.data.newPoints === 375 &&
        ex2.json.data.newPoints === 375 &&
        ex1.json.data.transactionId === ex2.json.data.transactionId,
      'Duplicate transaction prevented: repeated exchange idempotencyKey debited CP only once'
    );

    const buyKey = `idemp_buy_${ts}`;
    const buy1 = await apiCall('/market/buy', {
      method: 'POST',
      token: tokenA,
      body: { productId: 1, quantity: 1, idempotencyKey: buyKey },
    });
    const buy2 = await apiCall('/market/buy', {
      method: 'POST',
      token: tokenA,
      body: { productId: 1, quantity: 1, idempotencyKey: buyKey },
    });
    assert(
      buy1.status === 200 &&
        buy2.status === 200 &&
        buy1.json.data.wallet.virtualNaira === buy2.json.data.wallet.virtualNaira &&
        buy1.json.data.remainingStock === buy2.json.data.remainingStock &&
        buy1.json.data.transactionId === buy2.json.data.transactionId,
      'Duplicate transaction prevented: repeated market purchase idempotencyKey charged Naira only once'
    );

    // ------------------------------------------------------------------------
    // 6. SQL INJECTION & MALFORMED INPUT HARDENING
    // ------------------------------------------------------------------------
    const sqliPlatoonRes = await apiCall('/platoons/1;DROP%20TABLE%20users', { token: tokenA });
    assert(sqliPlatoonRes.status === 400, 'SQLi path payload rejected: /platoons/1;DROP TABLE users -> 400');

    const sqliLocationRes = await apiCall('/world/locations/1%20OR%201=1', { token: tokenA });
    assert(sqliLocationRes.status === 400, 'SQLi path payload rejected: /world/locations/1 OR 1=1 -> 400');

    const sqliAuthRes = await apiCall('/auth/login', {
      method: 'POST',
      body: { email: "admin@nysc.gov.ng' OR '1'='1", stateCode: 'OY/26C/1111' },
    });
    assert(sqliAuthRes.status === 422, 'SQLi email payload rejected by Zod schema (422)');

    const sqliSearchRes = await apiCall(`/admin/players?q=${encodeURIComponent("' OR 1=1; --")}`, {
      token: superToken,
    });
    assert(
      sqliSearchRes.status === 200 && Array.isArray(sqliSearchRes.json.data) && sqliSearchRes.json.data.length === 0,
      'SQLi search query safely treated as literal string returning 0 matches'
    );

    // ------------------------------------------------------------------------
    // 7. INSECURE DIRECT OBJECT REFERENCES (IDOR)
    // ------------------------------------------------------------------------
    const fr = await apiCall('/social/friends/request', {
      method: 'POST',
      token: tokenA,
      body: { targetUserId: idB },
    });
    assert(fr.status === 200, 'Player A sent friend request to Player B');
    const friendshipId = fr.json.data.id as string;

    const idorAcceptRes = await apiCall('/social/friends/respond', {
      method: 'POST',
      token: tokenC,
      body: { friendshipId, accept: true },
    });
    assert(idorAcceptRes.status === 403, 'IDOR blocked: Player C cannot accept Player B friend request (403)');

    // ------------------------------------------------------------------------
    // 8. ACCOUNT SUSPENSION & DELETION BYPASS
    // ------------------------------------------------------------------------
    const suspRes = await apiCall(`/admin/players/${idB}/status`, {
      method: 'POST',
      token: superToken,
      body: { status: 'SUSPENDED', reason: 'Security test suspension' },
    });
    assert(suspRes.status === 200, 'Admin suspended Player B');

    const suspendedBypassAttempt = await apiCall('/players/me', { token: tokenB });
    assert(
      suspendedBypassAttempt.status === 403,
      'Account suspension bypass blocked: existing valid JWT rejected immediately (403)'
    );

    const reactivateRes = await apiCall(`/admin/players/${idB}/status`, {
      method: 'POST',
      token: superToken,
      body: { status: 'ACTIVE', reason: 'Restore before deletion test' },
    });
    assert(reactivateRes.status === 200, 'Player B reactivated');

    const deleteRes = await apiCall(`/admin/players/${idB}`, {
      method: 'DELETE',
      token: superToken,
      body: { reason: 'Retention policy test' },
    });
    assert(deleteRes.status === 200, 'Player B soft-deleted under retention policy');

    const deletedBypassAttempt = await apiCall('/players/me', { token: tokenB });
    assert(
      deletedBypassAttempt.status === 403,
      'Account deletion bypass blocked: existing JWT rejected immediately with 403'
    );

    // ------------------------------------------------------------------------
    // 9. ADMIN INVITATIONS, PERMISSION SCOPING & TOKEN REUSE (PROMPT 23 + 24)
    // ------------------------------------------------------------------------
    const inviteEmail = `invited_econ_${ts}@nysc.gov.ng`;
    const inviteStateCode = `OY/26C/4${ts.slice(0, 3)}`;
    const createInvRes = await apiCall('/admin/invitations', {
      method: 'POST',
      token: superToken,
      body: {
        email: inviteEmail,
        role: 'ADMIN',
        permissions: ['MANAGE_ECONOMY'],
        expiresInHours: 24,
      },
    });
    assert(createInvRes.status === 201 && !!createInvRes.json.data?.token, 'Superadmin issued scoped ADMIN invitation');
    const inviteToken = createInvRes.json.data.token as string;

    // Wrong email redemption blocked
    const wrongEmailAccept = await apiCall('/auth/accept-invitation', {
      method: 'POST',
      body: { token: inviteToken, email: `attacker_${ts}@nysc.gov.ng`, stateCode: `OY/26C/5${ts.slice(0, 3)}` },
    });
    assert(wrongEmailAccept.status === 403, 'Invitation hijacking blocked: mismatched email rejected (403)');

    // Legitimate redemption succeeds
    const acceptInvRes = await apiCall('/auth/accept-invitation', {
      method: 'POST',
      body: { token: inviteToken, email: inviteEmail, stateCode: inviteStateCode, fullName: 'Economy Officer' },
    });
    assert(
      acceptInvRes.status === 200 && acceptInvRes.json.data.user.role === 'ADMIN',
      'Invited officer redeemed single-use invitation and received ADMIN JWT'
    );
    const econAdminToken = acceptInvRes.json.data.accessToken as string;
    const econAdminId = acceptInvRes.json.data.user.id as string;

    // Invitation token reuse blocked
    const replayInvRes = await apiCall('/auth/accept-invitation', {
      method: 'POST',
      body: { token: inviteToken, email: inviteEmail, stateCode: inviteStateCode },
    });
    assert(replayInvRes.status === 409, 'Invitation token reuse blocked: second redemption returns 409 Conflict');

    // Scoped permission enforcement on newly invited admin
    const allowedEconRes = await apiCall('/admin/config', { token: econAdminToken });
    assert(allowedEconRes.status === 200, 'Scoped ADMIN with MANAGE_ECONOMY accesses /admin/config (200)');

    const forbiddenPlayersRes = await apiCall('/admin/players', { token: econAdminToken });
    assert(forbiddenPlayersRes.status === 403, 'Permission enforcement: ADMIN without MANAGE_PLAYERS blocked from /admin/players (403)');

    const forbiddenStaffRes = await apiCall('/admin/staff', { token: econAdminToken });
    assert(forbiddenStaffRes.status === 403, 'Privilege escalation blocked: ADMIN cannot access Superadmin /admin/staff (403)');

    // Revocation & Expiration checks
    const revInviteEmail = `revoked_${ts}@nysc.gov.ng`;
    const revInvCreate = await apiCall('/admin/invitations', {
      method: 'POST',
      token: superToken,
      body: { email: revInviteEmail, role: 'ADMIN', expiresInHours: 24 },
    });
    const revInvId = revInvCreate.json.data.invitationId as string;
    const revInvToken = revInvCreate.json.data.token as string;

    const revokeRes = await apiCall(`/admin/invitations/${revInvId}/revoke`, {
      method: 'POST',
      token: superToken,
      body: { reason: 'Officer reassigned' },
    });
    assert(revokeRes.status === 200 && revokeRes.json.data.status === 'REVOKED', 'Superadmin revoked pending invitation');

    const redeemRevokedRes = await apiCall('/auth/accept-invitation', {
      method: 'POST',
      body: { token: revInvToken, email: revInviteEmail, stateCode: `OY/26C/6${ts.slice(0, 3)}` },
    });
    assert(redeemRevokedRes.status === 403, 'Revoked invitation token cannot be redeemed (403)');

    // Expired invitation check
    const expInviteEmail = `expired_${ts}@nysc.gov.ng`;
    const expInvCreate = await apiCall('/admin/invitations', {
      method: 'POST',
      token: superToken,
      body: { email: expInviteEmail, role: 'ADMIN', expiresInHours: 1 },
    });
    const expInvToken = expInvCreate.json.data.token as string;
    const expRecord = db.adminInvitations.get(expInvToken)!;
    expRecord.expiresAt = new Date(Date.now() - 60_000).toISOString();
    db.adminInvitations.set(expInvToken, expRecord);

    const redeemExpiredRes = await apiCall('/auth/accept-invitation', {
      method: 'POST',
      body: { token: expInvToken, email: expInviteEmail, stateCode: `OY/26C/7${ts.slice(0, 3)}` },
    });
    assert(redeemExpiredRes.status === 410, 'Expired invitation token rejected with 410 Gone');

    // Suspend & revoke admin access
    const suspendAdminRes = await apiCall(`/admin/players/${econAdminId}/status`, {
      method: 'POST',
      token: superToken,
      body: { status: 'SUSPENDED', reason: 'Prompt 23 admin suspension verification' },
    });
    assert(suspendAdminRes.status === 200, 'Superadmin suspended invited ADMIN');

    const suspendedAdminAccess = await apiCall('/admin/config', { token: econAdminToken });
    assert(suspendedAdminAccess.status === 403, 'Suspended ADMIN immediately blocked from /admin/config (403)');

    // ------------------------------------------------------------------------
    // 10. API ABUSE / RATE LIMITING
    // ------------------------------------------------------------------------
    let rateLimitHit = false;
    let hasRetryAfter = false;
    for (let i = 0; i < 65; i++) {
      const rlRes = await apiCall('/auth/login', {
        method: 'POST',
        headers: { 'x-test-rate-limit': 'enforce', 'x-forwarded-for': `10.99.0.${ts.slice(-2)}` },
        body: { email: 'invalid-rate-check', stateCode: 'bad' },
      });
      if (rlRes.status === 429) {
        rateLimitHit = true;
        hasRetryAfter = !!rlRes.headers.get('retry-after');
        break;
      }
    }
    assert(rateLimitHit && hasRetryAfter, 'API abuse protection: burst requests trigger 429 Too Many Requests + Retry-After');

    // ------------------------------------------------------------------------
    // 11. WEBSOCKET AUTHENTICATION & IDENTITY ENFORCEMENT
    // ------------------------------------------------------------------------
    const wsBadCloseCode = await new Promise<number>((resolve) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            type: 'JOIN',
            data: { userId: idA, token: unsignedForgedPayload },
          })
        );
      });
      ws.on('close', (code) => resolve(code));
      ws.on('error', () => resolve(-1));
    });
    assert(wsBadCloseCode === 4001, `WebSocket unauthenticated/forged JOIN rejected cleanly (close code ${wsBadCloseCode})`);

    const wsMismatchCode = await new Promise<number>((resolve) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            type: 'JOIN',
            data: { userId: superId, token: tokenA },
          })
        );
      });
      ws.on('close', (code) => resolve(code));
      ws.on('error', () => resolve(-1));
    });
    assert(wsMismatchCode === 4003, `WebSocket userId impersonation rejected cleanly (close code ${wsMismatchCode})`);

    const wsValidInitAndBroadcast = await new Promise<{ joinedWithFeed: boolean; liveBroadcastReceived: boolean }>(
      (resolve) => {
        const ws = new WebSocket(wsUrl);
        let joinedWithFeed = false;
        let liveBroadcastReceived = false;
        const timer = setTimeout(() => {
          ws.close();
          resolve({ joinedWithFeed, liveBroadcastReceived });
        }, 2500);

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              type: 'JOIN',
              data: { userId: idA, token: tokenA },
            })
          );
        });

        ws.on('message', async (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ROOM_INIT') {
            const list = msg.data?.notifications;
            joinedWithFeed =
              Array.isArray(list) &&
              list.some((n: any) => typeof n.message === 'string' && n.message.includes('joined the camp'));
            // Trigger a real gold-medal Parade Drill by Player C while Player A is connected
            await apiCall('/activities/parade/submit', {
              method: 'POST',
              token: tokenC,
              body: { commandsTotal: 10, commandsSuccessful: 10, difficulty: 'NORMAL' },
            });
          } else if (
            msg.type === 'CAMP_NOTIFICATION' &&
            typeof msg.data?.message === 'string' &&
            msg.data.message.includes('earned a gold medal in the Parade Drill')
          ) {
            liveBroadcastReceived = true;
            clearTimeout(timer);
            ws.close();
            resolve({ joinedWithFeed, liveBroadcastReceived });
          }
        });

        ws.on('error', () => {
          clearTimeout(timer);
          resolve({ joinedWithFeed, liveBroadcastReceived });
        });
      }
    );
    assert(wsValidInitAndBroadcast.joinedWithFeed, 'WebSocket authenticated JOIN succeeds and ROOM_INIT includes camp notification feed');
    assert(
      wsValidInitAndBroadcast.liveBroadcastReceived,
      'WebSocket broadcasts live CAMP_NOTIFICATION when another corper earns a gold medal in Parade Drill'
    );

    const unauthFeedRes = await apiCall('/world/notifications');
    assert(unauthFeedRes.status === 401, 'Notifications REST feed requires authentication (401)');

    const authFeedRes = await apiCall('/world/notifications?limit=15', { token: tokenA });
    assert(
      authFeedRes.status === 200 &&
        Array.isArray(authFeedRes.json.data) &&
        authFeedRes.json.data.some((n: any) => n.message.includes('gold medal in the Parade Drill')),
      'Authenticated GET /world/notifications returns recent medal and camp join events'
    );

    // Verify IDOR check left friendship untouched as PENDING
    assert(db.friendships.get(friendshipId)?.status === 'PENDING', 'Social friendship state verified intact (still PENDING)');
  } finally {
    MultiplayerGateway.destroy();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log('=======================================================');
  console.log(`[SECURITY AUDIT SUMMARY] Passed: ${passedCount}/${results.length}, Failed: ${failedCount}`);
  console.log('=======================================================');

  return {
    success: failedCount === 0,
    total: results.length,
    passedCount,
    failedCount,
  };
}
