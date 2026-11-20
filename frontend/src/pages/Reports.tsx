import { useEffect, useState } from 'react';
import { groupsService, reportsService } from '../services';
import { db } from '../services/supabase';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { Field, Input, Select } from '../components/Fields';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import Icon from '../components/Icon';
import { ErrorBox } from '../components/Feedback';
import { PERIOD_LABEL } from '../utils/constants';
import { formatDate, todayISO } from '../utils/format';
import { exportExcel, exportWord, printHtml, tableHtml } from '../utils/export';
import type { ReportGroupBy, ReportPeriod, ReportRow } from '../types';

type DayMark = '+' | '-' | '·';

interface SlotCol {
  key: string;
  label: string;
}

const WEEKDAY_LABELS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];
const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, d || 1);
  const diff = (dt.getDay() + 6) % 7; // Monday = 0
  dt.setDate(dt.getDate() - diff);
  return dt;
}

export default function Reports() {
  const { user } = useAuth();
  const seeAll = user?.role !== 'group_leader';
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [date, setDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(seeAll ? 'group' : 'student');
  const [groupId, setGroupId] = useState(seeAll ? '' : user?.group_id ?? '');
  const [slotMatrix, setSlotMatrix] = useState<Record<string, Record<string, DayMark>>>({});
  const [dailyParas, setDailyParas] = useState<number[]>([1, 2, 3]);

  const groups = useAsync(() => groupsService.list(), []);
  const report = useAsync(
    () => reportsService.get({ period, date, groupBy, groupId: groupId || undefined }),
    [period, date, groupBy, groupId]
  );

  const isStudentView = groupBy === 'student';
  const [yearStr, monthStr] = date.split('-');
  const yearNum = Number(yearStr) || new Date().getFullYear();
  const monthNum = Number(monthStr) || new Date().getMonth() + 1;
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const monday = getMondayDate(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return {
      iso: toIsoLocal(dt),
      short: `${WEEKDAY_LABELS[i]} (${dt.getDate()})`
    };
  });

  const slotCols: SlotCol[] = !isStudentView
    ? []
    : period === 'daily'
    ? dailyParas.map((p) => ({ key: `p_${p}`, label: `${p}-para` }))
    : period === 'weekly'
    ? weekDays.map((w) => ({ key: `w_${w.iso}`, label: w.short }))
    : period === 'monthly'
    ? Array.from({ length: daysInMonth }, (_, i) => ({ key: `d_${i + 1}`, label: String(i + 1) }))
    : MONTH_LABELS.map((mLabel, idx) => ({ key: `m_${idx + 1}`, label: mLabel }));

  useEffect(() => {
    let cancelled = false;
    if (!isStudentView) {
      setSlotMatrix({});
      return;
    }

    (async () => {
      try {
        const client = db();
        const { data: stuRows, error: stuError } = await client
          .from('students')
          .select('id, full_name');
        if (stuError) throw stuError;

        const nameToIds = new Map<string, string[]>();
        for (const s of (stuRows ?? []) as Array<{ id: string; full_name: string }>) {
          const list = nameToIds.get(s.full_name) ?? [];
          list.push(s.id);
          nameToIds.set(s.full_name, list);
        }

        if (period === 'daily') {
          let q = client
            .from('attendance')
            .select('student_id, para, status')
            .eq('lesson_date', date);
          if (groupId) q = q.eq('group_id', groupId);
          const { data: attRows, error: attError } = await q;
          if (attError) throw attError;

          const paraSet = new Set<number>([1, 2, 3]);
          const byStuPara = new Map<string, Map<number, Set<string>>>();
          for (const r of (attRows ?? []) as Array<{ student_id: string; para: number; status: string }>) {
            const pNum = Number(r.para) || 1;
            paraSet.add(pNum);
            let pMap = byStuPara.get(r.student_id);
            if (!pMap) {
              pMap = new Map();
              byStuPara.set(r.student_id, pMap);
            }
            let sSet = pMap.get(pNum);
            if (!sSet) {
              sSet = new Set();
              pMap.set(pNum, sSet);
            }
            sSet.add(r.status);
          }

          const sortedParas = Array.from(paraSet).sort((a, b) => a - b);
          const nextMatrix: Record<string, Record<string, DayMark>> = {};
          for (const row of report.data ?? []) {
            const candidateIds = nameToIds.get(row.label) ?? [row.key];
            const marks: Record<string, DayMark> = {};
            for (const pNum of sortedParas) {
              const combined = new Set<string>();
              for (const sid of candidateIds) {
                const found = byStuPara.get(sid)?.get(pNum);
                if (found) found.forEach((st) => combined.add(st));
              }
              marks[`p_${pNum}`] =
                combined.size === 0 ? '·' : combined.has('present') ? '+' : '-';
            }
            nextMatrix[row.key] = marks;
          }

          if (!cancelled) {
            setDailyParas(sortedParas);
            setSlotMatrix(nextMatrix);
          }
          return;
        }

        if (period === 'weekly') {
          const fromDate = weekDays[0].iso;
          const toDate = weekDays[6].iso;
          let q = client
            .from('attendance')
            .select('student_id, lesson_date, status')
            .gte('lesson_date', fromDate)
            .lte('lesson_date', toDate);
          if (groupId) q = q.eq('group_id', groupId);
          const { data: attRows, error: attError } = await q;
          if (attError) throw attError;

          const byStuDate = new Map<string, Map<string, Set<string>>>();
          for (const r of (attRows ?? []) as Array<{ student_id: string; lesson_date: string; status: string }>) {
            let dMap = byStuDate.get(r.student_id);
            if (!dMap) {
              dMap = new Map();
              byStuDate.set(r.student_id, dMap);
            }
            let sSet = dMap.get(r.lesson_date);
            if (!sSet) {
              sSet = new Set();
              dMap.set(r.lesson_date, sSet);
            }
            sSet.add(r.status);
          }

          const nextMatrix: Record<string, Record<string, DayMark>> = {};
          for (const row of report.data ?? []) {
            const candidateIds = nameToIds.get(row.label) ?? [row.key];
            const marks: Record<string, DayMark> = {};
            for (const w of weekDays) {
              const combined = new Set<string>();
              for (const sid of candidateIds) {
                const found = byStuDate.get(sid)?.get(w.iso);
                if (found) found.forEach((st) => combined.add(st));
              }
              marks[`w_${w.iso}`] =
                combined.size === 0 ? '·' : combined.has('present') ? '+' : '-';
            }
            nextMatrix[row.key] = marks;
          }

          if (!cancelled) {
            setSlotMatrix(nextMatrix);
          }
          return;
        }

        if (period === 'monthly') {
          const ym = `${String(yearNum).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}`;
          const fromDate = `${ym}-01`;
          const toDate = `${ym}-${String(daysInMonth).padStart(2, '0')}`;
          let q = client
            .from('attendance')
            .select('student_id, lesson_date, status')
            .gte('lesson_date', fromDate)
            .lte('lesson_date', toDate);
          if (groupId) q = q.eq('group_id', groupId);
          const { data: attRows, error: attError } = await q;
          if (attError) throw attError;

          const byStuDay = new Map<string, Map<number, Set<string>>>();
          for (const r of (attRows ?? []) as Array<{ student_id: string; lesson_date: string; status: string }>) {
            const dayPart = Number(r.lesson_date.split('-')[2]);
            if (!dayPart || dayPart < 1 || dayPart > daysInMonth) continue;
            let dMap = byStuDay.get(r.student_id);
            if (!dMap) {
              dMap = new Map();
              byStuDay.set(r.student_id, dMap);
            }
            let sSet = dMap.get(dayPart);
            if (!sSet) {
              sSet = new Set();
              dMap.set(dayPart, sSet);
            }
            sSet.add(r.status);
          }

          const nextMatrix: Record<string, Record<string, DayMark>> = {};
          for (const row of report.data ?? []) {
            const candidateIds = nameToIds.get(row.label) ?? [row.key];
            const marks: Record<string, DayMark> = {};
            for (let d = 1; d <= daysInMonth; d++) {
              const combined = new Set<string>();
              for (const sid of candidateIds) {
                const found = byStuDay.get(sid)?.get(d);
                if (found) found.forEach((st) => combined.add(st));
              }
              marks[`d_${d}`] =
                combined.size === 0 ? '·' : combined.has('present') ? '+' : '-';
            }
            nextMatrix[row.key] = marks;
          }

          if (!cancelled) {
            setSlotMatrix(nextMatrix);
          }
          return;
        }

        // yearly
        const fromDate = `${yearNum}-01-01`;
        const toDate = `${yearNum}-12-31`;
        let q = client
          .from('attendance')
          .select('student_id, lesson_date, status')
          .gte('lesson_date', fromDate)
          .lte('lesson_date', toDate);
        if (groupId) q = q.eq('group_id', groupId);
        const { data: attRows, error: attError } = await q;
        if (attError) throw attError;

        const byStuMonth = new Map<string, Map<number, Set<string>>>();
        for (const r of (attRows ?? []) as Array<{ student_id: string; lesson_date: string; status: string }>) {
          const mPart = Number(r.lesson_date.split('-')[1]);
          if (!mPart || mPart < 1 || mPart > 12) continue;
          let mMap = byStuMonth.get(r.student_id);
          if (!mMap) {
            mMap = new Map();
            byStuMonth.set(r.student_id, mMap);
          }
          let sSet = mMap.get(mPart);
          if (!sSet) {
            sSet = new Set();
            mMap.set(mPart, sSet);
          }
          sSet.add(r.status);
        }

        const nextMatrix: Record<string, Record<string, DayMark>> = {};
        for (const row of report.data ?? []) {
          const candidateIds = nameToIds.get(row.label) ?? [row.key];
          const marks: Record<string, DayMark> = {};
          for (let m = 1; m <= 12; m++) {
            const combined = new Set<string>();
            for (const sid of candidateIds) {
              const found = byStuMonth.get(sid)?.get(m);
              if (found) found.forEach((st) => combined.add(st));
            }
            marks[`m_${m}`] =
              combined.size === 0 ? '·' : combined.has('present') ? '+' : '-';
          }
          nextMatrix[row.key] = marks;
        }

        if (!cancelled) {
          setSlotMatrix(nextMatrix);
        }
      } catch {
        if (!cancelled) {
          setSlotMatrix({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isStudentView, period, date, groupId, yearNum, monthNum, daysInMonth, report.data]);

  const rows = report.data ?? [];
  const sum = (k: keyof ReportRow) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const first = groupBy === 'group' ? 'Guruh' : "O'quvchi";

  const getSlotMark = (r: ReportRow, slotKey: string): DayMark => slotMatrix[r.key]?.[slotKey] ?? '·';

  const headers = [
    first,
    ...(groupBy === 'student' ? ['Guruh'] : []),
    ...slotCols.map((c) => c.label),
    'Keldi',
    'Sababli',
    'Sababsiz',
    'Qochdi',
    'Sababli soat',
    'Sababsiz soat'
  ];

  const toRow = (r: ReportRow) => [
    r.label,
    ...(groupBy === 'student' ? [r.sub ?? ''] : []),
    ...slotCols.map((c) => getSlotMark(r, c.key)),
    r.present,
    r.excused,
    r.unexcused,
    r.skipped,
    r.excused_hours,
    r.unexcused_hours
  ];

  const title = `${PERIOD_LABEL[period]} hisobot — ${groupBy === 'group' ? 'guruh' : "o'quvchi"} bo'yicha`;
  const subtitle = `Sana: ${formatDate(date)}`;

  const dynamicCols: Column<ReportRow>[] = slotCols.map((c) => ({
    key: c.key,
    header: c.label,
    render: (r: ReportRow) => {
      const mark = getSlotMark(r, c.key);
      const cls =
        mark === '+'
          ? 'font-bold text-emerald-700'
          : mark === '-'
          ? 'font-bold text-red-600'
          : 'text-slate-400';
      return <span className={cls}>{mark}</span>;
    }
  }));

  const cols: Column<ReportRow>[] = [
    { key: 'l', header: first, render: (r) => <span className="font-semibold">{r.label}</span> },
    ...(groupBy === 'student' ? [{ key: 'g', header: 'Guruh', render: (r: ReportRow) => r.sub }] : []),
    ...dynamicCols,
    { key: 'p', header: 'Keldi', render: (r) => <span className="text-emerald-700">{r.present}</span> },
    { key: 'e', header: 'Sababli', render: (r) => <span className="text-amber-700">{r.excused}</span> },
    { key: 'u', header: 'Sababsiz', render: (r) => <span className="text-red-700">{r.unexcused}</span> },
    { key: 's', header: 'Qochdi', render: (r) => <span className="text-violet-700">{r.skipped}</span> },
    { key: 'eh', header: 'Sababli soat', render: (r) => r.excused_hours },
    { key: 'uh', header: 'Sababsiz soat', render: (r) => <span className="font-semibold">{r.unexcused_hours}</span> }
  ];

  return (
    <>
      <PageHeader title="Hisobotlar" subtitle={title}
        actions={<>
          <Button variant="secondary" disabled={!rows.length} onClick={() => exportExcel(`hisobot-${period}-${date}`, title, headers, rows.map(toRow))}>Excel</Button>
          <Button variant="secondary" disabled={!rows.length} onClick={() => printHtml(title, tableHtml(title, subtitle, headers, rows.map(toRow)))}>PDF</Button>
          <Button variant="secondary" disabled={!rows.length} onClick={() => exportWord(`hisobot-${period}-${date}`, title, tableHtml(title, subtitle, headers, rows.map(toRow)))}>Word</Button>
          <Button variant="secondary" disabled={!rows.length} onClick={() => printHtml(title, tableHtml(title, subtitle, headers, rows.map(toRow)))}>Chop etish</Button>
        </>} />
      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Davr"><Select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}>{(Object.keys(PERIOD_LABEL) as ReportPeriod[]).map((p) => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}</Select></Field>
        <Field label="Sana"><Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <Field label="Kesim"><Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}><option value="group">Guruh bo'yicha</option><option value="student">O'quvchi bo'yicha</option></Select></Field>
        <Field label="Guruh"><Select value={groupId} disabled={!seeAll} onChange={(e) => setGroupId(e.target.value)}>{seeAll && <option value="">Barcha guruhlar</option>}{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sababli qoldirilgan soat" value={sum('excused_hours')} icon={<Icon name="report" />} tone="amber" />
        <StatCard label="Sababsiz qoldirilgan soat" value={sum('unexcused_hours')} icon={<Icon name="alert" />} tone="red" />
        <StatCard label="Kelgan paralar" value={sum('present')} icon={<Icon name="check" />} tone="green" />
      </div>
      {report.error && <ErrorBox message={report.error} onRetry={report.reload} />}
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.key} loading={report.loading} pageSize={15} />
    </>
  );
}
