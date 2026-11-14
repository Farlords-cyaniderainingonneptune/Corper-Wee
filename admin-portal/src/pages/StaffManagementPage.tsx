import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  Check,
  KeyRound,
  UserCheck,
  ShieldOff,
  Ban,
  RotateCcw,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import {
  adminApi,
  type AdminUser,
  type AuditLogEntry,
  type InvitationStatus,
  type Permission,
  type UserRole,
} from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';

const PERMISSION_LABELS: Record<Permission, string> = {
  MANAGE_PLAYERS: 'Manage Players & Platoons',
  SUSPEND_PLAYERS: 'Suspend / Delete Accounts',
  MANAGE_ECONOMY: 'Market & Game Config',
  SCHEDULE_EVENTS: 'Events & Locations',
  VIEW_AUDIT_LOGS: 'View Audit Logs',
};

const ALL_ASSIGNABLE: Permission[] = [
  'MANAGE_PLAYERS',
  'SUSPEND_PLAYERS',
  'MANAGE_ECONOMY',
  'SCHEDULE_EVENTS',
  'VIEW_AUDIT_LOGS',
];

const INVITE_STATUS_STYLES: Record<InvitationStatus, string> = {
  PENDING: 'text-amber-700 font-semibold',
  ACCEPTED: 'text-emerald-700 font-semibold',
  REVOKED: 'text-rose-700 font-semibold',
  EXPIRED: 'text-slate-500 font-semibold',
};

interface InvitationRow {
  id: string;
  email: string;
  token: string;
  invitedByUserId: string;
  assignedRole: UserRole;
  permissions: Permission[];
  status: InvitationStatus;
  isConsumed: boolean;
  consumedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  expiresAt: string;
  createdAt: string;
}

export const StaffManagementPage: React.FC = () => {
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Invite creation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'PLAYER'>('ADMIN');
  const [inviteExpiryHours, setInviteExpiryHours] = useState(48);
  const [invitePermissions, setInvitePermissions] = useState<Permission[]>([...ALL_ASSIGNABLE]);
  const [inviting, setInviting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Confirm modals for destructive staff/invitation actions
  const [demoteTarget, setDemoteTarget] = useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ admin: AdminUser; nextStatus: 'ACTIVE' | 'SUSPENDED' } | null>(null);
  const [revokeInviteTarget, setRevokeInviteTarget] = useState<InvitationRow | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Edit Permissions modal
  const [permTarget, setPermTarget] = useState<AdminUser | null>(null);
  const [permDraft, setPermDraft] = useState<Permission[]>([]);

  const loadStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, logsRes] = await Promise.all([
        adminApi.listStaffAndInvitations(),
        adminApi.getAuditLogs(100),
      ]);
      setStaff(staffRes.staff);
      setInvitations(staffRes.invitations);
      setAuditLogs(logsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load staff directory and audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const toggleInvitePerm = (perm: Permission) => {
    setInvitePermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleEditPerm = (perm: Permission) => {
    setPermDraft((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setFeedback('');
    try {
      const res = await adminApi.createAdminInvitation(
        inviteEmail.trim(),
        inviteRole,
        inviteRole === 'ADMIN' ? invitePermissions : undefined,
        inviteExpiryHours
      );
      setFeedback(
        `Issued single-use ${res.assignedRole} invitation for ${res.email} (expires in ${inviteExpiryHours}h).`
      );
      setInviteEmail('');
      await loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Failed to issue invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleConfirmDemote = async () => {
    if (!demoteTarget) return;
    setActionBusy(true);
    setError('');
    setFeedback('');
    try {
      await adminApi.setUserRole(demoteTarget.id, 'PLAYER');
      setFeedback(`Revoked admin access for ${demoteTarget.email}. Account demoted to PLAYER.`);
      setDemoteTarget(null);
      await loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke admin access.');
      setDemoteTarget(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmAdminStatus = async () => {
    if (!statusTarget) return;
    setActionBusy(true);
    setError('');
    setFeedback('');
    try {
      await adminApi.setUserStatus(
        statusTarget.admin.id,
        statusTarget.nextStatus,
        statusTarget.nextStatus === 'SUSPENDED'
          ? 'Administrator suspended by Superadmin'
          : 'Administrator reactivated by Superadmin'
      );
      setFeedback(
        `Administrator ${statusTarget.admin.email} status updated to ${statusTarget.nextStatus}.`
      );
      setStatusTarget(null);
      await loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Failed to update administrator status.');
      setStatusTarget(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmRevokeInvite = async () => {
    if (!revokeInviteTarget) return;
    setActionBusy(true);
    setError('');
    setFeedback('');
    try {
      await adminApi.revokeAdminInvitation(
        revokeInviteTarget.id,
        'Revoked via Superadmin invitation console'
      );
      setFeedback(`Invitation for ${revokeInviteTarget.email} has been permanently revoked.`);
      setRevokeInviteTarget(null);
      await loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke invitation.');
      setRevokeInviteTarget(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permTarget) return;
    setActionBusy(true);
    setError('');
    setFeedback('');
    try {
      await adminApi.setAdminPermissions(permTarget.id, permDraft);
      setFeedback(`Updated granular permissions for ${permTarget.email}.`);
      setPermTarget(null);
      await loadStaff();
    } catch (err: any) {
      setError(err?.message || 'Failed to update administrator permissions.');
    } finally {
      setActionBusy(false);
    }
  };

  const copyValue = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Invitations & Staff Control</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Superadmin-exclusive onboarding tokens, granular permission assignments, admin suspension, and full audit trails.
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Authorized Staff Directory */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Authorized Camp Administrators</h2>
            <p className="text-xs text-slate-500">Primary Superadmin account is immutable and protected</p>
          </div>
          {loading ? (
            <div className="p-6 text-xs text-slate-500">Loading administrator accounts...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Officer</th>
                    <th className="py-2.5 px-4">Role & Status</th>
                    <th className="py-2.5 px-4">Permissions</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((s) => {
                    const perms = s.permissions || [];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <Link to={`/users/${s.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                            {s.displayName}
                          </Link>
                          <div className="text-[11px] font-mono text-slate-500">
                            {s.email} · {s.stateCode || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="font-semibold text-slate-800">{s.role}</div>
                          <div className={`text-[11px] ${s.status === 'SUSPENDED' ? 'text-rose-700 font-semibold' : 'text-emerald-700'}`}>
                            {s.status}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[200px]">
                          {s.role === 'SUPERADMIN'
                            ? 'Unrestricted Superadmin'
                            : perms.length > 0
                            ? perms.map((p) => PERMISSION_LABELS[p] || p).join(' · ')
                            : 'No custom scopes assigned'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {s.isProtected || s.role === 'SUPERADMIN' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Immutable</span>
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setPermTarget(s);
                                  setPermDraft(s.permissions || []);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold whitespace-nowrap shrink-0"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                <span>Permissions</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusTarget({
                                    admin: s,
                                    nextStatus: s.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                                  })
                                }
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded border font-semibold whitespace-nowrap shrink-0 ${
                                  s.status === 'SUSPENDED'
                                    ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                                }`}
                              >
                                {s.status === 'SUSPENDED' ? (
                                  <>
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Reactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-3 w-3" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDemoteTarget(s)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold whitespace-nowrap shrink-0"
                              >
                                <ShieldOff className="h-3 w-3" />
                                <span>Revoke</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Issue Single-Use Admin Invitation */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound className="h-4 w-4 text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Invite Administrator</h2>
              <p className="text-xs text-slate-500">Single-use email-bound token with scoped permissions</p>
            </div>
          </div>

          <form onSubmit={handleCreateInvitation} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invitee Email Address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="officer@nysc.gov.ng"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'PLAYER')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="ADMIN">ADMIN (Officer)</option>
                  <option value="PLAYER">PLAYER (Corper)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiration Window</label>
                <select
                  value={inviteExpiryHours}
                  onChange={(e) => setInviteExpiryHours(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white font-mono"
                >
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                  <option value={168}>7 Days (168h)</option>
                </select>
              </div>
            </div>

            {inviteRole === 'ADMIN' && (
              <div className="space-y-2 pt-1">
                <div className="font-semibold text-slate-700">Assigned Permissions</div>
                <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3">
                  {ALL_ASSIGNABLE.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.includes(perm)}
                        onChange={() => toggleInvitePerm(perm)}
                        className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                      />
                      <span>{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={inviting}
              className="w-full px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50"
            >
              {inviting ? 'Issuing Token...' : 'Issue Single-Use Invitation'}
            </button>
          </form>
        </section>
      </div>

      {/* Invitation Registry & Lifecycle Status */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Issued Administrator Invitations</h2>
            <p className="text-xs text-slate-500">
              Share invitation link with the assigned officer to redeem via <span className="font-mono">/admin/accept-invite</span>
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-500">{invitations.length} total</span>
        </div>
        {invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No administrator invitations have been issued yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Invitee</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Permissions</th>
                  <th className="py-2.5 px-4">Expires</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => {
                  const fullInviteLink = `${window.location.origin}/admin/accept-invite?token=${inv.token}`;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.email}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-[220px]">
                          {inv.assignedRole} · {inv.token}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-mono ${INVITE_STATUS_STYLES[inv.status]}`}>
                        {inv.status}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                        {inv.permissions?.length
                          ? inv.permissions.map((p) => PERMISSION_LABELS[p] || p).join(' · ')
                          : 'Standard'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {new Date(inv.expiresAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {inv.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => copyValue(`link-${inv.id}`, fullInviteLink)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-emerald-700 font-semibold whitespace-nowrap shrink-0"
                              >
                                {copiedKey === `link-${inv.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedKey === `link-${inv.id}` ? 'Link Copied' : 'Copy Link'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevokeInviteTarget(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold whitespace-nowrap shrink-0"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Revoke</span>
                              </button>
                            </>
                          )}
                          {inv.status !== 'PENDING' && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {inv.consumedAt
                                ? `Redeemed ${new Date(inv.consumedAt).toLocaleDateString()}`
                                : inv.revokedAt
                                ? `Revoked ${new Date(inv.revokedAt).toLocaleDateString()}`
                                : 'Closed'}
                            </span>
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
      </section>

      {/* Full System Audit Logs */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Full Security & Administrative Audit Log</h2>
            <p className="text-xs text-slate-500">Latest 100 audited system and administrative events</p>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-500">{auditLogs.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{log.action}</td>
                  <td className="py-2.5 px-4 text-slate-700">{log.actorEmail || log.actorUserId}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {log.targetEntity} {log.targetId ? `· ${log.targetId.slice(0, 12)}` : ''}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-500 max-w-md truncate">
                    {JSON.stringify(log.metadata || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Admin Permissions Modal */}
      {permTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Assign Permissions · {permTarget.displayName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{permTarget.email}</p>
            </div>
            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                {ALL_ASSIGNABLE.map((perm) => (
                  <label key={perm} className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permDraft.includes(perm)}
                      onChange={() => toggleEditPerm(perm)}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                    />
                    <span>{PERMISSION_LABELS[perm]}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPermTarget(null)}
                  disabled={actionBusy}
                  className="px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {actionBusy ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={demoteTarget !== null}
        title={`Revoke Admin Access for ${demoteTarget?.displayName}?`}
        description={`Demote ${demoteTarget?.email} from ADMIN to standard PLAYER role? They will lose access to the Admin Portal immediately.`}
        confirmLabel="Revoke Admin Access"
        tone="danger"
        loading={actionBusy}
        onCancel={() => setDemoteTarget(null)}
        onConfirm={handleConfirmDemote}
      />

      <ConfirmModal
        open={statusTarget !== null}
        title={
          statusTarget?.nextStatus === 'SUSPENDED'
            ? `Suspend Administrator ${statusTarget.admin.displayName}?`
            : `Reactivate Administrator ${statusTarget?.admin.displayName}?`
        }
        description={
          statusTarget?.nextStatus === 'SUSPENDED'
            ? `Suspending ${statusTarget.admin.email} immediately revokes active sessions and blocks all Admin API access until reactivated.`
            : `Restore active Admin Portal access for ${statusTarget?.admin.email}?`
        }
        confirmLabel={statusTarget?.nextStatus === 'SUSPENDED' ? 'Suspend Admin' : 'Reactivate Admin'}
        tone={statusTarget?.nextStatus === 'SUSPENDED' ? 'danger' : 'warning'}
        loading={actionBusy}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleConfirmAdminStatus}
      />

      <ConfirmModal
        open={revokeInviteTarget !== null}
        title={`Revoke Invitation for ${revokeInviteTarget?.email}?`}
        description="Once revoked, this single-use invitation token can never be redeemed."
        confirmLabel="Revoke Invitation"
        tone="danger"
        loading={actionBusy}
        onCancel={() => setRevokeInviteTarget(null)}
        onConfirm={handleConfirmRevokeInvite}
      />
    </div>
  );
};
