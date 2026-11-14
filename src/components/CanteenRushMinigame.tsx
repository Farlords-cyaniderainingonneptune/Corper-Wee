import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { Utensils, Timer, Trophy, Flame, AlertCircle, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface CanteenRushMinigameProps {
  onClose: () => void;
  onFinish: (pointsEarned: number) => void;
}

type TrackConfig = 'STANDARD' | 'MUDDY_TERRAIN' | 'SOLDIER_DRILL_GAUNTLET';

interface TrackDefinition {
  id: TrackConfig;
  name: string;
  tagline: string;
  badge: string;
  timeLimitSec: number;
  totalDistanceMeters: number;
  obstacleFrequency: number; // lower means more frequent
  speedMultiplier: number;
}

const TRACK_CONFIGS: Record<TrackConfig, TrackDefinition> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Lunch Whistle Sprint',
    tagline: 'Standard canteen rush path with queue benches and water buckets.',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    timeLimitSec: 30,
    totalDistanceMeters: 100,
    obstacleFrequency: 14,
    speedMultiplier: 1.0
  },
  MUDDY_TERRAIN: {
    id: 'MUDDY_TERRAIN',
    name: 'Laterite Mud Gauntlet',
    tagline: 'Heavy tropical downpour flooded the paths with slippery mud puddles and low barriers.',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    timeLimitSec: 32,
    totalDistanceMeters: 120,
    obstacleFrequency: 11,
    speedMultiplier: 1.25
  },
  SOLDIER_DRILL_GAUNTLET: {
    id: 'SOLDIER_DRILL_GAUNTLET',
    name: 'Commandant Surprise Inspection',
    tagline: 'Soldiers set up checkpoint barricades and high gates. Maximum agility required!',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    timeLimitSec: 28,
    totalDistanceMeters: 140,
    obstacleFrequency: 8.5,
    speedMultiplier: 1.6
  }
};

type ObstacleType = 'BENCH' | 'MUD_PUDDLE' | 'WATER_BARREL' | 'SOLDIER_ROPE';

interface TrackObstacle {
  id: number;
  lane: -1 | 0 | 1; // Left, Center, Right
  distanceMeters: number;
  type: ObstacleType;
  cleared: boolean;
  hit: boolean;
  requires: 'JUMP' | 'SLIDE' | 'DODGE';
}

export const CanteenRushMinigame: React.FC<CanteenRushMinigameProps> = ({ onClose, onFinish }) => {
  const [selectedTrack, setSelectedTrack] = useState<TrackConfig | null>(null);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [lane, setLane] = useState<-1 | 0 | 1>(0); // -1: left, 0: center, 1: right
  const [playerAction, setPlayerAction] = useState<'RUN' | 'JUMP' | 'SLIDE'>('RUN');
  const [stamina, setStamina] = useState(100);
  const [timeLeft, setTimeLeft] = useState(30);
  const [obstaclesCleared, setObstaclesCleared] = useState(0);
  const [puddlesHit, setPuddlesHit] = useState(0);
  const [foodPacksCollected, setFoodPacksCollected] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [reachedFinishLine, setReachedFinishLine] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const obstaclesRef = useRef<TrackObstacle[]>([]);
  const gameRunningRef = useRef<boolean>(false);
  const actionTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const statsRef = useRef<{ cleared: number; puddles: number; stamina: number; foodPacks: number }>({
    cleared: 0,
    puddles: 0,
    stamina: 100,
    foodPacks: 0,
  });

  // Initialize track and obstacle layout
  const handleStartTrack = (trackId: TrackConfig) => {
    setSelectedTrack(trackId);
    const cfg = TRACK_CONFIGS[trackId];
    setTimeLeft(cfg.timeLimitSec);
    setDistanceTraveled(0);
    setLane(0);
    setPlayerAction('RUN');
    setStamina(100);
    setObstaclesCleared(0);
    setPuddlesHit(0);
    setFoodPacksCollected(0);
    setIsGameOver(false);
    setReachedFinishLine(false);
    statsRef.current = { cleared: 0, puddles: 0, stamina: 100, foodPacks: 0 };
    startTimeRef.current = Date.now();

    // Generate obstacles along track
    const obsList: TrackObstacle[] = [];
    let d = 15;
    let obsId = 1;
    const obstacleTypes: Array<{ type: ObstacleType; requires: 'JUMP' | 'SLIDE' | 'DODGE' }> = [
      { type: 'BENCH', requires: 'JUMP' },
      { type: 'MUD_PUDDLE', requires: 'DODGE' },
      { type: 'WATER_BARREL', requires: 'DODGE' },
      { type: 'SOLDIER_ROPE', requires: 'SLIDE' }
    ];

    while (d < cfg.totalDistanceMeters - 8) {
      const lanes: Array<-1 | 0 | 1> = [-1, 0, 1];
      const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
      const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

      obsList.push({
        id: obsId++,
        lane: randomLane,
        distanceMeters: d,
        type: randomType.type,
        cleared: false,
        hit: false,
        requires: randomType.requires
      });

      d += cfg.obstacleFrequency + (Math.random() * 4 - 2);
    }

    obstaclesRef.current = obsList;
    gameRunningRef.current = true;
    soundManager.playWhistle();
  };

  const triggerFeedback = (text: string, color: string) => {
    setFeedback({ text, color });
    setTimeout(() => setFeedback(null), 900);
  };

  // Lane movement (Dodging)
  const shiftLane = useCallback((dir: 'LEFT' | 'RIGHT') => {
    if (!gameRunningRef.current) return;
    setLane((prev) => {
      let nextLane: -1 | 0 | 1 = prev;
      if (dir === 'LEFT') {
        nextLane = (prev > -1 ? prev - 1 : -1) as -1 | 0 | 1;
      } else {
        nextLane = (prev < 1 ? prev + 1 : 1) as -1 | 0 | 1;
      }
      return nextLane;
    });
    soundManager.playFootstep();
  }, []);

  // Jump Action
  const triggerJump = useCallback(() => {
    if (!gameRunningRef.current || playerAction !== 'RUN') return;
    setPlayerAction('JUMP');
    soundManager.playFootstep();
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    actionTimerRef.current = window.setTimeout(() => {
      setPlayerAction('RUN');
    }, 700);
  }, [playerAction]);

  // Slide Action
  const triggerSlide = useCallback(() => {
    if (!gameRunningRef.current || playerAction !== 'RUN') return;
    setPlayerAction('SLIDE');
    soundManager.playFootstep();
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    actionTimerRef.current = window.setTimeout(() => {
      setPlayerAction('RUN');
    }, 700);
  }, [playerAction]);

  // Main simulation tick loop
  useEffect(() => {
    if (!selectedTrack || isGameOver) return;
    const cfg = TRACK_CONFIGS[selectedTrack];

    const interval = setInterval(() => {
      // 1. Countdown timer
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          handleFinish(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedTrack, isGameOver]);

  // Distance progression and collision engine
  useEffect(() => {
    if (!selectedTrack || isGameOver) return;
    const cfg = TRACK_CONFIGS[selectedTrack];

    const moveInterval = setInterval(() => {
      setDistanceTraveled((prevDist) => {
        const speed = (playerAction === 'RUN' ? 12.0 : 9.5) * cfg.speedMultiplier;
        const deltaDist = speed * 0.05;
        const newDist = prevDist + deltaDist;

        // Check for bonus food packs along track
        if (Math.floor(newDist / 25) > Math.floor(prevDist / 25)) {
          statsRef.current.foodPacks += 1;
          setFoodPacksCollected(statsRef.current.foodPacks);
          soundManager.playCoinSound();
          triggerFeedback('+1 Extra Canteen Meat Pack!', 'text-amber-300 font-black');
        }

        // Collision Check with obstacles within current distance window (dist +/- 1.8m)
        for (const obs of obstaclesRef.current) {
          if (!obs.cleared && !obs.hit) {
            const distDiff = Math.abs(obs.distanceMeters - newDist);
            if (distDiff <= 1.8) {
              const sameLane = obs.lane === lane;
              if (sameLane) {
                // If obstacle requires Jump and player jumped -> Cleared!
                if (obs.requires === 'JUMP' && playerAction === 'JUMP') {
                  obs.cleared = true;
                  statsRef.current.cleared += 1;
                  setObstaclesCleared(statsRef.current.cleared);
                  triggerFeedback('CLEARED BENCH! Sharp jump!', 'text-emerald-400 font-bold');
                  soundManager.playCoinSound();
                } else if (obs.requires === 'SLIDE' && playerAction === 'SLIDE') {
                  obs.cleared = true;
                  statsRef.current.cleared += 1;
                  setObstaclesCleared(statsRef.current.cleared);
                  triggerFeedback('SLID UNDER BARRICADE! Smooth slide!', 'text-cyan-400 font-bold');
                  soundManager.playCoinSound();
                } else {
                  // Collision Hit
                  obs.hit = true;
                  statsRef.current.puddles += 1;
                  setPuddlesHit(statsRef.current.puddles);
                  soundManager.playPenaltyBuzz();
                  triggerFeedback(
                    `HIT ${obs.type.replace('_', ' ')}! ${obs.requires} to clear!`,
                    'text-rose-400 font-bold'
                  );
                  statsRef.current.stamina = Math.max(10, statsRef.current.stamina - 12);
                  setStamina(statsRef.current.stamina);
                }
              } else {
                // Dodged successfully by lane offset
                obs.cleared = true;
                statsRef.current.cleared += 1;
                setObstaclesCleared(statsRef.current.cleared);
              }
            }
          }
        }

        // Check Finish Line
        if (newDist >= cfg.totalDistanceMeters) {
          clearInterval(moveInterval);
          handleFinish(true);
          return cfg.totalDistanceMeters;
        }

        return newDist;
      });
    }, 50);

    return () => clearInterval(moveInterval);
  }, [selectedTrack, isGameOver, lane, playerAction]);

  // Bind keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTrack || isGameOver) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        shiftLane('LEFT');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        shiftLane('RIGHT');
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        triggerJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyC') {
        triggerSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrack, isGameOver, shiftLane, triggerJump, triggerSlide]);

  const handleFinish = async (reachedGoal: boolean) => {
    gameRunningRef.current = false;
    setIsGameOver(true);
    setReachedFinishLine(reachedGoal);
    setSubmitting(true);

    const timeTaken = Math.max(3, (Date.now() - startTimeRef.current) / 1000);
    soundManager.playBugleCall();

    const { cleared, puddles, stamina: currentStamina, foodPacks } = statsRef.current;

    try {
      const res = await api.submitCanteenRush(
        timeTaken,
        cleared,
        puddles,
        currentStamina
      );
      const earned = res.earnedPoints || (reachedGoal ? 45 + foodPacks * 10 : 15);
      setPointsEarned(earned);
      onFinish(earned);
    } catch {
      const fallbackPts = reachedGoal ? 45 + foodPacks * 10 : 15;
      setPointsEarned(fallbackPts);
      onFinish(fallbackPts);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-amber-500/40 bg-slate-900/95 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Canteen Food Rush &bull; Mess Hall Obstacle Run
              </h2>
              <p className="text-[11px] text-slate-400">
                Jump benches, slide under ropes, and dodge laterite mud puddles!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors"
          >
            ✕ Exit
          </button>
        </div>

        {/* PHASE 1: Track Selection */}
        {!selectedTrack ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Select Canteen Obstacle Course</h3>
              <p className="text-xs text-slate-400">
                The food sergeant announced daily government rations! Pick your route to the mess hall:
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(TRACK_CONFIGS) as TrackConfig[]).map((tId) => {
                const track = TRACK_CONFIGS[tId];
                return (
                  <button
                    key={tId}
                    onClick={() => handleStartTrack(tId)}
                    className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-850/80 p-4 text-left hover:border-amber-500 hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-lg group"
                  >
                    <div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-2 ${track.badge}`}>
                        {track.totalDistanceMeters}m Course
                      </span>
                      <h4 className="text-sm font-black text-white group-hover:text-amber-300">
                        {track.name}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                        {track.tagline}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      <span>{track.timeLimitSec}s Countdown</span>
                      <span className="font-semibold text-amber-400">&rarr; Rush!</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Controls Guide */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 mt-4">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Agility Controls & Obstacle Responses:
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="font-mono font-bold text-amber-300 text-[11px]">LEFT / RIGHT (A/D)</div>
                  <div className="text-[10px] text-slate-400">Dodge Barrels & Mud</div>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="font-mono font-bold text-emerald-300 text-[11px]">SPACE / UP (W)</div>
                  <div className="text-[10px] text-slate-400">Jump Dining Benches</div>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="font-mono font-bold text-cyan-300 text-[11px]">DOWN / S / C</div>
                  <div className="text-[10px] text-slate-400">Slide Under Ropes</div>
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                  <div className="font-mono font-bold text-rose-300 text-[11px]">TIME ATTACK</div>
                  <div className="text-[10px] text-slate-400">Lockout Countdown</div>
                </div>
              </div>
            </div>
          </div>
        ) : !isGameOver ? (
          /* PHASE 2: Live Obstacle Run */
          <div className="space-y-4">
            {/* Top Stat Dashboard */}
            <div className="flex items-center justify-between text-xs bg-slate-950/60 rounded-xl px-4 py-2 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Countdown:</span>
                <span className="font-mono font-bold text-rose-400 flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  {timeLeft}s
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ml-2 ${TRACK_CONFIGS[selectedTrack].badge}`}>
                  {TRACK_CONFIGS[selectedTrack].name}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono font-bold">
                <span className="text-amber-300">🍗 {foodPacksCollected} Packs</span>
                <span className="text-emerald-300">✅ {obstaclesCleared} Cleared</span>
                <span className="text-rose-300">⚠️ {puddlesHit} Hits</span>
              </div>
            </div>

            {/* Distance Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Distance to Canteen Gate</span>
                <span className="font-bold text-amber-300">
                  {distanceTraveled.toFixed(0)}m / {TRACK_CONFIGS[selectedTrack].totalDistanceMeters}m
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all duration-100"
                  style={{
                    width: `${Math.min(100, (distanceTraveled / TRACK_CONFIGS[selectedTrack].totalDistanceMeters) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Visual 3-Lane Track Canvas */}
            <div className="relative h-48 w-full rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-amber-950/40 overflow-hidden shadow-inner flex flex-col justify-between p-3">
              {/* Lane Markings */}
              <div className="absolute inset-0 grid grid-cols-3 pointer-events-none">
                <div className="border-r border-dashed border-slate-700/60" />
                <div className="border-r border-dashed border-slate-700/60" />
                <div />
              </div>

              {/* Obstacles along view window (rendered relative to distance) */}
              <div className="relative h-full w-full">
                {obstaclesRef.current.map((obs) => {
                  const relativeDist = obs.distanceMeters - distanceTraveled;
                  // Only render if obstacle is ahead and within 35 meters
                  if (relativeDist < -4 || relativeDist > 35) return null;

                  const bottomPct = Math.max(0, Math.min(85, (1 - relativeDist / 35) * 85));
                  const laneLeftPct = obs.lane === -1 ? '16.6%' : obs.lane === 0 ? '50%' : '83.3%';

                  return (
                    <div
                      key={obs.id}
                      className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-75"
                      style={{
                        left: laneLeftPct,
                        bottom: `${bottomPct}%`,
                        opacity: obs.hit ? 0.35 : 1.0,
                        transform: `translate(-50%, 0) scale(${0.7 + (bottomPct / 100) * 0.6})`
                      }}
                    >
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded shadow bg-slate-950 border border-amber-500/60 text-amber-300 mb-0.5">
                        {obs.requires === 'JUMP' ? '⬆️ JUMP BENCH' : obs.requires === 'SLIDE' ? '⬇️ SLIDE ROPE' : '↔️ DODGE MUD'}
                      </span>
                      <div className="text-xl">
                        {obs.type === 'BENCH' ? '🪵' : obs.type === 'SOLDIER_ROPE' ? '🚧' : obs.type === 'MUD_PUDDLE' ? '🌊' : '🛢️'}
                      </div>
                    </div>
                  );
                })}

                {/* Player Avatar in Current Lane */}
                <div
                  className="absolute bottom-2 -translate-x-1/2 flex flex-col items-center transition-all duration-150 z-20"
                  style={{
                    left: lane === -1 ? '16.6%' : lane === 0 ? '50%' : '83.3%',
                    transform: `translate(-50%, ${playerAction === 'JUMP' ? '-45px' : playerAction === 'SLIDE' ? '12px' : '0px'})`
                  }}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shadow ${
                    playerAction === 'JUMP'
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400'
                      : playerAction === 'SLIDE'
                      ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400'
                      : 'bg-amber-500/30 text-amber-300 border-amber-400'
                  }`}>
                    {playerAction === 'JUMP' ? 'JUMPING!' : playerAction === 'SLIDE' ? 'SLIDING!' : 'RUNNING'}
                  </span>
                  <div className="text-3xl mt-0.5 animate-bounce">
                    🏃
                  </div>
                </div>
              </div>

              {/* Real-time Feedback Banner */}
              <div className="h-6 flex items-center justify-center text-center z-30">
                {feedback && <span className={`text-xs ${feedback.color}`}>{feedback.text}</span>}
              </div>
            </div>

            {/* On-Screen Mobile Action Controls */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => shiftLane('LEFT')}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-600 text-slate-100 flex flex-col items-center justify-center font-bold text-xs transition-all active:scale-95 shadow"
              >
                <ArrowLeft className="h-4 w-4 text-amber-400 mb-0.5" />
                <span>Lane Left</span>
              </button>
              <button
                onClick={triggerJump}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white flex flex-col items-center justify-center font-black text-xs transition-all active:scale-95 shadow"
              >
                <ArrowUp className="h-4 w-4 mb-0.5" />
                <span>JUMP</span>
              </button>
              <button
                onClick={triggerSlide}
                className="py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-400 text-white flex flex-col items-center justify-center font-black text-xs transition-all active:scale-95 shadow"
              >
                <ArrowDown className="h-4 w-4 mb-0.5" />
                <span>SLIDE</span>
              </button>
              <button
                onClick={() => shiftLane('RIGHT')}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-600 text-slate-100 flex flex-col items-center justify-center font-bold text-xs transition-all active:scale-95 shadow"
              >
                <ArrowRight className="h-4 w-4 text-amber-400 mb-0.5" />
                <span>Lane Right</span>
              </button>
            </div>
          </div>
        ) : (
          /* PHASE 3: Results Report */
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Trophy className="h-9 w-9" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                {reachedFinishLine ? 'Canteen Goal Reached!' : 'Canteen Gate Locked!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {reachedFinishLine
                  ? 'You sprinted through the obstacle course and secured piping hot mess rations!'
                  : 'Soldiers blew the lockout whistle, but you still salvaged emergency meal packs!'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-slate-400">Obstacles Cleared</span>
                <div className="text-lg font-bold text-emerald-400 mt-1">{obstaclesCleared}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-slate-400">Puddles / Hits</span>
                <div className="text-lg font-bold text-rose-400 mt-1">{puddlesHit}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-slate-400">Food Packs</span>
                <div className="text-lg font-bold text-amber-300 mt-1">+{foodPacksCollected} Packs</div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 shadow-xl">
              <span className="text-xs text-amber-400 font-semibold">Authoritative Corper Points Awarded:</span>
              <div className="text-3xl font-black text-amber-300 mt-1">
                +{pointsEarned} Corper Points (CP)
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedTrack(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-750 transition-colors"
              >
                Change Course / Retry
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-xs font-black text-white hover:brightness-110 transition-all shadow-lg shadow-amber-950/40"
              >
                Return to Camp Ground
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
