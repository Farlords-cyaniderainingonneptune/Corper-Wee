import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Coins,
  Trophy,
  ShieldAlert,
  ShoppingBag,
  MapPin,
  CalendarDays,
  Flag,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { adminApi, type AuditLogEntry, type GameConfigData } from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';

type ConfigTab = 'rates' | 'rewards' | 'penalties';

const DEFAULT_CONFIG: GameConfigData = {
  conversionRate: { cp: 10, naira: 100 },
  paradeRewards: {
    baseCpPerCommand: 15,
    tier1AccuracyMin: 90,
    tier1Multiplier: 1.5,
    tier2AccuracyMin: 70,
    tier2Multiplier: 1.2,
    charismaGainThreshold: 85,
  },
  canteenRewards: {
    cpPerObstacle: 10,
    puddlePenaltyCp: 5,
    speedBonusCutoffSec: 60,
    speedBonusMultiplier: 2,
    minRewardCp: 10,
    waterDrainAmount: 15,
  },
  stealthConfig: {
    cpPerSecondSurvived: 2,
    maxSurvivalCp: 100,
    caughtPenaltyCp: 15,
  },
  hydrationDrain: {
    idlePerSec: 0.08,
    runPerSec: 0.25,
    criticalThreshold: 25,
  },
  updatedAt: '',
};

export const EconomyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('rates');
  const [savedConfig, setSavedConfig] = useState<GameConfigData>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<GameConfigData>(DEFAULT_CONFIG);
  const [configLogs, setConfigLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const [cfg, logs] = await Promise.all([
        adminApi.getGameConfig(),
        adminApi.getAuditLogs(60),
      ]);
      setSavedConfig(cfg);
      setDraft(cfg);
      setConfigLogs(
        logs.filter((l) => l.action === 'GAME_CONFIG_UPDATED' || l.action === 'UPDATE_CONVERSION_RATE')
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to load live game configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const handleConfirmSave = async () => {
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      const updated = await adminApi.updateGameConfig({
        conversionRate: draft.conversionRate,
        paradeRewards: draft.paradeRewards,
        canteenRewards: draft.canteenRewards,
        stealthConfig: draft.stealthConfig,
        hydrationDrain: draft.hydrationDrain,
      });
      setSavedConfig(updated);
      setDraft(updated);
      setFeedback('Live game configuration updated. Active WebGL & mobile clients sync immediately on next config fetch.');
      setConfirmOpen(false);
      await loadConfig();
    } catch (err: any) {
      setError(err?.message || 'Failed to update game configuration.');
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDraft = () => {
    setDraft(savedConfig);
    setFeedback('Unsaved configuration changes reverted to currently active server values.');
    setError('');
  };

  const nairaPerCp = draft.conversionRate.cp > 0 ? draft.conversionRate.naira / draft.conversionRate.cp : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Live Game Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure exchange rates, mini-game rewards, penalties, and hydration dynamics without a client release.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDraft}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Revert Draft</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={loading || saving}
            className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            Publish Live Config
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Quick Navigation to Companion Live-Config Consoles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/market"
          className="bg-white border border-slate-200 hover:border-emerald-600 rounded-lg p-3.5 flex items-center justify-between transition-colors"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-700" />
              <span>Products & Prices</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Mami Market stock & ₦ pricing</div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>

        <Link
          to="/locations"
          className="bg-white border border-slate-200 hover:border-emerald-600 rounded-lg p-3.5 flex items-center justify-between transition-colors"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-700" />
              <span>Locations</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">3D coordinates & trigger zones</div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>

        <Link
          to="/events"
          className="bg-white border border-slate-200 hover:border-emerald-600 rounded-lg p-3.5 flex items-center justify-between transition-colors"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
              <span>Camp Events</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Schedule & bonus payouts</div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>

        <Link
          to="/platoons"
          className="bg-white border border-slate-200 hover:border-emerald-600 rounded-lg p-3.5 flex items-center justify-between transition-colors"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-emerald-700" />
              <span>Platoons</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Squad mottos, colors & rosters</div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      </div>

      {/* Segmented Config Section Selector */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('rates')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rates' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Coins className="h-3.5 w-3.5" />
          <span>Exchange Rates</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rewards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          <span>Reward Configuration</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('penalties')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'penalties' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Penalties & Hydration</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-xs text-slate-500">
          Loading authoritative camp configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {activeTab === 'rates' && (
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">CP-to-Naira Currency Exchange Rate</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Active server rate:{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {savedConfig.conversionRate.cp} CP = ₦{savedConfig.conversionRate.naira}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corper Points Unit (CP)</label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={draft.conversionRate.cp}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          conversionRate: { ...prev.conversionRate, cp: Math.max(1, Number(e.target.value)) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Equivalent Virtual Naira (₦)</label>
                    <input
                      type="number"
                      min={1}
                      max={10000000}
                      value={draft.conversionRate.naira}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          conversionRate: { ...prev.conversionRate, naira: Math.max(1, Number(e.target.value)) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-md bg-slate-50 border border-slate-200 p-3 font-mono tabular-nums text-xs text-slate-700">
                  Conversion Preview: 100 CP = ₦
                  {(nairaPerCp * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} · 1 CP = ₦
                  {nairaPerCp.toFixed(2)}
                </div>
              </section>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-5">
                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Parade Ground Drill Rewards</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Controls CP earned per accurate drill command and accuracy tier multipliers.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Base CP / Command</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={draft.paradeRewards.baseCpPerCommand}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            paradeRewards: { ...prev.paradeRewards, baseCpPerCommand: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tier 1 Accuracy Min (%)</label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={draft.paradeRewards.tier1AccuracyMin}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            paradeRewards: { ...prev.paradeRewards, tier1AccuracyMin: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tier 1 Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        min={1}
                        max={5}
                        value={draft.paradeRewards.tier1Multiplier}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            paradeRewards: { ...prev.paradeRewards, tier1Multiplier: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tier 2 Accuracy Min (%)</label>
                      <input
                        type="number"
                        min={30}
                        max={99}
                        value={draft.paradeRewards.tier2AccuracyMin}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            paradeRewards: { ...prev.paradeRewards, tier2AccuracyMin: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tier 2 Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        min={1}
                        max={5}
                        value={draft.paradeRewards.tier2Multiplier}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            paradeRewards: { ...prev.paradeRewards, tier2Multiplier: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Charisma Gain Min (%)</label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={draft.paradeRewards.charismaGainThreshold}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            paradeRewards: { ...prev.paradeRewards, charismaGainThreshold: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Canteen Rush & Stealth Survival Rewards</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Controls obstacle course payouts, speed bonuses, and soldier evasion points.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CP / Obstacle Cleared</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={draft.canteenRewards.cpPerObstacle}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            canteenRewards: { ...prev.canteenRewards, cpPerObstacle: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Speed Cutoff (sec)</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={draft.canteenRewards.speedBonusCutoffSec}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            canteenRewards: { ...prev.canteenRewards, speedBonusCutoffSec: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Speed Bonus CP / Sec</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={draft.canteenRewards.speedBonusMultiplier}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            canteenRewards: { ...prev.canteenRewards, speedBonusMultiplier: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Minimum Run Reward (CP)</label>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={draft.canteenRewards.minRewardCp}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            canteenRewards: { ...prev.canteenRewards, minRewardCp: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Stealth CP / Sec Survived</label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={50}
                        value={draft.stealthConfig.cpPerSecondSurvived}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            stealthConfig: { ...prev.stealthConfig, cpPerSecondSurvived: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Stealth Max Survival CP</label>
                      <input
                        type="number"
                        min={10}
                        max={2000}
                        value={draft.stealthConfig.maxSurvivalCp}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            stealthConfig: { ...prev.stealthConfig, maxSurvivalCp: Number(e.target.value) },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'penalties' && (
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Penalty & Camp Hydration Rules</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Server-enforced point deductions and water meter depletion speed across Iseyin Camp.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mud Puddle Penalty (CP)</label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={draft.canteenRewards.puddlePenaltyCp}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          canteenRewards: { ...prev.canteenRewards, puddlePenaltyCp: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Soldier Capture Penalty (CP)</label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={draft.stealthConfig.caughtPenaltyCp}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          stealthConfig: { ...prev.stealthConfig, caughtPenaltyCp: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Canteen Water Drain (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={draft.canteenRewards.waterDrainAmount}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          canteenRewards: { ...prev.canteenRewards, waterDrainAmount: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Idle Water Drain (%/sec)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={5}
                      value={draft.hydrationDrain.idlePerSec}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          hydrationDrain: { ...prev.hydrationDrain, idlePerSec: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sprint Water Drain (%/sec)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      value={draft.hydrationDrain.runPerSec}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          hydrationDrain: { ...prev.hydrationDrain, runPerSec: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dehydration Threshold (%)</label>
                    <input
                      type="number"
                      min={5}
                      max={80}
                      value={draft.hydrationDrain.criticalThreshold}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          hydrationDrain: { ...prev.hydrationDrain, criticalThreshold: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono tabular-nums"
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Audited Configuration Change Log */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">Configuration Audit Log</h2>
              <p className="text-xs text-slate-500">Server-recorded modifications to live game balance</p>
            </div>
            {configLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No configuration updates recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Updated Keys</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {configLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 truncate max-w-[140px]">
                          {l.actorEmail || l.actorUserId}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-900 truncate max-w-[160px]">
                          {l.targetId || l.action}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Publish Live Game Configuration?"
        description="These exchange rates, activity rewards, penalties, and hydration parameters will immediately apply to all connected WebGL and mobile game clients without an application update."
        confirmLabel="Publish Configuration"
        tone="warning"
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
};
