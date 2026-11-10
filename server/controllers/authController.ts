/**
 * Corper Wee: Authentication Controller
 */
import type { Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class AuthController {
  static async googleAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { idToken, email, displayName } = req.body;
      const result = await AuthService.handleGoogleAuth(idToken, email, displayName);
      res.status(200).json({
        status: 'success',
        message: result.isNewUser ? 'Google identity verified. Please register NYSC State Code.' : 'Login successful.',
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
