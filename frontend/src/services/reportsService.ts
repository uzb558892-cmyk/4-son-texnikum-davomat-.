import type { ReportQuery, ReportRow } from '../types';
import { db, isDemoMode } from './supabase';
import { demoApi } from './demoData';

export const reportsService = {
  async get(q: ReportQuery): Promise<ReportRow[]> {
    if (isDemoMode) return demoApi.report(q);
    const { data, error } = await db().rpc('get_attendance_report', {
      p_period: q.period,
      p_date: q.date,
      p_group_by: q.groupBy,
      p_group_id: q.groupId ?? null
    });
    if (error) throw error;
    return (data ?? []) as ReportRow[];
  }
};
