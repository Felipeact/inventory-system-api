"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokenStore } from "./api";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    email: string;
    password: string;
    code: string;
    companyName: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** True if the signed-in user has the given permission (from the login response). */
  hasPermission: (permission: string) => boolean;
  /** True if the signed-in user's role matches any of the given names (case-insensitive). */
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Heuristic role → admin check, kept for header display. Prefer hasPermission()
 * for gating actions now that the login response carries the permission list.
 */
export function roleIsAdmin(role?: string | null) {
  if (!role) return false;
  return /admin|owner|manager/i.test(role);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rehydrate session from storage on first paint.
    setUser(tokenStore.user());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    tokenStore.set(session);
    setUser(session.user);
    return session.user;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      code: string;
      companyName: string;
    }) => {
      const session = await api.register(input);
      tokenStore.set(session);
      setUser(session.user);
      return session.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => Boolean(user?.permissions?.includes(permission)),
    [user],
  );

  const hasRole = useCallback(
    (...roles: string[]) =>
      Boolean(user?.role && roles.some((r) => r.toLowerCase() === user.role.toLowerCase())),
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, hasPermission, hasRole }),
    [user, loading, login, register, logout, hasPermission, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
