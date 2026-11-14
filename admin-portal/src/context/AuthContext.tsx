import React, { createContext, useContext, useEffect, useState } from 'react';
import { adminApi, type AdminUser } from '../api/adminApi';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, stateCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    const token = adminApi.getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await adminApi.getCurrentSession();
      if (data.user.role === 'ADMIN' || data.user.role === 'SUPERADMIN') {
        setUser(data.user);
      } else {
        adminApi.clearTokens();
        setUser(null);
      }
    } catch {
      adminApi.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const login = async (email: string, stateCode: string) => {
    const data = await adminApi.login(email, stateCode);
    setUser(data.user);
  };

  const logout = async () => {
    await adminApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
