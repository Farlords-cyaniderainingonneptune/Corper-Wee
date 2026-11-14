/**
 * Corper Wee: Daily 'Morning Drill' & 'Evening Parade' Task Service
 * Manages daily shift duties, triggers bugle/muster notification alerts,
 * prevents duplicate daily claims, and rewards Corper Points + XP.
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { NotificationService } from './notificationService.js';
import type { CampNotification, DailyDutyType } from '../db/types.js';

export type CampTimeOfDayParam = 'MORNING' | 'DAY' | 'NIGHT';

export interface DailyTaskDefinition {
  taskType: DailyDutyType;
  title: string;
  scheduleWindow: string;
  description: string;
  locationZoneId: 'parade_ground';
  locationLabel: string;
  rewardCp: number;
  xpAwarded: number;
  minAccuracy: number;
  preferredTimeOfDay: CampTimeOfDayParam;
}

export const DAILY_TASK_DEFINITIONS: Record<DailyDutyType, DailyTaskDefinition> = {
  MORNING_DRILL: {
    taskType: 'MORNING_DRILL',
    title: 'Morning Drill',
    scheduleWindow: '06:00 – 11:00 WAT',
    description:
      'Fall in at the Parade Ground for morning bugle inspection and complete drill commands.',
    locationZoneId: 'parade_ground',
    locationLabel: 'Parade Ground',
    rewardCp: 50,
    xpAwarded: 30,
    minAccuracy: 60,
    preferredTimeOfDay: 'MORNING',
  },
  EVENING_PARADE: {
    taskType: 'EVENING_PARADE',
    title: 'Evening Parade',
    scheduleWindow: '16:30 – 19:30 WAT',
    description:
      'Report to the Parade Ground for the evening lower-the-flag muster and ceremonial drill.',
    locationZoneId: 'parade_ground',
    locationLabel: 'Parade Ground',
    rewardCp: 60,
    xpAwarded: 40,
    minAccuracy: 60,
    preferredTimeOfDay: 'NIGHT',
  },
};

export interface DailyTaskView extends DailyTaskDefinition {
  dateKey: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt: string | null;
  isActiveWindow: boolean;
}

export class DailyTaskService {
  static getTodayDateKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private static makeCompletionKey(userId: string, dateKey: string, taskType: DailyDutyType) {
    return `${userId}:${dateKey}:${taskType}`;
  }

  private static makeAlertKey(userId: string, dateKey: string, taskType: DailyDutyType) {
    return `${userId}:${dateKey}:${taskType}:ALERT`;
  }

  static getDailyTasks(userId: string, timeOfDay: CampTimeOfDayParam = 'MORNING') {
    const dateKey = this.getTodayDateKey();
    const order: DailyDutyType[] = ['MORNING_DRILL', 'EVENING_PARADE'];

    const tasks: DailyTaskView[] = order.map((taskType) => {
      const def = DAILY_TASK_DEFINITIONS[taskType];
      const completion = db.dailyTaskCompletions.get(
        this.makeCompletionKey(userId, dateKey, taskType)
      );

      const isActiveWindow =
        (taskType === 'MORNING_DRILL' && (timeOfDay === 'MORNING' || timeOfDay === 'DAY')) ||
        (taskType === 'EVENING_PARADE' && (timeOfDay === 'DAY' || timeOfDay === 'NIGHT'));

      return {
        ...def,
        dateKey,
        status: completion ? 'COMPLETED' : 'PENDING',
        completedAt: completion ? completion.completedAt : null,
        isActiveWindow,
      };
    });

    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const totalBonusCpEarned = tasks
      .filter((t) => t.status === 'COMPLETED')
      .reduce((acc, t) => acc + t.rewardCp, 0);

    return {
      dateKey,
      tasks,
      completedCount,
      totalCount: tasks.length,
      pendingCount: tasks.length - completedCount,
      totalBonusCpEarned,
    };
  }

  /**
   * Triggers a real-time camp notification alert when Morning Drill or Evening Parade is due.
   * Deduplicated per user + calendar date + shift unless force=true.
   */
  static triggerShiftAlert(
    userId: string,
    timeOfDay: CampTimeOfDayParam = 'MORNING',
    force = false
  ): {
    alertTriggered: boolean;
    targetTask: DailyDutyType;
    notification: CampNotification | null;
    summary: ReturnType<typeof DailyTaskService.getDailyTasks>;
  } {
    const dateKey = this.getTodayDateKey();
    const targetTask: DailyDutyType =
      timeOfDay === 'MORNING' ? 'MORNING_DRILL' : 'EVENING_PARADE';

    const completionKey = this.makeCompletionKey(userId, dateKey, targetTask);
    const alertKey = this.makeAlertKey(userId, dateKey, targetTask);
    const summary = this.getDailyTasks(userId, timeOfDay);

    if (db.dailyTaskCompletions.has(completionKey)) {
      return {
        alertTriggered: false,
        targetTask,
        notification: null,
        summary,
      };
    }

    if (!force && db.dailyTaskAlertsSent.has(alertKey)) {
      return {
        alertTriggered: false,
        targetTask,
        notification: null,
        summary,
      };
    }

    db.dailyTaskAlertsSent.add(alertKey);
    const def = DAILY_TASK_DEFINITIONS[targetTask];
    const user = db.users.get(userId);
    const profile = db.playerProfiles.get(userId);
    const actorName = user?.displayName || 'Corper';

    const alertMessage =
      targetTask === 'MORNING_DRILL'
        ? `Morning Drill Alert: ${actorName}, report to Parade Ground for 06:00 bugle drill (+${def.rewardCp} CP)`
        : `Evening Parade Alert: ${actorName}, fall in at Parade Ground for evening muster (+${def.rewardCp} CP)`;

    const notification = NotificationService.publish({
      category: 'DAILY_TASK_ALERT',
      actorUserId: userId,
      actorName,
      actorStateCode: user?.stateCode,
      platoonNumber: profile?.platoonId,
      message: alertMessage,
    });

    return {
      alertTriggered: true,
      targetTask,
      notification,
      summary,
    };
  }

  /**
   * Authoritatively complete a daily duty and reward Corper Points + XP + Platoon Score.
   */
  static completeTask(
    userId: string,
    taskType: DailyDutyType,
    accuracy = 100
  ): {
    taskType: DailyDutyType;
    title: string;
    rewardCp: number;
    xpAwarded: number;
    newCorperPoints: number;
    completedAt: string;
    notification: CampNotification;
    summary: ReturnType<typeof DailyTaskService.getDailyTasks>;
  } {
    const def = DAILY_TASK_DEFINITIONS[taskType];
    if (!def) {
      throw new AppError('Unknown daily duty type.', 400);
    }

    if (accuracy < def.minAccuracy) {
      throw new AppError(
        `${def.title} requires at least ${def.minAccuracy}% drill accuracy to earn the daily bonus.`,
        400
      );
    }

    const dateKey = this.getTodayDateKey();
    const key = this.makeCompletionKey(userId, dateKey, taskType);
    if (db.dailyTaskCompletions.has(key)) {
      throw new AppError(`${def.title} has already been completed today (${dateKey}).`, 409);
    }

    const now = new Date().toISOString();
    const completion = {
      id: uuidv4(),
      userId,
      dateKey,
      taskType,
      rewardCp: def.rewardCp,
      xpAwarded: def.xpAwarded,
      accuracy,
      completedAt: now,
    };
    db.dailyTaskCompletions.set(key, completion);

    const wallet = db.wallets.get(userId);
    let newCorperPoints = 0;
    if (wallet) {
      wallet.corperPoints += def.rewardCp;
      wallet.updatedAt = now;
      db.wallets.set(userId, wallet);
      newCorperPoints = wallet.corperPoints;

      db.pointTransactions.push({
        id: uuidv4(),
        userId,
        amount: def.rewardCp,
        balanceAfter: wallet.corperPoints,
        activityType: `DAILY_${taskType}`,
        description: `Daily Duty Bonus: ${def.title} completed (${dateKey})`,
        createdAt: now,
      });
    }

    const profile = db.playerProfiles.get(userId);
    if (profile) {
      profile.experiencePoints += def.xpAwarded;
      profile.updatedAt = now;
      db.playerProfiles.set(userId, profile);

      const platoon = db.platoons.get(profile.platoonId);
      if (platoon) {
        platoon.totalPoints += def.rewardCp;
        db.platoons.set(profile.platoonId, platoon);
      }
    }

    const user = db.users.get(userId);
    const actorName = user?.displayName || 'Corper';
    const notification = NotificationService.publish({
      category: 'DAILY_TASK_ALERT',
      actorUserId: userId,
      actorName,
      actorStateCode: user?.stateCode,
      platoonNumber: profile?.platoonId,
      message: `${actorName} completed daily ${def.title} (+${def.rewardCp} CP bonus!)`,
    });

    const summary = this.getDailyTasks(userId, def.preferredTimeOfDay);

    return {
      taskType,
      title: def.title,
      rewardCp: def.rewardCp,
      xpAwarded: def.xpAwarded,
      newCorperPoints,
      completedAt: now,
      notification,
      summary,
    };
  }

  /**
   * Automatically unlocks the matching daily duty when a parade submission carries a daily shift sequenceId
   * (daily_morning_drill / daily_evening_parade) and achieves >= 60% accuracy.
   */
  static autoCompleteFromParadeDrill(
    userId: string,
    sequenceId: string,
    accuracy: number
  ): {
    unlockedTask: DailyDutyType | null;
    unlockedTitle: string | null;
    bonusCp: number;
    newCorperPoints: number | null;
  } {
    const seqLower = (sequenceId || '').toLowerCase();
    if (!seqLower.startsWith('daily_') || accuracy < 60) {
      return { unlockedTask: null, unlockedTitle: null, bonusCp: 0, newCorperPoints: null };
    }

    const dateKey = this.getTodayDateKey();
    const target: DailyDutyType = seqLower.includes('evening')
      ? 'EVENING_PARADE'
      : 'MORNING_DRILL';

    const key = this.makeCompletionKey(userId, dateKey, target);
    if (!db.dailyTaskCompletions.has(key)) {
      const res = this.completeTask(userId, target, accuracy);
      return {
        unlockedTask: target,
        unlockedTitle: res.title,
        bonusCp: res.rewardCp,
        newCorperPoints: res.newCorperPoints,
      };
    }

    return { unlockedTask: null, unlockedTitle: null, bonusCp: 0, newCorperPoints: null };
  }
}
