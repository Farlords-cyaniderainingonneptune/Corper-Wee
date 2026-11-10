/**
 * Corper Wee: Authoritative Activity & Mini-Games Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

export interface DrillResultInput {
  command: string;
  responseTimeMs: number;
  isCorrect: boolean;
}

export class ActivityService {
  /**
   * Authoritatively validate Parade Drill Commands
   */
  static submitParadeDrill(userId: string, sequenceId: string, results: DrillResultInput[]) {
    if (!results || results.length === 0) {
      throw new AppError('Drill results cannot be empty.', 400);
    }

    let correctCount = 0;
    let totalScore = 0;

    for (const r of results) {
      if (r.isCorrect) {
        correctCount += 1;
        // Perfect timing (< 250ms): +50 pts; Good (< 450ms): +35 pts; Slower: +20 pts
        if (r.responseTimeMs <= 250) {
          totalScore += 50;
        } else if (r.responseTimeMs <= 450) {
          totalScore += 35;
        } else {
          totalScore += 20;
        }
      }
    }

    const accuracy = Math.round((correctCount / results.length) * 100);
    // Base CP: 15 per correct command, with accuracy multiplier
    const accuracyMultiplier = accuracy >= 90 ? 1.5 : accuracy >= 70 ? 1.2 : 1.0;
    const earnedPoints = Math.round(correctCount * 15 * accuracyMultiplier);

    const now = new Date().toISOString();

    // Credit Corper Points to wallet
    const wallet = db.wallets.get(userId);
    let newCp = 0;
    if (wallet) {
      wallet.corperPoints += earnedPoints;
      wallet.updatedAt = now;
      db.wallets.set(userId, wallet);
      newCp = wallet.corperPoints;

      db.pointTransactions.push({
        id: uuidv4(),
        userId,
        amount: earnedPoints,
        balanceAfter: wallet.corperPoints,
        activityType: 'PARADE_DRILL',
        description: `Morning Parade Drill: ${accuracy}% accuracy (${correctCount}/${results.length} commands)`,
        createdAt: now,
      });
    }

    // Update Player Profile & Platoon Points
    const profile = db.playerProfiles.get(userId);
    if (profile) {
      profile.totalParadesCompleted += 1;
      profile.experiencePoints += totalScore;
      if (accuracy >= 85) {
        profile.charismaScore = Math.min(100, profile.charismaScore + 1);
      }
      profile.updatedAt = now;
      db.playerProfiles.set(userId, profile);

      // Award points to the platoon
      const platoon = db.platoons.get(profile.platoonId);
      if (platoon) {
        platoon.totalPoints += earnedPoints;
        db.platoons.set(profile.platoonId, platoon);
      }
    }

    // Record activity session
    db.activitySessions.push({
      id: uuidv4(),
      userId,
      activitySlug: 'parade-ground',
      score: totalScore,
      pointsAwarded: earnedPoints,
      accuracyPercentage: accuracy,
      durationSeconds: Math.round(results.length * 3),
      completedAt: now,
    });

    return {
      score: totalScore,
      accuracy,
      earnedPoints,
      newCorperPoints: newCp,
      correctCommands: correctCount,
      totalCommands: results.length,
    };
  }

  /**
   * Authoritatively validate Canteen Rush Obstacle Run
   */
  static submitCanteenRush(
    userId: string,
    timeTakenSeconds: number,
    obstaclesCleared: number,
    puddlesHit: number,
    staminaRemaining: number
  ) {
    if (timeTakenSeconds <= 0) {
      throw new AppError('Invalid time recorded for canteen rush.', 400);
    }

    // Award base points + speed bonus
    const basePoints = obstaclesCleared * 10;
    const penalty = puddlesHit * 5;
    const speedBonus = timeTakenSeconds < 60 ? Math.round((60 - timeTakenSeconds) * 2) : 0;
    const earnedPoints = Math.max(10, basePoints + speedBonus - penalty);

    const now = new Date().toISOString();

    const wallet = db.wallets.get(userId);
    if (wallet) {
      wallet.corperPoints += earnedPoints;
      wallet.updatedAt = now;
      db.wallets.set(userId, wallet);

      db.pointTransactions.push({
        id: uuidv4(),
        userId,
        amount: earnedPoints,
        balanceAfter: wallet.corperPoints,
        activityType: 'CANTEEN_RUSH',
        description: `Canteen Rush in ${timeTakenSeconds.toFixed(1)}s (Cleared: ${obstaclesCleared}, Mud: ${puddlesHit})`,
        createdAt: now,
      });
    }

    // Also slightly deplete water meter after running
    const waterMeter = db.waterMeters.get(userId);
    if (waterMeter) {
      waterMeter.currentLevel = Math.max(0, waterMeter.currentLevel - 15.0);
      waterMeter.updatedAt = now;
      db.waterMeters.set(userId, waterMeter);
    }

    return {
      timeTaken: timeTakenSeconds,
      earnedPoints,
      newCorperPoints: wallet?.corperPoints || 0,
      currentWaterLevel: waterMeter?.currentLevel || 100,
    };
  }

  /**
   * Report Avoid the Soldiers stealth outcome
   */
  static reportStealthOutcome(userId: string, survived: boolean, timeInZoneSec: number) {
    const now = new Date().toISOString();
    const wallet = db.wallets.get(userId);

    let pointsDelta = 0;
    let message = '';

    if (survived) {
      pointsDelta = Math.min(100, Math.round(timeInZoneSec * 2));
      message = 'You successfully evaded camp soldier patrols without being caught!';
      if (wallet) {
        wallet.corperPoints += pointsDelta;
        wallet.updatedAt = now;
        db.wallets.set(userId, wallet);
      }
    } else {
      pointsDelta = -15; // Penalty
      message = 'Caught by Soldier patrol! "Oga corper, double up! Pick pin now!"';
      if (wallet) {
        wallet.corperPoints = Math.max(0, wallet.corperPoints + pointsDelta);
        wallet.updatedAt = now;
        db.wallets.set(userId, wallet);
      }
    }

    if (wallet) {
      db.pointTransactions.push({
        id: uuidv4(),
        userId,
        amount: pointsDelta,
        balanceAfter: wallet.corperPoints,
        activityType: 'SOLDIER_STEALTH',
        description: message,
        createdAt: now,
      });
    }

    return {
      survived,
      pointsDelta,
      newCorperPoints: wallet?.corperPoints || 0,
      narrative: message,
    };
  }

  /**
   * Deplete Water Meter
   */
  static depleteWater(userId: string, deltaSeconds = 10, isRunning = false) {
    const waterMeter = db.waterMeters.get(userId);
    if (!waterMeter) {
      throw new AppError('Water meter not initialized.', 404);
    }

    const drainRatePerSec = isRunning ? 0.25 : 0.08;
    const drainAmount = deltaSeconds * drainRatePerSec;

    waterMeter.currentLevel = Math.max(0.0, +(waterMeter.currentLevel - drainAmount).toFixed(2));
    waterMeter.lastDepletedAt = new Date().toISOString();
    waterMeter.updatedAt = waterMeter.lastDepletedAt;
    db.waterMeters.set(userId, waterMeter);

    return {
      currentLevel: waterMeter.currentLevel,
      isCritical: waterMeter.currentLevel <= 25.0,
      isZero: waterMeter.currentLevel <= 0.0,
    };
  }
}
