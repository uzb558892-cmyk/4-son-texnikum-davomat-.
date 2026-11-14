// BIR MARTALIK: yagona administratorni yaratadi.
// Himoya: (1) x-bootstrap-secret sarlavhasi (BOOTSTRAP_SECRET), (2) DB darajasida
// bitta admin cheklovi + bootstrap_admin() faqat service_role uchun.
// Admin yaratilgach, funksiyani o‘chiring: supabase functions delete bootstrap-admin
import { corsHeaders, fail, isEmail, isName, isStrongPassword, json, readJson, safeEqual, serviceClient } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "Faqat POST");

  const expected = Deno.env.get("BOOTSTRAP_SECRET");
  if (!expected || expected.length < 24) {
    return fail(503, "NOT_CONFIGURED", "BOOTSTRAP_SECRET o‘rnatilmagan yoki juda qisqa (kamida 24 belgi)");
  }
  const provided = req.headers.get("x-bootstrap-secret") ?? "";
  if (!safeEqual(provided, expected)) return fail(403, "FORBIDDEN", "Maxfiy kalit noto‘g‘ri");

  const body = await readJson(req);
  if (!body) return fail(400, "BAD_REQUEST", "JSON tanasi kerak");
  const { email, password, full_name } = body;
  if (!isEmail(email)) return fail(422, "VALIDATION", "email noto‘g‘ri");
  if (!isStrongPassword(password)) return fail(422, "VALIDATION", "parol kamida 10 belgidan iborat bo‘lishi kerak");
  if (!isName(full_name)) return fail(422, "VALIDATION", "full_name noto‘g‘ri");

  const svc = serviceClient();

  const { count, error: countErr } = await svc.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  if (countErr) return fail(500, "INTERNAL", "Tekshirib bo‘lmadi");
  if ((count ?? 0) > 0) return fail(409, "ADMIN_EXISTS", "Administrator allaqachon mavjud");

  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (createErr || !created.user) return fail(400, "AUTH_CREATE_FAILED", createErr?.message ?? "Foydalanuvchi yaratilmadi");

  const { error: rpcErr } = await svc.rpc("bootstrap_admin", { p_user_id: created.user.id, p_full_name: (full_name as string).trim() });
  if (rpcErr) {
    await svc.auth.admin.deleteUser(created.user.id); // qaytarish (rollback)
    return fail(rpcErr.code === "P0001" ? 409 : 500, rpcErr.code === "P0001" ? "ADMIN_EXISTS" : "INTERNAL", rpcErr.message);
  }
  return json(201, { id: created.user.id, email, full_name: (full_name as string).trim(), role: "admin" });
});
