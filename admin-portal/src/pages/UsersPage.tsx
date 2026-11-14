import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Ban, RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import { adminApi, type AdminPlayerRow, type PlatoonItem } from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminPlayerRow[]>([]);
  const [platoons, setPlatoons] = useState<PlatoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Search & filters
  const [query, setQuery] = useState('');
  const [platoonFilter, setPlatoonFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Confirmation dialog state
  const [modalAction, setModalAction] = useState<{
    type: 'SUSPEND' | 'REACTIVATE' | 'DELETE';
    target: AdminPlayerRow;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsersAndPlatoons = async () => {
    setLoading(true);
    setError('');
    try {
      const [userRows, platoonRows] = await Promise.all([
        adminApi.listUsers({
          q: query || undefined,
          platoonId: platoonFilter !== 'ALL' ? Number(platoonFilter) : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        adminApi.listPlatoons(),
      ]);
      setUsers(userRows);
      setPlatoons(platoonRows);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsersAndPlatoons();
  }, [platoonFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadUsersAndPlatoons();
  };

  const handleConfirmAction = async (reason: string) => {
    if (!modalAction) return;
    setActionLoading(true);
    setError('');
    setFeedback('');
    try {
      const { type, target } = modalAction;
      if (type === 'SUSPEND') {
        await adminApi.setUserStatus(target.id, 'SUSPENDED', reason);
        setFeedback(`Account ${target.email} has been suspended and active sessions revoked.`);
      } else if (type === 'REACTIVATE') {
        await adminApi.setUserStatus(target.id, 'ACTIVE', reason);
        setFeedback(`Account ${target.email} has been reactivated.`);
      } else if (type === 'DELETE') {
        const res = await adminApi.deleteUserWithRetention(target.id, reason);
        setFeedback(res.message);
      }
      setModalAction(null);
      await loadUsersAndPlatoons();
    } catch (err: any) {
      setError(err?.message || 'Administrative action failed.');
      setModalAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">SUSPENDED</span>;
      case 'DELETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">DELETED</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search corps members, inspect wallets & gameplay statistics, suspend, reactivate, or process retention deletions.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsersAndPlatoons}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, NYSC state code, or user ID..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
          />
        </div>

        <select
          value={platoonFilter}
          onChange={(e) => setPlatoonFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 bg-white focus:border-emerald-700 focus:outline-none"
        >
          <option value="ALL">All Platoons</option>
          {platoons.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 bg-white focus:border-emerald-700 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Deleted (Retention)</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
        >
          Search
        </button>
      </form>

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

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Corps Member Directory</span>
          <span className="font-mono tabular-nums">{users.length} accounts</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading corps members...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No user accounts match your current search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Corper</th>
                  <th className="py-2.5 px-4">State Code & Role</th>
                  <th className="py-2.5 px-4">Platoon</th>
                  <th className="py-2.5 px-4 text-right">CP</th>
                  <th className="py-2.5 px-4 text-right">Virtual ₦</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((u) => {
                  const isSelfOrProtected = u.isProtected || u.role === 'SUPERADMIN' || u.id === currentAdmin?.id;
                  const isDeleted = u.status === 'DELETED';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <Link to={`/users/${u.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                          {u.displayName}
                        </Link>
                        <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800">{u.stateCode}</div>
                        <div className="text-[11px] text-slate-500">{u.role}{u.isProtected ? ' · Protected' : ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {u.platoon ? `Platoon ${u.platoon.number}` : 'Unassigned'}
                        <div className="text-[11px] text-slate-500">Lvl {u.level} · {u.paradeRank}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {u.wallet.corperPoints.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        ₦{u.wallet.virtualNaira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(u.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/users/${u.id}`}
                            title="Inspect User Profile & Ledgers"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </Link>

                          {!isSelfOrProtected && !isDeleted && u.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => setModalAction({ type: 'SUSPEND', target: u })}
                              title="Suspend User"
                              className="p-1.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {!isSelfOrProtected && !isDeleted && u.status === 'SUSPENDED' && (
                            <button
                              type="button"
                              onClick={() => setModalAction({ type: 'REACTIVATE', target: u })}
                              title="Reactivate User"
                              className="p-1.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {!isSelfOrProtected && !isDeleted && (
                            <button
                              type="button"
                              onClick={() => setModalAction({ type: 'DELETE', target: u })}
                              title="Delete Account (Retention Policy)"
                              className="p-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Destructive / Administrative Confirmation Dialog */}
      <ConfirmModal
        open={modalAction !== null}
        title={
          modalAction?.type === 'SUSPEND'
            ? `Suspend ${modalAction.target.displayName}?`
            : modalAction?.type === 'REACTIVATE'
            ? `Reactivate ${modalAction.target.displayName}?`
            : `Delete Account Under Retention Policy?`
        }
        description={
          modalAction?.type === 'SUSPEND'
            ? `Suspending ${modalAction.target.email} (${modalAction.target.stateCode}) immediately revokes all active refresh sessions and blocks gameplay sign-in until reactivated.`
            : modalAction?.type === 'REACTIVATE'
            ? `Reactivating ${modalAction?.target.email} restores full camp sign-in and gameplay access.`
            : `This executes retention-policy account deletion for ${modalAction?.target.email}. Personal identity fields (email, state code, display name) will be anonymized immediately, active tokens revoked, and financial/activity ledgers preserved for 90 days for camp audit compliance.`
        }
        confirmLabel={
          modalAction?.type === 'SUSPEND'
            ? 'Suspend Account'
            : modalAction?.type === 'REACTIVATE'
            ? 'Reactivate Account'
            : 'Execute Retention Deletion'
        }
        tone={modalAction?.type === 'REACTIVATE' ? 'primary' : modalAction?.type === 'SUSPEND' ? 'warning' : 'danger'}
        requireReason={true}
        confirmKeyword={modalAction?.type === 'DELETE' ? 'DELETE' : undefined}
        loading={actionLoading}
        onCancel={() => setModalAction(null)}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};
