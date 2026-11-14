import React, { useState } from 'react';
import { api, UserSession } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { ShieldCheck, Award, LogIn, Sparkles, AlertCircle, User, Mail, Hash } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface AuthModalProps {
  onSuccess: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('farlodunolusege@gmail.com');
  const [stateCode, setStateCode] = useState('OY/26C/5439');
  const [fullName, setFullName] = useState('Olusegun Farlodun');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | null>(null);

  const handleAuth = async (useSuperadmin: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const targetEmail = useSuperadmin ? 'farlodunolusege@gmail.com' : email.trim().toLowerCase();
      const targetStateCode = useSuperadmin ? 'OY/26C/5439' : stateCode.trim().toUpperCase();
      const targetFullName = useSuperadmin ? 'Olusegun Farlodun (Commandant)' : fullName.trim();

      const session = await api.authenticate(targetEmail, targetStateCode, targetFullName);
      soundManager.playBugleCall();
      onSuccess(session);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-amber-400 to-emerald-600" />

        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              CORPER WEE!
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Demo Auth
              </span>
            </h1>
            <p className="text-xs text-slate-400">Iseyin Orientation Camp &bull; Sign In & Sign Up</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-emerald-400" />
              Corps Member Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. corper@gmail.com"
              required
            />
          </div>

          {/* NYSC State Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-400" />
              NYSC State Code
            </label>
            <input
              type="text"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-mono text-emerald-300 tracking-wider focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
              placeholder="OY/26C/5439"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Format: 2-letter state / 2-digit year + batch / 4-digit call-up (e.g. OY/26C/5439)
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-cyan-400" />
              Full Name <span className="text-[10px] text-slate-400 lowercase">(for new signup)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. Bisi Adebayo"
            />
          </div>

          <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-2.5 text-[11px] text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-300">Demo Uniqueness:</span> Email and State Code are unique 1-to-1 pairs. An email cannot be used with multiple State Codes.
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleAuth(false)}
            disabled={loading || !email || !stateCode}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'Verifying Corper Identity...' : 'Enter Camp (Sign In / Sign Up)'}
          </button>

          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Fast Superadmin Demo
            </span>
          </div>

          {/* Superadmin Seed Fast Access */}
          <button
            onClick={() => handleAuth(true)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            Enter as Superadmin (farlodunolusege@gmail.com &bull; OY/26C/5439)
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => setLegalTab('privacy')}
            className="hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => setLegalTab('terms')}
            className="hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </button>
        </div>

        <div className="mt-2.5 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>Under the sun or in the rain, with dedication and selflessness.</span>
        </div>
      </div>

      {legalTab && <LegalModal initialTab={legalTab} onClose={() => setLegalTab(null)} />}
    </div>
  );
};
