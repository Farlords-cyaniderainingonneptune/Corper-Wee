/**
 * Corper Wee: Economy, Mami Market & Transactions Controller
 */
import type { Response, NextFunction } from 'express';
import { EconomyService } from '../services/economyService.js';
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

export class MarketController {
  static getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const products = EconomyService.getMarketProducts();
      const rate = EconomyService.getConversionRate();
      res.status(200).json({
        status: 'success',
        data: {
          products,
          conversionRate: rate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static buyProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { productId, quantity, idempotencyKey } = req.body;
      const result = EconomyService.purchaseProduct(userId, productId, quantity || 1, idempotencyKey);
      res.status(200).json({
        status: 'success',
        message: 'Purchase completed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static exchangeCurrency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { pointsToExchange, idempotencyKey } = req.body;
      const result = EconomyService.exchangeCpToNaira(userId, pointsToExchange, idempotencyKey);
      res.status(200).json({
        status: 'success',
        message: 'Points successfully exchanged for Virtual Naira.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static getInventory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const inventory = EconomyService.getPlayerInventory(userId);
      res.status(200).json({
        status: 'success',
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  }

  static getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = EconomyService.getTransactionHistory(userId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin Product Catalog Controls
  static adminGetAllProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const products = EconomyService.getAllMarketProductsForAdmin();
      const rate = EconomyService.getConversionRate();
      res.status(200).json({
        status: 'success',
        data: {
          products,
          conversionRate: rate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static adminCreateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const {
        categoryId,
        name,
        description,
        priceNaira,
        waterRefillValue,
        staminaBoostValue,
        charismaBoostValue,
        stockQuantity,
        iconKey,
      } = req.body;

      const product = EconomyService.createProduct(actorUserId, {
        categoryId,
        name,
        description,
        priceNaira,
        waterRefillValue,
        staminaBoostValue,
        charismaBoostValue,
        stockQuantity,
        iconKey,
      });

      res.status(201).json({
        status: 'success',
        message: 'Product added to Mami Market successfully.',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static adminUpdateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const productId = parsePositiveIntId(req.params.id, 'product identifier');
      const { name, description, priceNaira, stockQuantity, isActive, waterRefillValue } = req.body;

      const product = EconomyService.updateProduct(actorUserId, productId, {
        name,
        description,
        priceNaira,
        stockQuantity,
        isActive,
        waterRefillValue,
      });

      res.status(200).json({
        status: 'success',
        message: 'Product updated successfully.',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
}
