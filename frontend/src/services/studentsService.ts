import type { Student } from '../types';
import { db, isDemoMode } from './supabase';
import { demoApi } from './demoData';

export interface ParentCodeRow {
  student_id: string;
  full_name: string;
  group_id: string;
  group_name: string;
  parent_code: string;
}

export const studentsService = {
  async list(groupId?: string): Promise<Student[]> {
    if (isDemoMode) return demoApi.students(groupId);
    let q = db().from('students_overview')
      .select('id, full_name, group_id, group_name, phone, parent_phone, is_active').order('full_name');
    if (groupId) q = q.eq('group_id', groupId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Student[];
  },
  async save(s: { id?: string; full_name: string; group_id: string; phone?: string | null; parent_phone?: string | null }): Promise<void> {
    if (isDemoMode) { await demoApi.saveStudent(s); return; }
    const payload = { full_name: s.full_name, group_id: s.group_id, phone: s.phone || null, parent_phone: s.parent_phone || null };
    const q = s.id ? db().from('students').update(payload).eq('id', s.id) : db().from('students').insert(payload);
    const { error } = await q;
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    if (isDemoMode) { await demoApi.removeStudent(id); return; }
    const { error } = await db().from('students').delete().eq('id', id);
    if (error) throw error;
  },
  async parentCodes(groupId?: string): Promise<ParentCodeRow[]> {
    if (isDemoMode) return [];
    const { data, error } = await db().rpc('get_parent_codes', { p_group_id: groupId || null });
    if (error) throw error;
    return (data ?? []) as ParentCodeRow[];
  },
};
