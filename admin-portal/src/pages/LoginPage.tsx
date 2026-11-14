import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), stateCode.trim().toUpperCase());
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Unable to authenticate administrator credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2.5 text-slate-900">
          <div className="h-9 w-9 rounded-md bg-emerald-700 text-white flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Corper Wee Admin Portal</h1>
            <p className="text-xs text-slate-500">NYSC Orientation Camp · Iseyin, Oyo State</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 border border-slate-200 rounded-lg shadow-xs">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Commandant Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with an authorized Admin or Superadmin email and NYSC state code.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farlodunolusege@gmail.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-statecode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                NYSC State Code
              </label>
              <input
                id="admin-statecode"
                type="text"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                placeholder="OY/26C/5439"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
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
              <Lock className="h-3.5 w-3.5" />
              <span>{submitting ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link to="/accept-invite" className="font-medium text-emerald-700 hover:text-emerald-800">
              Accept Invitation Token
            </Link>
            <a href="/" className="font-medium text-slate-600 hover:text-slate-900">
              Back to 3D Camp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
