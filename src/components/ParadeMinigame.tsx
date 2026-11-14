import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api, type DailyDutyType } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { Award, Zap, CheckCircle2, XCircle, Shield, Volume2, Flame, AlertTriangle } from 'lucide-react';

interface ParadeMinigameProps {
  dutyMode?: DailyDutyType | null;
  onClose: () => void;
  onDrillComplete: (pointsAwarded: number, completedDailyTask?: DailyDutyType | null) => void;
}

type DrillDifficulty = 'EASY' | 'NORMAL' | 'HARD';

interface CommandDef {
  id: string;
  label: string;
  hotkey: string;
  audioCall: string;
  targetAction: string;
}

const COMMAND_DEFINITIONS: CommandDef[] = [
  { id: 'attention', label: 'ATTEN-TION!', hotkey: 'A', audioCall: 'ATTEN-TION!', targetAction: 'ATTENTION' },
  { id: 'right_turn', label: 'RIGHT TURN!', hotkey: 'D', audioCall: 'RIGHT... TURN!', targetAction: 'RIGHT_TURN' },
  { id: 'left_turn', label: 'LEFT TURN!', hotkey: 'L', audioCall: 'LEFT... TURN!', targetAction: 'LEFT_TURN' },
  { id: 'about_turn', label: 'ABOUT TURN!', hotkey: 'S', audioCall: 'ABOUT... TURN!', targetAction: 'ABOUT_TURN' },
  { id: 'quick_march', label: 'QUICK MARCH!', hotkey: 'M', audioCall: 'QUICK... MARCH!', targetAction: 'QUICK_MARCH' },
  { id: 'eyes_right', label: 'EYES RIGHT!', hotkey: 'E', audioCall: 'EYES... RIGHT!', targetAction: 'EYES_RIGHT' },
  { id: 'stand_at_ease', label: 'STAND AT EASE!', hotkey: 'X', audioCall: 'STAND AT... EASE!', targetAction: 'STAND_AT_EASE' },
  { id: 'platoon_halt', label: 'PLATOON HALT!', hotkey: 'H', audioCall: 'PLATOON... HALT!', targetAction: 'PLATOON_HALT' }
];

interface DifficultyConfig {
  name: string;
  tagline: string;
  badge: string;
  commandsCount: number;
  beatDurationMs: number;
  hitWindowStart: number; // 0.0 to 1.0
  hitWindowEnd: number;   // 0.0 to 1.0
  multiplier: number;
}

const DIFFICULTY_CONFIGS: Record<DrillDifficulty, DifficultyConfig> = {
  EASY: {
    name: 'Recruit Drill',
    tagline: 'Standard orientation pace. Generous response timing for recruits.',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    commandsCount: 8,
    beatDurationMs: 2200,
    hitWindowStart: 0.65,
    hitWindowEnd: 0.94,
    multiplier: 1.0
  },
  NORMAL: {
    name: 'Sergeant Drill',
    tagline: 'Military precision. Rapid callouts from the Battalion Regimental Sergeant Major.',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    commandsCount: 12,
    beatDurationMs: 1650,
    hitWindowStart: 0.70,
    hitWindowEnd: 0.90,
    multiplier: 1.5
  },
  HARD: {
    name: 'Passing-Out Parade (P.O.P.)',
    tagline: 'Elite Ceremonial Drill. Blistering pace before State Governor and Camp Commandant!',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    commandsCount: 16,
    beatDurationMs: 1250,
    hitWindowStart: 0.74,
    hitWindowEnd: 0.88,
    multiplier: 2.2
  }
};

interface CommandResult {
  command: string;
  responseTimeMs: number;
  isCorrect: boolean;
  accuracyLabel: 'PERFECT' | 'GOOD' | 'LATE' | 'MISSED' | 'WRONG';
}

export const ParadeMinigame: React.FC<ParadeMinigameProps> = ({
  dutyMode = null,
  onClose,
  onDrillComplete,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DrillDifficulty | null>(null);
  const [drillCommands, setDrillCommands] = useState<CommandDef[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliderPos, setSliderPos] = useState(0);
  const [score, setScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; subtext?: string } | null>(null);
  const [resultsLog, setResultsLog] = useState<CommandResult[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [dailyBonusInfo, setDailyBonusInfo] = useState<{ title: string; bonusCp: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const evaluatedRef = useRef<boolean>(false);
  const resultsLogRef = useRef<CommandResult[]>([]);

  // Initialize Drill with selected difficulty
  const startDrillWithDifficulty = (diff: DrillDifficulty) => {
    setSelectedDifficulty(diff);
    const cfg = DIFFICULTY_CONFIGS[diff];
    // Generate randomized sequence of drill commands
    const sequence: CommandDef[] = [];
    for (let i = 0; i < cfg.commandsCount; i++) {
      const randomCmd = COMMAND_DEFINITIONS[Math.floor(Math.random() * COMMAND_DEFINITIONS.length)];
      sequence.push(randomCmd);
    }
    setDrillCommands(sequence);
    setCurrentIndex(0);
    setScore(0);
    setComboStreak(0);
    setMaxCombo(0);
    resultsLogRef.current = [];
    setResultsLog([]);
    setIsFinished(false);

    soundManager.playCommandAlert();
  };

  const advanceCommand = useCallback(() => {
    if (!selectedDifficulty) return;
    const cfg = DIFFICULTY_CONFIGS[selectedDifficulty];
    if (currentIndex + 1 >= cfg.commandsCount) {
      finishDrill();
    } else {
      setCurrentIndex((prev) => prev + 1);
      startTimeRef.current = Date.now();
      evaluatedRef.current = false;
      soundManager.playCommandAlert();
    }
  }, [currentIndex, selectedDifficulty]);

  // Tick loop for rhythm timing
  useEffect(() => {
    if (!selectedDifficulty || isFinished || drillCommands.length === 0) return;

    const cfg = DIFFICULTY_CONFIGS[selectedDifficulty];
    startTimeRef.current = Date.now();
    evaluatedRef.current = false;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1.0, elapsed / cfg.beatDurationMs);
      setSliderPos(progress);

      // Play snare drum on cadence start
      if (progress < 0.04 && !evaluatedRef.current) {
        soundManager.playDrumHit(false);
      }

      // If time ran out without player response
      if (elapsed >= cfg.beatDurationMs) {
        if (!evaluatedRef.current) {
          evaluatedRef.current = true;
          handleCommandMissed();
        }
        advanceCommand();
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [currentIndex, selectedDifficulty, isFinished, drillCommands.length, advanceCommand]);

  const triggerFeedbackToast = (text: string, color: string, subtext?: string) => {
    setFeedback({ text, color, subtext });
    setTimeout(() => setFeedback(null), 900);
  };

  const handleCommandMissed = () => {
    const currentCmd = drillCommands[currentIndex];
    soundManager.playPenaltyBuzz();
    triggerFeedbackToast('MISSED COMMAND!', 'text-rose-400 font-black', '-30 penalty! Platoon broke formation!');
    setScore((prev) => Math.max(0, prev - 30));
    setComboStreak(0);

    const entry: CommandResult = {
      command: currentCmd?.label || 'Command',
      responseTimeMs: 9999,
      isCorrect: false,
      accuracyLabel: 'MISSED'
    };
    resultsLogRef.current = [...resultsLogRef.current, entry];
    setResultsLog(resultsLogRef.current);
  };

  const handleActionInput = (actionKey: string) => {
    if (evaluatedRef.current || isFinished || !selectedDifficulty) return;
    evaluatedRef.current = true;

    const cfg = DIFFICULTY_CONFIGS[selectedDifficulty];
    const currentCmd = drillCommands[currentIndex];
    const elapsedMs = Date.now() - startTimeRef.current;

    // Check action correctness
    const isMatchingAction = currentCmd && (
      currentCmd.targetAction === actionKey ||
      currentCmd.hotkey.toLowerCase() === actionKey.toLowerCase()
    );

    if (!isMatchingAction) {
      // Wrong command penalty
      soundManager.playPenaltyBuzz();
      triggerFeedbackToast('WRONG COMMAND!', 'text-rose-400 font-black', `Sergeant: "Are you normal?!" Target: ${currentCmd?.label}`);
      setScore((prev) => Math.max(0, prev - 40));
      setComboStreak(0);

      const wrongEntry: CommandResult = {
        command: currentCmd?.label || 'Command',
        responseTimeMs: elapsedMs,
        isCorrect: false,
        accuracyLabel: 'WRONG'
      };
      resultsLogRef.current = [...resultsLogRef.current, wrongEntry];
      setResultsLog(resultsLogRef.current);
      return;
    }

    // Correct action: evaluate timing window
    const inSweetSpot = sliderPos >= cfg.hitWindowStart && sliderPos <= cfg.hitWindowEnd;
    const isLate = sliderPos > cfg.hitWindowEnd;
    const isEarly = sliderPos < cfg.hitWindowStart;

    if (inSweetSpot) {
      // Perfect execution
      soundManager.playDrumHit(true);
      const points = Math.round(100 * cfg.multiplier);
      setScore((prev) => prev + points);
      setComboStreak((prev) => {
        const next = prev + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });
      triggerFeedbackToast('PERFECT TIMING!', 'text-emerald-400 font-black', `+${points} pts • Drill Master!`);

      const perfectEntry: CommandResult = {
        command: currentCmd.label,
        responseTimeMs: elapsedMs,
        isCorrect: true,
        accuracyLabel: 'PERFECT'
      };
      resultsLogRef.current = [...resultsLogRef.current, perfectEntry];
      setResultsLog(resultsLogRef.current);
    } else if (isEarly && sliderPos >= cfg.hitWindowStart - 0.20) {
      // Good execution (early)
      soundManager.playDrumHit(false);
      const points = Math.round(60 * cfg.multiplier);
      setScore((prev) => prev + points);
      setComboStreak((prev) => prev + 1);
      triggerFeedbackToast('GOOD! KEEP IN STEP', 'text-amber-400 font-bold', `+${points} pts`);

      const goodEntry: CommandResult = {
        command: currentCmd.label,
        responseTimeMs: elapsedMs,
        isCorrect: true,
        accuracyLabel: 'GOOD'
      };
      resultsLogRef.current = [...resultsLogRef.current, goodEntry];
      setResultsLog(resultsLogRef.current);
    } else if (isLate) {
      // Late response penalty
      soundManager.playPenaltyBuzz();
      const points = 20;
      setScore((prev) => prev + points);
      setComboStreak(0);
      triggerFeedbackToast('LATE RESPONSE!', 'text-orange-400 font-bold', `+${points} pts • Hesitant corper!`);

      const lateEntry: CommandResult = {
        command: currentCmd.label,
        responseTimeMs: elapsedMs,
        isCorrect: true,
        accuracyLabel: 'LATE'
      };
      resultsLogRef.current = [...resultsLogRef.current, lateEntry];
      setResultsLog(resultsLogRef.current);
    } else {
      // Off beat
      soundManager.playPenaltyBuzz();
      triggerFeedbackToast('OFF-BEAT STEP!', 'text-rose-400 font-bold', 'No timing credit! Watch the drum cadence.');
      setComboStreak(0);

      const missedEntry: CommandResult = {
        command: currentCmd.label,
        responseTimeMs: elapsedMs,
        isCorrect: false,
        accuracyLabel: 'MISSED'
      };
      resultsLogRef.current = [...resultsLogRef.current, missedEntry];
      setResultsLog(resultsLogRef.current);
    }
  };

  // Bind keyboard shortcuts to action keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedDifficulty || isFinished) return;
      const key = e.key.toUpperCase();
      const matchedDef = COMMAND_DEFINITIONS.find((c) => c.hotkey === key);
      if (matchedDef) {
        handleActionInput(matchedDef.targetAction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDifficulty, isFinished, currentIndex, drillCommands]);

  const finishDrill = async () => {
    setIsFinished(true);
    setSubmitting(true);
    try {
      const seqId = dutyMode
        ? `daily_${dutyMode.toLowerCase()}`
        : `parade_${(selectedDifficulty || 'normal').toLowerCase()}`;
      const result = await api.submitParadeDrill(
        resultsLogRef.current,
        selectedDifficulty || 'NORMAL',
        undefined,
        seqId
      );
      const baseEarned = result.pointsEarned || Math.round(score / 5);
      const bonusCp = result.dailyBonusCp || 0;
      const totalEarned = baseEarned + bonusCp;
      setPointsEarned(totalEarned);
      if (bonusCp > 0 && result.completedDailyTitle) {
        setDailyBonusInfo({
          title: result.completedDailyTitle,
          bonusCp,
        });
      }
      soundManager.playDrillSuccess();
      onDrillComplete(totalEarned, result.completedDailyTask || null);
    } catch {
      const earned = Math.max(10, Math.round(score / 5));
      setPointsEarned(earned);
      onDrillComplete(earned, null);
    } finally {
      setSubmitting(false);
    }
  };

  // Performance Rating calculation
  const totalCorrect = resultsLog.filter((r) => r.isCorrect).length;
  const accuracyPct = drillCommands.length > 0 ? (totalCorrect / drillCommands.length) * 100 : 0;
  let performanceRank = 'C';
  let rankBadgeColor = 'text-amber-400 border-amber-400 bg-amber-400/10';

  if (accuracyPct >= 95) {
    performanceRank = 'S';
    rankBadgeColor = 'text-amber-300 border-amber-300 bg-amber-400/20 shadow-[0_0_20px_#f59e0b]';
  } else if (accuracyPct >= 85) {
    performanceRank = 'A';
    rankBadgeColor = 'text-emerald-400 border-emerald-400 bg-emerald-400/10';
  } else if (accuracyPct >= 70) {
    performanceRank = 'B';
    rankBadgeColor = 'text-cyan-400 border-cyan-400 bg-cyan-400/10';
  } else if (accuracyPct >= 50) {
    performanceRank = 'C';
    rankBadgeColor = 'text-orange-400 border-orange-400 bg-orange-400/10';
  } else {
    performanceRank = 'F';
    rankBadgeColor = 'text-rose-400 border-rose-400 bg-rose-400/10';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {dutyMode === 'MORNING_DRILL'
                  ? 'Morning Drill Duty • Parade Ground'
                  : dutyMode === 'EVENING_PARADE'
                  ? 'Evening Parade Muster • Parade Ground'
                  : 'Parade Ground • Military Drill Competition'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Command-based rhythm synchronization &bull; Iseyin NYSC Camp
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

        {/* PHASE 1: Difficulty Selector Modal */}
        {!selectedDifficulty ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Choose Drill Difficulty</h3>
              <p className="text-xs text-slate-400">
                Higher difficulty levels feature tighter timing windows, faster Sergeant cadences, and generous Corper Points multipliers!
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(DIFFICULTY_CONFIGS) as DrillDifficulty[]).map((diff) => {
                const cfg = DIFFICULTY_CONFIGS[diff];
                return (
                  <button
                    key={diff}
                    onClick={() => startDrillWithDifficulty(diff)}
                    className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-850/80 p-4 text-left hover:border-emerald-500 hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-lg group"
                  >
                    <div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-2 ${cfg.badge}`}>
                        {cfg.multiplier}x CP
                      </span>
                      <h4 className="text-sm font-black text-white group-hover:text-emerald-300">
                        {cfg.name}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                        {cfg.tagline}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      <span>{cfg.commandsCount} Commands</span>
                      <span className="font-semibold text-emerald-400">&rarr; Select</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drill Command Controls Guide */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 mt-4">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Military Drill Commands & Keybinds:
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {COMMAND_DEFINITIONS.map((cmd) => (
                  <div key={cmd.id} className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2 py-1.5">
                    <kbd className="h-5 w-5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-mono font-bold text-[10px]">
                      {cmd.hotkey}
                    </kbd>
                    <span className="text-[11px] font-medium text-slate-300 truncate">{cmd.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !isFinished ? (
          /* PHASE 2: Live Rhythm Drill Gameplay */
          <div className="space-y-4">
            {/* Top Score & Streak Bar */}
            <div className="flex items-center justify-between text-xs bg-slate-950/60 rounded-xl px-4 py-2 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Order:</span>
                <span className="font-mono font-bold text-white">
                  {currentIndex + 1} / {drillCommands.length}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ml-2 ${DIFFICULTY_CONFIGS[selectedDifficulty].badge}`}>
                  {DIFFICULTY_CONFIGS[selectedDifficulty].name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="font-mono font-bold">{comboStreak}x Streak</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Award className="h-3.5 w-3.5" />
                  <span className="font-mono font-bold">{score} Pts</span>
                </div>
              </div>
            </div>

            {/* Drill Sergeant Callout Banner */}
            <div className="relative rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-transparent p-5 text-center shadow-xl">
              <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                <Volume2 className="h-4 w-4 animate-bounce" />
                <span>RSM Sergeant Barks:</span>
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-black text-amber-200 tracking-wider">
                &ldquo;{drillCommands[currentIndex]?.audioCall}&rdquo;
              </div>
              <div className="mt-1 text-xs text-amber-300/80 font-semibold">
                Respond with: <span className="font-mono bg-amber-400/20 px-2 py-0.5 rounded text-amber-200 font-black">{drillCommands[currentIndex]?.label} (Key: {drillCommands[currentIndex]?.hotkey})</span>
              </div>
            </div>

            {/* Rhythm Target Sweet-Spot Cadence Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cadence Rhythm</span>
                <span className="text-emerald-400 font-bold">Target Sweet-Spot</span>
              </div>
              <div className="relative h-9 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-700 shadow-inner">
                {/* Hit Zone Target Band */}
                {(() => {
                  const cfg = DIFFICULTY_CONFIGS[selectedDifficulty];
                  const leftPct = cfg.hitWindowStart * 100;
                  const widthPct = (cfg.hitWindowEnd - cfg.hitWindowStart) * 100;
                  return (
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/35 border-x-2 border-emerald-400 flex items-center justify-center text-[11px] font-black text-emerald-200 tracking-wider"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    >
                      STAMP!
                    </div>
                  );
                })()}

                {/* Sweeping Cadence Marker */}
                <div
                  className="absolute top-0 bottom-0 w-3 rounded-full bg-amber-300 shadow-[0_0_16px_#fde047]"
                  style={{ left: `${sliderPos * 100}%` }}
                />
              </div>
            </div>

            {/* Real-time Feedback Toast */}
            <div className="h-8 flex flex-col items-center justify-center text-center">
              {feedback ? (
                <>
                  <div className={`text-sm ${feedback.color}`}>{feedback.text}</div>
                  {feedback.subtext && <div className="text-[11px] text-slate-400">{feedback.subtext}</div>}
                </>
              ) : (
                <div className="text-[11px] text-slate-500">Tap the exact command button when the marker hits the green zone!</div>
              )}
            </div>

            {/* Interactive Drill Command Response Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {COMMAND_DEFINITIONS.map((cmd) => {
                const isTarget = drillCommands[currentIndex]?.targetAction === cmd.targetAction;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleActionInput(cmd.targetAction)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all active:scale-95 shadow-md ${
                      isTarget
                        ? 'border-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/80 ring-2 ring-emerald-500/50'
                        : 'border-slate-800 bg-slate-850 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 mb-1">
                      Key [{cmd.hotkey}]
                    </span>
                    <span className={`text-xs font-black ${isTarget ? 'text-emerald-200' : 'text-slate-300'}`}>
                      {cmd.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* PHASE 3: Drill Evaluation & Ranking Report */
          <div className="space-y-5 py-4 text-center">
            {/* Rank Badge */}
            <div className="flex flex-col items-center justify-center">
              <div className={`flex h-20 w-20 items-center justify-center rounded-3xl border-2 text-4xl font-black ${rankBadgeColor}`}>
                {performanceRank}
              </div>
              <span className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Platoon Drill Rating
              </span>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-400">Accuracy</span>
                <div className="text-xl font-bold text-white">{accuracyPct.toFixed(0)}%</div>
                <span className="text-[10px] text-slate-500">{totalCorrect} / {drillCommands.length} correct</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-400">Max Combo</span>
                <div className="text-xl font-bold text-amber-300">{maxCombo}x</div>
                <span className="text-[10px] text-slate-500">Consecutive hits</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-400">Difficulty</span>
                <div className="text-sm font-bold text-white mt-1">
                  {selectedDifficulty ? DIFFICULTY_CONFIGS[selectedDifficulty].name : 'Normal'}
                </div>
              </div>
            </div>

            {/* Corper Points Reward Awarded */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 shadow-xl">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                <Award className="h-4 w-4" />
                <span>Points Credited to Platoon Leaderboard & Wallet:</span>
              </div>
              <div className="text-3xl font-black text-emerald-300">
                +{pointsEarned} Corper Points (CP)
              </div>
              {dailyBonusInfo && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-200">
                  <span>Daily {dailyBonusInfo.title} Bonus Included (+{dailyBonusInfo.bonusCp} CP)</span>
                </div>
              )}
            </div>

            {/* Dismissal / Retry Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedDifficulty(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-750 transition-colors"
              >
                Change Difficulty / Re-Drill
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-black text-white hover:brightness-110 transition-all shadow-lg shadow-emerald-950/40"
              >
                Fall Out &bull; Return to Camp Ground
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
