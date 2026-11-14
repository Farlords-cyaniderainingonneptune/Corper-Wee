import * as THREE from 'three';
import { ProceduralModels, CharacterAppearance } from './ProceduralModels';
import { CAMP_LOCATION_REGISTRY, CampLocationZone, CampLocationManager } from './CampLocationSystem';
import { soundManager, type CampTimeOfDay } from '../audio/AudioSynthesizer';
import { SoldierPatrolSystem, SoldierDetectionEvent } from './SoldierPatrolAI';
import {
  detectRecommendedPerformanceTier,
  getPerformanceProfile,
  type PerformanceTier,
} from './DevicePerformance';
import { getWeatherProfile, type CampWeatherState } from './WeatherSystem';

export interface CampZoneTrigger {
  id: string | null;
  name: string;
  actionText: string;
  zone: CampLocationZone | null;
}

interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name: string;
}

const CAMP_OBSTACLES: ObstacleBox[] = [
  // Main Entrance Gate & Sentry
  { minX: -7.0, maxX: 7.0, minZ: 78.5, maxZ: 81.5, name: 'Main Gate Arch' },
  { minX: 7.0, maxX: 10.2, minZ: 76.5, maxZ: 79.5, name: 'Sentry Booth' },
  // Administrative Headquarters
  { minX: -11.5, maxX: 11.5, minZ: 8.5, maxZ: 21.5, name: 'Admin HQ' },
  // Orientation Lecture Pavilion
  { minX: -56.0, maxX: -28.0, minZ: 24.0, maxZ: 46.0, name: 'Lecture Pavilion' },
  // Male Hostels (Platoons 1-5)
  { minX: -58.0, maxX: -46.0, minZ: -16.0, maxZ: 6.0, name: 'Male Hostel' },
  // Female Hostels (Platoons 6-10)
  { minX: 46.0, maxX: 58.0, minZ: -16.0, maxZ: 6.0, name: 'Female Hostel' },
  // Parade Saluting Dais
  { minX: -4.5, maxX: 4.5, minZ: -58.5, maxZ: -51.5, name: 'Parade Dais' },
  // Camp Canteen
  { minX: -46.5, maxX: -29.5, minZ: -56.5, maxZ: -43.5, name: 'Camp Canteen' },
  // Mami Market Stalls
  { minX: 35.0, maxX: 49.0, minZ: -51.5, maxZ: -38.5, name: 'Mami Market' },
  // Borehole Pump
  { minX: 23.0, maxX: 27.0, minZ: 28.0, maxZ: 32.0, name: 'Borehole Tap' },
];

export class CampScene3D {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Player & Rig
  private playerGroup: THREE.Group;
  private playerLimbs: ReturnType<typeof ProceduralModels.createCorper> | null = null;
  private velocityY: number = 0;
  private isGrounded: boolean = true;
  private jumpStrength: number = 8.5;
  private gravity: number = -22.0;

  private isSaluting: boolean = false;
  private saluteTimer: number = 0;
  private isWaving: boolean = false;
  private waveTimer: number = 0;
  private footstepTimer: number = 0;

  // Soldier Patrol AI System
  private soldierPatrols: SoldierPatrolSystem;
  private onSoldierAlert?: (event: SoldierDetectionEvent) => void;

  // Remote Multiplayer Players in Camp
  private remotePlayers: Map<string, { group: THREE.Group; nameTag: THREE.Sprite }> = new Map();
  private onPlayerSelected?: (userId: string) => void;

  // Camera Orbit
  private cameraYaw: number = 0;
  private cameraPitch: number = 0.25;
  private cameraDistance: number = 7.5;

  // Navigation Target Waypoint
  private waypointBeacon: THREE.Group | null = null;
  private activeWaypointZoneId: string | null = null;

  // Input states
  private keys: Record<string, boolean> = {};
  private touchVector: { x: number; y: number } = { x: 0, y: 0 };
  private touchSprint: boolean = false;

  // Zone callback
  private onZoneChange: (zone: CampZoneTrigger) => void;
  private activeZoneId: string | null = null;

  // Animation frame id
  private animFrameId: number | null = null;

  // Lighting & Weather atmosphere refs
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private currentTimeOfDay: CampTimeOfDay = 'MORNING';
  private currentWeather: CampWeatherState = 'SUNNY';
  private rainPoints: THREE.Points | null = null;
  private rainCount: number = 0;

  // Device Performance Tier & Frame Pacing
  private performanceTier: PerformanceTier = detectRecommendedPerformanceTier();
  private lastRenderTimeMs: number = 0;

  constructor(
    container: HTMLDivElement,
    appearance: CharacterAppearance,
    onZoneChange: (zone: CampZoneTrigger) => void,
    onSoldierAlert?: (event: SoldierDetectionEvent) => void,
    initialPerformanceTier?: PerformanceTier
  ) {
    this.container = container;
    this.onZoneChange = onZoneChange;
    this.onSoldierAlert = onSoldierAlert;
    if (initialPerformanceTier) {
      this.performanceTier = initialPerformanceTier;
    }
    const perfProfile = getPerformanceProfile(this.performanceTier);
    this.clock = new THREE.Clock();

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9bd2f5); // Tropical Nigerian sky
    this.scene.fog = new THREE.FogExp2(0x9bd2f5, perfProfile.fogDensity);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      perfProfile.farClip
    );

    // 3. Renderer with Android-adaptive PBR settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: perfProfile.antialias,
      powerPreference: this.performanceTier === 'LOW' ? 'low-power' : 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perfProfile.pixelRatioCap));
    this.renderer.shadowMap.enabled = perfProfile.shadowsEnabled;
    this.renderer.shadowMap.type =
      this.performanceTier === 'HIGH' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Build Iseyin Camp Ground & Structures
    this.buildCampWorld();

    // 6. Spawn Player Avatar near Main Gate
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.set(0, 0, 65);
    this.scene.add(this.playerGroup);
    this.updatePlayerModel(appearance);

    // 7. Soldier Patrol AI System
    this.soldierPatrols = new SoldierPatrolSystem(this.scene, (event) => {
      if (this.onSoldierAlert) {
        this.onSoldierAlert(event);
      }
    });

    // 8. Navigation Waypoint Marker Beacon
    this.createWaypointBeacon();

    // 9. Bind Inputs
    this.bindEvents();

    // 10. Start Loop
    this.tick = this.tick.bind(this);
    this.tick();
  }

  private setupLighting() {
    const perfProfile = getPerformanceProfile(this.performanceTier);
    this.sunLight = new THREE.DirectionalLight(0xfff6e5, 1.8);
    this.sunLight.position.set(50, 75, 40);
    this.sunLight.castShadow = perfProfile.shadowsEnabled;
    this.sunLight.shadow.mapSize.width = perfProfile.shadowMapSize;
    this.sunLight.shadow.mapSize.height = perfProfile.shadowMapSize;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 220;
    const shadowDist = 80;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x9bd2f5, 0xd49b6a, 0.75);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambientLight);

    this.applyAtmosphere();
  }

  public setPerformanceTier(tier: PerformanceTier) {
    this.performanceTier = tier;
    const profile = getPerformanceProfile(tier);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatioCap));
    this.renderer.shadowMap.enabled = profile.shadowsEnabled;
    this.renderer.shadowMap.type =
      tier === 'HIGH' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (this.sunLight) {
      this.sunLight.castShadow = profile.shadowsEnabled;
      if (
        this.sunLight.shadow.mapSize.width !== profile.shadowMapSize &&
        this.sunLight.shadow.map
      ) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
      this.sunLight.shadow.mapSize.width = profile.shadowMapSize;
      this.sunLight.shadow.mapSize.height = profile.shadowMapSize;
    }
    this.camera.far = profile.farClip;
    this.camera.updateProjectionMatrix();

    // Rebuild rain particle density if Light Rain is currently active
    if (this.currentWeather === 'LIGHT_RAIN') {
      this.rebuildRainParticles();
    }
    this.applyAtmosphere();
  }

  public getPerformanceTier(): PerformanceTier {
    return this.performanceTier;
  }

  public setTimeOfDay(timeOfDay: CampTimeOfDay) {
    this.currentTimeOfDay = timeOfDay;
    this.applyAtmosphere();
  }

  public setWeather(weather: CampWeatherState) {
    if (this.currentWeather === weather) return;
    this.currentWeather = weather;
    if (weather === 'LIGHT_RAIN') {
      this.ensureRainParticles();
    } else if (this.rainPoints) {
      this.rainPoints.visible = false;
    }
    this.applyAtmosphere();
  }

  public getWeather(): CampWeatherState {
    return this.currentWeather;
  }

  private getRainParticleBudget(): number {
    if (this.performanceTier === 'LOW') return 320;
    if (this.performanceTier === 'MID') return 750;
    return 1300;
  }

  private rebuildRainParticles() {
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
      this.rainPoints.geometry.dispose();
      (this.rainPoints.material as THREE.Material).dispose();
      this.rainPoints = null;
      this.rainCount = 0;
    }
    if (this.currentWeather === 'LIGHT_RAIN') {
      this.ensureRainParticles();
    }
  }

  private ensureRainParticles() {
    const targetCount = this.getRainParticleBudget();
    if (this.rainPoints && this.rainCount === targetCount) {
      this.rainPoints.visible = true;
      return;
    }
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
      this.rainPoints.geometry.dispose();
      (this.rainPoints.material as THREE.Material).dispose();
      this.rainPoints = null;
    }

    const positions = new Float32Array(targetCount * 3);
    const px = this.playerGroup?.position.x ?? 0;
    const pz = this.playerGroup?.position.z ?? 65;

    for (let i = 0; i < targetCount; i++) {
      positions[i * 3] = px + (Math.random() - 0.5) * 42;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = pz + (Math.random() - 0.5) * 42;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xcbe7ff,
      size: 0.19,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });

    this.rainPoints = new THREE.Points(geometry, material);
    this.rainPoints.frustumCulled = false;
    this.rainCount = targetCount;
    this.scene.add(this.rainPoints);
  }

  private updateRainParticles(delta: number) {
    if (!this.rainPoints || !this.rainPoints.visible) return;

    const attr = this.rainPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const px = this.playerGroup.position.x;
    const pz = this.playerGroup.position.z;
    const halfSpan = 21;
    const fallSpeed = 16.5 * delta;
    const windDriftX = 1.6 * delta;

    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += windDriftX;
      arr[i + 1] -= fallSpeed;

      if (arr[i + 1] < 0.1) {
        arr[i] = px + (Math.random() - 0.5) * 42;
        arr[i + 1] = 17 + Math.random() * 4;
        arr[i + 2] = pz + (Math.random() - 0.5) * 42;
      } else {
        // Wrap horizontally around player position as corper moves across camp
        if (arr[i] - px > halfSpan) arr[i] -= halfSpan * 2;
        else if (arr[i] - px < -halfSpan) arr[i] += halfSpan * 2;

        if (arr[i + 2] - pz > halfSpan) arr[i + 2] -= halfSpan * 2;
        else if (arr[i + 2] - pz < -halfSpan) arr[i + 2] += halfSpan * 2;
      }
    }

    attr.needsUpdate = true;
  }

  private applyAtmosphere() {
    const timeOfDay = this.currentTimeOfDay;
    const weather = this.currentWeather;
    const perfProfile = getPerformanceProfile(this.performanceTier);

    let skyHex = 0x9bd2f5;
    let fogDensity = perfProfile.fogDensity;
    let sunHex = 0xfff6e5;
    let sunIntensity = 1.8;
    let sunPos: [number, number, number] = [50, 75, 40];
    let hemiSkyHex = 0x9bd2f5;
    let hemiGroundHex = 0xd49b6a;
    let hemiIntensity = 0.75;
    let ambientHex = 0xffffff;
    let ambientIntensity = 0.25;
    let exposure = 1.05;

    if (timeOfDay === 'MORNING') {
      skyHex = 0xf4c89b;
      fogDensity = 0.0065;
      sunHex = 0xffd296;
      sunIntensity = 1.5;
      sunPos = [68, 36, 48];
      hemiSkyHex = 0xfde68a;
      hemiGroundHex = 0xb3744d;
      hemiIntensity = 0.72;
      ambientHex = 0xfff1db;
      ambientIntensity = 0.28;
    } else if (timeOfDay === 'DAY') {
      skyHex = 0x9bd2f5;
      fogDensity = 0.007;
      sunHex = 0xfff6e5;
      sunIntensity = 1.8;
      sunPos = [50, 75, 40];
      hemiSkyHex = 0x9bd2f5;
      hemiGroundHex = 0xd49b6a;
      hemiIntensity = 0.75;
      ambientHex = 0xffffff;
      ambientIntensity = 0.25;
    } else {
      skyHex = 0x0f172a;
      fogDensity = 0.0095;
      sunHex = 0x93c5fd;
      sunIntensity = 0.6;
      sunPos = [-45, 65, -35];
      hemiSkyHex = 0x334155;
      hemiGroundHex = 0x2a1f1a;
      hemiIntensity = 0.55;
      ambientHex = 0x475569;
      ambientIntensity = 0.35;
    }

    // Blend weather modifiers cleanly over time-of-day baseline
    if (weather === 'SUNNY') {
      if (timeOfDay !== 'NIGHT') {
        sunIntensity *= 1.18;
        exposure = 1.12;
        fogDensity *= 0.85;
      }
    } else if (weather === 'CLOUDY') {
      skyHex = timeOfDay === 'NIGHT' ? 0x1e293b : timeOfDay === 'MORNING' ? 0xc2b8ae : 0x94a3b8;
      sunIntensity *= 0.58;
      hemiSkyHex = timeOfDay === 'NIGHT' ? 0x334155 : 0xcbd5e1;
      hemiIntensity *= 0.92;
      ambientIntensity += 0.12;
      fogDensity = Math.max(fogDensity, 0.0115);
      exposure = 0.96;
    } else if (weather === 'LIGHT_RAIN') {
      skyHex = timeOfDay === 'NIGHT' ? 0x0b1322 : 0x64748b;
      sunHex = timeOfDay === 'NIGHT' ? 0x60a5fa : 0xcbd5e1;
      sunIntensity *= 0.42;
      hemiSkyHex = timeOfDay === 'NIGHT' ? 0x1e293b : 0x94a3b8;
      hemiIntensity *= 0.82;
      ambientHex = 0x94a3b8;
      ambientIntensity = timeOfDay === 'NIGHT' ? 0.38 : 0.4;
      fogDensity = Math.max(fogDensity, 0.015);
      exposure = 0.9;
    }

    const skyColor = new THREE.Color(skyHex);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyHex, fogDensity);
    this.renderer.toneMappingExposure = exposure;

    if (this.sunLight) {
      this.sunLight.color.setHex(sunHex);
      this.sunLight.intensity = sunIntensity;
      this.sunLight.position.set(sunPos[0], sunPos[1], sunPos[2]);
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(hemiSkyHex);
      this.hemiLight.groundColor.setHex(hemiGroundHex);
      this.hemiLight.intensity = hemiIntensity;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(ambientHex);
      this.ambientLight.intensity = ambientIntensity;
    }
  }

  private buildCampWorld() {
    // 1. Terrain: Red laterite camp ground (260m x 260m)
    const groundGeo = new THREE.PlaneGeometry(260, 260);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xc87d55, // Nigerian laterite clay
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Main Driveway Asphalt Road leading from Main Gate to Parade Ground
    const roadGeo = new THREE.PlaneGeometry(10, 140);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const mainRoad = new THREE.Mesh(roadGeo, roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.015, 20);
    mainRoad.receiveShadow = true;
    this.scene.add(mainRoad);

    // Parade Ground Square
    const paradeGeo = new THREE.PlaneGeometry(64, 48);
    const paradeMat = new THREE.MeshStandardMaterial({ color: 0xaa613d, roughness: 0.9 });
    const paradeGround = new THREE.Mesh(paradeGeo, paradeMat);
    paradeGround.rotation.x = -Math.PI / 2;
    paradeGround.position.set(0, 0.02, -35);
    paradeGround.receiveShadow = true;
    this.scene.add(paradeGround);

    // White parade ground boundary lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const boundaryLine = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.4), lineMat);
    boundaryLine.rotation.x = -Math.PI / 2;
    boundaryLine.position.set(0, 0.03, -15);
    this.scene.add(boundaryLine);

    // 2. Main Camp Entrance Gate (0, 0, 80)
    const mainGate = ProceduralModels.createMainEntranceGate();
    mainGate.position.set(0, 0, 80);
    this.scene.add(mainGate);

    // Sentry Guard at Entrance Gate
    const sentry = ProceduralModels.createDrillSergeant();
    sentry.position.set(5.5, 0, 78);
    this.scene.add(sentry);

    // 3. Administrative Headquarters (0, 0, 15)
    const adminHq = ProceduralModels.createAdminBuilding();
    adminHq.position.set(0, 0, 15);
    this.scene.add(adminHq);

    // 4. Orientation Lecture Pavilion (-42, 0, 35)
    const pavilion = ProceduralModels.createLecturePavilion();
    pavilion.position.set(-42, 0, 35);
    pavilion.rotation.y = Math.PI / 8;
    this.scene.add(pavilion);

    // 5. Hostels (Male: -52, 0, -5 | Female: 52, 0, -5)
    const maleHostel = ProceduralModels.createHostelBuilding('PLATOON 1–5 MALE HOSTEL');
    maleHostel.position.set(-52, 0, -5);
    maleHostel.rotation.y = Math.PI / 2;
    this.scene.add(maleHostel);

    const femaleHostel = ProceduralModels.createHostelBuilding('PLATOON 6–10 FEMALE HOSTEL');
    femaleHostel.position.set(52, 0, -5);
    femaleHostel.rotation.y = -Math.PI / 2;
    this.scene.add(femaleHostel);

    // 6. Parade Ground Dais & Sergeant (0, 0, -55)
    const dais = ProceduralModels.createParadeDais();
    dais.position.set(0, 0, -55);
    this.scene.add(dais);

    const sergeant = ProceduralModels.createDrillSergeant();
    sergeant.position.set(0, 1.15, -53);
    this.scene.add(sergeant);

    // 7. Camp Canteen Mess Hall (-38, 0, -50)
    const canteen = ProceduralModels.createCanteenBuilding();
    canteen.position.set(-38, 0, -50);
    canteen.rotation.y = Math.PI / 3;
    this.scene.add(canteen);

    // 8. Mami Market Vendor Plaza (42, 0, -45)
    const mamiMarket = ProceduralModels.createMamiMarket();
    mamiMarket.position.set(42, 0, -45);
    mamiMarket.rotation.y = -Math.PI / 4;
    this.scene.add(mamiMarket);

    // 9. Borehole Water Tap Station (25, 0, 30)
    const borehole = ProceduralModels.createBoreholePump();
    borehole.position.set(25, 0, 30);
    this.scene.add(borehole);

    // 10. Tropical Trees & Flora across camp perimeter
    const treeCoords = [
      [-75, -55], [-75, -20], [-75, 15], [-75, 55], [-75, 85],
      [75, -55], [75, -20], [75, 15], [75, 55], [75, 85],
      [-25, -75], [25, -75], [-45, 75], [45, 75],
      [-22, 12], [22, 12], [-18, 55], [18, 55]
    ];
    treeCoords.forEach(([tx, tz]) => {
      const tree = ProceduralModels.createPalmTree();
      tree.position.set(tx, 0, tz);
      tree.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(tree);
    });
  }

  private createWaypointBeacon() {
    this.waypointBeacon = new THREE.Group();
    this.waypointBeacon.visible = false;

    // Golden vertical pillar of light
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 18, 16), beaconMat);
    pillar.position.y = 9;
    this.waypointBeacon.add(pillar);

    // Rotating ground ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.2, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    this.waypointBeacon.add(ring);

    this.scene.add(this.waypointBeacon);
  }

  public setWaypointTarget(zoneId: string | null) {
    this.activeWaypointZoneId = zoneId;
    if (!this.waypointBeacon) return;

    if (!zoneId) {
      this.waypointBeacon.visible = false;
      return;
    }

    const zone = CAMP_LOCATION_REGISTRY.find((z) => z.id === zoneId);
    if (zone) {
      this.waypointBeacon.position.set(zone.x, 0, zone.z);
      this.waypointBeacon.visible = true;
    }
  }

  public teleportToLocation(x: number, z: number) {
    this.playerGroup.position.set(x, 0, z);
    soundManager.playFootstep();
  }

  public updatePlayerModel(appearance: CharacterAppearance) {
    while (this.playerGroup.children.length > 0) {
      this.playerGroup.remove(this.playerGroup.children[0]);
    }
    this.playerLimbs = ProceduralModels.createCorper(appearance);
    this.playerGroup.add(this.playerLimbs.root);
  }

  public triggerJump() {
    if (!this.isGrounded) return;
    this.velocityY = this.jumpStrength;
    this.isGrounded = false;
    soundManager.playFootstep();
  }

  public setTouchInput(vec: { x: number; y: number }, isSprinting: boolean) {
    this.touchVector = vec;
    this.touchSprint = isSprinting;
  }

  public triggerSalute() {
    if (this.isSaluting) return;
    this.isSaluting = true;
    this.saluteTimer = 1.4;
    soundManager.playWhistle();
  }

  public triggerWave() {
    if (this.isWaving) return;
    this.isWaving = true;
    this.waveTimer = 1.6;
  }

  private bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') {
        this.triggerSalute();
      }
      if (e.code === 'KeyG') {
        this.triggerWave();
      }
      if (e.code === 'Space') {
        this.triggerJump();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        this.cameraYaw -= deltaX * 0.006;
        this.cameraPitch = Math.max(0.05, Math.min(1.1, this.cameraPitch + deltaY * 0.005));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  private onWindowResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private tick() {
    this.animFrameId = requestAnimationFrame(this.tick);

    const profile = getPerformanceProfile(this.performanceTier);
    if (profile.targetFps < 60) {
      const nowMs = performance.now();
      const minIntervalMs = 1000 / profile.targetFps;
      if (nowMs - this.lastRenderTimeMs < minIntervalMs) {
        return;
      }
      this.lastRenderTimeMs = nowMs;
    }

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    this.updatePlayerMovement(delta, time);
    this.updateCameraFollow(delta);
    this.checkZoneProximity();

    // Update Soldier Patrol AI & Line-of-sight checks
    if (this.soldierPatrols) {
      this.soldierPatrols.update(delta, {
        x: this.playerGroup.position.x,
        y: this.playerGroup.position.y,
        z: this.playerGroup.position.z
      });
    }

    // Update Light Rain particle curtain
    this.updateRainParticles(delta);

    // Rotate waypoint beacon
    if (this.waypointBeacon && this.waypointBeacon.visible) {
      this.waypointBeacon.rotation.y += 1.2 * delta;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private checkCollision(x: number, z: number, padding: number = 0.85): boolean {
    for (const box of CAMP_OBSTACLES) {
      if (
        x >= box.minX - padding &&
        x <= box.maxX + padding &&
        z >= box.minZ - padding &&
        z <= box.maxZ + padding
      ) {
        return true;
      }
    }
    return false;
  }

  private updatePlayerMovement(delta: number, time: number) {
    // 1. Vertical physics: Gravity & Jump
    if (!this.isGrounded) {
      this.velocityY += this.gravity * delta;
      this.playerGroup.position.y += this.velocityY * delta;
      if (this.playerGroup.position.y <= 0) {
        this.playerGroup.position.y = 0;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    if (this.isSaluting) {
      this.saluteTimer -= delta;
      if (this.saluteTimer <= 0) this.isSaluting = false;

      if (this.playerLimbs) {
        this.playerLimbs.rightArm.rotation.x = -2.2;
        this.playerLimbs.rightArm.rotation.z = -0.5;
        this.playerLimbs.leftArm.rotation.x = 0;
        this.playerLimbs.leftLeg.rotation.x = 0;
        this.playerLimbs.rightLeg.rotation.x = 0;
      }
      return;
    }

    if (this.isWaving) {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) this.isWaving = false;

      if (this.playerLimbs) {
        this.playerLimbs.rightArm.rotation.x = -2.4 + Math.sin(time * 12) * 0.3;
        this.playerLimbs.rightArm.rotation.z = Math.sin(time * 12) * 0.4;
      }
      return;
    }

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    if (Math.abs(this.touchVector.x) > 0.05 || Math.abs(this.touchVector.y) > 0.05) {
      moveX = this.touchVector.x;
      moveZ = -this.touchVector.y;
    }

    const inputLength = Math.hypot(moveX, moveZ);
    const isSprinting = (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint) && inputLength > 0.1;

    if (inputLength > 0.05) {
      const normX = moveX / inputLength;
      const normZ = moveZ / inputLength;

      const forward = new THREE.Vector3(
        -Math.sin(this.cameraYaw),
        0,
        -Math.cos(this.cameraYaw)
      ).normalize();
      const right = new THREE.Vector3(
        Math.cos(this.cameraYaw),
        0,
        -Math.sin(this.cameraYaw)
      ).normalize();

      const moveDirection = forward.clone().multiplyScalar(-normZ).add(right.clone().multiplyScalar(normX)).normalize();
      const baseSpeed = isSprinting ? 9.8 : 5.2;
      const speed = baseSpeed * getWeatherProfile(this.currentWeather).movementSpeedMultiplier;
      const stepX = moveDirection.x * speed * delta;
      const stepZ = moveDirection.z * speed * delta;

      // Slide collision resolution: test X and Z independently against obstacles
      const currentPos = this.playerGroup.position;
      let targetX = currentPos.x + stepX;
      let targetZ = currentPos.z + stepZ;

      if (this.checkCollision(targetX, currentPos.z)) {
        targetX = currentPos.x; // Block X movement, allow Z slide
      }
      if (this.checkCollision(currentPos.x, targetZ)) {
        targetZ = currentPos.z; // Block Z movement, allow X slide
      }
      // Corner collision check
      if (this.checkCollision(targetX, targetZ)) {
        if (!this.checkCollision(targetX, currentPos.z)) {
          targetZ = currentPos.z;
        } else if (!this.checkCollision(currentPos.x, targetZ)) {
          targetX = currentPos.x;
        } else {
          targetX = currentPos.x;
          targetZ = currentPos.z;
        }
      }

      this.playerGroup.position.x = targetX;
      this.playerGroup.position.z = targetZ;

      const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
      this.playerGroup.rotation.y = targetAngle;

      if (this.playerLimbs) {
        if (!this.isGrounded) {
          // Airborne jump animation blend
          this.playerLimbs.leftLeg.rotation.x = 0.4;
          this.playerLimbs.rightLeg.rotation.x = -0.3;
          this.playerLimbs.leftArm.rotation.x = -0.8;
          this.playerLimbs.rightArm.rotation.x = -0.8;
        } else {
          const animFreq = isSprinting ? 15 : 9;
          const swing = Math.sin(time * animFreq) * (isSprinting ? 0.9 : 0.6);

          this.playerLimbs.leftLeg.rotation.x = swing;
          this.playerLimbs.rightLeg.rotation.x = -swing;
          this.playerLimbs.leftArm.rotation.x = -swing;
          this.playerLimbs.rightArm.rotation.x = swing;

          this.footstepTimer += delta;
          if (this.footstepTimer > (isSprinting ? 0.22 : 0.38)) {
            this.footstepTimer = 0;
            soundManager.playFootstep();
          }
        }
      }
    } else {
      if (this.playerLimbs) {
        if (!this.isGrounded) {
          this.playerLimbs.leftLeg.rotation.x = 0.3;
          this.playerLimbs.rightLeg.rotation.x = -0.2;
          this.playerLimbs.leftArm.rotation.x = -0.6;
          this.playerLimbs.rightArm.rotation.x = -0.6;
        } else {
          // Idle breathing subtle sway
          const breathe = Math.sin(time * 3) * 0.05;
          this.playerLimbs.leftLeg.rotation.x = 0;
          this.playerLimbs.rightLeg.rotation.x = 0;
          this.playerLimbs.leftArm.rotation.x = breathe;
          this.playerLimbs.rightArm.rotation.x = -breathe;
        }
      }
    }

    // Clamp player within camp grounds
    this.playerGroup.position.x = Math.max(-115, Math.min(115, this.playerGroup.position.x));
    this.playerGroup.position.z = Math.max(-115, Math.min(115, this.playerGroup.position.z));
  }

  private updateCameraFollow(delta: number) {
    const focusY = 1.6;
    const target = this.playerGroup.position.clone().add(new THREE.Vector3(0, focusY, 0));

    const horizontalDist = this.cameraDistance * Math.cos(this.cameraPitch);
    const verticalDist = this.cameraDistance * Math.sin(this.cameraPitch);

    const desiredCamPos = new THREE.Vector3(
      target.x + horizontalDist * Math.sin(this.cameraYaw),
      target.y + verticalDist,
      target.z + horizontalDist * Math.cos(this.cameraYaw)
    );

    this.camera.position.lerp(desiredCamPos, 10 * delta);
    this.camera.lookAt(target);
  }

  private checkZoneProximity() {
    const px = this.playerGroup.position.x;
    const pz = this.playerGroup.position.z;

    const { zone } = CampLocationManager.getNearbyZone(px, pz);

    const newZone: CampZoneTrigger = zone
      ? {
          id: zone.id,
          name: zone.name,
          actionText: zone.actionText || `Visit ${zone.name}`,
          zone
        }
      : { id: null, name: '', actionText: '', zone: null };

    if (newZone.id !== this.activeZoneId) {
      this.activeZoneId = newZone.id;
      this.onZoneChange(newZone);
    }
  }

  public syncRemotePlayer(player: {
    userId: string;
    displayName: string;
    stateCode: string;
    platoonNumber: number;
    posX: number;
    posY: number;
    posZ: number;
    rotationY: number;
  }) {
    let remote = this.remotePlayers.get(player.userId);
    if (!remote) {
      const group = new THREE.Group();
      group.position.set(player.posX, player.posY || 0, player.posZ);
      group.rotation.y = player.rotationY || 0;

      // Create model
      const model = ProceduralModels.createCorper({
        gender: 'MALE',
        skinTone: 'WARM_BROWN',
        hairstyle: 'BUZZ_CUT',
        hairColor: 'BLACK',
        facialFeature: 'NONE',
        uniformType: 'KHAKI_FULL',
        footwear: 'JUNGLE_BOOTS',
        accessories: 'WAIST_BAG'
      });
      group.add(model.root);

      // Name tag above head
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect(4, 4, 248, 56, 12);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(player.displayName, 128, 28);
      ctx.fillStyle = '#34d399';
      ctx.font = '14px monospace';
      ctx.fillText(`P${player.platoonNumber} • ${player.stateCode}`, 128, 48);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2.3, 0);
      sprite.scale.set(3.2, 0.8, 1);
      group.add(sprite);

      this.scene.add(group);
      remote = { group, nameTag: sprite };
      this.remotePlayers.set(player.userId, remote);
    } else {
      // Smooth interpolation
      remote.group.position.lerp(new THREE.Vector3(player.posX, player.posY || 0, player.posZ), 0.3);
      remote.group.rotation.y = player.rotationY || 0;
    }
  }

  public removeRemotePlayer(userId: string) {
    const remote = this.remotePlayers.get(userId);
    if (remote) {
      this.scene.remove(remote.group);
      this.remotePlayers.delete(userId);
    }
  }

  public getPlayerPosition(): { x: number; z: number; rotationY: number } {
    return {
      x: this.playerGroup.position.x,
      z: this.playerGroup.position.z,
      rotationY: this.playerGroup.rotation.y
    };
  }

  public resetSoldierAlerts() {
    if (this.soldierPatrols) {
      this.soldierPatrols.resetAllToPatrol();
    }
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.soldierPatrols) {
      this.soldierPatrols.destroy();
    }
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
      this.rainPoints.geometry.dispose();
      (this.rainPoints.material as THREE.Material).dispose();
      this.rainPoints = null;
    }
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
