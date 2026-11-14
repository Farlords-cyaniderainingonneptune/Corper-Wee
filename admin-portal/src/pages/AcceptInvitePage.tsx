import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ArrowRight } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { useAuth } from '../context/AuthContext';

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [email, setEmail] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminApi.acceptAdminInvitation(
        token.trim(),
        email.trim().toLowerCase(),
        stateCode.trim().toUpperCase(),
        fullName.trim() || undefined
      );
      await refreshSession();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Unable to verify invitation token.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2.5 text-slate-900">
          <div className="h-9 w-9 rounded-md bg-emerald-700 text-white flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Accept Camp Admin Invitation</h1>
            <p className="text-xs text-slate-500">NYSC Orientation Camp · Iseyin, Oyo State</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 border border-slate-200 rounded-lg shadow-xs">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Redeem Single-Use Invitation</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your invited official email, NYSC state code, and invitation token issued by the Superadmin.
            </p>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label htmlFor="invite-token" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Invitation Token
              </label>
              <input
                id="invite-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="invite_..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="invite-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Invited Email Address
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@nysc.gov.ng"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="invite-statecode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                NYSC State Code
              </label>
              <input
                id="invite-statecode"
                type="text"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                placeholder="OY/26C/8102"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="invite-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Officer Display Name (Optional)
              </label>
              <input
                id="invite-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Camp Officer Adewale"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              <span>{submitting ? 'Validating Token...' : 'Accept Invitation & Sign In'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
              Back to Admin Sign In
            </Link>
            <a href="/" className="font-medium text-slate-600 hover:text-slate-900">
              3D Camp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
