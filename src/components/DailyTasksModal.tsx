import React, { useEffect, useState } from 'react';
import {
  api,
  type DailyCampTask,
  type DailyDutyType,
  type DailyTasksSummary,
} from '../api/client';
import { soundManager, type CampTimeOfDay } from '../audio/AudioSynthesizer';
import {
  Sunrise,
  Sunset,
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  BellRing,
  Play,
  X,
} from 'lucide-react';

interface DailyTasksModalProps {
  timeOfDay: CampTimeOfDay;
  onClose: () => void;
  onStartDutyDrill: (dutyType: DailyDutyType) => void;
  onNavigateToParadeGround: () => void;
  onSummaryUpdated?: (summary: DailyTasksSummary, bonusCpCredited?: number) => void;
}

export const DailyTasksModal: React.FC<DailyTasksModalProps> = ({
  timeOfDay,
  onClose,
  onStartDutyDrill,
  onNavigateToParadeGround,
  onSummaryUpdated,
}) => {
  const [summary, setSummary] = useState<DailyTasksSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [triggeringAlert, setTriggeringAlert] = useState(false);

  const loadTasks = async () => {
    try {
      const data = await api.getDailyTasks(timeOfDay);
      setSummary(data);
      if (onSummaryUpdated) {
        onSummaryUpdated(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load daily camp duties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [timeOfDay]);

  const handleTestShiftBugle = async () => {
    setTriggeringAlert(true);
    setAlertFeedback(null);
    try {
      const res = await api.triggerDailyTaskAlert(timeOfDay, true);
      soundManager.playBugleCall();
      setSummary(res.summary);
      if (onSummaryUpdated) {
        onSummaryUpdated(res.summary);
      }
      setAlertFeedback(
        res.notification?.message ||
          `Camp bugle sounded for ${timeOfDay === 'MORNING' ? 'Morning Drill' : 'Evening Parade'}!`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not trigger bugle alert.');
    } finally {
      setTriggeringAlert(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative flex flex-col w-full max-w-xl max-h-[88vh] rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/35">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Daily Parade Duties</h2>
              <p className="text-xs text-slate-400">
                Complete Morning Drill &amp; Evening Parade to earn daily bonus Corper Points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close Daily Parade Duties"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Strip */}
        {summary && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-xs">
            <span className="text-slate-300 font-semibold">
              Daily Progress:{' '}
              <span className="font-mono font-bold text-emerald-400">
                {summary.completedCount} / {summary.totalCount} Completed
              </span>
            </span>
            <span className="font-mono text-amber-300 font-bold">
              Earned Today: +{summary.totalBonusCpEarned} CP
            </span>
          </div>
        )}

        {alertFeedback && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/50 p-2.5 text-xs text-amber-200">
            <BellRing className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{alertFeedback}</span>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-rose-500/40 bg-rose-950/50 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading daily schedule...</div>
          ) : (
            (summary?.tasks || []).map((task: DailyCampTask) => {
              const isMorning = task.taskType === 'MORNING_DRILL';
              const isCompleted = task.status === 'COMPLETED';
              return (
                <div
                  key={task.taskType}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    isCompleted
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : task.isActiveWindow
                      ? 'border-amber-500/50 bg-slate-950/70 shadow-lg shadow-amber-950/20'
                      : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          isMorning
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                        }`}
                      >
                        {isMorning ? <Sunrise className="h-4 w-4" /> : <Sunset className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{task.title}</h3>
                          {task.isActiveWindow && !isCompleted && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              On Shift
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isCompleted ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      {task.scheduleWindow}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      {task.locationLabel}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                      <Award className="h-3.5 w-3.5" />+{task.rewardCp} CP (+{task.xpAwarded} XP)
                    </span>
                  </div>

                  {isCompleted ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/35 px-3 py-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        Completed today &bull; +{task.rewardCp} CP Bonus Credited
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onStartDutyDrill(task.taskType)}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-xs font-black text-white shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition-all"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start {task.title} Drill</span>
                      </button>
                      <button
                        type="button"
                        onClick={onNavigateToParadeGround}
                        className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        Point Waypoint
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shift Alert Button */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-4 py-3 bg-slate-950/60">
          <span className="text-[11px] text-slate-400">
            Requires &ge;60% drill accuracy to unlock daily bonus CP.
          </span>
          <button
            type="button"
            onClick={handleTestShiftBugle}
            disabled={triggeringAlert}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition-colors disabled:opacity-50"
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>{triggeringAlert ? 'Calling...' : 'Sound Bugle Alert'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
