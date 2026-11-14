import { Link } from 'react-router-dom';
import { dashboardService } from '../services';
import { useAsync } from '../hooks/useAsync';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { ErrorBox, Spinner } from '../components/Feedback';
import { formatDate, percent, todayISO } from '../utils/format';
import type { GroupToday } from '../types';

export default function DashboardView({ title, groupId, showGroups }: { title: string; groupId?: string; showGroups: boolean }) {
  const { data, loading, error, reload } = useAsync(() => dashboardService.stats(groupId), [groupId]);
  if (loading && !data) return <Spinner />;

  const cols: Column<GroupToday>[] = [
    { key: 'g', header: 'Guruh', render: (r) => <span className="font-semibold">{r.group_name}</span> },
    { key: 'p', header: 'Keldi', render: (r) => <span className="text-emerald-700">{r.present}</span> },
    { key: 'e', header: 'Sababli', render: (r) => <span className="text-amber-700">{r.excused}</span> },
    { key: 'u', header: 'Sababsiz', render: (r) => <span className="text-red-700">{r.unexcused}</span> },
    { key: 's', header: 'Qochdi', render: (r) => <span className="text-violet-700">{r.skipped}</span> },
    { key: 'pc', header: 'Qatnashish', render: (r) => percent(r.present, r.total) }
  ];

  return (
    <>
      <PageHeader title={title} subtitle={`Bugun: ${formatDate(todayISO())}`}
        actions={<Link to="/davomat"><Button>Davomat belgilash</Button></Link>} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {showGroups && <StatCard label="Guruhlar" value={data.groups} icon={<Icon name="groups" />} tone="blue" />}
            <StatCard label="O'quvchilar" value={data.students} icon={<Icon name="student" />} tone="slate" />
            <StatCard label="Bugun keldi" value={data.present} hint="belgilangan paralar" icon={<Icon name="check" />} tone="green" />
            <StatCard label="Sababli kelmadi" value={data.excused} icon={<Icon name="report" />} tone="amber" />
            <StatCard label="Sababsiz kelmadi" value={data.unexcused} icon={<Icon name="alert" />} tone="red" />
            <StatCard label="Darsdan qochdi" value={data.skipped} icon={<Icon name="alert" />} tone="violet" />
            <Link to="/ogohlantirishlar" className="block rounded-xl ring-red-300 transition hover:ring-2">
              <StatCard label="Ogohlantirishlar" value={data.warnings} hint="72 soatdan ortiq" icon={<Icon name="alert" />} tone="red" />
            </Link>
          </div>
          <h2 className="mb-3 mt-8 text-base font-semibold text-slate-800">Bugungi davomat — guruhlar kesimida</h2>
          <DataTable columns={cols} rows={data.groupsToday} rowKey={(r) => r.group_id} pageSize={8} empty="Bugun davomat belgilanmagan" />
        </>
      )}
    </>
  );
}
