'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';
import type { AuthUser } from './api-types';

const ACCESS_TOKEN_KEY = 'innflow_access_token';
const REFRESH_TOKEN_KEY = 'innflow_refresh_token';

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
};

const AuthContext = createContext<AuthState | null>(null);

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // ignore quota errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    writeStorage(ACCESS_TOKEN_KEY, null);
    writeStorage(REFRESH_TOKEN_KEY, null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    router.push('/login');
  }, [clearSession, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login(email, password);
      setUser(response.user);
      setAccessToken(response.accessToken);
      writeStorage(ACCESS_TOKEN_KEY, response.accessToken);
      writeStorage(REFRESH_TOKEN_KEY, response.refreshToken);
      router.push('/');
    },
    [router],
  );

  const getToken = useCallback(() => accessToken, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedAccess = readStorage(ACCESS_TOKEN_KEY);
      const storedRefresh = readStorage(REFRESH_TOKEN_KEY);

      if (!storedAccess) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      setAccessToken(storedAccess);

      try {
        const me = await api.me(storedAccess);
        if (!cancelled) setUser(me);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && storedRefresh) {
          try {
            const refreshed = await api.refresh(storedRefresh);
            if (cancelled) return;
            setAccessToken(refreshed.accessToken);
            writeStorage(ACCESS_TOKEN_KEY, refreshed.accessToken);
            const me = await api.me(refreshed.accessToken);
            if (!cancelled) setUser(me);
          } catch {
            if (!cancelled) clearSession();
          }
        } else if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: !!user && !!accessToken,
      login,
      logout,
      getToken,
    }),
    [user, accessToken, isLoading, login, logout, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
