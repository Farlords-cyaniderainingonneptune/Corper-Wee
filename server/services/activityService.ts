/**
 * Corper Wee: Authoritative Activity & Mini-Games Service
 * Reads live reward/penalty/hydration configuration from GameSettings
 * and enforces strict anti-cheat server-side bounds.
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { NotificationService } from './notificationService.js';
import { DailyTaskService } from './dailyTaskService.js';
import {
  getWeatherHydrationMultiplier,
  type CampWeatherState,
} from '../../src/game/WeatherSystem.js';

export interface DrillResultInput {
  command: string;
  responseTimeMs: number;
  isCorrect: boolean;
}

export class ActivityService {
  static getParadeConfig() {
    return (
      db.gameSettings.get('parade_rewards')?.value || {
        baseCpPerCommand: 15,
        tier1AccuracyMin: 90,
        tier1Multiplier: 1.5,
        tier2AccuracyMin: 70,
        tier2Multiplier: 1.2,
        charismaGainThreshold: 85,
      }
    );
  }

  static getCanteenConfig() {
    return (
      db.gameSettings.get('canteen_rewards')?.value || {
        cpPerObstacle: 10,
        puddlePenaltyCp: 5,
        speedBonusCutoffSec: 60,
        speedBonusMultiplier: 2,
        minRewardCp: 10,
        waterDrainAmount: 15,
      }
    );
  }

  static getStealthConfig() {
    return (
      db.gameSettings.get('stealth_config')?.value || {
        cpPerSecondSurvived: 2,
        maxSurvivalCp: 100,
        caughtPenaltyCp: 15,
      }
    );
  }

  static getHydrationConfig() {
    return (
      db.gameSettings.get('hydration_drain')?.value || {
        idlePerSec: 0.08,
        runPerSec: 0.25,
        criticalThreshold: 25,
      }
    );
  }

  /**
   * Authoritatively validate Parade Drill Commands
   */
  static submitParadeDrill(userId: string, sequenceId: string, results: DrillResultInput[]) {
    if (!results || results.length === 0) {
      throw new AppError('Drill results cannot be empty.', 400);
    }
    if (results.length > 50) {
      throw new AppError('Anti-cheat validation: Parade sequence cannot exceed 50 commands.', 400);
    }

    const cfg = this.getParadeConfig();
    let correctCount = 0;
    let totalScore = 0;

    for (const r of results) {
      if (typeof r.responseTimeMs !== 'number' || r.responseTimeMs < 0 || r.responseTimeMs > 60000) {
        throw new AppError('Anti-cheat validation: Invalid command response time.', 400);
      }
      if (r.isCorrect) {
        correctCount += 1;
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
    const accuracyMultiplier =
      accuracy >= cfg.tier1AccuracyMin
        ? cfg.tier1Multiplier
        : accuracy >= cfg.tier2AccuracyMin
        ? cfg.tier2Multiplier
        : 1.0;
    const earnedPoints = Math.round(correctCount * cfg.baseCpPerCommand * accuracyMultiplier);

    const now = new Date().toISOString();

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

    const profile = db.playerProfiles.get(userId);
    if (profile) {
      profile.totalParadesCompleted += 1;
      profile.experiencePoints += totalScore;
      if (accuracy >= cfg.charismaGainThreshold) {
        profile.charismaScore = Math.min(100, profile.charismaScore + 1);
      }
      profile.updatedAt = now;
      db.playerProfiles.set(userId, profile);

      const platoon = db.platoons.get(profile.platoonId);
      if (platoon) {
        platoon.totalPoints += earnedPoints;
        db.platoons.set(profile.platoonId, platoon);
      }
    }

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

    const user = db.users.get(userId);
    const actorName = user?.displayName || 'Corper';
    if (accuracy >= 90) {
      NotificationService.publish({
        category: 'MEDAL_EARNED',
        actorUserId: userId,
        actorName,
        actorStateCode: user?.stateCode,
        platoonNumber: profile?.platoonId,
        message: `${actorName} just earned a gold medal in the Parade Drill (${accuracy}% · +${earnedPoints} CP)`,
      });
    } else if (accuracy >= 75) {
      NotificationService.publish({
        category: 'MEDAL_EARNED',
        actorUserId: userId,
        actorName,
        actorStateCode: user?.stateCode,
        platoonNumber: profile?.platoonId,
        message: `${actorName} just earned a silver medal in the Parade Drill (${accuracy}% · +${earnedPoints} CP)`,
      });
    } else if (earnedPoints > 0) {
      NotificationService.publish({
        category: 'ACTIVITY_RECORD',
        actorUserId: userId,
        actorName,
        actorStateCode: user?.stateCode,
        platoonNumber: profile?.platoonId,
        message: `${actorName} just completed a Parade Drill (+${earnedPoints} CP)`,
      });
    }

    const dailyUnlock = DailyTaskService.autoCompleteFromParadeDrill(
      userId,
      sequenceId,
      accuracy
    );
    const finalCorperPoints =
      dailyUnlock.newCorperPoints !== null ? dailyUnlock.newCorperPoints : newCp;

    return {
      score: totalScore,
      accuracy,
      earnedPoints,
      dailyBonusCp: dailyUnlock.bonusCp,
      completedDailyTask: dailyUnlock.unlockedTask,
      completedDailyTitle: dailyUnlock.unlockedTitle,
      newCorperPoints: finalCorperPoints,
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
    if (timeTakenSeconds < 3 || timeTakenSeconds > 600) {
      throw new AppError('Anti-cheat validation: Invalid completion duration for Canteen Rush (must be 3s–600s).', 400);
    }
    if (obstaclesCleared < 0 || obstaclesCleared > 50 || puddlesHit < 0 || puddlesHit > 100) {
      throw new AppError('Anti-cheat validation: Canteen Rush obstacle or puddle count out of bounds.', 400);
    }

    const cfg = this.getCanteenConfig();
    const basePoints = obstaclesCleared * cfg.cpPerObstacle;
    const penalty = puddlesHit * cfg.puddlePenaltyCp;
    const speedBonus =
      timeTakenSeconds < cfg.speedBonusCutoffSec
        ? Math.round((cfg.speedBonusCutoffSec - timeTakenSeconds) * cfg.speedBonusMultiplier)
        : 0;
    const earnedPoints = Math.max(cfg.minRewardCp, basePoints + speedBonus - penalty);

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

    const waterMeter = db.waterMeters.get(userId);
    if (waterMeter) {
      waterMeter.currentLevel = Math.max(0, +(waterMeter.currentLevel - cfg.waterDrainAmount).toFixed(2));
      waterMeter.updatedAt = now;
      db.waterMeters.set(userId, waterMeter);
    }

    const accuracy = obstaclesCleared + puddlesHit > 0
      ? Math.round((obstaclesCleared / (obstaclesCleared + puddlesHit)) * 100)
      : 100;

    db.activitySessions.push({
      id: uuidv4(),
      userId,
      activitySlug: 'canteen-rush',
      score: basePoints + speedBonus,
      pointsAwarded: earnedPoints,
      accuracyPercentage: accuracy,
      durationSeconds: Math.round(timeTakenSeconds),
      completedAt: now,
    });

    const user = db.users.get(userId);
    const profile = db.playerProfiles.get(userId);
    const actorName = user?.displayName || 'Corper';
    NotificationService.publish({
      category: timeTakenSeconds < cfg.speedBonusCutoffSec ? 'MEDAL_EARNED' : 'ACTIVITY_RECORD',
      actorUserId: userId,
      actorName,
      actorStateCode: user?.stateCode,
      platoonNumber: profile?.platoonId,
      message:
        timeTakenSeconds < cfg.speedBonusCutoffSec
          ? `${actorName} blazed through Canteen Rush in ${timeTakenSeconds.toFixed(1)}s (+${earnedPoints} CP)`
          : `${actorName} finished Canteen Rush in ${timeTakenSeconds.toFixed(1)}s (+${earnedPoints} CP)`,
    });

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
    if (typeof timeInZoneSec !== 'number' || timeInZoneSec < 1 || timeInZoneSec > 300) {
      throw new AppError('Anti-cheat validation: Stealth zone duration must be between 1 and 300 seconds.', 400);
    }

    const cfg = this.getStealthConfig();
    const now = new Date().toISOString();
    const wallet = db.wallets.get(userId);

    let pointsDelta = 0;
    let message = '';

    if (survived) {
      pointsDelta = Math.min(cfg.maxSurvivalCp, Math.round(timeInZoneSec * cfg.cpPerSecondSurvived));
      message = 'You successfully evaded camp soldier patrols without being caught!';
      if (wallet) {
        wallet.corperPoints += pointsDelta;
        wallet.updatedAt = now;
        db.wallets.set(userId, wallet);
      }
    } else {
      pointsDelta = -Math.abs(cfg.caughtPenaltyCp);
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

    db.activitySessions.push({
      id: uuidv4(),
      userId,
      activitySlug: 'soldier-stealth',
      score: survived ? pointsDelta * 10 : 0,
      pointsAwarded: pointsDelta,
      accuracyPercentage: survived ? 100 : 0,
      durationSeconds: Math.round(timeInZoneSec),
      completedAt: now,
    });

    if (survived && pointsDelta > 0) {
      const user = db.users.get(userId);
      const profile = db.playerProfiles.get(userId);
      const actorName = user?.displayName || 'Corper';
      NotificationService.publish({
        category: 'ACTIVITY_RECORD',
        actorUserId: userId,
        actorName,
        actorStateCode: user?.stateCode,
        platoonNumber: profile?.platoonId,
        message: `${actorName} evaded soldier patrols for ${Math.round(timeInZoneSec)}s (+${pointsDelta} CP)`,
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
   * Deplete Water Meter (supports dynamic camp weather hydration modifiers)
   */
  static depleteWater(
    userId: string,
    deltaSeconds = 10,
    isRunning = false,
    weather?: CampWeatherState
  ) {
    if (typeof deltaSeconds !== 'number' || deltaSeconds <= 0 || deltaSeconds > 120) {
      throw new AppError('Invalid water depletion duration (must be between 0.1 and 120 seconds).', 400);
    }

    const waterMeter = db.waterMeters.get(userId);
    if (!waterMeter) {
      throw new AppError('Water meter not initialized.', 404);
    }

    const cfg = this.getHydrationConfig();
    const drainRatePerSec = isRunning ? cfg.runPerSec : cfg.idlePerSec;
    const weatherMultiplier = weather ? getWeatherHydrationMultiplier(weather) : 1.0;
    const drainAmount = deltaSeconds * drainRatePerSec * weatherMultiplier;

    waterMeter.currentLevel = Math.max(0.0, +(waterMeter.currentLevel - drainAmount).toFixed(2));
    waterMeter.lastDepletedAt = new Date().toISOString();
    waterMeter.updatedAt = waterMeter.lastDepletedAt;
    db.waterMeters.set(userId, waterMeter);

    return {
      currentLevel: waterMeter.currentLevel,
      isCritical: waterMeter.currentLevel <= cfg.criticalThreshold,
      isZero: waterMeter.currentLevel <= 0.0,
      weather: weather ?? 'CLOUDY',
      drainMultiplier: weatherMultiplier,
    };
  }
}
