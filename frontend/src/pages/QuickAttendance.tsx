import { useEffect, useMemo, useState } from 'react';
import { attendanceService, groupsService, studentsService } from '../services';
import { dutyService, todayTashkent, type DutyRow } from '../services/dutyService';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { Field, Input, Select, SearchInput } from '../components/Fields';
import Button from '../components/Button';
import { ErrorBox, Toast } from '../components/Feedback';
import { LESSONS } from '../utils/constants';
import { cx, errorMessage } from '../utils/format';
import type { AttendanceRecord } from '../types';

type SimpleMark = 'present' | 'unexcused';

export default function QuickAttendance() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isDuty = role === 'navbatchi';
  const today = todayTashkent();

  const [date, setDate] = useState(today);
  const [lesson, setLesson] = useState(1);
  const [groupId, setGroupId] = useState('');
  const [q, setQ] = useState('');
  const [marks, setMarks] = useState<Record<string, SimpleMark>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);

  const notify = (m: string, t: 'ok' | 'err' = 'ok') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2500);
  };

  const groups = useAsync(() => groupsService.list(), []);
  const duty = useAsync(
    () => (isDuty ? dutyService.list(today.slice(0, 7)) : Promise.resolve([] as DutyRow[])),
    [isDuty, today]
  );

  useEffect(() => {
    if (!groupId && groups.data?.length) setGroupId(groups.data[0].id);
  }, [groups.data, groupId]);

  const dutyReady = isAdmin || (isDuty && !duty.loading && !duty.error);
  const meOnDutyToday =
    !!user && (duty.data ?? []).some((r) => r.duty_date === today && r.duty_user_id === user.id);
  const allowed = isAdmin || (isDuty && meOnDutyToday);

  const students = useAsync(
    () => (allowed && groupId ? studentsService.list(groupId) : Promise.resolve([])),
    [allowed, groupId]
  );
  const existing = useAsync(
    () => (allowed && groupId ? attendanceService.get(groupId, date, lesson) : Promise.resolve([])),
    [allowed, groupId, date, lesson]
  );

  useEffect(() => {
    const m: Record<string, SimpleMark> = {};
    (existing.data ?? []).forEach((r) => {
      m[r.student_id] = r.status === 'present' ? 'present' : 'unexcused';
    });
    setMarks(m);
  }, [existing.data]);

  const list = useMemo(
    () => (students.data ?? []).filter((s) => s.full_name.toLowerCase().includes(q.toLowerCase())),
    [students.data, q]
  );

  const total = students.data?.length ?? 0;
  const presentCount = (students.data ?? []).filter((s) => marks[s.id] === 'present').length;
  const absentCount = (students.data ?? []).filter((s) => marks[s.id] === 'unexcused').length;
  const marked = presentCount + absentCount;

  const setMark = (id: string, val: SimpleMark) => {
    if (!allowed) return;
    setMarks((prev) => ({ ...prev, [id]: val }));
  };

  const markAllPresent = () => {
    if (!allowed) return;
    setMarks(Object.fromEntries((students.data ?? []).map((s) => [s.id, 'present' as const])));
  };

  async function save() {
    if (!allowed || !groupId) return;
    const rows: AttendanceRecord[] = (students.data ?? [])
      .filter((s) => marks[s.id])
      .map((s) => ({
        student_id: s.id,
        group_id: groupId,
        date,
        lesson,
        status: marks[s.id],
        skip_after: null
      }));
    if (!rows.length) return;
    setSaving(true);
    try {
      await attendanceService.save(rows);
      notify('Davomat saqlandi');
      existing.reload();
    } catch (e) {
      notify(errorMessage(e), 'err');
    } finally {
      setSaving(false);
    }
  }

  if (!dutyReady) {
    return <div className="py-10 text-center text-sm text-slate-400">Tekshirilmoqda...</div>;
  }

  if (!allowed) {
    return (
      <>
        <PageHeader title="Davomat belgilash" subtitle="Navbatchi va administrator uchun tezkor davomat" />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-900">
          Bugun sizning navbatchilik kuningiz emas. Bu sahifa faqat siz navbatchi etib belgilangan kunda ochiladi.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Davomat belgilash"
        subtitle="Guruhni tanlang va o'quvchilarning bor yoki yo'qligini belgilang"
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Sana">
          <Input
            type="date"
            value={date}
            disabled={!isAdmin}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </Field>
        <Field label="Guruh">
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {(groups.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Para">
          <Select value={lesson} onChange={(e) => setLesson(Number(e.target.value))}>
            {LESSONS.map((l) => (
              <option key={l} value={l}>
                {l}-para
              </option>
            ))}
          </Select>
        </Field>
        <Field label="O'quvchi qidirish">
          <SearchInput value={q} onChange={setQ} placeholder="F.I.Sh." />
        </Field>
      </div>

      {(students.error || existing.error || groups.error) && (
        <ErrorBox
          message={(students.error || existing.error || groups.error) as string}
          onRetry={() => {
            groups.reload();
            students.reload();
            existing.reload();
          }}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Bor: {presentCount}
        </span>
        <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700 ring-1 ring-inset ring-red-200">
          Yo&apos;q: {absentCount}
        </span>
        <span className="text-slate-500">
          Belgilandi: {marked} / {total}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={markAllPresent} disabled={!total}>
            Hammasi bor
          </Button>
          <Button onClick={save} disabled={saving || marked === 0}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {students.loading || existing.loading ? (
          <li className="py-10 text-center text-sm text-slate-400">Yuklanmoqda...</li>
        ) : list.length === 0 ? (
          <li className="py-10 text-center text-sm text-slate-400">O&apos;quvchilar topilmadi</li>
        ) : (
          list.map((s, i) => {
            const m = marks[s.id];
            return (
              <li
                key={s.id}
                className={cx(
                  'rounded-xl border bg-white p-3 shadow-sm',
                  m ? 'border-slate-200' : 'border-dashed border-slate-300'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="w-6 text-right text-sm text-slate-400">{i + 1}</span>
                    <span
                      className={cx(
                        'h-8 w-1 rounded-full',
                        m === 'present' ? 'bg-emerald-500' : m === 'unexcused' ? 'bg-red-500' : 'bg-slate-200'
                      )}
                    />
                    <span className="truncate font-semibold text-slate-800">{s.full_name}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setMark(s.id, 'present')}
                      aria-pressed={m === 'present'}
                      className={cx(
                        'min-w-[74px] rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors',
                        m === 'present'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-emerald-50'
                      )}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      onClick={() => setMark(s.id, 'unexcused')}
                      aria-pressed={m === 'unexcused'}
                      className={cx(
                        'min-w-[74px] rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors',
                        m === 'unexcused'
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-red-50'
                      )}
                    >
                      Yo&apos;q
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
      {toast && <Toast message={toast.m} tone={toast.t} />}
    </>
  );
}
