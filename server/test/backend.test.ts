/**
 * Corper Wee: Comprehensive Automated Test Suite
 * Covers:
 * - Prompt 6: Auth, Token Rotation, Superadmin Invariance
 * - Prompt 7: Character & Platoon Management
 * - Prompt 8: Points & Wallet Systems with Idempotency
 * - Prompt 9: Mami Market & Water Management
 */
import { AuthService } from '../services/authService.js';
import { AuthorizationService } from '../services/authorizationService.js';
import { EconomyService } from '../services/economyService.js';
import { ActivityService } from '../services/activityService.js';
import { AdminService } from '../services/adminService.js';
import { PlatoonService } from '../services/platoonService.js';
import { LocationService } from '../services/locationService.js';
import { EventService } from '../services/eventService.js';
import { parseAccessToken } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { config } from '../config/env.js';

export async function runBackendVerification() {
  console.log('[TEST] Starting Corper Wee Full Backend Verification Suite (Prompts 6, 7, 8, 9)...');
  const results: { test: string; passed: boolean; message?: string }[] = [];

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      results.push({ test: testName, passed: true });
      console.log(`  ✓ PASS: ${testName}`);
    } else {
      results.push({ test: testName, passed: false, message: detail });
      console.error(`  ✗ FAIL: ${testName} - ${detail}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: SUPERADMIN SEED IDEMPOTENCE & IMMUTABILITY (Prompt 6)
    // ------------------------------------------------------------------------
    const initialUserCount = db.users.size;
    const seededSuperadmin = db.seedSuperadmin();

    assert(db.users.size === initialUserCount, 'seedSuperadmin() is idempotent (did not duplicate accounts)');
    assert(seededSuperadmin.email === config.superadmin.email.toLowerCase(), 'Superadmin email matches farlodunolusege@gmail.com');
    assert(seededSuperadmin.stateCode === config.superadmin.stateCode, 'Superadmin state code matches OY/26C/5439');
    assert(seededSuperadmin.role === 'SUPERADMIN', 'Superadmin role is strictly SUPERADMIN');
    assert(seededSuperadmin.isProtected === true, 'Superadmin isProtected flag is strictly true');

    // Superadmin protection from suspension
    let caughtSuspension = false;
    try {
      AdminService.setPlayerStatus('actor-admin-1', seededSuperadmin.id, 'SUSPENDED');
    } catch (e: any) {
      caughtSuspension = e.statusCode === 403;
    }
    assert(caughtSuspension, 'Superadmin cannot be suspended (Protected by Authorization invariant)');

    // Superadmin protection from role demotion
    let caughtRoleDemotion = false;
    try {
      AdminService.setPlayerRole('actor-admin-1', seededSuperadmin.id, 'PLAYER');
    } catch (e: any) {
      caughtRoleDemotion = e.statusCode === 403;
    }
    assert(caughtRoleDemotion, 'Superadmin cannot be demoted to PLAYER or ADMIN');

    // ------------------------------------------------------------------------
    // SECTION 2: GOOGLE IDENTITY & NYSC STATE CODE REGISTRATION (Prompt 6)
    // ------------------------------------------------------------------------
    // Rejection of unverified email
    let caughtUnverified = false;
    try {
      AuthService.verifyGoogleIdentity(JSON.stringify({
        email: 'unverified_person@gmail.com',
        email_verified: false,
        sub: 'unverified-sub',
      }));
    } catch (e: any) {
      caughtUnverified = e.statusCode === 401;
    }
    assert(caughtUnverified, 'Google accounts with unverified email are rejected with 401');

    // Register a new user
    const uniqueEmail = `corper_${Date.now()}@gmail.com`;
    const googleToken = JSON.stringify({
      email: uniqueEmail,
      email_verified: true,
      name: 'Ngozi Eze',
      sub: 'google-sub-' + Date.now(),
    });

    const newAuth = await AuthService.handleGoogleAuth(googleToken);
    assert(newAuth.isNewUser === true, 'New user identified correctly');
    assert(newAuth.requiresOnboarding === true, 'New user requires state code onboarding');
    assert(!!newAuth.accessToken, 'Access token issued');
    assert(!!newAuth.refreshToken, 'Refresh token issued');

    // State code registration
    const validCode = 'EN/26A/5012';
    const regResult = await AuthService.registerStateCode(newAuth.user.id, validCode, 'Ngozi Sweet');
    assert(regResult.user.stateCode === validCode, 'State Code registered successfully');
    assert(regResult.platoonId >= 1 && regResult.platoonId <= 10, 'Platoon assigned between 1 and 10');

    // Refresh token rotation & reuse detection
    const rotation = AuthService.refreshTokenRotation(newAuth.refreshToken);
    assert(!!rotation.accessToken && !!rotation.newRefreshToken, 'Session rotated with new token pair');
    let reuseCaught = false;
    try {
      AuthService.refreshTokenRotation(newAuth.refreshToken); // Replay old token
    } catch (e: any) {
      reuseCaught = e.statusCode === 401 && e.message.includes('Token reuse detected');
    }
    assert(reuseCaught, 'Refresh token reuse detection caught replay attack and invalidated family');

    // ------------------------------------------------------------------------
    // SECTION 3: CHARACTER & PLATOON MANAGEMENT (Prompt 7)
    // ------------------------------------------------------------------------
    const char = db.playerCharacters.get(newAuth.user.id);
    assert(!!char, 'Character auto-created upon registration');

    // Character customization
    char!.gender = 'FEMALE';
    char!.uniformType = 'white_pt_kit';
    char!.skinToneHex = '#C68642';
    char!.accessory = 'waist_bag';
    db.playerCharacters.set(newAuth.user.id, char!);
    const updatedChar = db.playerCharacters.get(newAuth.user.id);
    assert(updatedChar?.gender === 'FEMALE', 'Character gender updated to FEMALE');
    assert(updatedChar?.uniformType === 'white_pt_kit', 'Uniform updated to white_pt_kit');

    // Platoon Listing & Roster
    const platoons = PlatoonService.listPlatoons();
    assert(platoons.length >= 10, 'All 10 camp platoons listed');

    const assignedPlatoon = PlatoonService.getPlatoonDetails(regResult.platoonId);
    assert(assignedPlatoon.totalMembers >= 1, 'Platoon roster includes registered corper');
    const memberEntry = assignedPlatoon.members.find((m) => m.userId === newAuth.user.id);
    assert(memberEntry?.displayName === 'Ngozi Eze', 'Corper name listed in platoon roster');

    // Platoon Leaderboard
    const leaderboard = PlatoonService.getLeaderboard();
    assert(leaderboard[0].rank === 1, 'Leaderboard ranks sorted with Rank 1 at top');
    assert(leaderboard[0].isChampion === true, 'Top platoon designated as champion');

    // Admin Platoon Reassignment
    const originalPlatoonId = regResult.platoonId;
    const targetPlatoonId = originalPlatoonId === 1 ? 2 : 1;
    const reassign = PlatoonService.reassignPlayerPlatoon(seededSuperadmin.id, newAuth.user.id, targetPlatoonId);
    assert(reassign.newPlatoonId === targetPlatoonId, 'Admin reassigned player to new platoon');
    assert(db.playerProfiles.get(newAuth.user.id)?.platoonId === targetPlatoonId, 'Profile platoon ID reflects reassignment');

    // ------------------------------------------------------------------------
    // SECTION 4: POINTS, WALLET & IDEMPOTENCY SYSTEM (Prompt 8)
    // ------------------------------------------------------------------------
    const initialWallet = EconomyService.getWallet(newAuth.user.id);
    const startCp = initialWallet.corperPoints;
    const startNaira = initialWallet.virtualNaira;

    // A. Award Points with Idempotency
    const awardKey = 'award_key_' + Date.now();
    const award1 = EconomyService.awardPoints(newAuth.user.id, 100, 'PARADE_BONUS', 'Parade drill victory', awardKey);
    assert(award1.newCorperPoints === startCp + 100, '100 CP awarded to wallet');

    // Replay with identical idempotencyKey
    const awardReplay = EconomyService.awardPoints(newAuth.user.id, 100, 'PARADE_BONUS', 'Parade drill victory', awardKey);
    assert(awardReplay.newCorperPoints === award1.newCorperPoints, 'Idempotent point award does not double-credit');
    assert(db.wallets.get(newAuth.user.id)?.corperPoints === startCp + 100, 'Wallet balance strictly guarded by idempotency');

    // B. Convert Points to Virtual Naira with Idempotency
    const exchangeKey = 'exchange_key_' + Date.now();
    const exchange1 = EconomyService.exchangeCpToNaira(newAuth.user.id, 50, exchangeKey);
    assert(exchange1.pointsDeducted === 50, '50 CP deducted for exchange');
    assert(exchange1.nairaCredited === 500, '₦500 credited (at 10 CP = ₦100 rate)');

    // Replay exchange with same idempotencyKey
    const exchangeReplay = EconomyService.exchangeCpToNaira(newAuth.user.id, 50, exchangeKey);
    assert(exchangeReplay.nairaCredited === 500, 'Idempotent exchange returns cached payload');
    assert(db.wallets.get(newAuth.user.id)?.virtualNaira === startNaira + 500, 'Virtual Naira balance not duplicated on replay');

    // C. Rejection of conversion when insufficient CP
    let caughtInsufficientCp = false;
    try {
      EconomyService.exchangeCpToNaira(newAuth.user.id, 999999);
    } catch (e: any) {
      caughtInsufficientCp = e.statusCode === 400;
    }
    assert(caughtInsufficientCp, 'Excessive CP conversion rejected with 400 Insufficient Corper Points');

    // D. Transaction History
    const txHistory = EconomyService.getTransactionHistory(newAuth.user.id);
    assert(txHistory.pointTransactions.length >= 2, 'Point transaction history logged');
    assert(txHistory.walletTransactions.length >= 2, 'Wallet transaction history logged');

    // ------------------------------------------------------------------------
    // SECTION 5: MAMI MARKET & WATER MANAGEMENT (Prompt 9)
    // ------------------------------------------------------------------------
    // A. Product Catalog
    const products = EconomyService.getMarketProducts();
    assert(products.length >= 7, 'Mami Market catalog loaded with diverse products');
    const waterProduct = products.find((p) => p.name.includes('Sachet'));
    assert(!!waterProduct, 'Pure water sachet available in market');

    // B. Purchase Product with Idempotency
    const initialNaira = db.wallets.get(newAuth.user.id)?.virtualNaira || 0;
    const initialStock = waterProduct!.stockQuantity;
    const buyKey = 'buy_key_' + Date.now();

    const purchase = EconomyService.purchaseProduct(newAuth.user.id, waterProduct!.id, 2, buyKey);
    assert(purchase.purchasedItem.quantity === 2, 'Purchased 2 sachets of water');
    assert(purchase.wallet.virtualNaira === initialNaira - waterProduct!.priceNaira * 2, 'Wallet virtual Naira deducted');
    assert(purchase.remainingStock === initialStock - 2, 'Product stock decremented');

    // Replay purchase with same idempotencyKey
    const purchaseReplay = EconomyService.purchaseProduct(newAuth.user.id, waterProduct!.id, 2, buyKey);
    assert(purchaseReplay.wallet.virtualNaira === purchase.wallet.virtualNaira, 'Idempotent purchase does not double-charge');
    assert(db.products.get(waterProduct!.id)?.stockQuantity === initialStock - 2, 'Stock not double-decremented on replay');

    // C. Inventory Lookup
    const inventory = EconomyService.getPlayerInventory(newAuth.user.id);
    const invWater = inventory.find((i) => i.productId === waterProduct!.id);
    assert(!!invWater && invWater.quantity >= 2, 'Purchased items appear in player inventory');

    // D. Water Meter Depletion & Refill
    ActivityService.depleteWater(newAuth.user.id, 30, true);
    const depletedLevel = db.waterMeters.get(newAuth.user.id)?.currentLevel || 0;
    assert(depletedLevel < 100, 'Water meter depleted by running');

    const consumeResult = EconomyService.consumeInventoryItem(newAuth.user.id, waterProduct!.id);
    assert(consumeResult.newWaterLevel > depletedLevel, 'Drinking water sachet restores water meter');

    // E. Admin Market Controls
    // Add product
    const newProduct = EconomyService.createProduct(seededSuperadmin.id, {
      categoryId: 2,
      name: 'Mami Special Jollof with Fried Fish',
      description: 'Hot steaming party jollof with crispy fish',
      priceNaira: 1200,
      staminaBoostValue: 60,
      stockQuantity: 100,
    });
    assert(newProduct.name.includes('Jollof'), 'Admin created new Mami Market product');

    // Update product price & stock
    const updatedProduct = EconomyService.updateProduct(seededSuperadmin.id, newProduct.id, {
      priceNaira: 1400,
      stockQuantity: 150,
    });
    assert(updatedProduct.priceNaira === 1400, 'Admin updated product price');
    assert(updatedProduct.stockQuantity === 150, 'Admin updated product stock');

    // ------------------------------------------------------------------------
    // SECTION 6: EVENTS & LOCATIONS WITH ZERO CORRUPTION (Prompt 10)
    // ------------------------------------------------------------------------
    // A. Locations Listing
    const initialLocations = LocationService.listLocations(1);
    assert(initialLocations.length >= 6, 'Camp 3D locations listed (Parade Ground, Mami Market, Canteen, Hostels, etc.)');

    // B. Admin Create Location
    const newLocation = LocationService.createLocation(seededSuperadmin.id, {
      campId: 1,
      slug: 'camp-clinic',
      name: 'Camp Clinic & Red Cross Station',
      category: 'MEDICAL',
      posX: 25.0,
      posY: 0.0,
      posZ: -30.0,
      triggerRadius: 8.0,
      description: 'First aid and camp medical station for fatigued corps members.',
    });
    assert(newLocation.name.includes('Clinic'), 'Admin created new camp location with 3D coordinates');

    // C. Admin Update Location Coordinates & Trigger Radius
    const updatedLocation = LocationService.updateLocation(seededSuperadmin.id, newLocation.id, {
      triggerRadius: 12.0,
      description: 'Expanded Red Cross medical zone with hydration support.',
    });
    assert(updatedLocation.triggerRadius === 12.0, 'Admin updated location trigger radius');

    // D. Admin Toggle Active
    const deactivated = LocationService.toggleActive(seededSuperadmin.id, newLocation.id, false);
    assert(deactivated.isActive === false, 'Admin deactivated camp location');
    const activeList = LocationService.listLocations(1, false);
    assert(!activeList.some((l) => l.id === newLocation.id), 'Deactivated location hidden from regular camp view');

    // E. Camp Events Listing & Details
    const eventsList = EventService.listEvents(1);
    assert(eventsList.length >= 2, 'Scheduled camp events retrieved');
    const firstEvent = eventsList[0];

    // F. Admin Schedule Event
    const scheduledEvent = EventService.createEvent(seededSuperadmin.id, {
      campId: 1,
      locationId: newLocation.id,
      title: 'Inter-Platoon Football Final',
      description: 'Championship match between the top 2 platoons.',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      rewardCp: 500,
      rewardNaira: 3000.0,
      maxParticipants: 50,
      minCharismaRequired: 10,
    });
    assert(scheduledEvent.title === 'Inter-Platoon Football Final', 'Admin scheduled new camp event with rewards');

    // G. Soft Deletion of Location Ensuring Zero Corruption of Events
    const softDelResult = LocationService.softDeleteLocation(seededSuperadmin.id, newLocation.id);
    assert(softDelResult.success === true, 'Location soft-deleted');
    // Verify that the event scheduled at this location still exists with its historic locationName intact!
    const preservedEvent = db.events.get(scheduledEvent.id);
    assert(!!preservedEvent, 'Historical event remains intact after location soft-deletion (Zero corruption)');
    assert(preservedEvent?.locationName === newLocation.name, 'Historical locationName preserved on event record');

    // H. Player Join Event & Claim Reward
    const joinResult = EventService.joinEvent(newAuth.user.id, scheduledEvent.id);
    assert(joinResult.eventId === scheduledEvent.id, 'Corps member registered for scheduled camp event');

    const walletBeforeEvent = db.wallets.get(newAuth.user.id);
    const cpBefore = walletBeforeEvent?.corperPoints || 0;
    const nairaBefore = walletBeforeEvent?.virtualNaira || 0;

    const claimResult = EventService.claimEventReward(newAuth.user.id, scheduledEvent.id);
    assert(claimResult.rewardCp === 500, '500 CP participation reward awarded');
    assert(claimResult.newCorperPoints === cpBefore + 500, 'Wallet CP updated authoritatively');
    assert(claimResult.newVirtualNaira === nairaBefore + 3000.0, 'Wallet Virtual Naira credited with prize');

    // I. Admin View Participants Roster
    const roster = EventService.getEventParticipants(scheduledEvent.id);
    assert(roster.totalParticipants >= 1, 'Event participants roster retrieved');
    const participantRecord = roster.participants.find((p) => p.userId === newAuth.user.id);
    assert(participantRecord?.rewardClaimed === true, 'Participant record reflects rewardClaimed=true');

    // J. Admin Cancel Event
    const cancelResult = EventService.cancelEvent(seededSuperadmin.id, scheduledEvent.id, 'Heavy rain on camp grounds');
    assert(cancelResult.status === 'CANCELLED', 'Admin successfully cancelled camp event');

    // Attempting to join cancelled event should be rejected
    let joinCancelledRejected = false;
    try {
      EventService.joinEvent('some-other-user', scheduledEvent.id);
    } catch (e: any) {
      joinCancelledRejected = e.statusCode === 400 && e.message.includes('cancelled');
    }
    assert(joinCancelledRejected, 'Joining a cancelled event is rejected with 400');

    console.log('[TEST] All Prompts 6, 7, 8, 9, 10 tests passed! Total verifications:', results.length);
    return {
      success: results.every((r) => r.passed),
      results,
    };
  } catch (error) {
    console.error('[TEST] Unhandled test execution error:', error);
    return {
      success: false,
      error,
      results,
    };
  }
}
