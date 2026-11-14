/**
 * Corper Wee: Activities & Mini-games Controller
 */
import type { Response, NextFunction } from 'express';
import { ActivityService } from '../services/activityService.js';
import { EconomyService } from '../services/economyService.js';
import { DailyTaskService, type CampTimeOfDayParam } from '../services/dailyTaskService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class ActivityController {
  static getDailyTasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rawTime = String(req.query.timeOfDay || 'MORNING').toUpperCase();
      const timeOfDay: CampTimeOfDayParam =
        rawTime === 'DAY' || rawTime === 'NIGHT' ? rawTime : 'MORNING';
      const summary = DailyTaskService.getDailyTasks(userId, timeOfDay);
      res.status(200).json({ status: 'success', data: summary });
    } catch (error) {
      next(error);
    }
  }

  static triggerDailyTaskAlert(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rawTime = String(req.body?.timeOfDay || 'MORNING').toUpperCase();
      const timeOfDay: CampTimeOfDayParam =
        rawTime === 'DAY' || rawTime === 'NIGHT' ? rawTime : 'MORNING';
      const result = DailyTaskService.triggerShiftAlert(userId, timeOfDay, Boolean(req.body?.force));
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static completeDailyTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { taskType, accuracy } = req.body;
      const data = DailyTaskService.completeTask(
        userId,
        taskType,
        typeof accuracy === 'number' ? accuracy : 100
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static submitParadeDrill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { sequenceId, results, commandsTotal, commandsSuccessful, difficulty } = req.body;
      let drillResults = results;
      if (!drillResults || drillResults.length === 0) {
        const total = commandsTotal || 8;
        const success = Math.min(total, commandsSuccessful || 0);
        drillResults = Array.from({ length: total }, (_, i) => ({
          command: `Command #${i + 1}`,
          responseTimeMs: i < success ? 180 : 700,
          isCorrect: i < success,
        }));
      }
      const data = ActivityService.submitParadeDrill(userId, sequenceId || `parade_${difficulty || 'normal'}`, drillResults);
      res.status(200).json({
        status: 'success',
        data: {
          ...data,
          pointsEarned: data.earnedPoints,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static submitCanteenRush(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { timeTakenSeconds, obstaclesCleared, puddlesHit, staminaRemaining } = req.body;
      const data = ActivityService.submitCanteenRush(
        userId,
        timeTakenSeconds,
        obstaclesCleared || 0,
        puddlesHit || 0,
        staminaRemaining || 0
      );
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static reportStealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { survived, timeInZoneSec } = req.body;
      const data = ActivityService.reportStealthOutcome(userId, survived, timeInZoneSec || 10);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static depleteWater(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { deltaSeconds, isRunning, weather } = req.body;
      const data = ActivityService.depleteWater(userId, deltaSeconds || 10, !!isRunning, weather);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static consumeWater(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { productId } = req.body;
      const data = EconomyService.consumeInventoryItem(userId, productId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}
