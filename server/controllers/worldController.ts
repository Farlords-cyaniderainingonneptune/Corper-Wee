/**
 * Corper Wee: World, Locations, Coordinates & Social Controller
 */
import type { Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { LocationService } from '../services/locationService.js';
import { SocialService } from '../services/socialService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class WorldController {
  static getLocations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parseInt(req.query.campId as string, 10) : 1;
      const includeInactive = req.query.includeInactive === 'true';
      const locations = LocationService.listLocations(campId, includeInactive);
      res.status(200).json({ status: 'success', data: locations });
    } catch (error) {
      next(error);
    }
  }

  static getLocationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const locationId = parseInt(req.params.id, 10);
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

  static socialInteract(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { targetUserId, interactionType } = req.body;
      const result = SocialService.processInteraction(userId, targetUserId, interactionType || 'GREETING');
      res.status(200).json({ status: 'success', data: result });
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
      const locationId = parseInt(req.params.id, 10);
      const location = LocationService.updateLocation(actorUserId, locationId, req.body);
      res.status(200).json({ status: 'success', message: 'Camp location updated.', data: location });
    } catch (error) {
      next(error);
    }
  }

  static adminToggleLocationActive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const locationId = parseInt(req.params.id, 10);
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
      const locationId = parseInt(req.params.id, 10);
      const result = LocationService.softDeleteLocation(actorUserId, locationId);
      res.status(200).json({ status: 'success', message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  }
}
