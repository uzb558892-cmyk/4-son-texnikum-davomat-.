import { db } from './supabase';

export interface ParentRecord {
  date: string;
  para: number;
  status: string;
  hours: number;
}

export interface ParentView {
  full_name: string;
  group_name: string;
  threshold_hours: number;
  unexcused_hours: number;
  excused_hours: number;
  records: ParentRecord[];
}

export const parentService = {
  async get(code: string): Promise<ParentView | null> {
    const { data, error } = await db().rpc('get_parent_view', { p_code: code });
    if (error) throw error;
    return (data ?? null) as ParentView | null;
  },
};
