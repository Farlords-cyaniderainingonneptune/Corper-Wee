import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi, type ActivityMonitoringResponse } from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';

export const ActivitiesPage: React.FC = () => {
  const [data, setData] = useState<ActivityMonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slugFilter, setSlugFilter] = useState('ALL');
  const [reportModal, setReportModal] = useState<{
    reportId: string;
    reportedName: string;
    action: 'RESOLVED' | 'DISMISSED';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getActivityMonitoring();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity monitoring feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, []);

  const handleResolveReport = async (note: string) => {
    if (!reportModal) return;
    setActionLoading(true);
    try {
      await adminApi.resolveReport(reportModal.reportId, reportModal.action, note);
      setReportModal(null);
      await loadActivities();
    } catch (err: any) {
      setError(err?.message || 'Failed to update report status.');
      setReportModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredSessions = (data?.sessions || []).filter((s) =>
    slugFilter === 'ALL' ? true : s.activitySlug.toLowerCase().includes(slugFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Activity Monitoring & Moderation</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track server-validated mini-game submissions and moderate player misconduct reports.
          </p>
        </div>
        <button
          type="button"
          onClick={loadActivities}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">Total Sessions</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">{data.summary.totalSessions}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">Parade Drills</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">{data.summary.paradeSessions}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">Canteen Rushes</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">{data.summary.canteenSessions}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">Stealth Evasions</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">{data.summary.stealthSessions}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">Avg Accuracy</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700">{data.summary.avgAccuracy}%</div>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Validated Activity Sessions</h2>
          <select
            value={slugFilter}
            onChange={(e) => setSlugFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs bg-white text-slate-700"
          >
            <option value="ALL">All Activities</option>
            <option value="parade">Parade Drill</option>
            <option value="canteen">Canteen Rush</option>
            <option value="stealth">Soldier Evasion</option>
          </select>
        </div>

        {loading && !data ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading activity telemetry...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No activity sessions recorded matching filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Corper</th>
                  <th className="py-2.5 px-4">Activity</th>
                  <th className="py-2.5 px-4 text-right">Score</th>
                  <th className="py-2.5 px-4 text-right">Accuracy</th>
                  <th className="py-2.5 px-4 text-right">Duration</th>
                  <th className="py-2.5 px-4 text-right">CP Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(s.completedAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4">
                      <Link to={`/users/${s.userId}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                        {s.userDisplayName}
                      </Link>
                      <div className="text-[11px] font-mono text-slate-500">{s.userStateCode}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{s.activitySlug}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.score}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.accuracyPercentage}%</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.durationSeconds}s</td>
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

      {/* Player Misconduct Reports */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Player Misconduct Reports</h2>
            <p className="text-xs text-slate-500">Social interaction reports filed by corps members</p>
          </div>
          <span className="font-mono text-xs text-slate-600">{data?.reports.length ?? 0} total</span>
        </div>

        {!data || data.reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No player reports submitted.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Reported Corper</th>
                  <th className="py-2.5 px-4">Reporter</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4">
                      <Link to={`/users/${r.reportedUserId}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                        {r.reportedName}
                      </Link>
                      <div className="text-[11px] font-mono text-slate-500">{r.reportedStateCode}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{r.reporterName}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{r.reason}</div>
                      {r.details && <div className="text-[11px] text-slate-500">{r.details}</div>}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{r.status}</td>
                    <td className="py-2.5 px-4 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setReportModal({ reportId: r.id, reportedName: r.reportedName, action: 'RESOLVED' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Resolve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setReportModal({ reportId: r.id, reportedName: r.reportedName, action: 'DISMISSED' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">{r.resolutionNote || 'Closed'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={reportModal !== null}
        title={reportModal?.action === 'RESOLVED' ? 'Mark Report Resolved?' : 'Dismiss Player Report?'}
        description={`Confirm moderation action (${reportModal?.action}) for report against ${reportModal?.reportedName}.`}
        confirmLabel={reportModal?.action === 'RESOLVED' ? 'Resolve Report' : 'Dismiss Report'}
        tone="primary"
        requireReason={true}
        reasonLabel="Moderation Note"
        loading={actionLoading}
        onCancel={() => setReportModal(null)}
        onConfirm={handleResolveReport}
      />
    </div>
  );
};
