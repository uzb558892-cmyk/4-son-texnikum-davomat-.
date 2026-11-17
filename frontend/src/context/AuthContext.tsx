import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Profile } from '../types';
import { authService } from '../services';

interface AuthValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.currentProfile().then(async (profile) => {
      if (profile && !profile.is_active) {
        await authService.signOut();
        setUser(null);
      } else setUser(profile);
    }).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await authService.signIn(email, password));
  }, []);
  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return v;
}
