import type { Profile, Role } from '../types';
import { db, isDemoMode } from './supabase';
import { demoApi } from './demoData';

const DEMO_KEY = 'demo-user-id';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const client = db();
  const [{ data: profile, error }, { data: authData }] = await Promise.all([
    client.from('profiles').select('id, full_name, role, is_active').eq('id', userId).maybeSingle(),
    client.auth.getUser()
  ]);
  if (error) throw error;
  if (!profile) return null;
  const { data: group } = profile.role === 'group_leader'
    ? await client.from('groups').select('id').eq('leader_id', userId).maybeSingle()
    : { data: null };
  return {
    ...(profile as Omit<Profile, 'email' | 'group_id'>),
    email: authData.user?.email ?? '',
    group_id: group?.id ?? null
  };
}

export const authService = {
  async currentProfile(): Promise<Profile | null> {
    if (isDemoMode) {
      const id = sessionStorage.getItem(DEMO_KEY);
      return id ? demoApi.profile(id) : null;
    }
    const { data, error } = await db().auth.getSession();
    if (error) throw error;
    const uid = data.session?.user.id;
    return uid ? fetchProfile(uid) : null;
  },
  async signIn(email: string, password: string): Promise<Profile> {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw new Error("Email yoki parol noto'g'ri.");
    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      await db().auth.signOut();
      throw new Error("Profil topilmadi. Administrator bilan bog'laning.");
    }
    if (!profile.is_active) {
      await db().auth.signOut();
      throw new Error('Hisobingiz faol emas.');
    }
    return profile;
  },
  signInDemo(role: Role): Profile {
    const profile = demoApi.profile(role === 'admin' ? 'u1' : 'u2')!;
    sessionStorage.setItem(DEMO_KEY, profile.id);
    return profile;
  },
  async signOut(): Promise<void> {
    if (isDemoMode) sessionStorage.removeItem(DEMO_KEY);
    else await db().auth.signOut();
  },
  async changePassword(newPassword: string): Promise<void> {
    if (isDemoMode) return;
    const { error } = await db().auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
};
