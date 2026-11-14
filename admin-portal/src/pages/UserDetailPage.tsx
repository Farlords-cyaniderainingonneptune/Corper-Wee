import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, RotateCcw, Trash2, Shield } from 'lucide-react';
import { adminApi, type PlayerDetailResponse, type PlatoonItem } from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentAdmin } = useAuth();

  const [detail, setDetail] = useState<PlayerDetailResponse | null>(null);
  const [platoons, setPlatoons] = useState<PlatoonItem[]>([]);
  const [selectedPlatoonId, setSelectedPlatoonId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'activity' | 'points' | 'wallet' | 'audit'>('activity');

  const [modalAction, setModalAction] = useState<'SUSPEND' | 'REACTIVATE' | 'DELETE' | 'REASSIGN_PLATOON' | 'ROLE' | null>(null);
  const [desiredRole, setDesiredRole] = useState<'PLAYER' | 'ADMIN'>('PLAYER');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [userRes, platoonRes] = await Promise.all([
        adminApi.getUserDetails(id),
        adminApi.listPlatoons(),
      ]);
      setDetail(userRes);
      setPlatoons(platoonRes);
      if (userRes.profile?.platoonId) {
        setSelectedPlatoonId(userRes.profile.platoonId);
      }
      setDesiredRole(userRes.user.role === 'ADMIN' ? 'PLAYER' : 'ADMIN');
    } catch (err: any) {
      setError(err?.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleConfirm = async (reason: string) => {
    if (!detail || !modalAction) return;
    setActionLoading(true);
    setError('');
    setFeedback('');
    try {
      if (modalAction === 'SUSPEND') {
        await adminApi.setUserStatus(detail.user.id, 'SUSPENDED', reason);
        setFeedback('User suspended and active sessions invalidated.');
      } else if (modalAction === 'REACTIVATE') {
        await adminApi.setUserStatus(detail.user.id, 'ACTIVE', reason);
        setFeedback('User account reactivated.');
      } else if (modalAction === 'DELETE') {
        const res = await adminApi.deleteUserWithRetention(detail.user.id, reason);
        setFeedback(res.message);
      } else if (modalAction === 'REASSIGN_PLATOON') {
        await adminApi.reassignPlayerPlatoon(detail.user.id, selectedPlatoonId);
        setFeedback(`User reassigned to Platoon #${selectedPlatoonId}.`);
      } else if (modalAction === 'ROLE') {
        await adminApi.setUserRole(detail.user.id, desiredRole);
        setFeedback(`User role updated to ${desiredRole}.`);
      }
      setModalAction(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Action failed.');
      setModalAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !detail) {
    return <div className="p-8 text-xs text-slate-500">Loading user record...</div>;
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to User Directory</span>
        </Link>
        <div className="bg-white border border-rose-200 rounded-lg p-6 text-xs text-rose-700">{error}</div>
      </div>
    );
  }

  if (!detail) return null;

  const { user, profile, character, wallet, water, gameplayStats, activitySessions, pointTransactions, walletTransactions, auditTrail } = detail;
  const isProtectedOrSelf = user.isProtected || user.role === 'SUPERADMIN' || user.id === currentAdmin?.id;
  const isDeleted = user.status === 'DELETED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/users" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to User Management</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{user.displayName}</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {user.status}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {user.role}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            {user.email} · {user.stateCode || 'No State Code'} · ID {user.id}
          </p>
        </div>

        {/* Action Buttons */}
        {!isProtectedOrSelf && !isDeleted && (
          <div className="flex flex-wrap items-center gap-2">
            {currentAdmin?.role === 'SUPERADMIN' && (
              <button
                type="button"
                onClick={() => setModalAction('ROLE')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{user.role === 'ADMIN' ? 'Demote to Player' : 'Promote to Admin'}</span>
              </button>
            )}

            {user.status === 'ACTIVE' ? (
              <button
                type="button"
                onClick={() => setModalAction('SUSPEND')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Suspend User</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalAction('REACTIVATE')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reactivate User</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalAction('DELETE')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-700 hover:bg-rose-800 text-xs font-semibold text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        )}
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

      {isDeleted && (
        <div className="rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-xs text-slate-700">
          <strong>Retention Policy Notice:</strong> Account PII was anonymized on{' '}
          <span className="font-mono">{user.deletedAt ? new Date(user.deletedAt).toLocaleString() : '—'}</span>.
          Financial and gameplay audit ledgers are retained until{' '}
          <span className="font-mono">{user.retentionUntil ? new Date(user.retentionUntil).toLocaleDateString() : '—'}</span>.
        </div>
      )}

      {/* Balances & Gameplay Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Corper Points Balance</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {wallet.corperPoints.toLocaleString()} CP
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Earned in sessions: <span className="font-mono">{gameplayStats.totalPointsEarned}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Virtual Naira Wallet</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            ₦{wallet.virtualNaira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            Water Meter: {water.currentLevel.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Gameplay Sessions</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {gameplayStats.totalSessions}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            Parade {gameplayStats.paradeCount} · Canteen {gameplayStats.canteenCount} · Stealth {gameplayStats.stealthCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Performance & Charisma</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {gameplayStats.avgAccuracy}% acc
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            Charisma {profile?.charismaScore ?? 0} · High Score {gameplayStats.highestScore}
          </div>
        </div>
      </div>

      {/* Profile, Platoon & Character Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Profile & Account</h2>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">Camp Nickname</dt>
              <dd className="font-medium text-slate-900">{profile?.campNickname || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Parade Rank</dt>
              <dd className="font-medium text-slate-900">{profile?.paradeRank || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Level / XP</dt>
              <dd className="font-mono text-slate-900">
                Lvl {profile?.level ?? 1} · {profile?.experiencePoints ?? 0} XP
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Reputation</dt>
              <dd className="font-mono text-slate-900">{profile?.reputationScore ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Created At</dt>
              <dd className="font-mono text-slate-700">{new Date(user.createdAt || '').toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Last Login</dt>
              <dd className="font-mono text-slate-700">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">3D Avatar Configuration</h2>
          {character ? (
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Gender</dt>
                <dd className="font-medium text-slate-900">{character.gender}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Uniform</dt>
                <dd className="font-mono text-slate-900">{character.uniformType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Hairstyle</dt>
                <dd className="font-mono text-slate-900">{character.hairstyle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Footwear</dt>
                <dd className="font-mono text-slate-900">{character.footwear}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Accessory</dt>
                <dd className="font-mono text-slate-900">{character.accessory || 'None'}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">Skin Tone</dt>
                <dd className="flex items-center gap-1.5 font-mono text-slate-900">
                  <span className="h-3 w-3 rounded border border-slate-300" style={{ backgroundColor: character.skinToneHex }} />
                  <span>{character.skinToneHex}</span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-slate-500">No avatar created yet.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Platoon Assignment</h2>
          <p className="text-xs text-slate-600">
            Current Platoon:{' '}
            <strong className="text-slate-900">{profile?.platoon ? profile.platoon.name : 'Unassigned'}</strong>
          </p>
          {profile && !isDeleted && (
            <div className="space-y-2 pt-1">
              <select
                value={selectedPlatoonId}
                onChange={(e) => setSelectedPlatoonId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
              >
                {platoons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={selectedPlatoonId === profile.platoonId}
                onClick={() => setModalAction('REASSIGN_PLATOON')}
                className="w-full px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white disabled:opacity-40"
              >
                Reassign Platoon
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Tabs: Activity History, Points Ledger, Wallet Ledger, Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex flex-wrap gap-4">
          {[
            { key: 'activity', label: `Activity History (${activitySessions.length})` },
            { key: 'points', label: `CP Ledger (${pointTransactions.length})` },
            { key: 'wallet', label: `Naira Ledger (${walletTransactions.length})` },
            { key: 'audit', label: `Audit Trail (${auditTrail.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-700 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'activity' && (
            activitySessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No gameplay activity recorded for this user.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Completed At</th>
                    <th className="py-2.5 px-4">Activity</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                    <th className="py-2.5 px-4 text-right">Accuracy</th>
                    <th className="py-2.5 px-4 text-right">Duration</th>
                    <th className="py-2.5 px-4 text-right">CP Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activitySessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(s.completedAt).toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{s.activitySlug}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.score}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.accuracyPercentage}%</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.durationSeconds}s</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {s.pointsAwarded >= 0 ? `+${s.pointsAwarded}` : s.pointsAwarded}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'points' && (
            pointTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No Corper Point transactions recorded.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pointTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-800">{tx.activityType}</td>
                      <td className="py-2.5 px-4 text-slate-700">{tx.description}</td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">{tx.balanceAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'wallet' && (
            walletTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No Virtual Naira wallet transactions recorded.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount (₦)</th>
                    <th className="py-2.5 px-4 text-right">Balance After (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {walletTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-800">{tx.transactionType}</td>
                      <td className="py-2.5 px-4 text-slate-700">{tx.description}</td>
                      <td className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.amount >= 0 ? `+₦${tx.amount.toFixed(2)}` : `-₦${Math.abs(tx.amount).toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">₦{tx.balanceAfter.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'audit' && (
            auditTrail.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No administrative audit entries involving this user.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Actor ID</th>
                    <th className="py-2.5 px-4">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditTrail.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{log.actorUserId}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{JSON.stringify(log.metadata || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        open={modalAction !== null}
        title={
          modalAction === 'SUSPEND'
            ? `Suspend ${user.displayName}?`
            : modalAction === 'REACTIVATE'
            ? `Reactivate ${user.displayName}?`
            : modalAction === 'DELETE'
            ? `Delete Account Under Retention Policy?`
            : modalAction === 'REASSIGN_PLATOON'
            ? `Reassign Platoon?`
            : `Change User Role to ${desiredRole}?`
        }
        description={
          modalAction === 'SUSPEND'
            ? `Suspending ${user.email} immediately revokes refresh tokens and prevents gameplay sign-in.`
            : modalAction === 'REACTIVATE'
            ? `Reactivating ${user.email} restores camp sign-in access.`
            : modalAction === 'DELETE'
            ? `Retention deletion permanently anonymizes ${user.email}'s personal identifiers (email, state code, display name) while keeping immutable financial and activity logs for 90 days.`
            : modalAction === 'REASSIGN_PLATOON'
            ? `Move ${user.displayName} to Platoon #${selectedPlatoonId}? Platoon member counts will update immediately.`
            : `Update ${user.email}'s administrative privilege level to ${desiredRole}?`
        }
        confirmLabel={
          modalAction === 'SUSPEND'
            ? 'Suspend User'
            : modalAction === 'REACTIVATE'
            ? 'Reactivate User'
            : modalAction === 'DELETE'
            ? 'Execute Retention Deletion'
            : 'Confirm Change'
        }
        tone={modalAction === 'DELETE' ? 'danger' : modalAction === 'SUSPEND' ? 'warning' : 'primary'}
        requireReason={modalAction === 'SUSPEND' || modalAction === 'REACTIVATE' || modalAction === 'DELETE'}
        confirmKeyword={modalAction === 'DELETE' ? 'DELETE' : undefined}
        loading={actionLoading}
        onCancel={() => setModalAction(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
