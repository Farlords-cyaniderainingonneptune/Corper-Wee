import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperadmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireSuperadmin = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-slate-600">Verifying command session...</span>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperadmin && user.role !== 'SUPERADMIN') {
    return (
      <div className="p-8 max-w-xl mx-auto mt-12 bg-white border border-slate-200 rounded-lg">
        <h2 className="text-base font-bold text-slate-900">Superadmin Clearance Required</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          This module is restricted to the primary Camp Commandant Superadmin account.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
