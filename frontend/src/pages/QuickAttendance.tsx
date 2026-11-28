import { useEffect, useMemo, useState } from 'react';
import { attendanceService, groupsService, studentsService } from '../services';
import { getRecurringDutiesForDate, todayTashkent } from '../services/dutyService';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import { Field, Input, Select, SearchInput } from '../components/Fields';
import Button from '../components/Button';
import { ErrorBox, Toast } from '../components/Feedback';
import { cx, errorMessage } from '../utils/format';
import type { AttendanceRecord } from '../types';

type SimpleMark = 'present' | 'unexcused';

export default function QuickAttendance() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const canCheckDuty = role === 'navbatchi' || role === 'group_leader';
  const today = todayTashkent();

  const [date, setDate] = useState(today);
  const lesson = 1;
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
  const locks = useAsync(() => attendanceService.getGroupLocks(date), [date]);

  useEffect(() => {
    if (!groupId && groups.data?.length) {
      const firstOpen = groups.data.find((g) => {
        const lk = (locks.data ?? {})[g.id];
        return !lk || lk.markedBy === user?.id;
      });
      setGroupId((firstOpen ?? groups.data[0]).id);
    }
  }, [groups.data, locks.data, groupId, user?.id]);

  const dutyReady = true;
  const meOnDutyToday =
    !!user && getRecurringDutiesForDate(today).some((r) => r.duty_user_id === user.id);
  const allowed = isAdmin || (canCheckDuty && meOnDutyToday);

  const currentLock = groupId ? (locks.data ?? {})[groupId] : undefined;
  const lockedByOther = !isAdmin && !!currentLock && !!user && currentLock.markedBy !== user.id;
  const canEdit = allowed && !lockedByOther;

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
    if (!canEdit) return;
    setMarks((prev) => ({ ...prev, [id]: val }));
  };

  const markAllPresent = () => {
    if (!canEdit) return;
    setMarks(Object.fromEntries((students.data ?? []).map((s) => [s.id, 'present' as const])));
  };

  async function save() {
    if (!canEdit || !groupId) return;
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
      locks.reload();
    } catch (e) {
      notify(errorMessage(e), 'err');
      locks.reload();
    } finally {
      setSaving(false);
    }
  }

  if (!dutyReady) {
    return <div className="card py-10 text-center text-sm font-medium text-slate-500">Tekshirilmoqda...</div>;
  }

  if (!allowed) {
    return (
      <>
        <PageHeader title="Davomat belgilash" subtitle="Navbatchi va administrator uchun tezkor davomat" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm font-medium text-amber-900 shadow-2xs">
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

      {lockedByOther && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm font-medium text-rose-800 shadow-2xs">
          Bu guruhning davomati allaqachon <strong>{currentLock?.markedByName}</strong> tomonidan olingan. Boshqa navbatchi o&apos;zgartira olmaydi — boshqa guruhni tanlang.
        </div>
      )}

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
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
            {(groups.data ?? []).map((g) => {
              const lk = (locks.data ?? {})[g.id];
              const suffix = lk
                ? lk.markedBy === user?.id
                  ? ' (Siz olgansiz)'
                  : ` (Olingan — ${lk.markedByName})`
                : '';
              return (
                <option key={g.id} value={g.id}>
                  {g.name}{suffix}
                </option>
              );
            })}
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

      <div className="card mb-4 flex flex-wrap items-center gap-2.5 px-4 py-3 text-xs">
        <span className="tabular-nums rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
          Bor: {presentCount}
        </span>
        <span className="tabular-nums rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/80">
          Yo&apos;q: {absentCount}
        </span>
        <span className="tabular-nums rounded-full bg-indigo-50/80 px-3 py-1 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
          Belgilandi: {marked} / {total}
        </span>
        {canEdit && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" onClick={markAllPresent} disabled={!total}>
              Hammasi bor
            </Button>
            <Button onClick={save} disabled={saving || marked === 0}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </div>
        )}
      </div>

      <ul className="space-y-2.5">
        {students.loading || existing.loading ? (
          <li className="card py-10 text-center text-sm font-medium text-slate-400">Yuklanmoqda...</li>
        ) : list.length === 0 ? (
          <li className="card py-10 text-center text-sm font-medium text-slate-400">O&apos;quvchilar topilmadi</li>
        ) : (
          list.map((s, i) => {
            const m = marks[s.id];
            return (
              <li
                key={s.id}
                className={cx(
                  'rounded-2xl border bg-white p-3.5 shadow-2xs transition-all duration-150 hover:shadow-sm',
                  m === 'present'
                    ? 'border-emerald-200/80 hover:border-emerald-300'
                    : m === 'unexcused'
                      ? 'border-rose-200/80 hover:border-rose-300'
                      : 'border-dashed border-slate-300 hover:border-indigo-300'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="tabular-nums w-6 text-right text-xs font-bold text-slate-400">{i + 1}</span>
                    <span
                      className={cx(
                        'h-8 w-1 shrink-0 rounded-full transition-colors',
                        m === 'present' ? 'bg-emerald-500' : m === 'unexcused' ? 'bg-rose-500' : 'bg-slate-200'
                      )}
                    />
                    <span className="truncate text-sm font-semibold text-slate-900">{s.full_name}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setMark(s.id, 'present')}
                      aria-pressed={m === 'present'}
                      className={cx(
                        'min-w-[76px] rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60',
                        m === 'present'
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800'
                      )}
                    >
                      Bor
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setMark(s.id, 'unexcused')}
                      aria-pressed={m === 'unexcused'}
                      className={cx(
                        'min-w-[76px] rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60',
                        m === 'unexcused'
                          ? 'border-rose-600 bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800'
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
