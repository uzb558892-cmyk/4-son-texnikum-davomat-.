import type { StudentWarning } from '../types';
import { db } from './supabase';

export const warningsService = {
  /**
   * 72 soatlik hisob-kitob BACKENDDA bajariladi (rpc get_unexcused_warnings).
   * Frontend faqat tayyor natijani ko'rsatadi.
   */
  async list(groupId?: string): Promise<StudentWarning[]> {
    const { data, error } = await db().rpc('get_unexcused_warnings', { p_group_id: groupId ?? null });
    if (error) throw error;
    return (data ?? []) as StudentWarning[];
  }
};
