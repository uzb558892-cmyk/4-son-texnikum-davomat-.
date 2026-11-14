import type { Db } from "./client.ts";
import type { GroupRow } from "../types/database.ts";
import { fromPostgrestError, unwrap } from "../utils/errors.ts";

export async function listGroups(db: Db): Promise<GroupRow[]> {
  const { data, error } = await db.from("groups").select("*").order("name");
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}

export async function createGroup(db: Db, input: { name: string; parasPerDay?: number | null }): Promise<GroupRow> {
  return unwrap(await db.from("groups").insert({ name: input.name.trim(), paras_per_day: input.parasPerDay ?? null }).select("*").single());
}

export async function updateGroup(
  db: Db, id: string, patch: { name?: string; parasPerDay?: number | null; isActive?: boolean },
): Promise<GroupRow> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.parasPerDay !== undefined) update.paras_per_day = patch.parasPerDay;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  return unwrap(await db.from("groups").update(update).eq("id", id).select("*").single());
}

/** Rahbarni guruhga biriktirish / (null) olib tashlash. Bir rahbar — bitta guruh. */
export async function assignLeader(db: Db, groupId: string, leaderId: string | null): Promise<GroupRow> {
  return unwrap(await db.from("groups").update({ leader_id: leaderId }).eq("id", groupId).select("*").single());
}
