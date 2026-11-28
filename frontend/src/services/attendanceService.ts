import type { AttendanceRecord } from '../types';
import { db } from './supabase';
import { invalidateDashboardCache } from './dashboardService';

const toUiStatus = (s: string): AttendanceRecord['status'] =>
  s === 'excused_absent' ? 'excused' : s === 'unexcused_absent' ? 'unexcused' : s === 'escaped' ? 'skipped' : 'present';

export interface GroupLockInfo {
  markedBy: string;
  markedByName: string;
}

const LOCK_TTL_MS = 20_000;
const lockCache = new Map<string, { at: number; data: Record<string, GroupLockInfo> }>();

export function invalidateLocksCache(date?: string): void {
  if (date) lockCache.delete(date);
  else lockCache.clear();
}

export const attendanceService = {
  async get(groupId: string, date: string, lesson: number): Promise<AttendanceRecord[]> {
    const { data, error } = await db().from('attendance')
      .select('id, student_id, group_id, lesson_date, para, status, escaped_after_para')
      .eq('group_id', groupId).eq('lesson_date', date).eq('para', lesson);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, student_id: r.student_id, group_id: r.group_id, date: r.lesson_date,
      lesson: r.para, status: toUiStatus(r.status), skip_after: r.escaped_after_para
    })) as AttendanceRecord[];
  },
  async getGroupLocks(date: string, force = false): Promise<Record<string, GroupLockInfo>> {
    const now = Date.now();
    const hit = lockCache.get(date);
    if (!force && hit && now - hit.at < LOCK_TTL_MS) {
      return hit.data;
    }
    const { data, error } = await db().from('attendance')
      .select('group_id, marked_by, profiles:marked_by(full_name)')
      .eq('lesson_date', date)
      .not('marked_by', 'is', null);
    if (error) throw error;
    const map: Record<string, GroupLockInfo> = {};
    for (const r of (data ?? []) as any[]) {
      if (!r.group_id || !r.marked_by || map[r.group_id]) continue;
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      map[r.group_id] = {
        markedBy: r.marked_by,
        markedByName: prof?.full_name ?? 'Boshqa navbatchi'
      };
    }
    lockCache.set(date, { at: Date.now(), data: map });
    return map;
  },
  async save(rows: AttendanceRecord[]): Promise<void> {
    const batches = new Map<number, Array<{ student_id: string; status: string; note: null }>>();
    for (const row of rows) {
      const para = row.status === 'skipped' ? (row.skip_after ?? row.lesson) : row.lesson;
      const status = row.status === 'skipped' ? 'escaped'
        : row.status === 'excused' ? 'excused_absent'
        : row.status === 'unexcused' ? 'unexcused_absent' : 'present';
      const batch = batches.get(para) ?? [];
      batch.push({ student_id: row.student_id, status, note: null });
      batches.set(para, batch);
    }
    for (const [para, records] of batches) {
      const { error } = await db().rpc('mark_attendance_bulk', {
        p_group_id: rows[0].group_id, p_lesson_date: rows[0].date,
        p_para: para, p_records: records
      });
      if (error) throw error;
    }
    if (rows[0]?.date) invalidateLocksCache(rows[0].date);
    invalidateDashboardCache();
  }
};
