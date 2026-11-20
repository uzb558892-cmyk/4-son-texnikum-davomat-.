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

export default function Reports() {
  const { user } = useAuth();
  const seeAll = user?.role !== 'group_leader';
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [date, setDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(seeAll ? 'group' : 'student');
  const [groupId, setGroupId] = useState(seeAll ? '' : user?.group_id ?? '');
  const [dayMatrix, setDayMatrix] = useState<Record<string, Record<number, DayMark>>>({});

  const groups = useAsync(() => groupsService.list(), []);
  const report = useAsync(
    () => reportsService.get({ period, date, groupBy, groupId: groupId || undefined }),
    [period, date, groupBy, groupId]
  );

  const isMonthlyStudent = period === 'monthly' && groupBy === 'student';
  const [yearStr, monthStr] = date.split('-');
  const yearNum = Number(yearStr) || new Date().getFullYear();
  const monthNum = Number(monthStr) || new Date().getMonth() + 1;
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    let cancelled = false;
    if (!isMonthlyStudent) {
      setDayMatrix({});
      return;
    }

    const ym = `${String(yearNum).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}`;
    const fromDate = `${ym}-01`;
    const toDate = `${ym}-${String(daysInMonth).padStart(2, '0')}`;

    (async () => {
      try {
        const client = db();
        let attQuery = client
          .from('attendance')
          .select('student_id, lesson_date, status')
          .gte('lesson_date', fromDate)
          .lte('lesson_date', toDate);

        if (groupId) {
          attQuery = attQuery.eq('group_id', groupId);
        }

        const { data: attRows, error: attError } = await attQuery;
        if (attError) throw attError;

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

        const studentDayStatus = new Map<string, Map<number, Set<string>>>();
        for (const r of (attRows ?? []) as Array<{ student_id: string; lesson_date: string; status: string }>) {
          const dayPart = Number(r.lesson_date.split('-')[2]);
          if (!dayPart || dayPart < 1 || dayPart > daysInMonth) continue;
          let dMap = studentDayStatus.get(r.student_id);
          if (!dMap) {
            dMap = new Map();
            studentDayStatus.set(r.student_id, dMap);
          }
          let sSet = dMap.get(dayPart);
          if (!sSet) {
            sSet = new Set();
            dMap.set(dayPart, sSet);
          }
          sSet.add(r.status);
        }

        const nextMatrix: Record<string, Record<number, DayMark>> = {};
        for (const row of report.data ?? []) {
          const candidateIds = nameToIds.get(row.label) ?? [row.key];
          const dayMarks: Record<number, DayMark> = {};
          for (let d = 1; d <= daysInMonth; d++) {
            const combined = new Set<string>();
            for (const sid of candidateIds) {
              const found = studentDayStatus.get(sid)?.get(d);
              if (found) found.forEach((st) => combined.add(st));
            }
            if (combined.size === 0) {
              dayMarks[d] = '·';
            } else if (combined.has('present')) {
              dayMarks[d] = '+';
            } else {
              dayMarks[d] = '-';
            }
          }
          nextMatrix[row.key] = dayMarks;
        }

        if (!cancelled) {
          setDayMatrix(nextMatrix);
        }
      } catch {
        if (!cancelled) {
          setDayMatrix({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMonthlyStudent, yearNum, monthNum, daysInMonth, groupId, report.data]);

  const rows = report.data ?? [];
  const sum = (k: keyof ReportRow) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const first = groupBy === 'group' ? 'Guruh' : "O'quvchi";

  const getDayMark = (r: ReportRow, d: number): DayMark => dayMatrix[r.key]?.[d] ?? '·';

  const headers = [
    first,
    ...(groupBy === 'student' ? ['Guruh'] : []),
    ...(isMonthlyStudent ? dayNumbers.map((d) => String(d)) : []),
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
    ...(isMonthlyStudent ? dayNumbers.map((d) => getDayMark(r, d)) : []),
    r.present,
    r.excused,
    r.unexcused,
    r.skipped,
    r.excused_hours,
    r.unexcused_hours
  ];

  const title = `${PERIOD_LABEL[period]} hisobot — ${groupBy === 'group' ? 'guruh' : "o'quvchi"} bo'yicha`;
  const subtitle = `Sana: ${formatDate(date)}`;

  const dayCols: Column<ReportRow>[] = isMonthlyStudent
    ? dayNumbers.map((d) => ({
        key: `d_${d}`,
        header: String(d),
        render: (r: ReportRow) => {
          const mark = getDayMark(r, d);
          const cls =
            mark === '+'
              ? 'font-bold text-emerald-700'
              : mark === '-'
              ? 'font-bold text-red-600'
              : 'text-slate-400';
          return <span className={cls}>{mark}</span>;
        }
      }))
    : [];

  const cols: Column<ReportRow>[] = [
    { key: 'l', header: first, render: (r) => <span className="font-semibold">{r.label}</span> },
    ...(groupBy === 'student' ? [{ key: 'g', header: 'Guruh', render: (r: ReportRow) => r.sub }] : []),
    ...dayCols,
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
