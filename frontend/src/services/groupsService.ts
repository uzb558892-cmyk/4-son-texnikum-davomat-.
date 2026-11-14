import type { Group } from '../types';
import { db, isDemoMode } from './supabase';
import { demoApi } from './demoData';

export const groupsService = {
  async list(): Promise<Group[]> {
    if (isDemoMode) return demoApi.groups();
    const { data, error } = await db().from('groups_overview')
      .select('id, name, course, leader_id, leader_name, student_count').order('name');
    if (error) throw error;
    return (data ?? []) as Group[];
  },
  async save(g: { id?: string; name: string; course: number; leader_id?: string | null }): Promise<void> {
    if (isDemoMode) { await demoApi.saveGroup(g); return; }
    const payload = { name: g.name, course: g.course, leader_id: g.leader_id ?? null };
    const q = g.id ? db().from('groups').update(payload).eq('id', g.id) : db().from('groups').insert(payload);
    const { error } = await q;
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    if (isDemoMode) { await demoApi.removeGroup(id); return; }
    const { error } = await db().from('groups').delete().eq('id', id);
    if (error) throw error;
  }
};
