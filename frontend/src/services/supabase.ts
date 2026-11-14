import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Kalitlar yo'q yoki VITE_DEMO_MODE=true bo'lsa demo rejim yoqiladi. */
export const isDemoMode: boolean = import.meta.env.VITE_DEMO_MODE === 'true' || !url || !anonKey;

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

/** Haqiqiy rejimda klientni qaytaradi. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase ulanmagan (demo rejim).');
  return supabase;
}
