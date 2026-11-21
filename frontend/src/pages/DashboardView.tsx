import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { dashboardService, groupsService } from '../services';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable, { type Column } from '../components/DataTable';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { ErrorBox, Loader } from '../components/Feedback';
import AnnouncementsBoard from '../components/AnnouncementsBoard';
import { formatDate, todayISO } from '../utils/format';

interface GroupSummaryRow {
  group_id: string;
  group_name: string;
  students_count: number;
  present: number;
  excused: number;
  unexcused: number;
  skipped: number;
}

export default function DashboardView({
  roleTitle,
  basePath,
  title,
  groupId: propGroupId,
  showGroups: propShowGroups
}: {
  roleTitle?: string;
  basePath?: string;
  title?: string;
  groupId?: string | null;
  showGroups?: boolean;
}) {
  const { user } = useAuth();
  const effectiveGroupId =
    propGroupId !== undefined
      ? propGroupId || undefined
      : user?.role === 'group_leader'
      ? user.group_id ?? undefined
      : undefined;

  const stats = useAsync(() => dashboardService.stats(effectiveGroupId), [effectiveGroupId]);
  const groups = useAsync(() => groupsService.list(), []);
  const d = stats.data;
  const canShowGroups = propShowGroups !== undefined ? propShowGroups : user?.role !== 'group_leader';
  const totalGroups = groups.data?.length ?? 0;
  const groupNameById = new Map((groups.data ?? []).map((g) => [g.id, g.name]));
  const leaderGroupName = effectiveGroupId ? groupNameById.get(effectiveGroupId) : undefined;
  const resolvedBase = basePath ?? (user?.role === 'group_leader' ? '/leader' : '/admin');
  const resolvedTitle = title ?? roleTitle ?? 'Boshqaruv paneli';

  const groupRows: GroupSummaryRow[] = (groups.data ?? [])
    .filter((g) => (!effectiveGroupId ? true : g.id === effectiveGroupId))
    .map((g) => ({
      group_id: g.id,
      group_name: g.name,
      students_count: Number(g.student_count ?? 0),
      present: 0,
      excused: 0,
      unexcused: 0,
      skipped: 0
    }));

  const cols: Column<GroupSummaryRow>[] = [
    {
      key: 'g',
      header: 'Guruh',
      sortBy: (r) => r.group_name,
      render: (r) => (
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          {r.group_name}
        </span>
      )
    },
    {
      key: 'sc',
      header: "O'quvchilar",
      sortBy: (r) => r.students_count,
      render: (r) => <span className="font-medium text-slate-700">{r.students_count}</span>
    },
    {
      key: 'p',
      header: 'Keldi',
      sortBy: (r) => r.present,
      render: (r) => (
        <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
          {r.present}
        </span>
      )
    },
    {
      key: 'e',
      header: 'Sababli',
      sortBy: (r) => r.excused,
      render: (r) => (
        <span className="inline-flex rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/70">
          {r.excused}
        </span>
      )
    },
    {
      key: 'u',
      header: 'Sababsiz',
      sortBy: (r) => r.unexcused,
      render: (r) => (
        <span className="inline-flex rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/70">
          {r.unexcused}
        </span>
      )
    },
    {
      key: 's',
      header: 'Qochdi',
      sortBy: (r) => r.skipped,
      render: (r) => (
        <span className="inline-flex rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200/70">
          {r.skipped}
        </span>
      )
    }
  ];

  return (
    <>
      <AnnouncementsBoard />

      <PageHeader
        title={resolvedTitle}
        subtitle={`Bugun: ${formatDate(todayISO())}${leaderGroupName ? ` · ${leaderGroupName}` : ''}`}
        actions={
          <Link to={`${resolvedBase}/attendance`}>
            <Button>
              <Icon name="check" /> Davomat belgilash
            </Button>
          </Link>
        }
      />

      {stats.loading && <Loader />}
      {stats.error && <ErrorBox message={stats.error} onRetry={stats.reload} />}

      {d && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {canShowGroups && (
              <StatCard
                label="Guruhlar"
                value={totalGroups}
                icon={<Icon name="groups" />}
                tone="blue"
              />
            )}
            <StatCard
              label="Bugun keldi"
              value={d.present}
              sub="belgilangan paralar"
              icon={<Icon name="check" />}
              tone="green"
            />
            <StatCard
              label="Sababli kelmadi"
              value={d.excused}
              icon={<Icon name="report" />}
              tone="amber"
            />
            <StatCard
              label="Sababsiz kelmadi"
              value={d.unexcused}
              icon={<Icon name="alert" />}
              tone="red"
            />
            <StatCard
              label="Darsdan qochdi"
              value={d.skipped}
              icon={<Icon name="alert" />}
              tone="violet"
            />
            <StatCard
              label="Ogohlantirishlar"
              value={d.warnings}
              sub="72 soatdan ortiq"
              icon={<Icon name="alert" />}
              tone="red"
            />
          </div>

          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Bugungi davomat — guruhlar kesimida
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {groupRows.length} ta guruh
            </span>
          </div>
          <DataTable
            columns={cols}
            rows={groupRows}
            rowKey={(r) => r.group_id}
            loading={groups.loading}
            emptyTitle="Bugun hali davomat olinmagan"
          />
        </>
      )}
    </>
  );
}
