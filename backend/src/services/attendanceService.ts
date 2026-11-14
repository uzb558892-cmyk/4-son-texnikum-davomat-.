import type { Db } from "./client.ts";
import type { AttendanceAuditRow, AttendanceRow, StudentRow } from "../types/database.ts";
import type { BulkMarkInput, MarkAttendanceInput } from "../types/api.ts";
import { fromPostgrestError, unwrap } from "../utils/errors.ts";
import { validateBulkInput, validateMarkInput } from "../utils/validation.ts";

/** Bitta o‘quvchi/sana/para uchun belgi. "escaped" bo‘lsa keyingi paralar serverda uzrsiz qilinadi. */
export async function markAttendance(db: Db, input: MarkAttendanceInput): Promise<AttendanceRow> {
  validateMarkInput(input);
  return unwrap(await db.rpc("mark_attendance", {
    p_student_id: input.studentId, p_lesson_date: input.lessonDate, p_para: input.para,
    p_status: input.status, p_note: input.note ?? null,
  }));
}

/** Butun guruhni bir para uchun belgilash (atomik). Qaytadi: yozilganlar soni. */
export async function markAttendanceBulk(db: Db, input: BulkMarkInput): Promise<number> {
  validateBulkInput(input);
  return unwrap(await db.rpc("mark_attendance_bulk", {
    p_group_id: input.groupId, p_lesson_date: input.lessonDate, p_para: input.para,
    p_records: input.records.map((r) => ({ student_id: r.studentId, status: r.status, note: r.note ?? null })),
  }));
}

/** Davomat varag‘i: guruh o‘quvchilari + shu kundagi barcha para yozuvlari. */
export async function getDaySheet(db: Db, groupId: string, lessonDate: string):
  Promise<{ students: StudentRow[]; records: AttendanceRow[] }> {
  const s = await db.from("students").select("*").eq("group_id", groupId).eq("is_active", true).order("full_name");
  if (s.error) throw fromPostgrestError(s.error);
  const studentIds = (s.data ?? []).map((x: StudentRow) => x.id);
  if (studentIds.length === 0) return { students: [], records: [] };
  const a = await db.from("attendance").select("*").in("student_id", studentIds).eq("lesson_date", lessonDate).order("para");
  if (a.error) throw fromPostgrestError(a.error);
  return { students: s.data ?? [], records: a.data ?? [] };
}

export async function listAttendance(
  db: Db, f: { studentId?: string; groupId?: string; from?: string; to?: string; limit?: number },
): Promise<AttendanceRow[]> {
  let q = db.from("attendance").select("*").order("lesson_date", { ascending: false }).order("para").limit(f.limit ?? 500);
  if (f.studentId) q = q.eq("student_id", f.studentId);
  if (f.groupId) q = q.eq("group_id", f.groupId);
  if (f.from) q = q.gte("lesson_date", f.from);
  if (f.to) q = q.lte("lesson_date", f.to);
  const { data, error } = await q;
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}

export async function listAudit(db: Db, f: { groupId?: string; attendanceId?: string; limit?: number } = {}): Promise<AttendanceAuditRow[]> {
  let q = db.from("attendance_audit").select("*").order("changed_at", { ascending: false }).limit(f.limit ?? 200);
  if (f.groupId) q = q.eq("group_id", f.groupId);
  if (f.attendanceId) q = q.eq("attendance_id", f.attendanceId);
  const { data, error } = await q;
  if (error) throw fromPostgrestError(error);
  return data ?? [];
}
