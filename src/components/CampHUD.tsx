import React, { useState } from 'react';
import {
  UserSession,
  type CampNotificationItem,
  type DailyDutyType,
  type DailyTasksSummary,
} from '../api/client';
import { CampZoneTrigger } from '../game/CampScene3D';
import {
  soundManager,
  computeAmbientProfile,
  describeActiveLayers,
  type CampTimeOfDay,
} from '../audio/AudioSynthesizer';
import {
  Award,
  Trophy,
  Droplets,
  Coins,
  Shield,
  User,
  Volume2,
  VolumeX,
  Sunrise,
  Sun,
  Cloud,
  CloudRain,
  Moon,
  Calendar,
  ClipboardCheck,
  BellRing,
  X,
  Gauge,
  Compass,
  Zap,
  Flame,
  ArrowUp,
  MapPin
} from 'lucide-react';
import type { PerformanceTier } from '../game/DevicePerformance';
import { getWeatherProfile, type CampWeatherState } from '../game/WeatherSystem';

import { InteractiveMinimap } from './InteractiveMinimap';
import { TouchJoystick } from './TouchJoystick';
import { CampNotificationFeed } from './CampNotificationFeed';
import { SoldierDetectionEvent } from '../game/SoldierPatrolAI';

interface CampHUDProps {
  session: UserSession;
  waterLevel: number;
  activeZone: CampZoneTrigger;
  soldierAlert?: SoldierDetectionEvent | null;
  playerPos: { x: number; z: number; rotationY: number };
  activeWaypointId: string | null;
  onlinePlayersCount?: number;
  notifications?: CampNotificationItem[];
  dailyTasksSummary?: DailyTasksSummary | null;
  dailyAlertBanner?: {
    taskType: DailyDutyType;
    title: string;
    message: string;
    rewardCp: number;
  } | null;
  timeOfDay?: CampTimeOfDay;
  onCycleTimeOfDay?: () => void;
  weather?: CampWeatherState;
  onCycleWeather?: () => void;
  performanceTier?: PerformanceTier;
  onCyclePerformanceTier?: () => void;
  onClearNotifications?: () => void;
  onSelectWaypoint: (zoneId: string | null) => void;
  onFastTravel: (x: number, z: number) => void;
  onOpenCharacterStudio: () => void;
  onOpenLeaderboard: () => void;
  onOpenAdminPortal: () => void;
  onOpenSocialHub?: () => void;
  onOpenEvents?: () => void;
  onOpenDailyTasks?: () => void;
  onStartDutyFromAlert?: (taskType: DailyDutyType) => void;
  onDismissDailyAlert?: () => void;
  onTriggerZoneAction: () => void;
  onSalute: () => void;
  onWave?: () => void;
  onJump?: () => void;
  onRefillWater: () => void;
  onTouchMove: (vec: { x: number; y: number }, isSprinting: boolean) => void;
}

export const CampHUD: React.FC<CampHUDProps> = ({
  session,
  waterLevel,
  activeZone,
  soldierAlert,
  playerPos,
  activeWaypointId,
  onlinePlayersCount = 1,
  notifications = [],
  dailyTasksSummary = null,
  dailyAlertBanner = null,
  timeOfDay = 'MORNING',
  onCycleTimeOfDay,
  weather = 'SUNNY',
  onCycleWeather,
  performanceTier = 'MID',
  onCyclePerformanceTier,
  onClearNotifications,
  onSelectWaypoint,
  onFastTravel,
  onOpenCharacterStudio,
  onOpenLeaderboard,
  onOpenAdminPortal,
  onOpenSocialHub,
  onOpenEvents,
  onOpenDailyTasks,
  onStartDutyFromAlert,
  onDismissDailyAlert,
  onTriggerZoneAction,
  onSalute,
  onWave,
  onJump,
  onRefillWater,
  onTouchMove
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [sprintToggled, setSprintToggled] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const weatherProfile = getWeatherProfile(weather);
  const activeAmbientLayers = describeActiveLayers(
    computeAmbientProfile(activeZone.id, timeOfDay, weather)
  );
  const ambientSummary = isMuted
    ? 'Audio Muted'
    : activeAmbientLayers.slice(0, 3).join(' · ');

  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN';

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3 select-none">
      {/* Top HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Corper Profile & Platoon */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Platoon Badge */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-2 rounded-xl bg-slate-900/85 border border-emerald-500/40 px-3 py-1.5 shadow-lg shadow-black/40 hover:bg-slate-800/90 transition-all text-xs text-white"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
              #{session.user.platoonNumber}
            </div>
            <div className="text-left">
              <div className="font-bold leading-tight">Platoon {session.user.platoonNumber}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <Trophy className="h-2.5 w-2.5" />
                <span>Leaderboard</span>
              </div>
            </div>
          </button>

          {/* State Code Pill */}
          <div className="hidden sm:flex flex-col rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-1 shadow-lg text-xs">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">NYSC Code</span>
            <span className="font-mono font-bold text-amber-300">{session.user.stateCode}</span>
          </div>
        </div>

        {/* Center: Hydration Water Bottle Meter */}
        <div
          className={`pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900/85 border px-3 py-1.5 shadow-lg text-xs text-white transition-colors ${
            weather === 'SUNNY'
              ? 'border-amber-500/60'
              : weather === 'LIGHT_RAIN'
              ? 'border-sky-400/50'
              : 'border-cyan-500/40'
          }`}
          title={weatherProfile.description}
        >
          <Droplets className="h-4 w-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col w-28 sm:w-36">
            <div className="flex justify-between items-center text-[10px] mb-0.5 gap-1">
              <span className="text-slate-300">Hydration</span>
              {weather === 'SUNNY' && (
                <span className="font-bold text-amber-300 text-[9px] tracking-tight">
                  +65% Drain
                </span>
              )}
              {weather === 'LIGHT_RAIN' && (
                <span className="font-bold text-sky-300 text-[9px] tracking-tight">
                  -40% Drain
                </span>
              )}
              <span className="font-bold text-cyan-300">{waterLevel.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${
                  waterLevel < 20 ? 'bg-rose-500 animate-pulse' : 'bg-cyan-400'
                }`}
                style={{ width: `${waterLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Balances, Admin & Tools */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Corper Points Counter */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/85 border border-emerald-500/40 px-3 py-1.5 shadow-lg text-xs">
            <Award className="h-4 w-4 text-emerald-400" />
            <span className="font-mono font-bold text-emerald-300">{session.wallet.corperPoints} CP</span>
          </div>

          {/* Virtual Naira Counter */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/85 border border-amber-500/40 px-3 py-1.5 shadow-lg text-xs">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="font-mono font-bold text-amber-300">
              ₦{parseFloat(session.wallet.virtualNaira).toLocaleString()}
            </span>
          </div>

          {/* Avatar Customizer */}
          <button
            onClick={onOpenCharacterStudio}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/85 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            title="Customise NYSC Kit"
          >
            <User className="h-4 w-4" />
          </button>

          {/* Social Hub & Charisma Button */}
          {onOpenSocialHub && (
            <button
              onClick={onOpenSocialHub}
              className="flex items-center gap-1 rounded-xl bg-slate-900/85 border border-emerald-500/50 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-emerald-300 shadow-lg transition-colors"
              title="Social Hub & Corper Friends"
            >
              <span>💬 Social</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] text-emerald-400">({onlinePlayersCount})</span>
            </button>
          )}

          {/* Daily Duties (Morning Drill & Evening Parade) Button */}
          {onOpenDailyTasks && (
            <button
              onClick={onOpenDailyTasks}
              className={`flex items-center gap-1 rounded-xl bg-slate-900/85 border px-2.5 py-1.5 text-xs font-bold shadow-lg transition-colors hover:bg-slate-800 ${
                (dailyTasksSummary?.pendingCount ?? 2) > 0
                  ? 'border-amber-500/50 text-amber-300'
                  : 'border-emerald-500/40 text-emerald-300'
              }`}
              title="Daily Morning Drill & Evening Parade Tasks"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Duties</span>
              {dailyTasksSummary && (
                <span className="font-mono text-[10px] px-1 rounded bg-black/40">
                  {dailyTasksSummary.completedCount}/{dailyTasksSummary.totalCount}
                </span>
              )}
            </button>
          )}

          {/* Camp Events Button */}
          {onOpenEvents && (
            <button
              onClick={onOpenEvents}
              className="flex items-center gap-1 rounded-xl bg-slate-900/85 border border-violet-500/40 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-violet-300 shadow-lg transition-colors"
              title="Camp Schedule & Events"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Events</span>
            </button>
          )}

          {/* Android / WebGL Performance Quality Toggle */}
          {onCyclePerformanceTier && (
            <button
              onClick={onCyclePerformanceTier}
              className="flex items-center gap-1 rounded-xl bg-slate-900/85 border border-slate-700 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
              title={`Graphics Quality: ${performanceTier} (Click to cycle Low / Mid / High for Android performance)`}
            >
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden lg:inline">{performanceTier}</span>
            </button>
          )}

          {/* Camp Weather Switcher & Modifier Indicator (Sunny / Cloudy / Light Rain) */}
          {onCycleWeather && (
            <button
              onClick={onCycleWeather}
              className={`flex items-center gap-1.5 rounded-xl bg-slate-900/85 border px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-lg hover:bg-slate-800 ${
                weather === 'SUNNY'
                  ? 'border-amber-500/50 text-amber-200'
                  : weather === 'CLOUDY'
                  ? 'border-slate-500/60 text-slate-200'
                  : 'border-sky-400/60 text-sky-200'
              }`}
              title={`Weather: ${weatherProfile.label} (${weatherProfile.modifierBadge}) — ${weatherProfile.description} Click to cycle weather.`}
            >
              {weather === 'SUNNY' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : weather === 'CLOUDY' ? (
                <Cloud className="h-3.5 w-3.5 text-slate-300" />
              ) : (
                <CloudRain className="h-3.5 w-3.5 text-sky-400" />
              )}
              <span className="hidden md:inline">{weatherProfile.label}</span>
              <span
                className={`hidden xl:inline font-mono text-[10px] px-1 rounded bg-black/35 ${
                  weather === 'SUNNY'
                    ? 'text-amber-300'
                    : weather === 'LIGHT_RAIN'
                    ? 'text-sky-300'
                    : 'text-slate-300'
                }`}
              >
                {weatherProfile.modifierBadge}
              </span>
            </button>
          )}

          {/* Camp Time of Day Switcher (Morning Bugle / Day Bustle / Night Crickets) */}
          {onCycleTimeOfDay && (
            <button
              onClick={onCycleTimeOfDay}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900/85 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
              title={`Camp Time: ${timeOfDay} (${ambientSummary}). Click to cycle Morning, Day, Night.`}
            >
              {timeOfDay === 'MORNING' ? (
                <Sunrise className="h-3.5 w-3.5 text-amber-300" />
              ) : timeOfDay === 'DAY' ? (
                <Sun className="h-3.5 w-3.5 text-yellow-300" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-300" />
              )}
              <span className="hidden md:inline">
                {timeOfDay === 'MORNING' ? 'Morning' : timeOfDay === 'DAY' ? 'Day' : 'Night'}
              </span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/85 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            title={isMuted ? 'Unmute Audio & Ambient Soundscape' : `Mute Audio (${ambientSummary})`}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          {/* Admin Command Portal Toggle */}
          {isAdmin && (
            <button
              onClick={onOpenAdminPortal}
              className="flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Middle HUD Row: Notification Feed (Left) & Minimap (Right) */}
      <div className="flex items-start justify-between gap-2 mt-2 w-full">
        <div className="pointer-events-auto z-20 shrink-0">
          <CampNotificationFeed
            notifications={notifications}
            onClear={onClearNotifications}
          />
        </div>
        <div className="pointer-events-auto z-20 shrink-0">
          <InteractiveMinimap
            playerPos={playerPos}
            activeWaypointId={activeWaypointId}
            onSelectWaypoint={onSelectWaypoint}
            onFastTravel={onFastTravel}
          />
        </div>
      </div>

      {/* Daily Morning Drill / Evening Parade Notification Alert Banner */}
      {dailyAlertBanner && (
        <div className="pointer-events-auto mx-auto mt-1 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/60 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md max-w-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
            <BellRing className="h-4 w-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <span>{dailyAlertBanner.title} Alert</span>
              <span className="font-mono text-[10px] text-emerald-300">
                +{dailyAlertBanner.rewardCp} CP
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-snug">{dailyAlertBanner.message}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onStartDutyFromAlert && (
              <button
                type="button"
                onClick={() => onStartDutyFromAlert(dailyAlertBanner.taskType)}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors"
              >
                Start Drill
              </button>
            )}
            {onDismissDailyAlert && (
              <button
                type="button"
                onClick={onDismissDailyAlert}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Dismiss duty alert"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Soldier Patrol Alert & Stealth Meter (Center-Top Alert) */}
      {soldierAlert && (
        <div className={`pointer-events-auto mx-auto mt-1 flex items-center gap-3 rounded-2xl px-5 py-2.5 shadow-2xl backdrop-blur-md border animate-pulse ${
          soldierAlert.state === 'CHASE' || soldierAlert.state === 'CAPTURED'
            ? 'bg-rose-950/90 border-rose-500 text-rose-200'
            : 'bg-amber-950/90 border-amber-500 text-amber-200'
        }`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-base">
            {soldierAlert.state === 'CHASE' || soldierAlert.state === 'CAPTURED' ? '🚨' : '👀'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase">
                {soldierAlert.state === 'CAPTURED'
                  ? 'CAPTURED BY SOLDIER!'
                  : soldierAlert.state === 'CHASE'
                  ? 'SOLDIER IN HOT PURSUIT!'
                  : 'SOLDIER PATROL SUSPICIOUS!'}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-bold">
                {soldierAlert.distanceToPlayer.toFixed(1)}m away
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-32 bg-black/60 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    soldierAlert.state === 'CHASE' ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${soldierAlert.suspicionLevel * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-300 italic">{soldierAlert.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Proximity Interaction Banner (Center Screen when near building) */}
      {activeZone.id && (
        <div className="pointer-events-auto mx-auto my-auto flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/60 bg-slate-900/90 px-6 py-4 shadow-2xl backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <MapPin className="h-4 w-4" />
            <span>Approaching: {activeZone.name}</span>
          </div>
          <button
            onClick={onTriggerZoneAction}
            className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-950/60 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            {activeZone.actionText}
          </button>
        </div>
      )}

      {/* Bottom HUD: Quick Actions & Controls */}
      <div className="flex items-end justify-between gap-3">
        {/* Left: Dynamic Touch Joystick for Mobile / Tablet */}
        <div className="pointer-events-auto">
          <TouchJoystick onMove={onTouchMove} />
          {/* Fallback On-Screen D-Pad for tap navigation */}
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-slate-900/80 border border-slate-800 p-2 shadow-xl backdrop-blur-sm sm:hidden">
            <button
              onPointerDown={() => onTouchMove({ x: 0, y: 1 }, sprintToggled)}
              onPointerUp={() => onTouchMove({ x: 0, y: 0 }, sprintToggled)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-200 active:bg-emerald-600 active:text-white"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <div className="flex gap-1">
              <button
                onPointerDown={() => onTouchMove({ x: -1, y: 0 }, sprintToggled)}
                onPointerUp={() => onTouchMove({ x: 0, y: 0 }, sprintToggled)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-200 active:bg-emerald-600 active:text-white"
              >
                &larr;
              </button>
              <button
                onPointerDown={() => onTouchMove({ x: 0, y: -1 }, sprintToggled)}
                onPointerUp={() => onTouchMove({ x: 0, y: 0 }, sprintToggled)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-200 active:bg-emerald-600 active:text-white"
              >
                &darr;
              </button>
              <button
                onPointerDown={() => onTouchMove({ x: 1, y: 0 }, sprintToggled)}
                onPointerUp={() => onTouchMove({ x: 0, y: 0 }, sprintToggled)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-200 active:bg-emerald-600 active:text-white"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Center: Desktop Controls & Active Soundscape Hint (Hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-4 rounded-xl bg-slate-900/75 border border-slate-800 px-4 py-2 text-[11px] text-slate-400 backdrop-blur-sm shadow-lg">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">WASD</kbd> Move</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Space</kbd> Jump</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Shift</kbd> Sprint</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">F</kbd> Salute (&ldquo;Corper Wee!&rdquo;)</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Mouse Drag</kbd> Rotate View</span>
          <span className="hidden lg:inline-flex items-center gap-1.5 border-l border-slate-700 pl-3 text-emerald-300/90">
            <Volume2 className="h-3 w-3 shrink-0" />
            <span>{ambientSummary}</span>
          </span>
        </div>

        {/* Right: Quick Action Buttons (wraps cleanly on compact Android screens) */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 max-w-[205px] sm:max-w-none">
          {/* Jump Button */}
          {onJump && (
            <button
              onClick={onJump}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900/85 border border-slate-700 hover:bg-slate-800 active:bg-emerald-600 px-3 py-2 text-xs font-black text-amber-300 shadow-lg active:scale-95 transition-all"
              title="Jump over obstacles (Space)"
            >
              <span>JUMP ⬆️</span>
            </button>
          )}

          {/* Sprint Toggle */}
          <button
            onClick={() => {
              const next = !sprintToggled;
              setSprintToggled(next);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-lg transition-all ${
              sprintToggled
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-slate-900/85 border border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Sprint</span>
          </button>

          {/* Attention Salute Button */}
          <button
            onClick={onSalute}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-black text-white shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
          >
            <Shield className="h-4 w-4" />
            <span>SALUTE!</span>
          </button>

          {/* Wave Gesture Button */}
          {onWave && (
            <button
              onClick={onWave}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900/85 border border-slate-700 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg active:scale-95 transition-all"
              title="Wave to fellow corpers"
            >
              <span>Wave 👋</span>
            </button>
          )}

          {/* Quick Borehole Drink */}
          <button
            onClick={onRefillWater}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 active:scale-95 transition-all"
            title="Drink pure borehole water"
          >
            <Droplets className="h-4 w-4" />
            <span className="hidden sm:inline">Drink</span>
          </button>
        </div>
      </div>
    </div>
  );
};
