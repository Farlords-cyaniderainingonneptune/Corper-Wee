/**
 * Corper Wee: Authentication Controller
 */
import type { Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { AdminService } from '../services/adminService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class AuthController {
  static async loginOrSignup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, stateCode, fullName, displayName } = req.body;
      const result = await AuthService.authenticateWithEmailAndStateCode(
        email,
        stateCode,
        fullName || displayName
      );
      res.status(200).json({
        status: 'success',
        message: result.isNewUser ? 'Corper registered and platoon assigned!' : 'Welcome back, Corper!',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async acceptInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { token, email, stateCode, fullName } = req.body;
      const result = await AdminService.acceptAdminInvitation(token, email, stateCode, fullName);
      res.status(200).json({
        status: 'success',
        message: 'Administrator invitation accepted successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async googleAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { idToken, email, displayName, stateCode, fullName } = req.body;
      let result;
      if (email && stateCode) {
        result = await AuthService.authenticateWithEmailAndStateCode(email, stateCode, fullName || displayName);
      } else {
        result = await AuthService.handleGoogleAuth(idToken, email, displayName || fullName, stateCode);
      }
      res.status(200).json({
        status: 'success',
        message: result.isNewUser ? 'Registration successful.' : 'Login successful.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerStateCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { stateCode, campNickname } = req.body;
      const result = await AuthService.registerStateCode(userId, stateCode, campNickname);
      res.status(201).json({
        status: 'success',
        message: 'NYSC State Code registered and platoon assigned successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static refreshSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = AuthService.refreshTokenRotation(refreshToken);
      res.status(200).json({
        status: 'success',
        message: 'Session refreshed successfully.',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.newRefreshToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            displayName: result.user.displayName,
            role: result.user.role,
            stateCode: result.user.stateCode,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = AuthService.logout(refreshToken);
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
