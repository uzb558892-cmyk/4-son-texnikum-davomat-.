import { useMemo, useState } from 'react';
import { usersService } from '../services';
import type { UserRow } from '../services/usersService';
import { dutyService, todayTashkent, type DutyRow } from '../services/dutyService';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { Field, Input, Select } from '../components/Fields';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ErrorBox, Toast } from '../components/Feedback';
import { errorMessage } from '../utils/format';

const WEEKDAY = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const BOX = 'mb-4 rounded-lg border px-4 py-3 text-sm font-medium';

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  const wd = WEEKDAY[new Date(y, m - 1, day).getDay()];
  return `${String(day).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}, ${wd}`;
}

export default function DutySchedule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDuty = user?.role === 'navbatchi';
  const today = todayTashkent();
  const [month, setMonth] = useState(today.slice(0, 7));
  const duty = useAsync(() => dutyService.list(month), [month]);
  const users = useAsync(() => (isAdmin ? usersService.list() : Promise.resolve([])), [isAdmin]);
  const [add, setAdd] = useState<{ userId: string; date: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);

  const notify = (m: string, t: 'ok' | 'err' = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2500); };

  const userList = (users.data ?? []) as UserRow[];
  const staff = useMemo(() => userList.filter((u) => u.role === 'navbatchi' && u.is_active), [userList]);
  const names = useMemo(() => new Map(userList.map((u) => [u.id, u.full_name] as const)), [userList]);

  const rows: DutyRow[] = useMemo(() => (duty.data ?? []).map((r) => ({
    ...r,
    name: r.name ?? names.get(r.duty_user_id) ?? (user && r.duty_user_id === user.id ? user.full_name : null)
  })), [duty.data, names, user]);

  const isCurrent = month === today.slice(0, 7);
  const ready = !duty.loading && !duty.error;
  const todayRows = rows.filter((r) => r.duty_date === today);
  const meOnDuty = !!user && todayRows.some((r) => r.duty_user_id === user.id);

  async function save() {
    if (!add?.userId || !add.date || !user) return;
    setSaving(true);
    try {
      await dutyService.add(add.userId, add.date, user.id);
      const m = add.date.slice(0, 7);
      setAdd(null);
      if (m !== month) setMonth(m); else duty.reload();
      notify("Qo'shildi");
    } catch (e) { notify(errorMessage(e), 'err'); } finally { setSaving(false); }
  }

  async function remove(r: DutyRow) {
    if (!confirm(`${r.name ?? 'Navbatchi'} — ${fmtDate(r.duty_date)} yozuvini o'chirishni tasdiqlaysizmi?`)) return;
    try { await dutyService.remove(r.id); duty.reload(); notify("O'chirildi"); } catch (e) { notify(errorMessage(e), 'err'); }
  }

  const cols: Column<DutyRow>[] = [
    { key: 'd', header: 'Sana', render: (r) => (
      <span className="font-semibold">
        {fmtDate(r.duty_date)}
        {r.duty_date === today && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">Bugun</span>}
      </span>
    ) },
    { key: 'n', header: 'Navbatchi', render: (r) => r.name ?? <span className="text-slate-400">Navbatchi</span> }
  ];
  if (isAdmin) cols.push({ key: 'a', header: '', className: 'text-right', render: (r) => (
    <div className="flex justify-end"><Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => remove(r)}>O'chirish</Button></div>
  ) });

  const subtitle = isAdmin ? 'Navbatchilarni kunlar bo\'yicha belgilash' : isDuty ? 'Sizning navbatchilik kunlaringiz' : 'Navbatchilik jadvali (faqat ko\'rish)';

  return (
    <>
      <PageHeader title="Navbatchilar jadvali" subtitle={subtitle}
        actions={<>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value || today.slice(0, 7))} />
          {isAdmin && <Button onClick={() => setAdd({ userId: '', date: today })}>+ Navbatchi qo'shish</Button>}
        </>} />
      {ready && isCurrent && isDuty && (meOnDuty
        ? <div className={`${BOX} border-emerald-200 bg-emerald-50 text-emerald-800`}>Bugun sizning navbatchilik kuningiz. Davomat belgilashingiz mumkin.</div>
        : <div className={`${BOX} border-amber-200 bg-amber-50 text-amber-800`}>Bugun sizning navbatchilik kuningiz emas.</div>)}
      {ready && isCurrent && !isDuty && (
        <div className={`${BOX} border-slate-200 bg-white text-slate-700`}>
          {todayRows.length ? `Bugungi navbatchi: ${todayRows.map((r) => r.name ?? 'Navbatchi').join(', ')}` : 'Bugun navbatchi belgilanmagan.'}
        </div>
      )}
      {duty.error && <ErrorBox message={duty.error} onRetry={duty.reload} />}
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} loading={duty.loading} />
      {add && (
        <Modal title="Navbatchi qo'shish" onClose={() => setAdd(null)}>
          <div className="space-y-4">
            <Field label="Navbatchi">
              <Select value={add.userId} onChange={(e) => setAdd({ ...add, userId: e.target.value })}>
                <option value="">Tanlang</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            </Field>
            {staff.length === 0 && <p className="text-xs text-slate-500">Navbatchi topilmadi. Avval Foydalanuvchilar sahifasidan navbatchi qo'shing.</p>}
            <Field label="Sana"><Input type="date" value={add.date} onChange={(e) => setAdd({ ...add, date: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdd(null)}>Bekor qilish</Button>
              <Button onClick={save} disabled={!add.userId || !add.date || saving}>Saqlash</Button>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.m} tone={toast.t} />}
    </>
  );
}
