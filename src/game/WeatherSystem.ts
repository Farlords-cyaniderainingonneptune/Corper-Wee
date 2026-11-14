/**
 * Dynamic Camp Weather System for Corper Wee (Iseyin NYSC Orientation Camp).
 * Cycles periodically through Sunny, Cloudy, and Light Rain states, providing
 * synchronized 3D atmosphere, ambient audio, HUD feedback, and hydration modifiers.
 */

export type CampWeatherState = 'SUNNY' | 'CLOUDY' | 'LIGHT_RAIN';

export interface WeatherProfile {
  state: CampWeatherState;
  label: 'Sunny' | 'Cloudy' | 'Light Rain';
  hydrationMultiplier: number;
  movementSpeedMultiplier: number;
  modifierBadge: string;
  description: string;
}

export const WEATHER_CYCLE_ORDER: readonly CampWeatherState[] = [
  'SUNNY',
  'CLOUDY',
  'LIGHT_RAIN',
];

export const WEATHER_CYCLE_INTERVAL_MS = 45_000;

export const WEATHER_PROFILES: Record<CampWeatherState, WeatherProfile> = {
  SUNNY: {
    state: 'SUNNY',
    label: 'Sunny',
    hydrationMultiplier: 1.65,
    movementSpeedMultiplier: 1.0,
    modifierBadge: '+65% Thirst',
    description: 'High tropical sun over Iseyin camp — water drains 65% faster.',
  },
  CLOUDY: {
    state: 'CLOUDY',
    label: 'Cloudy',
    hydrationMultiplier: 1.0,
    movementSpeedMultiplier: 1.0,
    modifierBadge: 'Normal Thirst',
    description: 'Cool overcast shade across the parade ground — normal water consumption.',
  },
  LIGHT_RAIN: {
    state: 'LIGHT_RAIN',
    label: 'Light Rain',
    hydrationMultiplier: 0.6,
    movementSpeedMultiplier: 0.94,
    modifierBadge: '-40% Thirst',
    description: 'Refreshing camp drizzle — 40% slower water drain and slightly damp footing.',
  },
};

export function getNextWeatherState(current: CampWeatherState): CampWeatherState {
  const idx = WEATHER_CYCLE_ORDER.indexOf(current);
  if (idx === -1) return 'SUNNY';
  return WEATHER_CYCLE_ORDER[(idx + 1) % WEATHER_CYCLE_ORDER.length];
}

export function getWeatherProfile(weather: CampWeatherState): WeatherProfile {
  return WEATHER_PROFILES[weather] || WEATHER_PROFILES.SUNNY;
}

export function getWeatherHydrationMultiplier(weather: CampWeatherState): number {
  return getWeatherProfile(weather).hydrationMultiplier;
}
