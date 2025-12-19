import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "msd_token";

export function AuthProvider({ children }) {
  const initialToken = localStorage.getItem(TOKEN_KEY);

  const [token, setTokenState] = useState(initialToken);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(Boolean(initialToken));

  function setToken(tokenValue) {
    if (tokenValue) {
      localStorage.setItem(TOKEN_KEY, tokenValue);
      setTokenState(tokenValue);
      setLoadingUser(true); // important: user is not loaded yet
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
      setUser(null);
      setLoadingUser(false);
    }
  }

  function logout() {
    setToken(null);
  }

  async function refreshMe(explicitToken) {
    const t = explicitToken ?? token;
    if (!t) {
      setUser(null);
      setLoadingUser(false);
      return null;
    }

    setLoadingUser(true);
    try {
      const me = await apiFetch("/api/users/me", { token: t });
      setUser(me);
      return me;
    } catch (e) {
      // logout ONLY if token is actually invalid
      const msg = String(e?.message || "");
      if (msg.startsWith("401") || msg.startsWith("403")) {
        setToken(null);
      }
      throw e;
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refreshMe(token).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({ token, user, loadingUser, setToken, logout, refreshMe }),
    [token, user, loadingUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}