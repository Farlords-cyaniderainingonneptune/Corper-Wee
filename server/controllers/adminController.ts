/**
 * Corper Wee: Admin Portal & Live Game Configuration Controller
 */
import type { Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService.js';
import { EconomyService } from '../services/economyService.js';
import { LocationService } from '../services/locationService.js';
import { EventService } from '../services/eventService.js';
import { PlatoonService } from '../services/platoonService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class AdminController {
  static getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = AdminService.getDashboardMetrics();
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static listPlayers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string) || '';
      const platoonId = req.query.platoonId ? parseInt(req.query.platoonId as string, 10) : undefined;
      const statusFilter = (req.query.status as string) || undefined;
      const data = AdminService.listPlayers(query, platoonId, statusFilter);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static getPlayerDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id;
      const data = AdminService.getPlayerDetails(targetUserId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static setPlayerStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const targetUserId = req.params.id;
      const { status, reason } = req.body;
      const data = AdminService.setPlayerStatus(actorUserId, targetUserId, status, reason);
      res.status(200).json({ status: 'success', message: `Player status updated to ${status}`, data });
    } catch (error) {
      next(error);
    }
  }

  static deletePlayerWithRetention(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const targetUserId = req.params.id;
      const reason = req.body?.reason as string | undefined;
      const data = AdminService.deletePlayerWithRetention(actorUserId, targetUserId, reason);
      res.status(200).json({ status: 'success', message: data.message, data });
    } catch (error) {
      next(error);
    }
  }

  static setPlayerRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const targetUserId = req.params.id;
      const { role } = req.body;
      const data = AdminService.setPlayerRole(actorUserId, targetUserId, role);
      res.status(200).json({ status: 'success', message: `User role updated to ${role}`, data });
    } catch (error) {
      next(error);
    }
  }

  static setAdminPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const targetUserId = req.params.id;
      const { permissions } = req.body;
      const data = AdminService.setAdminPermissions(actorUserId, targetUserId, permissions);
      res.status(200).json({ status: 'success', message: 'Administrator permissions updated.', data });
    } catch (error) {
      next(error);
    }
  }

  static getActivityMonitoring(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = AdminService.getActivityMonitoring();
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static resolveReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const reportId = req.params.id;
      const { status, resolutionNote } = req.body;
      const data = AdminService.resolveUserReport(actorUserId, reportId, status, resolutionNote);
      res.status(200).json({ status: 'success', message: `Report marked as ${status}`, data });
    } catch (error) {
      next(error);
    }
  }

  static listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = AdminService.listStaffAndInvitations();
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static createInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { email, role, permissions, expiresInHours } = req.body;
      const data = AdminService.createAdminInvitation(
        actorUserId,
        email,
        role || 'ADMIN',
        permissions,
        expiresInHours || 48
      );
      res.status(201).json({ status: 'success', message: 'Admin invitation token created', data });
    } catch (error) {
      next(error);
    }
  }

  static revokeInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const invitationId = req.params.id;
      const { reason } = req.body || {};
      const data = AdminService.revokeAdminInvitation(actorUserId, invitationId, reason);
      res.status(200).json({ status: 'success', message: 'Invitation revoked successfully.', data });
    } catch (error) {
      next(error);
    }
  }

  static getAdminConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = AdminService.getGameConfiguration();
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static updateGameConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const data = AdminService.updateGameConfiguration(actorUserId, req.body);
      res.status(200).json({ status: 'success', message: 'Live game configuration updated.', data });
    } catch (error) {
      next(error);
    }
  }

  static getClientLiveGameConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const gameConfig = AdminService.getGameConfiguration();
      const marketProducts = EconomyService.getMarketProducts();
      const locations = LocationService.listLocations(1, false);
      const events = EventService.listEvents(1);
      const platoons = PlatoonService.listPlatoons(1);

      res.status(200).json({
        status: 'success',
        data: {
          ...gameConfig,
          marketProducts,
          locations,
          events,
          platoons,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static updateConversionRate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { cp, naira } = req.body;
      const data = AdminService.updateConversionRate(actorUserId, cp, naira);
      res.status(200).json({ status: 'success', message: 'Conversion rate updated', data });
    } catch (error) {
      next(error);
    }
  }

  static getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const data = AdminService.getAuditLogs(limit);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}
