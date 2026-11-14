import type { AttendanceStatus } from "../types/database.ts";
import type { BulkMarkInput, CreateGroupLeaderInput, MarkAttendanceInput } from "../types/api.ts";
import { ApiError } from "./errors.ts";
import { isValidDateString } from "./date.ts";
import { MAX_PARAS_PER_DAY } from "./attendanceRules.ts";

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] =
  ["present", "excused_absent", "unexcused_absent", "escaped"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
export const isAttendanceStatus = (v: unknown): v is AttendanceStatus =>
  typeof v === "string" && (ATTENDANCE_STATUSES as readonly string[]).includes(v);

function bad(message: string): never { throw new ApiError("VALIDATION", message); }

export function validateMarkInput(i: MarkAttendanceInput): void {
  if (!isUuid(i.studentId)) bad("studentId noto‘g‘ri");
  if (!isValidDateString(i.lessonDate)) bad("lessonDate YYYY-MM-DD ko‘rinishida bo‘lishi kerak");
  if (!Number.isInteger(i.para) || i.para < 1 || i.para > MAX_PARAS_PER_DAY) bad(`para 1..${MAX_PARAS_PER_DAY} bo‘lishi kerak`);
  if (!isAttendanceStatus(i.status)) bad("status noto‘g‘ri");
  if (i.status === "escaped" && i.para > 3) bad("Darsdan qochdi faqat 1, 2 yoki 3-paradan keyin belgilanadi");
  if (i.note != null && i.note.length > 500) bad("note 500 belgidan oshmasligi kerak");
}

export function validateBulkInput(i: BulkMarkInput): void {
  if (!isUuid(i.groupId)) bad("groupId noto‘g‘ri");
  if (!Array.isArray(i.records) || i.records.length === 0) bad("records bo‘sh bo‘lmasligi kerak");
  const seen = new Set<string>();
  for (const r of i.records) {
    validateMarkInput({ studentId: r.studentId, lessonDate: i.lessonDate, para: i.para, status: r.status, note: r.note });
    if (seen.has(r.studentId)) bad(`O‘quvchi takrorlangan: ${r.studentId}`);
    seen.add(r.studentId);
  }
}

export function validateCreateLeaderInput(i: CreateGroupLeaderInput): void {
  if (!isEmail(i.email)) bad("email noto‘g‘ri");
  if (typeof i.password !== "string" || i.password.length < 10 || i.password.length > 72) bad("parol 10..72 belgi bo‘lishi kerak");
  if (typeof i.full_name !== "string" || i.full_name.trim().length < 2 || i.full_name.trim().length > 120) bad("full_name noto‘g‘ri");
  if (i.group_id != null && !isUuid(i.group_id)) bad("group_id noto‘g‘ri");
}
