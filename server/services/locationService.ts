/**
 * Corper Wee: Camp Locations & 3D Spatial Zone Service
 * Supports 3D coordinates, trigger radiuses, and safe soft-deletion
 * guaranteeing historical activity preservation.
 */
import { randomUUID as uuidv4 } from 'crypto';
import { db } from '../db/index.js';
import type { LocationZone } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export class LocationService {
  /**
   * List all visible camp locations (excludes soft-deleted items)
   */
  static listLocations(campId = 1, includeInactive = false) {
    return Array.from(db.locations.values())
      .filter((loc) => loc.campId === campId && !loc.isDeleted && (includeInactive || loc.isActive))
      .sort((a, b) => a.id - b.id);
  }

  /**
   * Get location details
   */
  static getLocationById(locationId: number) {
    const loc = db.locations.get(locationId);
    if (!loc || loc.isDeleted) {
      throw new AppError(`Location #${locationId} not found or has been removed.`, 404);
    }
    return loc;
  }

  /**
   * Admin: Create a new camp location
   */
  static createLocation(
    actorUserId: string,
    params: {
      campId?: number;
      slug: string;
      name: string;
      category: string;
      posX: number;
      posY: number;
      posZ: number;
      triggerRadius?: number;
      description?: string;
    }
  ) {
    const campId = params.campId || 1;
    const slug = params.slug.toLowerCase().trim();

    // Check slug uniqueness within camp
    for (const loc of db.locations.values()) {
      if (loc.campId === campId && loc.slug === slug && !loc.isDeleted) {
        throw new AppError(`Location slug '${slug}' already exists in camp #${campId}.`, 409);
      }
    }

    const nextId = db.locations.size + 1;
    const now = new Date().toISOString();

    const location: LocationZone = {
      id: nextId,
      campId,
      slug,
      name: params.name,
      category: params.category,
      posX: params.posX,
      posY: params.posY,
      posZ: params.posZ,
      triggerRadius: params.triggerRadius ?? 6.0,
      description: params.description || '',
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    db.locations.set(location.id, location);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'LOCATION_CREATED',
      targetEntity: 'LOCATION',
      targetId: String(location.id),
      metadata: { name: location.name, coords: [location.posX, location.posY, location.posZ] },
      createdAt: now,
    });

    return location;
  }

  /**
   * Admin: Update an existing location
   */
  static updateLocation(
    actorUserId: string,
    locationId: number,
    updates: Partial<Pick<LocationZone, 'name' | 'category' | 'posX' | 'posY' | 'posZ' | 'triggerRadius' | 'description' | 'isActive'>>
  ) {
    const location = db.locations.get(locationId);
    if (!location || location.isDeleted) {
      throw new AppError(`Location #${locationId} not found.`, 404);
    }

    if (updates.name) location.name = updates.name;
    if (updates.category) location.category = updates.category;
    if (updates.posX !== undefined) location.posX = updates.posX;
    if (updates.posY !== undefined) location.posY = updates.posY;
    if (updates.posZ !== undefined) location.posZ = updates.posZ;
    if (updates.triggerRadius !== undefined) location.triggerRadius = updates.triggerRadius;
    if (updates.description !== undefined) location.description = updates.description;
    if (updates.isActive !== undefined) location.isActive = updates.isActive;

    location.updatedAt = new Date().toISOString();
    db.locations.set(locationId, location);

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'LOCATION_UPDATED',
      targetEntity: 'LOCATION',
      targetId: String(locationId),
      metadata: updates,
      createdAt: location.updatedAt,
    });

    return location;
  }

  /**
   * Admin: Deactivate a location (without deleting)
   */
  static toggleActive(actorUserId: string, locationId: number, isActive: boolean) {
    return this.updateLocation(actorUserId, locationId, { isActive });
  }

  /**
   * Admin: Soft-delete location ensuring zero corruption to historical activity/event records
   */
  static softDeleteLocation(actorUserId: string, locationId: number) {
    const location = db.locations.get(locationId);
    if (!location || location.isDeleted) {
      throw new AppError(`Location #${locationId} not found or already deleted.`, 404);
    }

    const now = new Date().toISOString();

    // Mark as deleted and inactive (soft deletion)
    location.isDeleted = true;
    location.isActive = false;
    location.updatedAt = now;
    db.locations.set(locationId, location);

    // Any historical events retain the denormalized locationName so reports never break
    for (const event of db.events.values()) {
      if (event.locationId === locationId) {
        // Keep the historic locationName intact
        event.updatedAt = now;
        db.events.set(event.id, event);
      }
    }

    db.auditLogs.push({
      id: uuidv4(),
      actorUserId,
      action: 'LOCATION_SOFT_DELETED',
      targetEntity: 'LOCATION',
      targetId: String(locationId),
      metadata: { deletedLocationName: location.name, historicalPreservation: true },
      createdAt: now,
    });

    return {
      success: true,
      message: `Location #${locationId} (${location.name}) soft-deleted. Historical activity and event records preserved.`,
      locationId,
    };
  }
}
