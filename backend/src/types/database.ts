// Qo‘lda yozilgan sxema turlari (migratsiyalar bilan mos).
// Muqobil: `npm run gen:types` — Supabase CLI avtomatik generatsiya qiladi.
export type UserRole = "admin" | "group_leader";
export type AttendanceStatus = "present" | "excused_absent" | "unexcused_absent" | "escaped";
export type WarningStatus = "draft" | "issued" | "sent";

export interface ProfileRow {
  id: string; role: UserRole; full_name: string; phone: string | null;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface GroupRow {
  id: string; name: string; leader_id: string | null; paras_per_day: number | null;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface StudentRow {
  id: string; group_id: string; full_name: string; student_code: string | null;
  parent_name: string | null; parent_phone: string | null; parent_address: string | null;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface AttendanceRow {
  id: string; student_id: string; group_id: string; lesson_date: string; para: number;
  status: AttendanceStatus; academic_hours: number; note: string | null;
  is_auto: boolean; escaped_after_para: number | null; marked_by: string | null;
  created_at: string; updated_at: string;
}
export interface AttendanceAuditRow {
  id: number; attendance_id: string; student_id: string; group_id: string;
  lesson_date: string; para: number; action: "insert" | "update" | "delete";
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null;
  changed_by: string | null; changed_at: string;
}
export interface WarningLetterRow {
  id: string; student_id: string; level: number; unexcused_hours: number; threshold_hours: number;
  status: WarningStatus; letter_text: string; created_at: string;
  issued_at: string | null; sent_at: string | null; handled_by: string | null;
}
export interface SettingRow {
  key: string; value: unknown; description: string | null; updated_by: string | null; updated_at: string;
}
export interface StudentAbsenceSummaryRow {
  student_id: string; group_id: string; group_name: string; full_name: string;
  unexcused_hours: number; excused_hours: number; escaped_count: number; present_paras: number;
  threshold_hours: number; threshold_exceeded: boolean;
}
export interface GroupAttendanceDailyRow {
  group_id: string; lesson_date: string; para: number;
  present: number; excused_absent: number; unexcused_absent: number; escaped: number;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};
type View<Row> = { Row: Row; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, never, Pick<Partial<ProfileRow>, "full_name" | "phone" | "is_active">>;
      groups: Table<GroupRow, { name: string; leader_id?: string | null; paras_per_day?: number | null; is_active?: boolean }>;
      students: Table<StudentRow, {
        group_id: string; full_name: string; student_code?: string | null; parent_name?: string | null;
        parent_phone?: string | null; parent_address?: string | null; is_active?: boolean;
      }>;
      attendance: Table<AttendanceRow, never, never>;
      attendance_audit: Table<AttendanceAuditRow, never, never>;
      warning_letters: Table<WarningLetterRow, never, never>;
      settings: Table<SettingRow, never, never>;
    };
    Views: {
      v_student_absence_summary: View<StudentAbsenceSummaryRow>;
      v_group_attendance_daily: View<GroupAttendanceDailyRow>;
    };
    Functions: {
      mark_attendance: {
        Args: { p_student_id: string; p_lesson_date: string; p_para: number; p_status: AttendanceStatus; p_note?: string | null };
        Returns: AttendanceRow;
      };
      mark_attendance_bulk: {
        Args: { p_group_id: string; p_lesson_date: string; p_para: number; p_records: unknown };
        Returns: number;
      };
      update_setting: { Args: { p_key: string; p_value: unknown }; Returns: SettingRow };
      update_warning: {
        Args: { p_id: string; p_letter_text?: string | null; p_status?: WarningStatus | null };
        Returns: WarningLetterRow;
      };
    };
    Enums: {
      user_role: UserRole; attendance_status: AttendanceStatus; warning_status: WarningStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
