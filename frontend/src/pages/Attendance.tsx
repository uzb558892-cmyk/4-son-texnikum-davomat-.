import { useEffect, useMemo, useState } from 'react';
import { attendanceService, groupsService, studentsService } from '../services';
import { dutyService, todayTashkent, type DutyRow } from '../services/dutyService';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { Field, Input, Select, SearchInput } from '../components/Fields';
import Button from '../components/Button';
import { ErrorBox, Toast } from '../components/Feedback';
import { STATUS_META, STATUS_ORDER } from '../utils/constants';
import { cx, errorMessage, todayISO } from '../utils/format';
import type { AttendanceRecord, AttendanceStatus } from '../types';

interface Mark { status: AttendanceStatus }

const BOX = 'mb-4 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xs';

export default function Attendance() {
  const { user } = useAuth();
  const role = user?.role;
  const seeAll = role !== 'group_leader';
  const isDuty = role === 'navbatchi';
  const [date, setDate] = useState(isDuty ? todayTashkent() : todayISO());
  const lesson = 1;
  const [groupId, setGroupId] = useState(seeAll ? '' : user?.group_id ?? '');
  const [q, setQ] = useState('');
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);
  const notify = (m: string, t: 'ok' | 'err' = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2500); };

  const groups = useAsync(() => groupsService.list(), []);
  const duty = useAsync(() => (isDuty ? dutyService.list(todayTashkent().slice(0, 7)) : Promise.resolve([] as DutyRow[])), [isDuty]);
  useEffect(() => { if (!groupId && groups.data?.length) setGroupId(groups.data[0].id); }, [groups.data, groupId]);

  const meOnDuty = !!user && (duty.data ?? []).some((r) => r.duty_date === todayTashkent() && r.duty_user_id === user.id);
  const canEdit = role === 'admin' || role === 'group_leader' || (isDuty && meOnDuty);

  const students = useAsync(() => (groupId ? studentsService.list(groupId) : Promise.resolve([])), [groupId]);
  const existing = useAsync(() => (groupId ? attendanceService.get(groupId, date, lesson) : Promise.resolve([])), [groupId, date, lesson]);

  useEffect(() => {
    const m: Record<string, Mark> = {};
    (existing.data ?? []).forEach((r) => { m[r.student_id] = { status: r.status }; });
    setMarks(m);
  }, [existing.data]);

  const list = useMemo(() => (students.data ?? []).filter((s) => s.full_name.toLowerCase().includes(q.toLowerCase())), [students.data, q]);
  const total = students.data?.length ?? 0;
  const marked = (students.data ?? []).filter((s) => marks[s.id]).length;

  const set = (id: string, status: AttendanceStatus) => {
    if (!canEdit) return;
    setMarks((m) => ({ ...m, [id]: { status } }));
  };
  const allPresent = () => {
    if (!canEdit) return;
    setMarks(Object.fromEntries((students.data ?? []).map((s) => [s.id, { status: 'present' as const }])));
  };

  async function save() {
    if (!canEdit) return;
    const rows: AttendanceRecord[] = (students.data ?? []).filter((s) => marks[s.id]).map((s) => ({
      student_id: s.id, group_id: groupId, date, lesson, status: marks[s.id].status, skip_after: null
    }));
    if (!rows.length) return;
    setSaving(true);
    try { await attendanceService.save(rows); notify('Davomat saqlandi'); existing.reload(); }
    catch (e) { notify(errorMessage(e), 'err'); }
    finally { setSaving(false); }
  }

  const visibleStatuses = role === 'group_leader' ? STATUS_ORDER.filter((st) => st !== 'present' && st !== 'skipped') : STATUS_ORDER;
  const counts = visibleStatuses.map((s) => ({ s, n: (Object.values(marks) as Mark[]).filter((m) => m.status === s).length }));
  const dutyReady = isDuty && !duty.loading && !duty.error;

  return (
    <>
      <PageHeader title="Davomat" subtitle={canEdit ? "Sana va guruhni tanlab, o'quvchilarni belgilang" : "Davomatni ko'rish"} />
      {dutyReady && (meOnDuty
        ? <div className={`${BOX} border-emerald-200 bg-emerald-50/90 text-emerald-800`}>Bugun sizning navbatchilik kuningiz. Davomat belgilashingiz mumkin.</div>
        : <div className={`${BOX} border-amber-200 bg-amber-50/90 text-amber-900`}>Bugun sizning navbatchilik kuningiz emas. Davomatni faqat ko'rishingiz mumkin.</div>)}
      {(role === 'manaviyatchi' || role === 'direktor') && <div className={`${BOX} border-indigo-200/80 bg-indigo-50/50 text-slate-700`}>Siz davomatni faqat ko'ra olasiz.</div>}

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Sana"><Input type="date" value={date} disabled={isDuty} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <Field label="Guruh">
          <Select value={groupId} disabled={!seeAll} onChange={(e) => setGroupId(e.target.value)}>
            {(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </Field>
        <Field label="O'quvchi qidirish"><SearchInput value={q} onChange={setQ} placeholder="F.I.Sh." /></Field>
      </div>

      {(students.error || existing.error || duty.error) && <ErrorBox message={(students.error || existing.error || duty.error) as string} onRetry={() => { students.reload(); existing.reload(); duty.reload(); }} />}

      <div className="card mb-4 flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
        {counts.map(({ s, n }) => <span key={s} className={`tabular-nums rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${STATUS_META[s].badge}`}>{STATUS_META[s].label}: {n}</span>)}
        <span className="tabular-nums rounded-full bg-indigo-50/80 px-2.5 py-1 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">Belgilandi: {marked} / {total}</span>
        {canEdit && (
          <div className="ml-auto flex flex-wrap gap-2">
            {role === 'admin' && <Button variant="secondary" onClick={allPresent} disabled={!total}>Hammasi keldi</Button>}
            <Button onClick={save} disabled={saving || marked === 0}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</Button>
          </div>
        )}
      </div>

      <ul className="space-y-2.5">
        {students.loading || existing.loading ? <li className="card py-10 text-center text-sm font-medium text-slate-400">Yuklanmoqda...</li> :
          list.length === 0 ? <li className="card py-10 text-center text-sm font-medium text-slate-400">O'quvchilar topilmadi</li> :
          list.map((s, i) => {
            const m = marks[s.id];
            return (
              <li key={s.id} className={cx('rounded-2xl border bg-white p-3.5 shadow-2xs transition-all duration-150 hover:shadow-sm', m ? 'border-slate-200/90 hover:border-indigo-200' : 'border-dashed border-slate-300 hover:border-indigo-300')}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="tabular-nums w-6 text-right text-xs font-bold text-slate-400">{i + 1}</span>
                    <span className={cx('h-8 w-1 shrink-0 rounded-full transition-colors', m ? STATUS_META[m.status].dot : 'bg-slate-200')} />
                    <span className="truncate text-sm font-semibold text-slate-900">{s.full_name}</span>
                  </div>
                  <div className={cx('grid grid-cols-2 gap-2', role === 'group_leader' ? 'sm:grid-cols-2' : 'sm:grid-cols-4')}>
                    {visibleStatuses.map((st) => (
                      <button key={st} onClick={() => set(s.id, st)} disabled={!canEdit} aria-pressed={m?.status === st}
                        className={cx('rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60', m?.status === st ? STATUS_META[st].active : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-slate-900')}>
                        {STATUS_META[st].label}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
      </ul>
      {toast && <Toast message={toast.m} tone={toast.t} />}
    </>
  );
}
