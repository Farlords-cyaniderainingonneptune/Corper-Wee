/**
 * Modular Location & Navigation System for Corper Wee.
 * Defines all buildings, checkpoints, and activity zones of Iseyin Camp.
 * Modular and fully configurable so verified references can be updated easily.
 */

export interface CampLocationZone {
  id: string;
  name: string;
  category: 'CHECKPOINT' | 'ACTIVITY' | 'ACCOMMODATION' | 'COMMERCE' | 'FACILITY';
  x: number;
  z: number;
  triggerRadius: number;
  description: string;
  actionText?: string;
  actionType?: 'parade' | 'canteen' | 'market' | 'borehole' | 'lecture' | 'admin' | 'entrance' | 'hostel';
  colorHex: string;
  badge: string;
}

export const CAMP_LOCATION_REGISTRY: CampLocationZone[] = [
  {
    id: 'main_entrance',
    name: 'Main Camp Gate & Security',
    category: 'CHECKPOINT',
    x: 0,
    z: 80,
    triggerRadius: 12,
    description: 'Official entrance gates with military security checkpoint and NYSC welcome arch.',
    actionText: 'Report to Security Post',
    actionType: 'entrance',
    colorHex: '#10b981',
    badge: 'GATE'
  },
  {
    id: 'parade_ground',
    name: 'Parade Ground & Saluting Dais',
    category: 'ACTIVITY',
    x: 0,
    z: -35,
    triggerRadius: 16,
    description: 'Central drill ground with VIP saluting dais, 3 national flagpoles, and parade markings.',
    actionText: 'Enter Parade Drill (Rhythm QTE)',
    actionType: 'parade',
    colorHex: '#f59e0b',
    badge: 'PARADE'
  },
  {
    id: 'admin_hq',
    name: 'Administrative Headquarters',
    category: 'FACILITY',
    x: 0,
    z: 15,
    triggerRadius: 10,
    description: 'Camp Director & State Coordinator offices, registration desk, and staff administration.',
    actionText: 'Enter Admin Reception',
    actionType: 'admin',
    colorHex: '#ef4444',
    badge: 'ADMIN'
  },
  {
    id: 'lecture_pavilion',
    name: 'Orientation Lecture Pavilion',
    category: 'FACILITY',
    x: -42,
    z: 35,
    triggerRadius: 14,
    description: 'Grand multipurpose open-air pavilion for SAED lectures, swear-in ceremonies, and social nights.',
    actionText: 'Attend Camp Lecture',
    actionType: 'lecture',
    colorHex: '#8b5cf6',
    badge: 'HALL'
  },
  {
    id: 'male_hostel',
    name: 'Male Hostels (Platoons 1–5)',
    category: 'ACCOMMODATION',
    x: -52,
    z: -5,
    triggerRadius: 14,
    description: 'Two-storey male corps member dormitory blocks with wide verandas and bunk beds.',
    actionText: 'Enter Male Hostel',
    actionType: 'hostel',
    colorHex: '#3b82f6',
    badge: 'BOYS'
  },
  {
    id: 'female_hostel',
    name: 'Female Hostels (Platoons 6–10)',
    category: 'ACCOMMODATION',
    x: 52,
    z: -5,
    triggerRadius: 14,
    description: 'Two-storey female corps member residential blocks with secure perimeter.',
    actionText: 'Enter Female Hostel',
    actionType: 'hostel',
    colorHex: '#ec4899',
    badge: 'GIRLS'
  },
  {
    id: 'camp_canteen',
    name: 'Camp Canteen & Mess Hall',
    category: 'COMMERCE',
    x: -38,
    z: -50,
    triggerRadius: 12,
    description: 'Official dining hall serving daily government rations and meal tray collections.',
    actionText: 'Join Canteen Food Rush',
    actionType: 'canteen',
    colorHex: '#f97316',
    badge: 'MESS'
  },
  {
    id: 'mami_market',
    name: 'Mami Market & Vendor Plaza',
    category: 'COMMERCE',
    x: 42,
    z: -45,
    triggerRadius: 15,
    description: 'Vibrant commercial hub: Mama Put smoky jollof, tailors, cold drinks, ATM banking kiosk.',
    actionText: 'Visit Mama Put & ATM',
    actionType: 'market',
    colorHex: '#eab308',
    badge: 'MAMI'
  },
  {
    id: 'water_borehole',
    name: 'Borehole Water Point',
    category: 'FACILITY',
    x: 25,
    z: 30,
    triggerRadius: 8,
    description: 'Deep borehole pump station with 2,000L overhead blue tanks and multi-faucet water collection trough.',
    actionText: 'Refill Water Bucket (Free)',
    actionType: 'borehole',
    colorHex: '#06b6d4',
    badge: 'WATER'
  }
];

export class CampLocationManager {
  /**
   * Find closest location zone to the player
   */
  public static getNearbyZone(playerX: number, playerZ: number): {
    zone: CampLocationZone | null;
    distance: number;
  } {
    let closestZone: CampLocationZone | null = null;
    let minDistance = Infinity;

    for (const zone of CAMP_LOCATION_REGISTRY) {
      const dist = Math.hypot(playerX - zone.x, playerZ - zone.z);
      if (dist <= zone.triggerRadius && dist < minDistance) {
        minDistance = dist;
        closestZone = zone;
      }
    }

    return { zone: closestZone, distance: minDistance };
  }

  /**
   * Compute distance and compass heading from player to target location
   */
  public static getNavigationInfo(
    playerX: number,
    playerZ: number,
    targetZoneId: string
  ): {
    zone: CampLocationZone | null;
    distance: number;
    angleDegrees: number;
    compassBearing: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  } {
    const zone = CAMP_LOCATION_REGISTRY.find((z) => z.id === targetZoneId) || null;
    if (!zone) {
      return { zone: null, distance: 0, angleDegrees: 0, compassBearing: 'N' };
    }

    const dx = zone.x - playerX;
    const dz = zone.z - playerZ;
    const distance = Math.hypot(dx, dz);

    // Three.js coordinates: -Z is North, +X is East
    // Math.atan2(dx, -dz) yields angle in radians clockwise from North
    let angleRad = Math.atan2(dx, -dz);
    if (angleRad < 0) angleRad += Math.PI * 2;
    const angleDegrees = (angleRad * 180) / Math.PI;

    const bearings: Array<'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'> = [
      'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'
    ];
    const index = Math.round(angleDegrees / 45) % 8;

    return {
      zone,
      distance: Math.round(distance),
      angleDegrees: Math.round(angleDegrees),
      compassBearing: bearings[index]
    };
  }
}
