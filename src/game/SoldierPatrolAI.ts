import * as THREE from 'three';
import { ProceduralModels } from './ProceduralModels';

export interface SoldierPatrolWaypoint {
  x: number;
  z: number;
  pauseDurationSec?: number;
}

export interface SoldierPatrolRoute {
  id: string;
  name: string;
  waypoints: SoldierPatrolWaypoint[];
  speed: number;
  visionRange: number;
  visionFovRad: number; // Field of view in radians (e.g. 70 deg = ~1.22 rad)
}

export type SoldierAlertState = 'PATROL' | 'SUSPICIOUS' | 'CHASE' | 'CAPTURED';

export interface SoldierDetectionEvent {
  soldierId: string;
  state: SoldierAlertState;
  suspicionLevel: number; // 0.0 to 1.0
  distanceToPlayer: number;
  message: string;
}

export const CAMP_SOLDIER_ROUTES: SoldierPatrolRoute[] = [
  // Patrol 1: Main Gate & Sentry Avenue
  {
    id: 'sentry_avenue',
    name: 'Main Gate Sentry',
    waypoints: [
      { x: 5, z: 75, pauseDurationSec: 2 },
      { x: -5, z: 75, pauseDurationSec: 2 },
      { x: -5, z: 45, pauseDurationSec: 1 },
      { x: 5, z: 45, pauseDurationSec: 1 },
    ],
    speed: 3.2,
    visionRange: 18.0,
    visionFovRad: 1.25
  },
  // Patrol 2: Admin HQ & Central Corridor
  {
    id: 'admin_corridor',
    name: 'Admin HQ Guard',
    waypoints: [
      { x: 18, z: 15, pauseDurationSec: 2 },
      { x: 18, z: -10, pauseDurationSec: 1.5 },
      { x: -18, z: -10, pauseDurationSec: 1.5 },
      { x: -18, z: 15, pauseDurationSec: 2 },
    ],
    speed: 3.6,
    visionRange: 16.0,
    visionFovRad: 1.3
  },
  // Patrol 3: Hostels & Perimeter Quad
  {
    id: 'hostel_perimeter',
    name: 'Hostel Curfew Patrol',
    waypoints: [
      { x: -35, z: -15, pauseDurationSec: 2 },
      { x: -35, z: 20, pauseDurationSec: 2 },
      { x: 35, z: 20, pauseDurationSec: 2 },
      { x: 35, z: -15, pauseDurationSec: 2 },
    ],
    speed: 3.8,
    visionRange: 20.0,
    visionFovRad: 1.4
  },
  // Patrol 4: Mami Market & Borehole Pathway
  {
    id: 'mami_borehole_run',
    name: 'Mami Market Checkpoint',
    waypoints: [
      { x: 30, z: -35, pauseDurationSec: 1.5 },
      { x: 22, z: 20, pauseDurationSec: 2 },
      { x: 35, z: 20, pauseDurationSec: 1.5 },
      { x: 45, z: -35, pauseDurationSec: 2 },
    ],
    speed: 3.4,
    visionRange: 17.0,
    visionFovRad: 1.2
  }
];

export class SoldierPatrolAgent {
  public route: SoldierPatrolRoute;
  public group: THREE.Group;
  public visionConeMesh: THREE.Mesh;
  public alertState: SoldierAlertState = 'PATROL';
  public suspicion: number = 0; // 0 to 1
  public currentWaypointIndex: number = 0;
  public pauseTimer: number = 0;
  private limbs: ReturnType<typeof ProceduralModels.createDrillSergeant>;

  constructor(route: SoldierPatrolRoute) {
    this.route = route;
    this.group = new THREE.Group();

    const startWp = route.waypoints[0];
    this.group.position.set(startWp.x, 0, startWp.z);

    // Procedural soldier mesh with military camouflage
    this.limbs = ProceduralModels.createDrillSergeant();
    this.group.add(this.limbs);

    // Vision Cone (semi-transparent sector on ground)
    const coneGeo = new THREE.ConeGeometry(route.visionRange, route.visionRange * 1.5, 16, 1, false, 0, route.visionFovRad);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xeab308, // Warning yellow in patrol
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.visionConeMesh = new THREE.Mesh(coneGeo, coneMat);
    this.visionConeMesh.rotation.x = Math.PI / 2;
    this.visionConeMesh.position.set(0, 0.1, 0);
    this.group.add(this.visionConeMesh);
  }

  public update(
    delta: number,
    playerPos: { x: number; y: number; z: number; isCrouched?: boolean }
  ): SoldierDetectionEvent | null {
    const currentWp = this.route.waypoints[this.currentWaypointIndex];

    // 1. Line-of-sight & Player Detection Checks
    const toPlayer = new THREE.Vector3(playerPos.x - this.group.position.x, 0, playerPos.z - this.group.position.z);
    const distToPlayer = toPlayer.length();

    // Soldier facing forward vector
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
    const toPlayerNorm = toPlayer.clone().normalize();
    const angleToPlayer = forward.angleTo(toPlayerNorm);

    // In Field of View & Range?
    const inFov = angleToPlayer <= this.route.visionFovRad / 2;
    const inRange = distToPlayer <= this.route.visionRange;

    let seesPlayer = inFov && inRange;
    // If player is very close (< 3m), detection occurs even from behind
    if (distToPlayer < 3.2) {
      seesPlayer = true;
    }

    // Update alert status
    if (seesPlayer) {
      const detectionRate = distToPlayer < 6 ? 1.4 : 0.8;
      this.suspicion = Math.min(1.0, this.suspicion + delta * detectionRate);

      if (this.suspicion >= 0.85) {
        this.alertState = 'CHASE';
        (this.visionConeMesh.material as THREE.MeshBasicMaterial).color.setHex(0xef4444); // Red
        (this.visionConeMesh.material as THREE.MeshBasicMaterial).opacity = 0.35;
      } else {
        this.alertState = 'SUSPICIOUS';
        (this.visionConeMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf97316); // Orange
        (this.visionConeMesh.material as THREE.MeshBasicMaterial).opacity = 0.25;
      }

      // Rotate soldier toward player when suspicious/chasing
      const targetLookAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetLookAngle, 8 * delta);

      // Chase movement if in chase state
      if (this.alertState === 'CHASE') {
        const chaseSpeed = this.route.speed * 1.35;
        this.group.position.addScaledVector(toPlayerNorm, chaseSpeed * delta);

        if (distToPlayer < 1.6) {
          this.alertState = 'CAPTURED';
          return {
            soldierId: this.route.id,
            state: 'CAPTURED',
            suspicionLevel: 1.0,
            distanceToPlayer: distToPlayer,
            message: `Oga Corper caught by ${this.route.name}! "Double up! Pick pin now!"`
          };
        }
      }

      return {
        soldierId: this.route.id,
        state: this.alertState,
        suspicionLevel: this.suspicion,
        distanceToPlayer: distToPlayer,
        message: this.alertState === 'CHASE' ? 'SOLDIER IN HOT PURSUIT!' : 'Soldier spotted suspicious movement!'
      };
    } else {
      // Decay suspicion
      this.suspicion = Math.max(0, this.suspicion - delta * 0.45);
      if (this.suspicion === 0) {
        this.alertState = 'PATROL';
        (this.visionConeMesh.material as THREE.MeshBasicMaterial).color.setHex(0xeab308); // Yellow
        (this.visionConeMesh.material as THREE.MeshBasicMaterial).opacity = 0.16;
      }
    }

    // 2. Regular Waypoint Patrol Pathfinding
    if (this.pauseTimer > 0) {
      this.pauseTimer -= delta;
      return null;
    }

    const toWp = new THREE.Vector3(currentWp.x - this.group.position.x, 0, currentWp.z - this.group.position.z);
    const distToWp = toWp.length();

    if (distToWp < 1.0) {
      this.pauseTimer = currentWp.pauseDurationSec || 1.5;
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.route.waypoints.length;
    } else {
      const moveDir = toWp.clone().normalize();
      this.group.position.addScaledVector(moveDir, this.route.speed * delta);
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 6 * delta);
    }

    return null;
  }
}

export class SoldierPatrolSystem {
  public agents: SoldierPatrolAgent[] = [];
  private scene: THREE.Scene;
  private onAlertCallback?: (event: SoldierDetectionEvent) => void;

  constructor(scene: THREE.Scene, onAlert?: (event: SoldierDetectionEvent) => void) {
    this.scene = scene;
    this.onAlertCallback = onAlert;

    // Instantiate all camp routes
    for (const route of CAMP_SOLDIER_ROUTES) {
      const agent = new SoldierPatrolAgent(route);
      this.agents.push(agent);
      this.scene.add(agent.group);
    }
  }

  public update(
    delta: number,
    playerPos: { x: number; y: number; z: number }
  ) {
    let highestEvent: SoldierDetectionEvent | null = null;

    for (const agent of this.agents) {
      const event = agent.update(delta, playerPos);
      if (event) {
        if (!highestEvent || event.suspicionLevel > highestEvent.suspicionLevel) {
          highestEvent = event;
        }
      }
    }

    if (highestEvent && this.onAlertCallback) {
      this.onAlertCallback(highestEvent);
    }
  }

  public resetAllToPatrol() {
    for (const agent of this.agents) {
      agent.alertState = 'PATROL';
      agent.suspicion = 0;
      agent.pauseTimer = 0;
      (agent.visionConeMesh.material as THREE.MeshBasicMaterial).color.setHex(0xeab308);
      (agent.visionConeMesh.material as THREE.MeshBasicMaterial).opacity = 0.16;
      const startWp = agent.route.waypoints[0];
      agent.group.position.set(startWp.x, 0, startWp.z);
    }
  }

  public destroy() {
    for (const agent of this.agents) {
      this.scene.remove(agent.group);
    }
    this.agents = [];
  }
}
