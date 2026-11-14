/**
 * Device performance tier profiles & hardware auto-detection for Android & mobile WebGL devices.
 */

export type PerformanceTier = 'LOW' | 'MID' | 'HIGH';

export interface PerformanceProfile {
  tier: PerformanceTier;
  label: string;
  pixelRatioCap: number;
  antialias: boolean;
  shadowsEnabled: boolean;
  shadowMapSize: 512 | 1024 | 2048;
  farClip: number;
  fogDensity: number;
  targetFps: 30 | 60;
}

export const PERFORMANCE_PROFILES: Record<PerformanceTier, PerformanceProfile> = {
  LOW: {
    tier: 'LOW',
    label: 'Battery / Budget Android',
    pixelRatioCap: 1.0,
    antialias: false,
    shadowsEnabled: false,
    shadowMapSize: 512,
    farClip: 280,
    fogDensity: 0.0095,
    targetFps: 30,
  },
  MID: {
    tier: 'MID',
    label: 'Mid-Range Android',
    pixelRatioCap: 1.5,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    farClip: 420,
    fogDensity: 0.0078,
    targetFps: 60,
  },
  HIGH: {
    tier: 'HIGH',
    label: 'High-End / Desktop',
    pixelRatioCap: 2.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    farClip: 600,
    fogDensity: 0.007,
    targetFps: 60,
  },
};

export function getPerformanceProfile(tier: PerformanceTier): PerformanceProfile {
  return PERFORMANCE_PROFILES[tier];
}

export function detectRecommendedPerformanceTier(specs?: {
  cores?: number;
  memoryGb?: number;
  viewportWidth?: number;
  isTouch?: boolean;
}): PerformanceTier {
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number })
      : undefined;

  const cores = specs?.cores ?? nav?.hardwareConcurrency ?? 4;
  const memoryGb = specs?.memoryGb ?? nav?.deviceMemory ?? 4;
  const viewportWidth =
    specs?.viewportWidth ??
    (typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isTouch =
    specs?.isTouch ??
    (typeof window !== 'undefined'
      ? 'ontouchstart' in window || (nav?.maxTouchPoints ?? 0) > 0
      : false);

  if (cores <= 4 && memoryGb <= 3) {
    return 'LOW';
  }
  if (isTouch || viewportWidth <= 900 || cores <= 6 || memoryGb <= 6) {
    return 'MID';
  }
  return 'HIGH';
}
