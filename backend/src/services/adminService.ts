import type { Db } from "./client.ts";
import type { ProfileRow } from "../types/database.ts";
import type { ApiErrorBody, CreateGroupLeaderInput, CreateGroupLeaderResult, ManageGroupLeaderInput } from "../types/api.ts";
import { ApiError, fromPostgrestError } from "../utils/errors.ts";
import { validateCreateLeaderInput } from "../utils/validation.ts";

async function invoke<T>(db: Db, fn: string, body: unknown): Promise<T> {
  const { data, error } = await db.functions.invoke(fn, { body: body as Record<string, unknown> });
  if (error) {
    // supabase-js HTTP xatosida javob tanasini context ichida beradi
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = (await ctx.json()) as ApiErrorBody;
        throw new ApiError((parsed.error.code as ApiError["code"]) ?? "INTERNAL", parsed.error.message);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
    throw new ApiError("INTERNAL", error.message);
  }
  return data as T;
}

export function createGroupLeader(db: Db, input: CreateGroupLeaderInput): Promise<CreateGroupLeaderResult> {
  validateCreateLeaderInput(input);
  return invoke<CreateGroupLeaderResult>(db, "create-group-leader", input);
}

export function manageGroupLeader(db: Db, input: ManageGroupLeaderInput): Promise<{ ok: true }> {
  return invoke<{ ok: true }>(db, "manage-group-leader", input);
}

export async function listGroupLeaders(db: Db): Promise<ProfileRow[]> {
  const { data, error } = await db.from("profiles").select("*").eq("role", "group_leader").order("full_name");
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}
