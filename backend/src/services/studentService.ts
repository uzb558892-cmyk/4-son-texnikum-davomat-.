import type { Db } from "./client.ts";
import type { StudentRow } from "../types/database.ts";
import { fromPostgrestError, unwrap } from "../utils/errors.ts";

export interface StudentInput {
  groupId: string; fullName: string; studentCode?: string | null;
  parentName?: string | null; parentPhone?: string | null; parentAddress?: string | null;
}

/** Guruh rahbari uchun RLS avtomatik o‘z guruhini qaytaradi. */
export async function listStudents(db: Db, opts: { groupId?: string; includeInactive?: boolean } = {}): Promise<StudentRow[]> {
  let q = db.from("students").select("*").order("full_name");
  if (opts.groupId) q = q.eq("group_id", opts.groupId);
  if (!opts.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}

export async function createStudent(db: Db, i: StudentInput): Promise<StudentRow> {
  return unwrap(await db.from("students").insert({
    group_id: i.groupId, full_name: i.fullName.trim(), student_code: i.studentCode ?? null,
    parent_name: i.parentName ?? null, parent_phone: i.parentPhone ?? null, parent_address: i.parentAddress ?? null,
  }).select("*").single());
}

export async function updateStudent(db: Db, id: string, patch: Partial<StudentInput> & { isActive?: boolean }): Promise<StudentRow> {
  const u: Record<string, unknown> = {};
  if (patch.groupId !== undefined) u.group_id = patch.groupId;
  if (patch.fullName !== undefined) u.full_name = patch.fullName.trim();
  if (patch.studentCode !== undefined) u.student_code = patch.studentCode;
  if (patch.parentName !== undefined) u.parent_name = patch.parentName;
  if (patch.parentPhone !== undefined) u.parent_phone = patch.parentPhone;
  if (patch.parentAddress !== undefined) u.parent_address = patch.parentAddress;
  if (patch.isActive !== undefined) u.is_active = patch.isActive;
  return unwrap(await db.from("students").update(u).eq("id", id).select("*").single());
}
