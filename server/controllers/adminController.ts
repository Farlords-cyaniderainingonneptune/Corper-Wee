/**
 * Corper Wee: Admin Portal Controller
 */
import type { Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService.js';
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
      const data = AdminService.listPlayers(query, platoonId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static setPlayerStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const targetUserId = req.params.id;
      const { status } = req.body;
      const data = AdminService.setPlayerStatus(actorUserId, targetUserId, status);
      res.status(200).json({ status: 'success', message: `Player status updated to ${status}`, data });
    } catch (error) {
      next(error);
    }
  }

  static createInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { email, role } = req.body;
      const data = AdminService.createAdminInvitation(actorUserId, email, role || 'ADMIN');
      res.status(201).json({ status: 'success', message: 'Admin invitation token created', data });
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
