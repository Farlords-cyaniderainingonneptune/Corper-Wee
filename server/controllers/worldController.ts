/**
 * Corper Wee: World, Locations, Coordinates & Social Controller
 */
import type { Response, NextFunction } from 'express';
import { LocationService } from '../services/locationService.js';
import { SocialService } from '../services/socialService.js';
import { NotificationService } from '../services/notificationService.js';
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

export class WorldController {
  static getLocations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parsePositiveIntId(String(req.query.campId), 'camp identifier') : 1;
      const includeInactive = req.query.includeInactive === 'true';
      const locations = LocationService.listLocations(campId, includeInactive);
      res.status(200).json({ status: 'success', data: locations });
    } catch (error) {
      next(error);
    }
  }

  static getLocationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const locationId = parsePositiveIntId(req.params.id, 'location identifier');
      const location = LocationService.getLocationById(locationId);
      res.status(200).json({ status: 'success', data: location });
    } catch (error) {
      next(error);
    }
  }

  static getNearbyCorpers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const corpers = SocialService.getNearbyCorpers(userId);
      res.status(200).json({ status: 'success', data: corpers });
    } catch (error) {
      next(error);
    }
  }

  static getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rawLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 20;
      const notifications = NotificationService.getRecent(limit);
      res.status(200).json({ status: 'success', data: notifications });
    } catch (error) {
      next(error);
    }
  }

  static socialInteract(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { targetUserId, interactionType, dialogueOptionId } = req.body;
      const result = SocialService.processInteraction(
        userId,
        targetUserId,
        interactionType || 'GREETING',
        dialogueOptionId
      );
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  static getFriends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const friends = SocialService.listFriends(userId);
      res.status(200).json({ status: 'success', data: friends });
    } catch (error) {
      next(error);
    }
  }

  static sendFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { targetUserId } = req.body;
      const friendship = SocialService.sendFriendRequest(userId, targetUserId);
      res.status(200).json({ status: 'success', message: 'Friend request sent.', data: friendship });
    } catch (error) {
      next(error);
    }
  }

  static respondFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { friendshipId, accept } = req.body;
      const friendship = SocialService.respondToFriendRequest(userId, friendshipId, !!accept);
      res.status(200).json({ status: 'success', data: friendship });
    } catch (error) {
      next(error);
    }
  }

  static blockUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { targetUserId, reason } = req.body;
      const block = SocialService.blockUser(userId, targetUserId, reason);
      res.status(200).json({ status: 'success', message: 'Corps member blocked.', data: block });
    } catch (error) {
      next(error);
    }
  }

  static reportUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { targetUserId, reason, details } = req.body;
      const report = SocialService.reportUser(userId, targetUserId, reason, details);
      res.status(200).json({ status: 'success', message: 'Report submitted to Camp Commandant.', data: report });
    } catch (error) {
      next(error);
    }
  }

  static getPrivacy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const privacy = SocialService.getPrivacy(userId);
      res.status(200).json({ status: 'success', data: privacy });
    } catch (error) {
      next(error);
    }
  }

  static updatePrivacy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const updated = SocialService.updatePrivacy(userId, req.body);
      res.status(200).json({ status: 'success', message: 'Privacy preferences updated.', data: updated });
    } catch (error) {
      next(error);
    }
  }

  // Admin Location Management
  static adminCreateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const location = LocationService.createLocation(actorUserId, req.body);
      res.status(201).json({ status: 'success', message: 'Camp location created.', data: location });
    } catch (error) {
      next(error);
    }
  }

  static adminUpdateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const locationId = parsePositiveIntId(req.params.id, 'location identifier');
      const location = LocationService.updateLocation(actorUserId, locationId, req.body);
      res.status(200).json({ status: 'success', message: 'Camp location updated.', data: location });
    } catch (error) {
      next(error);
    }
  }

  static adminToggleLocationActive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const locationId = parsePositiveIntId(req.params.id, 'location identifier');
      const { isActive } = req.body;
      const location = LocationService.toggleActive(actorUserId, locationId, !!isActive);
      res.status(200).json({ status: 'success', message: `Location active status set to ${!!isActive}`, data: location });
    } catch (error) {
      next(error);
    }
  }

  static adminSoftDeleteLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const locationId = parsePositiveIntId(req.params.id, 'location identifier');
      const result = LocationService.softDeleteLocation(actorUserId, locationId);
      res.status(200).json({ status: 'success', message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  }
}
