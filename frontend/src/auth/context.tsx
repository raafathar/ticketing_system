import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { api, getAccessToken, setAccessToken, clearAccessToken } from 'src/api/client';

import type { User, LoginPayload } from './types';

// ----------------------------------------------------------------------

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ----------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const initialize = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    try {
      const currentUser = await api.get<User>('/auth/me');
      setUser(currentUser);
    } catch {
      clearAccessToken();
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await api.post<LoginPayload>('/auth/login', { email, password });
    setAccessToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout is fire-and-forget; clearing the client token is what matters.
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await api.get<User>('/auth/me');
    setUser(currentUser);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, refreshUser }),
    [user, initializing, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
