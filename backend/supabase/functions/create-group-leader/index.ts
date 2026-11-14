// Administrator guruh rahbari hisobini yaratadi (ixtiyoriy: guruhga biriktiradi).
import { corsHeaders, fail, isEmail, isName, isStrongPassword, isUuid, json, readJson, requireAdmin, serviceClient } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "Faqat POST");

  const svc = serviceClient();
  const auth = await requireAdmin(req, svc);
  if (auth instanceof Response) return auth;

  const body = await readJson(req);
  if (!body) return fail(400, "BAD_REQUEST", "JSON tanasi kerak");
  const { email, password, full_name, phone, group_id } = body;
  if (!isEmail(email)) return fail(422, "VALIDATION", "email noto‘g‘ri");
  if (!isStrongPassword(password)) return fail(422, "VALIDATION", "parol kamida 10 belgidan iborat bo‘lishi kerak");
  if (!isName(full_name)) return fail(422, "VALIDATION", "full_name noto‘g‘ri");
  if (phone != null && (typeof phone !== "string" || phone.length > 32)) return fail(422, "VALIDATION", "phone noto‘g‘ri");
  if (group_id != null && !isUuid(group_id)) return fail(422, "VALIDATION", "group_id noto‘g‘ri");

  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (createErr || !created.user) return fail(400, "AUTH_CREATE_FAILED", createErr?.message ?? "Foydalanuvchi yaratilmadi");

  const { error: rpcErr } = await svc.rpc("create_group_leader_profile", {
    p_user_id: created.user.id,
    p_full_name: (full_name as string).trim(),
    p_phone: (phone as string | null | undefined) ?? null,
    p_group_id: (group_id as string | null | undefined) ?? null,
  });
  if (rpcErr) {
    await svc.auth.admin.deleteUser(created.user.id); // rollback
    return fail(rpcErr.code === "22023" ? 422 : 500, rpcErr.code === "22023" ? "VALIDATION" : "INTERNAL", rpcErr.message);
  }
  return json(201, {
    id: created.user.id, email, full_name: (full_name as string).trim(),
    phone: phone ?? null, group_id: group_id ?? null, role: "group_leader",
  });
});
