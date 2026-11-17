import type { DashboardStats } from '../types';
import { db } from './supabase';
import { todayISO } from '../utils/format';

export const dashboardService = {
  async stats(groupId?: string): Promise<DashboardStats> {
    const { data, error } = await db().rpc('get_dashboard_stats', { p_date: todayISO(), p_group_id: groupId ?? null });
    if (error) throw error;
    return data as DashboardStats;
  }
};
