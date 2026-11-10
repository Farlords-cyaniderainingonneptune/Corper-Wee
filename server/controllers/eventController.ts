/**
 * Corper Wee: Event Controller
 */
import type { Response, NextFunction } from 'express';
import { EventService } from '../services/eventService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class EventController {
  static listEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campId = req.query.campId ? parseInt(req.query.campId as string, 10) : 1;
      const status = req.query.status as any;
      const events = EventService.listEvents(campId, status);
      res.status(200).json({ status: 'success', data: events });
    } catch (error) {
      next(error);
    }
  }

  static getEventDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id;
      const userId = req.user?.id;
      const data = EventService.getEventDetails(eventId, userId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static joinEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const eventId = req.params.id;
      const result = EventService.joinEvent(userId, eventId);
      res.status(200).json({ status: 'success', message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  }

  static claimReward(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const eventId = req.params.id;
      const result = EventService.claimEventReward(userId, eventId);
      res.status(200).json({ status: 'success', message: 'Event reward claimed successfully!', data: result });
    } catch (error) {
      next(error);
    }
  }

  // Admin endpoints
  static adminCreateEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const event = EventService.createEvent(actorUserId, req.body);
      res.status(201).json({ status: 'success', message: 'Camp event scheduled successfully.', data: event });
    } catch (error) {
      next(error);
    }
  }

  static adminCancelEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const eventId = req.params.id;
      const { reason } = req.body;
      const result = EventService.cancelEvent(actorUserId, eventId, reason);
      res.status(200).json({ status: 'success', message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  }

  static adminGetParticipants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id;
      const result = EventService.getEventParticipants(eventId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
}
