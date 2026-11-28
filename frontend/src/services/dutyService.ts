import { db } from './supabase';

export interface DutyRow {
  id: string;
  duty_user_id: string;
  duty_date: string; // YYYY-MM-DD
  name: string | null;
  weekday?: number; // 1=Dushanba .. 6=Shanba
}

/** Bugungi sana, Asia/Tashkent bo'yicha (YYYY-MM-DD). */
export function todayTashkent(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

/**
 * Doimiy (cheksiz) haftalik navbatchilik jadvali:
 * 1=Dushanba, 2=Seshanba, 3=Chorshanba, 4=Payshanba, 5=Juma, 6=Shanba
 */
export const RECURRING_WEEKLY_DUTY: Record<number, Array<{ userId: string; name: string }>> = {
  1: [
    { userId: '56c9958f-0a6c-421c-bb74-02dcede09888', name: "ULUG'BEK" },
    { userId: '56f3730d-c6d0-42f8-8697-39e1163f7c54', name: "MUSAHON" }
  ],
  2: [
    { userId: 'e7b928a0-b63d-4053-bec3-00182fe5f560', name: "A'ZAMJON" },
    { userId: '801450aa-4260-48ea-aeba-1da8840db790', name: "ABDURASUL" }
  ],
  3: [
    { userId: '84359be2-e8f6-45d7-a81d-ae76a15b9c01', name: "ABDUVAHOB" },
    { userId: '77f8afee-1e7e-410a-852a-9e2482b03ae4', name: "SHAXNOZA" }
  ],
  4: [
    { userId: 'a5a50e7e-2220-4520-a070-b1cf4adf3755', name: "MUHIBULLO" },
    { userId: 'e477ae28-1abf-4ee0-be48-c749dcc2a759', name: "GULIDA" }
  ],
  5: [
    { userId: '2521f590-dc06-45b3-be08-01938907a2b8', name: "ANVARJON" },
    { userId: '4dc0a5a1-9738-4625-8b1c-5b8c3d327327', name: "UMIDJON" }
  ],
  6: [
    { userId: 'f0765c3f-e876-4367-8e39-4c2eb014aed5', name: "MAHLIYO" },
    { userId: '3fb026f1-070b-4032-abf9-b6311c849282', name: "MUHAMMADYUSUF" }
  ]
};

function getWeekdayMonToSun(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Yakshanba, 1=Dushanba .. 6=Shanba
}

export function getRecurringDutiesForDate(dateStr: string): DutyRow[] {
  const dow = getWeekdayMonToSun(dateStr);
  const assigned = RECURRING_WEEKLY_DUTY[dow] ?? [];
  return assigned.map((person, idx) => ({
    id: `recurring-${dateStr}-${person.userId}-${idx}`,
    duty_user_id: person.userId,
    duty_date: dateStr,
    name: person.name,
    weekday: dow
  }));
}

export const dutyService = {
  async list(month: string): Promise<DutyRow[]> {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const rows: DutyRow[] = [];
    for (let day = 1; day <= last; day++) {
      const ds = `${month}-${String(day).padStart(2, '0')}`;
      rows.push(...getRecurringDutiesForDate(ds));
    }
    return rows;
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
