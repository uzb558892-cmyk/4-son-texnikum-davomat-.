// Administrator uchun foydalanuvchilar ro'yxati. Email faqat Auth Admin API'dan olinadi.
import { corsHeaders, fail, json, requireAdmin, serviceClient } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED", "Faqat POST");
  const svc = serviceClient();
  const auth = await requireAdmin(req, svc);
  if (auth instanceof Response) return auth;

  const [{ data: profiles, error: profileErr }, { data: groups, error: groupErr }, { data: users, error: usersErr }] =
    await Promise.all([
      svc.from("profiles").select("id,full_name,role,is_active,phone,is_primary,job_title").order("full_name"),
      svc.from("groups").select("id,name,leader_id"),
      svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    ]);
  if (profileErr || groupErr || usersErr) return fail(500, "INTERNAL", "Foydalanuvchilarni olishda xatolik");
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const groupByLeader = new Map((groups ?? []).filter((g) => g.leader_id).map((g) => [g.leader_id, g]));
  return json(200, (profiles ?? []).map((p) => {
    const g = groupByLeader.get(p.id);
    return { ...p, email: emailById.get(p.id) ?? "", group_id: g?.id ?? null, group_name: g?.name ?? null };
  }));
});
