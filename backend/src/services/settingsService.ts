import type { Db } from "./client.ts";
import type { SettingRow } from "../types/database.ts";
import type { SettingKey } from "../types/api.ts";
import { fromPostgrestError, unwrap } from "../utils/errors.ts";

export async function getSettings(db: Db): Promise<SettingRow[]> {
  const { data, error } = await db.from("settings").select("*").order("key");
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}

/** Faqat administrator. Masalan: updateSetting(db, "academic_hours_per_para", 2). */
export async function updateSetting(db: Db, key: SettingKey, value: number | string): Promise<SettingRow> {
  return unwrap(await db.rpc("update_setting", { p_key: key, p_value: value }));
}
