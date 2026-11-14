import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Activity, CalendarDays, Coins, RefreshCw, ArrowRight } from 'lucide-react';
import { adminApi, type DashboardResponse } from '../api/adminApi';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-lg p-6">
        <h2 className="text-sm font-bold text-rose-800">Unable to Load Dashboard</h2>
        <p className="text-xs text-rose-700 mt-1">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 px-3.5 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold"
        >
          Retry Request
        </button>
      </div>
    );
  }

  if (!data) return null;
  const { telemetry, platoonStandings, recentActivitySessions, recentAuditLogs } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Command Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live operational telemetry from Iseyin Orientation Camp backend API
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Registered Accounts</span>
            <Users className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {telemetry.totalRegisteredCorpers}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {telemetry.activePlayers} active · {telemetry.suspendedPlayers} suspended
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Activity Sessions</span>
            <Activity className="h-4 w-4 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {telemetry.totalActivitySessions}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {telemetry.pendingReports} pending reports
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Events & Locations</span>
            <CalendarDays className="h-4 w-4 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {telemetry.activeEvents}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {telemetry.activeLocations} active 3D zones · {telemetry.totalMarketProducts} market SKUs
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Economy Circulation</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            ₦{telemetry.totalNairaInCirculation.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {telemetry.totalPointsInCirculation.toLocaleString()} CP · Rate {telemetry.conversionRate.cp} CP = ₦
            {telemetry.conversionRate.naira}
          </div>
        </div>
      </div>

      {/* Main Split: Platoon Standings + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Platoon Standings */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Platoon Leaderboard</h2>
              <p className="text-xs text-slate-500">Ranked by cumulative Corper Points</p>
            </div>
            <Link
              to="/platoons"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <span>Manage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Rank</th>
                  <th className="py-2.5 px-4">Platoon</th>
                  <th className="py-2.5 px-4 text-right">Members</th>
                  <th className="py-2.5 px-4 text-right">Total CP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {platoonStandings.slice(0, 6).map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">#{idx + 1}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.colorHex }}
                        />
                        <span className="font-semibold text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">{p.memberCount}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {p.totalPoints.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity Sessions */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Gameplay Activity</h2>
              <p className="text-xs text-slate-500">Latest server-validated drill & rush sessions</p>
            </div>
            <Link
              to="/activities"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentActivitySessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No gameplay sessions recorded yet in this server instance.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Corper</th>
                    <th className="py-2.5 px-4">Activity</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                    <th className="py-2.5 px-4 text-right">CP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentActivitySessions.slice(0, 6).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <Link to={`/users/${s.userId}`} className="font-medium text-slate-900 hover:text-emerald-700">
                          {s.userDisplayName || s.userId.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{s.activitySlug}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">{s.score}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        +{s.pointsAwarded}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Audit Trail Preview */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Administrative Audit Trail</h2>
            <p className="text-xs text-slate-500">Immutable record of administrative actions and system changes</p>
          </div>
        </div>
        {recentAuditLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">No audit records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Entity / Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentAuditLogs.slice(0, 8).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-600">{log.actorEmail || log.actorUserId}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {log.targetEntity} {log.targetId ? `· ${log.targetId.slice(0, 14)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
