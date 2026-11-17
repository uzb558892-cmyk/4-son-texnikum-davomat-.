import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url as string, anonKey as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase sozlanmagan: VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY kerak.');
  return supabase;
}
