/**
 * Corper Wee: Authoritative Economy, Wallet, Mami Market & Idempotency Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { Product, Wallet, PointTransaction, WalletTransaction, IdempotencyRecord } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export class EconomyService {
  /**
   * Idempotency Check & Lock
   */
  private static checkIdempotency(key?: string): any | null {
    if (!key) return null;
    const existing = db.idempotencyKeys.get(key);
    if (existing) {
      // Check expiration (24h)
      if (new Date(existing.expiresAt).getTime() > Date.now()) {
        return existing.responsePayload;
      }
      db.idempotencyKeys.delete(key);
    }
    return null;
  }

  private static recordIdempotency(key: string | undefined, userId: string, action: string, responsePayload: any) {
    if (!key) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const record: IdempotencyRecord = {
      key,
      userId,
      action,
      responsePayload,
      createdAt: now.toISOString(),
      expiresAt,
    };
    db.idempotencyKeys.set(key, record);
  }

  /**
   * Get Conversion Rate
   */
  static getConversionRate(): { cp: number; naira: number } {
    const setting = db.gameSettings.get('cp_to_naira_rate');
    return setting?.value || { cp: 10, naira: 100.0 };
  }

  /**
   * Get User Wallet
   */
  static getWallet(userId: string): Wallet {
    let wallet = db.wallets.get(userId);
    if (!wallet) {
      wallet = {
        userId,
        corperPoints: 0,
        virtualNaira: 0.0,
        updatedAt: new Date().toISOString(),
      };
      db.wallets.set(userId, wallet);
    }
    return wallet;
  }

  /**
   * Authoritatively Award Corper Points (with Idempotency)
   */
  static awardPoints(
    userId: string,
    amount: number,
    activityType: string,
    description: string,
    idempotencyKey?: string
  ) {
    if (amount <= 0) {
      throw new AppError('Point award amount must be strictly positive.', 400);
    }

    const cached = this.checkIdempotency(idempotencyKey);
    if (cached) return cached;

    const wallet = this.getWallet(userId);
    const now = new Date().toISOString();

    wallet.corperPoints += amount;
    wallet.updatedAt = now;
    db.wallets.set(userId, wallet);

    const tx: PointTransaction = {
      id: uuidv4(),
      userId,
      amount,
      balanceAfter: wallet.corperPoints,
      activityType,
      description,
      createdAt: now,
    };
    db.pointTransactions.push(tx);

    const response = {
      awardedPoints: amount,
      newCorperPoints: wallet.corperPoints,
      transactionId: tx.id,
    };

    this.recordIdempotency(idempotencyKey, userId, 'AWARD_POINTS', response);
    return response;
  }

  /**
   * Authoritatively Deduct Corper Points (with Idempotency)
   */
  static deductPoints(
    userId: string,
    amount: number,
    activityType: string,
    description: string,
    idempotencyKey?: string
  ) {
    if (amount <= 0) {
      throw new AppError('Point deduction amount must be strictly positive.', 400);
    }

    const cached = this.checkIdempotency(idempotencyKey);
    if (cached) return cached;

    const wallet = this.getWallet(userId);
    const now = new Date().toISOString();

    const actualDeduction = Math.min(wallet.corperPoints, amount);
    wallet.corperPoints -= actualDeduction;
    wallet.updatedAt = now;
    db.wallets.set(userId, wallet);

    const tx: PointTransaction = {
      id: uuidv4(),
      userId,
      amount: -actualDeduction,
      balanceAfter: wallet.corperPoints,
      activityType,
      description,
      createdAt: now,
    };
    db.pointTransactions.push(tx);

    const response = {
      deductedPoints: actualDeduction,
      newCorperPoints: wallet.corperPoints,
      transactionId: tx.id,
    };

    this.recordIdempotency(idempotencyKey, userId, 'DEDUCT_POINTS', response);
    return response;
  }

  /**
   * Authoritative CP to Virtual Naira Conversion (with Idempotency)
   */
  static exchangeCpToNaira(userId: string, pointsToExchange: number, idempotencyKey?: string) {
    if (pointsToExchange <= 0) {
      throw new AppError('Points to convert must be greater than zero.', 400);
    }

    const cached = this.checkIdempotency(idempotencyKey);
    if (cached) return cached;

    const wallet = this.getWallet(userId);
    if (wallet.corperPoints < pointsToExchange) {
      throw new AppError(
        `Insufficient Corper Points. Available: ${wallet.corperPoints} CP, Requested: ${pointsToExchange} CP.`,
        400
      );
    }

    const rate = this.getConversionRate();
    const earnedNaira = (pointsToExchange / rate.cp) * rate.naira;
    const now = new Date().toISOString();

    // Atomic mutation
    wallet.corperPoints -= pointsToExchange;
    wallet.virtualNaira += earnedNaira;
    wallet.updatedAt = now;
    db.wallets.set(userId, wallet);

    const pointTx: PointTransaction = {
      id: uuidv4(),
      userId,
      amount: -pointsToExchange,
      balanceAfter: wallet.corperPoints,
      activityType: 'CP_EXCHANGE',
      description: `Exchanged ${pointsToExchange} CP for ₦${earnedNaira.toFixed(2)} at Camp Bank`,
      createdAt: now,
    };
    db.pointTransactions.push(pointTx);

    const walletTx: WalletTransaction = {
      id: uuidv4(),
      userId,
      amount: earnedNaira,
      balanceAfter: wallet.virtualNaira,
      transactionType: 'CP_EXCHANGE',
      description: `Converted from ${pointsToExchange} Corper Points (${rate.cp} CP = ₦${rate.naira})`,
      createdAt: now,
    };
    db.walletTransactions.push(walletTx);

    const response = {
      pointsDeducted: pointsToExchange,
      nairaCredited: earnedNaira,
      newPoints: wallet.corperPoints,
      newNaira: wallet.virtualNaira,
      rateUsed: `${rate.cp} CP = ₦${rate.naira}`,
      transactionId: walletTx.id,
    };

    this.recordIdempotency(idempotencyKey, userId, 'CP_EXCHANGE', response);
    return response;
  }

  /**
   * Get Transaction History
   */
  static getTransactionHistory(userId: string) {
    const pointTxs = db.pointTransactions
      .filter((t) => t.userId === userId)
      .slice(-50)
      .reverse();

    const walletTxs = db.walletTransactions
      .filter((t) => t.userId === userId)
      .slice(-50)
      .reverse();

    return {
      pointTransactions: pointTxs,
      walletTransactions: walletTxs,
    };
  }

  /**
   * Get all active Mami Market products
   */
  static getMarketProducts() {
    return Array.from(db.products.values())
      .filter((p) => p.isActive)
      .sort((a, b) => a.categoryId - b.categoryId || a.priceNaira - b.priceNaira);
  }

  /**
   * Admin: Get all Mami Market products including inactive ones
   */
  static getAllMarketProductsForAdmin() {
    return Array.from(db.products.values())
      .sort((a, b) => a.categoryId - b.categoryId || a.id - b.id);
  }

  /**
   * Purchase an item at Mami Market (with Idempotency)
   */
  static purchaseProduct(userId: string, productId: number, quantity = 1, idempotencyKey?: string) {
    if (quantity <= 0) {
      throw new AppError('Quantity must be at least 1.', 400);
    }

    const cached = this.checkIdempotency(idempotencyKey);
    if (cached) return cached;

    const product = db.products.get(productId);
    if (!product || !product.isActive) {
      throw new AppError('Product is currently not available in Mami Market.', 404);
    }

    if (product.stockQuantity < quantity) {
      throw new AppError(`Oga, item don finish! Only ${product.stockQuantity} remaining.`, 400);
    }

    const totalCost = product.priceNaira * quantity;
    const wallet = this.getWallet(userId);

    if (wallet.virtualNaira < totalCost) {
      throw new AppError(
        `Insufficient Virtual Naira. Cost: ₦${totalCost.toFixed(2)}, Available: ₦${wallet.virtualNaira.toFixed(2)}. Complete more parade drills or convert CP!`,
        400
      );
    }

    const now = new Date().toISOString();

    // Atomic execution
    wallet.virtualNaira -= totalCost;
    wallet.updatedAt = now;
    db.wallets.set(userId, wallet);

    product.stockQuantity -= quantity;
    db.products.set(productId, product);

    let inventory = db.playerInventory.get(userId) || [];
    const existingItem = inventory.find((i) => i.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      inventory.push({
        id: uuidv4(),
        userId,
        productId,
        quantity,
        isEquipped: false,
        acquiredAt: now,
      });
    }
    db.playerInventory.set(userId, inventory);

    const tx: WalletTransaction = {
      id: uuidv4(),
      userId,
      amount: -totalCost,
      balanceAfter: wallet.virtualNaira,
      transactionType: 'MARKET_PURCHASE',
      description: `Bought ${quantity}x ${product.name} from Mami Market`,
      createdAt: now,
    };
    db.walletTransactions.push(tx);

    const response = {
      purchasedItem: {
        id: product.id,
        name: product.name,
        quantity,
        totalCost,
      },
      wallet: {
        virtualNaira: wallet.virtualNaira,
        corperPoints: wallet.corperPoints,
      },
      remainingStock: product.stockQuantity,
      transactionId: tx.id,
    };

    this.recordIdempotency(idempotencyKey, userId, 'MARKET_PURCHASE', response);
    return response;
  }

  /**
   * Consume water/drink or item from inventory
   */
  static consumeInventoryItem(userId: string, productId: number) {
    const inventory = db.playerInventory.get(userId) || [];
    const itemIndex = inventory.findIndex((i) => i.productId === productId);

    if (itemIndex === -1 || inventory[itemIndex].quantity <= 0) {
      throw new AppError('Item not found in your waist bag inventory.', 404);
    }

    const product = db.products.get(productId);
    if (!product) {
      throw new AppError('Product definition missing.', 404);
    }

    inventory[itemIndex].quantity -= 1;
    if (inventory[itemIndex].quantity === 0) {
      inventory.splice(itemIndex, 1);
    }
    db.playerInventory.set(userId, inventory);

    const now = new Date().toISOString();

    let waterLevel = 100.0;
    if (product.waterRefillValue > 0) {
      const waterMeter = db.waterMeters.get(userId);
      if (waterMeter) {
        waterMeter.currentLevel = Math.min(100.0, +(waterMeter.currentLevel + product.waterRefillValue).toFixed(2));
        waterMeter.updatedAt = now;
        db.waterMeters.set(userId, waterMeter);
        waterLevel = waterMeter.currentLevel;
      }
    }

    if (product.charismaBoostValue > 0) {
      const profile = db.playerProfiles.get(userId);
      if (profile) {
        profile.charismaScore = Math.min(100, profile.charismaScore + product.charismaBoostValue);
        profile.updatedAt = now;
        db.playerProfiles.set(userId, profile);
      }
    }

    return {
      consumedProduct: product.name,
      waterRefillAwarded: product.waterRefillValue,
      newWaterLevel: waterLevel,
      remainingQuantity: inventory[itemIndex]?.quantity || 0,
    };
  }

  /**
   * Get player's inventory
   */
  static getPlayerInventory(userId: string) {
    const rawItems = db.playerInventory.get(userId) || [];
    return rawItems.map((item) => {
      const product = db.products.get(item.productId);
      return {
        id: item.id,
        productId: item.productId,
        name: product?.name || 'Unknown Item',
        description: product?.description || '',
        priceNaira: product?.priceNaira || 0,
        waterRefillValue: product?.waterRefillValue || 0,
        staminaBoostValue: product?.staminaBoostValue || 0,
        charismaBoostValue: product?.charismaBoostValue || 0,
        iconKey: product?.iconKey || 'box',
        quantity: item.quantity,
        isEquipped: item.isEquipped,
        acquiredAt: item.acquiredAt,
      };
    });
  }

  /**
   * Admin: Add a new product to Mami Market
   */
  static createProduct(
    actorUserId: string,
    params: {
      categoryId: number;
      name: string;
      description: string;
      priceNaira: number;
      waterRefillValue?: number;
      staminaBoostValue?: number;
      charismaBoostValue?: number;
      stockQuantity?: number;
      iconKey?: string;
    }
  ) {
    if (params.priceNaira < 0) {
      throw new AppError('Product price cannot be negative.', 400);
    }

    const nextId = db.products.size + 1;
    const product: Product = {
      id: nextId,
      categoryId: params.categoryId,
      name: params.name,
      description: params.description,
      priceNaira: params.priceNaira,
      waterRefillValue: params.waterRefillValue || 0,
      staminaBoostValue: params.staminaBoostValue || 0,
      charismaBoostValue: params.charismaBoostValue || 0,
      stockQuantity: params.stockQuantity ?? 1000,
      iconKey: params.iconKey || 'tag',
      isActive: true,
    };
    db.products.set(product.id, product);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'PRODUCT_CREATED',
      targetEntity: 'PRODUCT',
      targetId: String(product.id),
      metadata: { name: product.name, price: product.priceNaira },
      createdAt: new Date().toISOString(),
    });

    return product;
  }

  /**
   * Admin: Update product details, price, or stock
   */
  static updateProduct(
    actorUserId: string,
    productId: number,
    updates: Partial<Pick<Product, 'name' | 'description' | 'priceNaira' | 'stockQuantity' | 'isActive' | 'waterRefillValue'>>
  ) {
    const product = db.products.get(productId);
    if (!product) {
      throw new AppError(`Product #${productId} not found.`, 404);
    }

    if (updates.priceNaira !== undefined) {
      if (updates.priceNaira < 0) throw new AppError('Price cannot be negative.', 400);
      product.priceNaira = updates.priceNaira;
    }
    if (updates.stockQuantity !== undefined) {
      if (updates.stockQuantity < 0) throw new AppError('Stock cannot be negative.', 400);
      product.stockQuantity = updates.stockQuantity;
    }
    if (updates.name) product.name = updates.name;
    if (updates.description) product.description = updates.description;
    if (updates.isActive !== undefined) product.isActive = updates.isActive;
    if (updates.waterRefillValue !== undefined) product.waterRefillValue = updates.waterRefillValue;

    db.products.set(productId, product);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'PRODUCT_UPDATED',
      targetEntity: 'PRODUCT',
      targetId: String(productId),
      metadata: updates,
      createdAt: new Date().toISOString(),
    });

    return product;
  }
}
