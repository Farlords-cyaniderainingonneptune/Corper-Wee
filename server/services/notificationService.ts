/**
 * Corper Wee: Authoritative Real-Time Social & Camp Notification Service
 * Persists recent camp notifications and broadcasts live events via WebSocket.
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { CampNotification, NotificationCategory } from '../db/types.js';

const MAX_STORED_NOTIFICATIONS = 60;

export class NotificationService {
  private static broadcaster: ((notification: CampNotification) => void) | null = null;

  static registerBroadcaster(fn: ((notification: CampNotification) => void) | null) {
    this.broadcaster = fn;
  }

  static publish(input: {
    category: NotificationCategory;
    actorUserId: string;
    actorName: string;
    actorStateCode?: string;
    platoonNumber?: number;
    message: string;
  }): CampNotification {
    const notification: CampNotification = {
      id: uuidv4(),
      category: input.category,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorStateCode: input.actorStateCode,
      platoonNumber: input.platoonNumber,
      message: input.message,
      createdAt: new Date().toISOString(),
    };

    db.notifications.push(notification);
    if (db.notifications.length > MAX_STORED_NOTIFICATIONS) {
      db.notifications.splice(0, db.notifications.length - MAX_STORED_NOTIFICATIONS);
    }

    if (this.broadcaster) {
      try {
        this.broadcaster(notification);
      } catch (err) {
        console.error('[NotificationService] Broadcaster error:', err);
      }
    }

    return notification;
  }

  static getRecent(limit = 20): CampNotification[] {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    return db.notifications.slice(-safeLimit).reverse();
  }
}
