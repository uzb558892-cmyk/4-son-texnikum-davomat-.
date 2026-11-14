import type { Db } from "./client.ts";
import type { WarningLetterRow, WarningStatus } from "../types/database.ts";
import { fromPostgrestError, unwrap } from "../utils/errors.ts";

export async function listWarnings(db: Db, f: { status?: WarningStatus; studentId?: string } = {}): Promise<WarningLetterRow[]> {
  let q = db.from("warning_letters").select("*").order("created_at", { ascending: false });
  if (f.status) q = q.eq("status", f.status);
  if (f.studentId) q = q.eq("student_id", f.studentId);
  const { data, error } = await q;
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}

/** Faqat administrator. Holat faqat oldinga: draft -> issued -> sent. */
export async function updateWarning(
  db: Db, id: string, patch: { letterText?: string; status?: WarningStatus },
): Promise<WarningLetterRow> {
  return unwrap(await db.rpc("update_warning", {
    p_id: id, p_letter_text: patch.letterText ?? null, p_status: patch.status ?? null,
  }));
}
