import type { Group } from '../types';
import { db } from './supabase';

function sortGroups(list: Group[]): Group[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

const TTL_MS = 60_000;
let cachedList: { at: number; data: Group[] } | null = null;
let inflightList: Promise<Group[]> | null = null;

export function invalidateGroupsCache(): void {
  cachedList = null;
  inflightList = null;
}

export const groupsService = {
  async list(force = false): Promise<Group[]> {
    const now = Date.now();
    if (!force && cachedList && now - cachedList.at < TTL_MS) {
      return cachedList.data;
    }
    if (!force && inflightList) {
      return inflightList;
    }
    inflightList = (async () => {
      try {
        const { data, error } = await db()
          .from('groups_overview')
          .select('id, name, course, leader_id, leader_name, student_count')
          .order('name');
        if (error) throw error;
        const sorted = sortGroups((data ?? []) as Group[]);
        cachedList = { at: Date.now(), data: sorted };
        return sorted;
      } finally {
        inflightList = null;
      }
    })();
    return inflightList;
  },
  async save(g: { id?: string; name: string; course: number; leader_id?: string | null }): Promise<void> {
    const payload = { name: g.name, course: g.course, leader_id: g.leader_id ?? null };
    const q = g.id ? db().from('groups').update(payload).eq('id', g.id) : db().from('groups').insert(payload);
    const { error } = await q;
    if (error) throw error;
    invalidateGroupsCache();
  },
  async remove(id: string): Promise<void> {
    const { error } = await db().from('groups').delete().eq('id', id);
    if (error) throw error;
    invalidateGroupsCache();
  }
};
