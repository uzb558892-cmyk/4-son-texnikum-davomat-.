// Asosiy administrator qolgan administratorlarni boshqaradi: activate | deactivate | delete.
// Asosiy administratorga (is_primary) hech qanday amal qo'llanilmaydi — DB trigger ham bu bloklaydi.
import { corsHeaders, fail, isUuid, json, readJson, requireAdmin, serviceClient } from "../_shared/common.ts";

const BAN_FOREVER = "876000h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "Faqat POST");

  const svc = serviceClient();
  const auth = await requireAdmin(req, svc);
  if (auth instanceof Response) return auth;

  const body = await readJson(req);
  if (!body) return fail(400, "BAD_REQUEST", "JSON tanasi kerak");
  const { action, user_id } = body;
  if (!isUuid(user_id)) return fail(422, "VALIDATION", "user_id noto‘g‘ri");

  const { data: target, error: targetErr } = await svc.from("profiles").select("id, role, is_primary").eq("id", user_id).maybeSingle();
  if (targetErr) return fail(500, "INTERNAL", "Profilni o‘qib bo‘lmadi");
  if (!target) return fail(404, "NOT_FOUND", "Foydalanuvchi topilmadi");
  if (target.role !== "admin") return fail(403, "FORBIDDEN", "Faqat administratorlarni boshqarish mumkin");
  if (target.is_primary) return fail(403, "FORBIDDEN", "Asosiy administratorga tegib bo‘lmaydi");

  switch (action) {
    case "deactivate": {
      const { error } = await svc.from("profiles").update({ is_active: false }).eq("id", user_id);
      if (error) return fail(500, "INTERNAL", error.message);
      const { error: banErr } = await svc.auth.admin.updateUserById(user_id as string, { ban_duration: BAN_FOREVER });
      if (banErr) return fail(500, "INTERNAL", banErr.message);
      return json(200, { ok: true });
    }
    case "activate": {
      const { error } = await svc.from("profiles").update({ is_active: true }).eq("id", user_id);
      if (error) return fail(500, "INTERNAL", error.message);
      const { error: banErr } = await svc.auth.admin.updateUserById(user_id as string, { ban_duration: "none" });
      if (banErr) return fail(500, "INTERNAL", banErr.message);
      return json(200, { ok: true });
    }
    case "delete": {
      const { error } = await svc.auth.admin.deleteUser(user_id as string);
      if (error) return fail(500, "INTERNAL", error.message);
      return json(200, { ok: true });
    }
    default:
      return fail(422, "VALIDATION", "action: activate | deactivate | delete");
  }
});
