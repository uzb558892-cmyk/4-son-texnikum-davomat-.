import type { DashboardStats } from '../types';
import { db, isDemoMode } from './supabase';
import { demoApi } from './demoData';
import { todayISO } from '../utils/format';

export const dashboardService = {
  async stats(groupId?: string): Promise<DashboardStats> {
    if (isDemoMode) return demoApi.dashboard(groupId);
    const { data, error } = await db().rpc('get_dashboard_stats', { p_date: todayISO(), p_group_id: groupId ?? null });
    if (error) throw error;
    return data as DashboardStats;
  }
};
