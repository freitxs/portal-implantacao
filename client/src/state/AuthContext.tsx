import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getRefreshToken, setTokens } from "../lib/api";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const rt = getRefreshToken();
    if (!rt) throw new Error("Sem refresh token");
    const { data } = await api.post("/api/auth/refresh", { refreshToken: rt });
    setTokens(data.accessToken, undefined);
    setUser(data.user);
  }

  async function fetchMe() {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data);
    } catch {
      try {
        if (getRefreshToken()) await refresh();
      } catch {
        setTokens(null, null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMe(); }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post("/api/auth/login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }

  async function logout() {
    const rt = getRefreshToken();
    try {
      if (rt) await api.post("/api/auth/logout", { refreshToken: rt });
    } finally {
      setTokens(null, null);
      setUser(null);
    }
  }

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa do AuthProvider");
  return ctx;
}
