import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  display_name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(api.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then((u) => {
        api.setUser(u);
        setUser(u);
      })
      .catch(() => {
        api.setToken(null);
        api.setUser(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const data = await api.signUp(email, password, displayName);
      setUser(data.user);
      return { error: null, data };
    } catch (err: any) {
      return { error: { message: err.message }, data: null };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.signIn(email, password);
      if (data.mfa_required) {
        return { error: null, data, mfa_required: true };
      }
      setUser(data.user);
      return { error: null, data };
    } catch (err: any) {
      return { error: { message: err.message }, data: null };
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.getMe();
      api.setUser(u);
      setUser(u);
    } catch {
      // ignore
    }
  }, []);

  return { user, loading, signUp, signIn, signOut, refreshUser };
}
