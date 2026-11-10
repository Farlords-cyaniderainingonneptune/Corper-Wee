/**
 * Corper Wee: Platoon & Leaderboard Controller
 */
import type { Response, NextFunction } from 'express';
import { PlatoonService } from '../services/platoonService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class PlatoonController {
  static listPlatoons(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parseInt(req.query.campId as string, 10) : 1;
      const platoons = PlatoonService.listPlatoons(campId);
      res.status(200).json({ status: 'success', data: platoons });
    } catch (error) {
      next(error);
    }
  }

  static getPlatoonDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const platoonId = parseInt(req.params.id, 10);
      const data = PlatoonService.getPlatoonDetails(platoonId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static getLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parseInt(req.query.campId as string, 10) : 1;
      const leaderboard = PlatoonService.getLeaderboard(campId);
      res.status(200).json({ status: 'success', data: leaderboard });
    } catch (error) {
      next(error);
    }
  }

  // Admin Operations
  static adminCreatePlatoon(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { campId, number, name, colorHex, motto } = req.body;
      const platoon = PlatoonService.createPlatoon(
        actorUserId,
        campId || 1,
        number,
        name,
        colorHex,
        motto
      );
      res.status(201).json({ status: 'success', message: 'Platoon created successfully.', data: platoon });
    } catch (error) {
      next(error);
    }
  }

  static adminUpdatePlatoon(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const platoonId = parseInt(req.params.id, 10);
      const { name, colorHex, motto } = req.body;
      const platoon = PlatoonService.updatePlatoon(actorUserId, platoonId, { name, colorHex, motto });
      res.status(200).json({ status: 'success', message: 'Platoon updated successfully.', data: platoon });
    } catch (error) {
      next(error);
    }
  }

  static adminReassignPlayer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { targetUserId, newPlatoonId } = req.body;
      const result = PlatoonService.reassignPlayerPlatoon(actorUserId, targetUserId, newPlatoonId);
      res.status(200).json({ status: 'success', message: 'Player reassigned to new platoon.', data: result });
    } catch (error) {
      next(error);
    }
  }
}
