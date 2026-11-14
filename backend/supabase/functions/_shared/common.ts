// Edge Function'lar uchun umumiy yordamchilar (Deno).
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — Supabase tomonidan
// funksiyalarga avtomatik beriladi; ularni kodga yozmang.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function fail(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } });
}

/** Service-role klient: faqat server ichida, hech qachon javobga chiqarilmaydi. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY o‘rnatilmagan");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Chaqiruvchi faol ADMIN ekanini server tomonida tekshiradi. */
export async function requireAdmin(req: Request, svc: SupabaseClient): Promise<{ userId: string } | Response> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return fail(401, "UNAUTHENTICATED", "Authorization sarlavhasi kerak");

  const { data: userData, error: userErr } = await svc.auth.getUser(token);
  if (userErr || !userData.user) return fail(401, "UNAUTHENTICATED", "Token yaroqsiz");

  const { data: profile, error: profErr } = await svc
    .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
  if (profErr) return fail(500, "INTERNAL", "Profilni o‘qib bo‘lmadi");
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return fail(403, "FORBIDDEN", "Faqat administrator bajara oladi");
  }
  return { userId: userData.user.id };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
export const isStrongPassword = (v: unknown): v is string => typeof v === "string" && v.length >= 10 && v.length <= 72;
export const isName = (v: unknown): v is string => typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 120;
export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** Vaqt bo‘yicha doimiy taqqoslash (timing attack himoyasi). */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
