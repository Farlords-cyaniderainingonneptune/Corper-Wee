/**
 * Corper Wee: Activities & Mini-games Controller
 */
import type { Response, NextFunction } from 'express';
import { ActivityService } from '../services/activityService.js';
import { EconomyService } from '../services/economyService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class ActivityController {
  static submitParadeDrill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { sequenceId, results } = req.body;
      const data = ActivityService.submitParadeDrill(userId, sequenceId || 'morning_drill', results);
      res.status(200).json({ status: 'success', data });
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
      const { deltaSeconds, isRunning } = req.body;
      const data = ActivityService.depleteWater(userId, deltaSeconds || 10, !!isRunning);
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
