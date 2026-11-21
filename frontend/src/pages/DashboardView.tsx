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
  attendance_rate: number;
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
  const d = stats.data as (Record<string, any> & {
    present: number;
    excused: number;
    unexcused: number;
    skipped: number;
    warnings: number;
  }) | null | undefined;

  const canShowGroups = propShowGroups !== undefined ? propShowGroups : user?.role !== 'group_leader';
  const totalGroups = groups.data?.length ?? 0;
  const groupNameById = new Map((groups.data ?? []).map((g) => [g.id, g.name]));
  const groupStudentsById = new Map((groups.data ?? []).map((g) => [g.id, Number(g.student_count ?? 0)]));
  const leaderGroupName = effectiveGroupId ? groupNameById.get(effectiveGroupId) : undefined;
  const resolvedBase = basePath ?? (user?.role === 'group_leader' ? '/leader' : '/admin');
  const resolvedTitle = title ?? roleTitle ?? 'Boshqaruv paneli';

  const rawByGroup: Array<Record<string, any>> = Array.isArray(d?.by_group)
    ? d.by_group
    : Array.isArray(d?.groups)
    ? d.groups
    : [];

  const byGroupMap = new Map<string, Record<string, any>>();
  for (const item of rawByGroup) {
    const key = String(item.group_id ?? item.id ?? '');
    if (key) byGroupMap.set(key, item);
  }

  const groupRows: GroupSummaryRow[] = (groups.data ?? [])
    .filter((g) => (!effectiveGroupId ? true : g.id === effectiveGroupId))
    .map((g) => {
      const s = byGroupMap.get(g.id) ?? {};
      const present = Number(s.present ?? 0);
      const excused = Number(s.excused ?? 0);
      const unexcused = Number(s.unexcused ?? 0);
      const skipped = Number(s.skipped ?? 0);
      const totalMarks = present + excused + unexcused + skipped;
      const computedRate = totalMarks > 0 ? Math.round((present / totalMarks) * 100) : 0;
      const rateRaw = s.attendance_rate ?? s.rate ?? computedRate;
      const attendance_rate = Math.max(0, Math.min(100, Number(rateRaw) || 0));

      return {
        group_id: g.id,
        group_name: g.name,
        students_count: Number(s.students_count ?? groupStudentsById.get(g.id) ?? 0),
        present,
        excused,
        unexcused,
        skipped,
        attendance_rate
      };
    });

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
    },
    {
      key: 'r',
      header: 'Qatnashish',
      sortBy: (r) => r.attendance_rate,
      render: (r) => {
        const rate = r.attendance_rate;
        const barColor =
          rate >= 85 ? 'bg-emerald-500' : rate >= 65 ? 'bg-amber-500' : 'bg-rose-500';
        return (
          <div className="flex min-w-[120px] items-center gap-2.5">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-800">{rate}%</span>
          </div>
        );
      }
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
