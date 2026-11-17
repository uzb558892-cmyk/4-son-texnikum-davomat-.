import type { Group } from '../types';
import { db } from './supabase';

// Guruh nomidagi raqam bo'yicha tartiblash: 36, 53, 54, 55, 56, 100 ...
function sortGroups(list: Group[]): Group[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

export const groupsService = {
  async list(): Promise<Group[]> {
    const { data, error } = await db().from('groups_overview')
      .select('id, name, course, leader_id, leader_name, student_count')
      .order('name');
    if (error) throw error;
    return sortGroups((data ?? []) as Group[]);
  },
  async save(g: { id?: string; name: string; course: number; leader_id?: string | null }): Promise<void> {
    const payload = { name: g.name, course: g.course, leader_id: g.leader_id ?? null };
    const q = g.id ? db().from('groups').update(payload).eq('id', g.id) : db().from('groups').insert(payload);
    const { error } = await q;
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await db().from('groups').delete().eq('id', id);
    if (error) throw error;
  }
};
