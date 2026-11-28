import type { DashboardStats } from '../types';
import { db } from './supabase';
import { todayISO } from '../utils/format';

const TTL_MS = 20_000;
const cache = new Map<string, { at: number; data: DashboardStats }>();

export function invalidateDashboardCache(): void {
  cache.clear();
}

export const dashboardService = {
  async stats(groupId?: string, force = false): Promise<DashboardStats> {
    const date = todayISO();
    const key = `${date}:${groupId ?? '__all__'}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (!force && hit && now - hit.at < TTL_MS) {
      return hit.data;
    }
    const { data, error } = await db().rpc('get_dashboard_stats', {
      p_date: date,
      p_group_id: groupId ?? null
    });
    if (error) throw error;
    const stats = data as DashboardStats;
    cache.set(key, { at: Date.now(), data: stats });
    return stats;
  }
};
