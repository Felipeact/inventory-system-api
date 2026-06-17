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
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Heuristic role → capability mapping. The login response only carries a role
 * name, so we infer broad capabilities. A future /auth/me permissions list
 * could make this exact.
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

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
