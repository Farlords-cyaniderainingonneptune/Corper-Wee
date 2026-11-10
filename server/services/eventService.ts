/**
 * Corper Wee: Camp Event Scheduling, Participation & Rewards Service
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { CampEvent, EventParticipant, EventStatus } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export class EventService {
  /**
   * List scheduled or active events
   */
  static listEvents(campId = 1, statusFilter?: EventStatus) {
    return Array.from(db.events.values())
      .filter((e) => e.campId === campId && (!statusFilter || e.status === statusFilter))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  /**
   * Get single event details with participant count
   */
  static getEventDetails(eventId: string, userId?: string) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new AppError(`Camp event '${eventId}' not found.`, 404);
    }

    const participants = db.eventParticipants.get(eventId) || [];
    const isUserRegistered = userId ? participants.some((p) => p.userId === userId) : false;
    const userParticipation = userId ? participants.find((p) => p.userId === userId) : undefined;

    return {
      event,
      totalParticipants: participants.length,
      availableSlots: Math.max(0, event.maxParticipants - participants.length),
      isUserRegistered,
      userParticipation: userParticipation || null,
    };
  }

  /**
   * Player: Join an upcoming scheduled camp event
   */
  static joinEvent(userId: string, eventId: string) {
    const event = db.events.get(eventId);
    if (!event) {
      throw new AppError(`Event '${eventId}' not found.`, 404);
    }

    if (event.status === 'CANCELLED') {
      throw new AppError('This camp event has been cancelled by administration.', 400);
    }
    if (event.status === 'COMPLETED') {
      throw new AppError('This event has already finished.', 400);
    }

    const profile = db.playerProfiles.get(userId);
    if (!profile) {
      throw new AppError('Player profile not found.', 404);
    }

    // Check platoon restriction
    if (event.targetPlatoonId && profile.platoonId !== event.targetPlatoonId) {
      throw new AppError(`This event is restricted to Platoon #${event.targetPlatoonId}.`, 403);
    }

    // Check charisma prerequisite
    if (profile.charismaScore < event.minCharismaRequired) {
      throw new AppError(
        `Insufficient Charisma score. Required: ${event.minCharismaRequired}, Your Charisma: ${profile.charismaScore}. Complete more camp activities!`,
        400
      );
    }

    let participants = db.eventParticipants.get(eventId) || [];
    if (participants.some((p) => p.userId === userId)) {
      throw new AppError('You are already registered for this camp event.', 409);
    }

    if (participants.length >= event.maxParticipants) {
      throw new AppError('Event is fully booked! No slots remaining.', 400);
    }

    const now = new Date().toISOString();
    const participant: EventParticipant = {
      id: uuidv4(),
      eventId,
      userId,
      registeredAt: now,
      attended: true,
      rewardClaimed: false,
    };

    participants.push(participant);
    db.eventParticipants.set(eventId, participants);

    return {
      message: `Successfully registered for '${event.title}'!`,
      eventId: event.id,
      eventTitle: event.title,
      scheduledTime: event.startTime,
      participantId: participant.id,
    };
  }

  /**
   * Player: Claim event participation rewards
   */
  static claimEventReward(userId: string, eventId: string) {
    const event = db.events.get(eventId);
    if (!event) throw new AppError('Event not found.', 404);

    const participants = db.eventParticipants.get(eventId) || [];
    const participant = participants.find((p) => p.userId === userId);

    if (!participant) {
      throw new AppError('You did not participate in this camp event.', 403);
    }

    if (participant.rewardClaimed) {
      throw new AppError('Event rewards have already been claimed.', 400);
    }

    const now = new Date().toISOString();
    const wallet = db.wallets.get(userId);
    if (!wallet) throw new AppError('Wallet not found.', 404);

    // Credit Corper Points
    wallet.corperPoints += event.rewardCp;
    wallet.virtualNaira += event.rewardNaira;
    wallet.updatedAt = now;
    db.wallets.set(userId, wallet);

    db.pointTransactions.push({
      id: uuidv4(),
      userId,
      amount: event.rewardCp,
      balanceAfter: wallet.corperPoints,
      activityType: 'EVENT_REWARD',
      description: `Participation reward for event: ${event.title}`,
      createdAt: now,
    });

    db.walletTransactions.push({
      id: uuidv4(),
      userId,
      amount: event.rewardNaira,
      balanceAfter: wallet.virtualNaira,
      transactionType: 'EARN_ACTIVITY',
      description: `Cash prize for event: ${event.title}`,
      createdAt: now,
    });

    participant.rewardClaimed = true;
    participant.claimedAt = now;
    db.eventParticipants.set(eventId, participants);

    return {
      eventTitle: event.title,
      rewardCp: event.rewardCp,
      rewardNaira: event.rewardNaira,
      newCorperPoints: wallet.corperPoints,
      newVirtualNaira: wallet.virtualNaira,
    };
  }

  /**
   * Admin: Create and schedule a new camp event
   */
  static createEvent(
    actorUserId: string,
    params: {
      campId?: number;
      locationId?: number;
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      rewardCp: number;
      rewardNaira: number;
      maxParticipants?: number;
      minCharismaRequired?: number;
      targetPlatoonId?: number;
    }
  ) {
    if (new Date(params.endTime).getTime() <= new Date(params.startTime).getTime()) {
      throw new AppError('Event end time must be strictly after start time.', 400);
    }

    let locationName = 'Main Camp Area';
    if (params.locationId) {
      const loc = db.locations.get(params.locationId);
      if (loc && !loc.isDeleted) {
        locationName = loc.name;
      }
    }

    const now = new Date().toISOString();
    const eventId = 'evt_' + uuidv4().substring(0, 8);

    const event: CampEvent = {
      id: eventId,
      campId: params.campId || 1,
      locationId: params.locationId,
      locationName,
      title: params.title,
      description: params.description,
      startTime: params.startTime,
      endTime: params.endTime,
      rewardCp: params.rewardCp,
      rewardNaira: params.rewardNaira,
      status: 'SCHEDULED',
      targetPlatoonId: params.targetPlatoonId,
      minCharismaRequired: params.minCharismaRequired || 0,
      maxParticipants: params.maxParticipants || 100,
      createdAt: now,
      updatedAt: now,
    };

    db.events.set(event.id, event);
    db.eventParticipants.set(event.id, []);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'EVENT_SCHEDULED',
      targetEntity: 'CAMP_EVENT',
      targetId: event.id,
      metadata: { title: event.title, location: locationName, startTime: event.startTime },
      createdAt: now,
    });

    return event;
  }

  /**
   * Admin: Cancel an event
   */
  static cancelEvent(actorUserId: string, eventId: string, reason?: string) {
    const event = db.events.get(eventId);
    if (!event) throw new AppError(`Event '${eventId}' not found.`, 404);

    if (event.status === 'CANCELLED') {
      return { eventId, status: 'CANCELLED', message: 'Event already cancelled.' };
    }

    event.status = 'CANCELLED';
    event.updatedAt = new Date().toISOString();
    db.events.set(eventId, event);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'EVENT_CANCELLED',
      targetEntity: 'CAMP_EVENT',
      targetId: eventId,
      metadata: { title: event.title, reason: reason || 'Cancelled by camp administration' },
      createdAt: event.updatedAt,
    });

    return {
      eventId: event.id,
      title: event.title,
      status: event.status,
      message: 'Event successfully cancelled.',
    };
  }

  /**
   * Admin: View event participants
   */
  static getEventParticipants(eventId: string) {
    const event = db.events.get(eventId);
    if (!event) throw new AppError('Event not found.', 404);

    const raw = db.eventParticipants.get(eventId) || [];
    const roster = raw.map((p) => {
      const user = db.users.get(p.userId);
      const profile = db.playerProfiles.get(p.userId);
      const platoon = profile?.platoonId ? db.platoons.get(profile.platoonId) : undefined;

      return {
        id: p.id,
        userId: p.userId,
        displayName: user?.displayName || 'Unknown Corper',
        stateCode: user?.stateCode || 'Pending',
        platoon: platoon ? { id: platoon.id, number: platoon.number, name: platoon.name } : null,
        registeredAt: p.registeredAt,
        attended: p.attended,
        rewardClaimed: p.rewardClaimed,
        claimedAt: p.claimedAt,
      };
    });

    return {
      eventId: event.id,
      title: event.title,
      totalParticipants: roster.length,
      maxParticipants: event.maxParticipants,
      participants: roster,
    };
  }
}
