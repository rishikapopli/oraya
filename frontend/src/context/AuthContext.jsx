import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!tokenStore.get());

  const loadUser = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setBooting(false);
      return;
    }
    try {
      const me = await api.get("/auth/me");
      setUser(me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    const onUnauthorized = () => setUser(null);
    window.addEventListener("oraya:unauthorized", onUnauthorized);
    return () => window.removeEventListener("oraya:unauthorized", onUnauthorized);
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const data = await api.post("/auth/signup", { email, password, name });
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const updated = await api.patch("/auth/profile", patch);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({ user, booting, login, signup, logout, updateProfile, reload: loadUser }),
    [user, booting, login, signup, logout, updateProfile, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
