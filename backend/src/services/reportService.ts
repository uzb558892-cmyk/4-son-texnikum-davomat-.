import type { Db } from "./client.ts";
import type { GroupAttendanceDailyRow, StudentAbsenceSummaryRow } from "../types/database.ts";
import { fromPostgrestError } from "../utils/errors.ts";

/** O‘quvchilar bo‘yicha uzrli/uzrsiz soatlar va 72 soat chegarasi. Rahbar uchun faqat o‘z guruhi. */
export async function studentAbsenceSummary(
  db: Db, f: { groupId?: string; onlyExceeded?: boolean } = {},
): Promise<StudentAbsenceSummaryRow[]> {
  let q = db.from("v_student_absence_summary").select("*").order("unexcused_hours", { ascending: false });
  if (f.groupId) q = q.eq("group_id", f.groupId);
  if (f.onlyExceeded) q = q.eq("threshold_exceeded", true);
  const { data, error } = await q;
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}

export async function groupDailyReport(
  db: Db, f: { groupId?: string; from?: string; to?: string } = {},
): Promise<GroupAttendanceDailyRow[]> {
  let q = db.from("v_group_attendance_daily").select("*").order("lesson_date", { ascending: false }).order("para");
  if (f.groupId) q = q.eq("group_id", f.groupId);
  if (f.from) q = q.gte("lesson_date", f.from);
  if (f.to) q = q.lte("lesson_date", f.to);
  const { data, error } = await q;
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}
