export type Role = 'admin' | 'group_leader' | 'manaviyatchi' | 'navbatchi';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  group_id: string | null;
  is_active: boolean;
}

export interface Group {
  id: string;
  name: string;
  course: number;
  leader_id: string | null;
  leader_name?: string | null;
  student_count?: number;
}

export interface Student {
  id: string;
  full_name: string;
  group_id: string;
  group_name?: string;
  phone?: string | null;
  parent_phone?: string | null;
  is_active: boolean;
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'skipped';
export type SkipAfter = 1 | 2 | 3;

export interface AttendanceRecord {
  id?: string;
  student_id: string;
  group_id: string;
  date: string; // YYYY-MM-DD
  lesson: number; // para raqami
  status: AttendanceStatus;
  skip_after: SkipAfter | null;
}

export interface WarningAbsence {
  date: string;
  lesson: number;
  status: AttendanceStatus;
}

/** Backend (rpc get_unexcused_warnings) qaytaradigan tayyor natija. */
export interface StudentWarning {
  student_id: string;
  student_name: string;
  group_id: string;
  group_name: string;
  phone?: string | null;
  parent_phone?: string | null;
  unexcused_hours: number;
  threshold_hours: number;
  last_absence_date: string | null;
  absences: WarningAbsence[];
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReportGroupBy = 'group' | 'student';

export interface ReportQuery {
  period: ReportPeriod;
  date: string;
  groupBy: ReportGroupBy;
  groupId?: string;
}

export interface ReportRow {
  key: string;
  label: string;
  sub?: string;
  present: number;
  excused: number;
  unexcused: number;
  skipped: number;
  excused_hours: number;
  unexcused_hours: number;
}

export interface GroupToday {
  group_id: string;
  group_name: string;
  total: number;
  present: number;
  excused: number;
  unexcused: number;
  skipped: number;
}

export interface DashboardStats {
  groups: number;
  students: number;
  present: number;
  excused: number;
  unexcused: number;
  skipped: number;
  warnings: number;
  groupsToday: GroupToday[];
}

export interface NewUserInput {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  group_id: string | null;
}

export interface Announcement {
  id: string;
  author_id: string;
  author_name: string;
  author_role: Role | string;
  title: string;
  body: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface NewAnnouncementInput {
  title: string;
  body: string;
  files?: File[];
}

export interface UpdateAnnouncementInput {
  title: string;
  body: string;
  existingImageUrls: string[];
  newFiles?: File[];
}
