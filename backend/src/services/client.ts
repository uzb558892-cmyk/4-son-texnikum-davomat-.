import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.ts";

export type Db = SupabaseClient<Database>;

/**
 * Brauzer/frontend uchun klient. FAQAT anon (publishable) kalit bilan.
 * Maxfiy (server) kalitni bu yerga hech qachon bermang.
 */
export function createBackendClient(url: string, anonKey: string): Db {
  if (!url || !anonKey) throw new Error("SUPABASE_URL va SUPABASE_ANON_KEY kerak");
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}
