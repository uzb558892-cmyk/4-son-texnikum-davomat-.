import { db } from './supabase';

export interface DutyRow {
  id: string;
  duty_user_id: string;
  duty_date: string; // YYYY-MM-DD
  name: string | null;
}

type RawName = { full_name: string | null };
interface RawRow {
  id: string;
  duty_user_id: string;
  duty_date: string;
  profiles?: RawName | RawName[] | null;
}

/** Bugungi sana, Asia/Tashkent bo'yicha (YYYY-MM-DD). */
export function todayTashkent(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

export const dutyService = {
  async list(month: string): Promise<DutyRow[]> {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const from = `${month}-01`;
    const to = `${month}-${String(last).padStart(2, '0')}`;
    const { data, error } = await db().from('duty_schedule')
      .select('id, duty_user_id, duty_date, profiles:duty_user_id(full_name)')
      .gte('duty_date', from)
      .lte('duty_date', to)
      .order('duty_date', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as RawRow[]).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return { id: r.id, duty_user_id: r.duty_user_id, duty_date: r.duty_date, name: p?.full_name ?? null };
    });
  },
  async add(userId: string, date: string, createdBy: string): Promise<void> {
    const { error } = await db().from('duty_schedule')
      .insert({ duty_user_id: userId, duty_date: date, created_by: createdBy });
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new Error("Bu navbatchi shu kunga allaqachon qo'shilgan");
      }
      throw error;
    }
  },
  async remove(id: string): Promise<void> {
    const { error } = await db().from('duty_schedule').delete().eq('id', id);
    if (error) throw error;
  }
};
