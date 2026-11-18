import { useState } from 'react';
import { groupsService, reportsService } from '../services';
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

export default function Reports() {
  const { user } = useAuth();
  const seeAll = user?.role !== 'group_leader';
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [date, setDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(seeAll ? 'group' : 'student');
  const [groupId, setGroupId] = useState(seeAll ? '' : user?.group_id ?? '');
  const groups = useAsync(() => groupsService.list(), []);
  const report = useAsync(() => reportsService.get({ period, date, groupBy, groupId: groupId || undefined }), [period, date, groupBy, groupId]);

  const rows = report.data ?? [];
  const sum = (k: keyof ReportRow) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const first = groupBy === 'group' ? 'Guruh' : "O'quvchi";
  const headers = [first, ...(groupBy === 'student' ? ['Guruh'] : []), 'Keldi', 'Sababli', 'Sababsiz', 'Qochdi', 'Sababli soat', 'Sababsiz soat'];
  const toRow = (r: ReportRow) => [r.label, ...(groupBy === 'student' ? [r.sub ?? ''] : []), r.present, r.excused, r.unexcused, r.skipped, r.excused_hours, r.unexcused_hours];
  const title = `${PERIOD_LABEL[period]} hisobot — ${groupBy === 'group' ? 'guruh' : "o'quvchi"} bo'yicha`;
  const subtitle = `Sana: ${formatDate(date)}`;

  const cols: Column<ReportRow>[] = [
    { key: 'l', header: first, render: (r) => <span className="font-semibold">{r.label}</span> },
    ...(groupBy === 'student' ? [{ key: 'g', header: 'Guruh', render: (r: ReportRow) => r.sub }] : []),
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
