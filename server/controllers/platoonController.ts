/**
 * Corper Wee: Platoon & Leaderboard Controller
 */
import type { Response, NextFunction } from 'express';
import { PlatoonService } from '../services/platoonService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

function parsePositiveIntId(raw: string, label = 'identifier'): number {
  if (!/^\d+$/.test(raw)) {
    throw new AppError(`Invalid numeric ${label}.`, 400);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid numeric ${label}.`, 400);
  }
  return parsed;
}

export class PlatoonController {
  static listPlatoons(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parsePositiveIntId(String(req.query.campId), 'camp identifier') : 1;
      const platoons = PlatoonService.listPlatoons(campId);
      res.status(200).json({ status: 'success', data: platoons });
    } catch (error) {
      next(error);
    }
  }

  static getPlatoonDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const platoonId = parsePositiveIntId(req.params.id, 'platoon identifier');
      const data = PlatoonService.getPlatoonDetails(platoonId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static getLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parsePositiveIntId(String(req.query.campId), 'camp identifier') : 1;
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
      const platoonId = parsePositiveIntId(req.params.id, 'platoon identifier');
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
