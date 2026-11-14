// Frontend va backend o‘rtasidagi shartnoma (DTO'lar). docs/API.md bilan mos.
import type { AttendanceStatus } from "./database.ts";

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface CreateGroupLeaderInput {
  email: string;
  password: string; // kamida 10 belgi
  full_name: string;
  phone?: string | null;
  group_id?: string | null;
}
export interface CreateGroupLeaderResult {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  group_id: string | null;
  role: "group_leader";
}

export type ManageGroupLeaderInput =
  | { action: "update"; user_id: string; full_name?: string; phone?: string | null }
  | { action: "deactivate"; user_id: string }
  | { action: "activate"; user_id: string }
  | { action: "reset_password"; user_id: string; password: string };

export interface MarkAttendanceInput {
  studentId: string;
  lessonDate: string; // YYYY-MM-DD
  para: number;       // 1..paras_per_day
  status: AttendanceStatus;
  note?: string | null;
}

export interface BulkMarkInput {
  groupId: string;
  lessonDate: string;
  para: number;
  records: Array<{ studentId: string; status: AttendanceStatus; note?: string | null }>;
}

export type SettingKey =
  | "academic_hours_per_para"
  | "paras_per_day"
  | "warning_threshold_hours"
  | "college_name"
  | "timezone";
