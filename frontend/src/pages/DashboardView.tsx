import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services';
import { useAsync } from '../hooks/useAsync';
import AnnouncementsBoard from '../components/AnnouncementsBoard';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { ErrorBox, Spinner } from '../components/Feedback';
import { formatDate, percent, todayISO } from '../utils/format';
import type { GroupToday } from '../types';

export default function DashboardView({ title, groupId, showGroups }: { title: string; groupId?: string; showGroups: boolean }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => dashboardService.stats(groupId), [groupId]);
  if (loading && !data) return <Spinner />;

  const cols: Column<GroupToday>[] = [
    { key: 'g', header: 'Guruh', render: (r) => <span className="font-semibold text-slate-900">{r.group_name}</span> },
    { key: 'p', header: 'Keldi', render: (r) => <span className="tabular-nums font-semibold text-emerald-700">{r.present}</span> },
    { key: 'e', header: 'Sababli', render: (r) => <span className="tabular-nums font-medium text-amber-700">{r.excused}</span> },
    { key: 'u', header: 'Sababsiz', render: (r) => <span className="tabular-nums font-semibold text-rose-700">{r.unexcused}</span> },
    { key: 's', header: 'Qochdi', render: (r) => <span className="tabular-nums font-medium text-violet-700">{r.skipped}</span> },
    {
      key: 'pc',
      header: 'Qatnashish',
      render: (r) => {
        const ratio = r.total > 0 ? Math.max(0, Math.min(100, (r.present / r.total) * 100)) : 0;
        return (
          <div className="flex min-w-[110px] items-center gap-2.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${ratio}%` }}
              />
            </div>
            <span className="tabular-nums w-11 text-right text-xs font-semibold text-slate-700">
              {percent(r.present, r.total)}
            </span>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <AnnouncementsBoard />
      <PageHeader
        title={title}
        subtitle={`Bugun: ${formatDate(todayISO())}`}
        actions={(user?.role === 'manaviyatchi' || user?.role === 'direktor') ? <></> : <Link to="/davomat"><Button>Davomat belgilash</Button></Link>}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
            {showGroups && <StatCard label="Guruhlar" value={data.groups} icon={<Icon name="groups" />} tone="blue" />}
            <StatCard label="O'quvchilar" value={data.students} icon={<Icon name="student" />} tone="slate" />
            <StatCard label="Bugun keldi" value={data.present} hint="belgilangan paralar" icon={<Icon name="check" />} tone="green" />
            <StatCard label="Sababli kelmadi" value={data.excused} icon={<Icon name="report" />} tone="amber" />
            <StatCard label="Sababsiz kelmadi" value={data.unexcused} icon={<Icon name="alert" />} tone="red" />
            <StatCard label="Darsdan qochdi" value={data.skipped} icon={<Icon name="alert" />} tone="violet" />
            <Link to="/ogohlantirishlar" className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300">
              <StatCard label="Ogohlantirishlar" value={data.warnings} hint="72 soatdan ortiq" icon={<Icon name="alert" />} tone="red" />
            </Link>
          </div>
          <div className="mt-8 mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Bugungi davomat — guruhlar kesimida</h2>
          </div>
          <DataTable columns={cols} rows={data.groupsToday} rowKey={(r) => r.group_id} pageSize={8} empty="Bugun davomat belgilanmagan" />
        </>
      )}
    </>
  );
}
