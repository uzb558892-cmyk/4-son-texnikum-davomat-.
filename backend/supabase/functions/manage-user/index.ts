// Administrator guruh rahbari, manaviyatchi yoki navbatchini boshqaradi:
// update | deactivate | activate | reset_password | assign_group (faqat group_leader uchun).
// Administrator hisobiga hech qachon tegmaydi (buning uchun manage-admin bor).
import { corsHeaders, fail, isName, isStrongPassword, isUuid, json, readJson, requireAdmin, serviceClient } from "../_shared/common.ts";

const BAN_FOREVER = "876000h";
const MANAGED_ROLES = ["group_leader", "manaviyatchi", "direktor", "navbatchi"];

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

  const { data: target, error: targetErr } = await svc.from("profiles").select("id, role").eq("id", user_id).maybeSingle();
  if (targetErr) return fail(500, "INTERNAL", "Profilni o‘qib bo‘lmadi");
  if (!target) return fail(404, "NOT_FOUND", "Foydalanuvchi topilmadi");
  if (!MANAGED_ROLES.includes(target.role)) return fail(403, "FORBIDDEN", "Bu rol uchun boshqa funksiya ishlatiladi");

  switch (action) {
    case "update": {
      const patch: Record<string, unknown> = {};
      if (body.full_name !== undefined) {
        if (!isName(body.full_name)) return fail(422, "VALIDATION", "full_name noto‘g‘ri");
        patch.full_name = (body.full_name as string).trim();
      }
      if (body.phone !== undefined) {
        if (body.phone !== null && (typeof body.phone !== "string" || body.phone.length > 32)) return fail(422, "VALIDATION", "phone noto‘g‘ri");
        patch.phone = body.phone;
      }
      if (body.job_title !== undefined) {
        if (body.job_title !== null && (typeof body.job_title !== "string" || body.job_title.length > 120)) return fail(422, "VALIDATION", "job_title noto‘g‘ri");
        patch.job_title = body.job_title;
      }
      if (Object.keys(patch).length === 0) return fail(422, "VALIDATION", "O‘zgartirish uchun maydon yo‘q");
      const { error } = await svc.from("profiles").update(patch).eq("id", user_id);
      if (error) return fail(500, "INTERNAL", error.message);
      return json(200, { ok: true });
    }
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
    case "assign_group": {
      if (target.role !== "group_leader") return fail(403, "FORBIDDEN", "Faqat guruh rahbariga guruh biriktiriladi");
      if (body.group_id !== null && !isUuid(body.group_id)) return fail(422, "VALIDATION", "group_id noto‘g‘ri");
      if (body.group_id) {
        const { data: targetGroup, error: targetGroupErr } = await svc.from("groups")
          .select("id,leader_id").eq("id", body.group_id).maybeSingle();
        if (targetGroupErr) return fail(500, "INTERNAL", "Guruhni tekshirib bo‘lmadi");
        if (!targetGroup) return fail(404, "NOT_FOUND", "Guruh topilmadi");
        if (targetGroup.leader_id && targetGroup.leader_id !== user_id)
          return fail(409, "GROUP_ALREADY_ASSIGNED", "Bu guruhga boshqa rahbar biriktirilgan");
      }
      const { error: clearErr } = await svc.from("groups").update({ leader_id: null }).eq("leader_id", user_id);
      if (clearErr) return fail(500, "INTERNAL", clearErr.message);
      if (body.group_id) {
        const { data: assigned, error } = await svc.from("groups").update({ leader_id: user_id })
          .eq("id", body.group_id).select("id").maybeSingle();
        if (error || !assigned) return fail(500, "INTERNAL", error?.message ?? "Guruhga biriktirib bo‘lmadi");
      }
      return json(200, { ok: true });
    }
    case "reset_password": {
      if (!isStrongPassword(body.password)) return fail(422, "VALIDATION", "parol kamida 10 belgidan iborat bo‘lishi kerak");
      const { error } = await svc.auth.admin.updateUserById(user_id as string, { password: body.password as string });
      if (error) return fail(500, "INTERNAL", error.message);
      return json(200, { ok: true });
    }
    default:
      return fail(422, "VALIDATION", "action: update | deactivate | activate | reset_password | assign_group");
  }
});
