import React, { useEffect, useState } from 'react';
import { api, UserSession } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { ShieldAlert, Users, Coins, Key, Activity, CheckCircle, Copy, X, ArrowUpRight } from 'lucide-react';

interface AdminDashboardProps {
  session: UserSession;
  onClose: () => void;
}

interface TelemetryData {
  totalUsers: number;
  activePlayers: number;
  totalPointsAwarded: number;
  nairaCirculation: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ session, onClose }) => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    totalUsers: 0,
    activePlayers: 0,
    totalPointsAwarded: 0,
    nairaCirculation: '0.00'
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getAdminDashboard();
      if (data && data.telemetry) {
        setTelemetry({
          totalUsers: data.telemetry.totalRegisteredCorpers ?? 0,
          activePlayers: data.telemetry.activePlayers ?? 0,
          totalPointsAwarded: data.telemetry.totalPointsInCirculation ?? 0,
          nairaCirculation: String(data.telemetry.totalNairaInCirculation ?? '0.00')
        });
      }
    } catch {
      // keep zeroed state if unauthorized or offline
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setGenerating(true);
    setInviteError('');
    try {
      const result = await api.generateAdminInvite(inviteEmail.trim(), 'ADMIN');
      setInviteToken(result.token);
      setInviteEmail('');
      soundManager.playCoinSound();
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to generate invitation token');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteToken) {
      navigator.clipboard.writeText(inviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-rose-500/40 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">NYSC Command Overview</h2>
                <span className="text-[11px] uppercase font-bold tracking-wider text-rose-300">
                  {session.user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Orientation Camp Administration · Iseyin, Oyo State
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              <span>Open Full Admin Portal</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Superadmin Card */}
        <div className="mx-4 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Command Account
            </span>
            <div className="text-sm font-semibold text-white mt-0.5">
              {session.user.fullName} ({session.user.email})
            </div>
            <div className="text-xs font-mono text-amber-300">State Code: {session.user.stateCode}</div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400">
            Protected Seed
          </span>
        </div>

        {/* Telemetry Metrics */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>Total Corpers</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">{telemetry.totalUsers}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Active Accounts</span>
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300">{telemetry.activePlayers}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>CP Circulation</span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-300">
                {telemetry.totalPointsAwarded.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Coins className="h-4 w-4 text-emerald-400" />
                <span>₦ Circulation</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                ₦{parseFloat(telemetry.nairaCirculation).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Admin Invitations Generator */}
          <form onSubmit={handleCreateInvite} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                Camp Staff Invitation Generator
              </h3>
              <p className="text-xs text-slate-400">
                Issue single-use administrative invitation tokens (valid for 48 hours).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="officer@nysc.gov.ng"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={generating}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Token'}
              </button>
            </div>

            {inviteError && <div className="text-xs text-rose-400">{inviteError}</div>}

            {inviteToken && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-500/40 bg-slate-900 px-3 py-2 text-xs font-mono text-amber-300">
                <span className="truncate">{inviteToken}</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors shrink-0 ml-2"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex justify-between items-center">
          <a href="/admin" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Launch Separate Admin Portal (/admin) &rarr;
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};
