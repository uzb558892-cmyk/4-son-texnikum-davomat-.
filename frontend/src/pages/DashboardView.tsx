import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { dashboardService, groupsService } from '../services';
import { db } from '../services/supabase';
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

interface LiveCounts {
  byGroup: Record<string, { present: number; excused: number; unexcused: number; skipped: number }>;
  totals: { present: number; excused: number; unexcused: number; skipped: number };
}

type AttendanceKind = 'present' | 'excused' | 'unexcused' | 'skipped';

const PRIORITY: Record<AttendanceKind, number> = {
  present: 1,
  excused: 2,
  unexcused: 3,
  skipped: 4
};

function parseKind(row: Record<string, any>): AttendanceKind | null {
  const raw = String(
    row.status ?? row.attendance_status ?? row.state ?? row.type ?? row.mark ?? ''
  )
    .trim()
    .toLowerCase();

  if (raw === 'skipped' || raw === 'qochdi' || raw.includes('skip') || raw.includes('qoch')) {
    return 'skipped';
  }
  if (
    raw === 'unexcused' ||
    raw === 'sababsiz' ||
    raw === 'absent' ||
    raw.includes('unexcus') ||
    raw.includes('sababsiz')
  ) {
    return 'unexcused';
  }
  if (raw === 'excused' || raw === 'sababli' || raw.includes('excus') || raw.includes('sabab')) {
    return 'excused';
  }
  if (raw === 'present' || raw === 'keldi' || raw === 'bor' || raw === '+') {
    return 'present';
  }
  return null;
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
  const [live, setLive] = useState<LiveCounts>({
    byGroup: {},
    totals: { present: 0, excused: 0, unexcused: 0, skipped: 0 }
  });

  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = db();
        let q = client.from('attendance').select('*').eq('lesson_date', today);
        if (effectiveGroupId) q = q.eq('group_id', effectiveGroupId);
        const { data, error } = await q;
        if (error) throw error;

        // Har bir o'quvchi bo'yicha eng yuqori ustuvor holatni saqlaymiz (qochdi > sababsiz > sababli > keldi)
        const studentStateByGroup: Record<string, Record<string, AttendanceKind>> = {};
        const fallbackCounterByGroup: Record<
          string,
          { present: number; excused: number; unexcused: number; skipped: number }
        > = {};

        for (const r of (data ?? []) as Array<Record<string, any>>) {
          const gid = String(r.group_id ?? '');
          const kind = parseKind(r);
          if (!gid || !kind) continue;

          const sid = String(r.student_id ?? r.pupil_id ?? '');
          if (sid) {
            if (!studentStateByGroup[gid]) studentStateByGroup[gid] = {};
            const prev = studentStateByGroup[gid][sid];
            if (!prev || PRIORITY[kind] > PRIORITY[prev]) {
              studentStateByGroup[gid][sid] = kind;
            }
          } else {
            if (!fallbackCounterByGroup[gid]) {
              fallbackCounterByGroup[gid] = { present: 0, excused: 0, unexcused: 0, skipped: 0 };
            }
            fallbackCounterByGroup[gid][kind] += 1;
          }
        }

        const allGroupIds = new Set([
          ...Object.keys(studentStateByGroup),
          ...Object.keys(fallbackCounterByGroup)
        ]);

        const byGroup: LiveCounts['byGroup'] = {};
        const totals = { present: 0, excused: 0, unexcused: 0, skipped: 0 };

        for (const gid of allGroupIds) {
          const counts = { present: 0, excused: 0, unexcused: 0, skipped: 0 };
          const map = studentStateByGroup[gid] ?? {};
          for (const kind of Object.values(map)) {
            counts[kind] += 1;
          }
          const fb = fallbackCounterByGroup[gid];
          if (fb) {
            counts.present += fb.present;
            counts.excused += fb.excused;
            counts.unexcused += fb.unexcused;
            counts.skipped += fb.skipped;
          }
          byGroup[gid] = counts;
          totals.present += counts.present;
          totals.excused += counts.excused;
          totals.unexcused += counts.unexcused;
          totals.skipped += counts.skipped;
        }

        if (!cancelled) {
          setLive({ byGroup, totals });
        }
      } catch {
        // Keep stats fallback
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveGroupId, today]);

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
      const rpcItem = byGroupMap.get(g.id) ?? {};
      const liveItem = live.byGroup[g.id];
      const studentsCount = Math.max(0, Number(rpcItem.students_count ?? groupStudentsById.get(g.id) ?? 0));

      let present = liveItem ? liveItem.present : Number(rpcItem.present ?? 0);
      let excused = liveItem ? liveItem.excused : Number(rpcItem.excused ?? 0);
      let unexcused = liveItem ? liveItem.unexcused : Number(rpcItem.unexcused ?? 0);
      let skipped = liveItem ? liveItem.skipped : Number(rpcItem.skipped ?? 0);

      // Agar biror sabab bilan yig'indi guruhdagi o'quvchilar sonidan oshsa, o'quvchilar soniga mutanosib chegaralaymiz
      const sum = present + excused + unexcused + skipped;
      if (studentsCount > 0 && sum > studentsCount) {
        const ratio = studentsCount / sum;
        present = Math.floor(present * ratio);
        excused = Math.floor(excused * ratio);
        unexcused = Math.floor(unexcused * ratio);
        skipped = Math.floor(skipped * ratio);
        let rem = studentsCount - (present + excused + unexcused + skipped);
        if (rem > 0 && liveItem) {
          const addP = Math.min(rem, liveItem.present);
          present += addP;
          rem -= addP;
        }
      }

      const markedTotal = present + excused + unexcused + skipped;
      const denom = studentsCount > 0 ? Math.max(studentsCount, markedTotal) : markedTotal;
      const computedRate = denom > 0 ? Math.min(100, Math.round((present / denom) * 100)) : 0;

      return {
        group_id: g.id,
        group_name: g.name,
        students_count: studentsCount,
        present,
        excused,
        unexcused,
        skipped,
        attendance_rate: computedRate
      };
    });

  const displayTotals = {
    present: live.totals.present || Number(d?.present ?? 0),
    excused: live.totals.excused || Number(d?.excused ?? 0),
    unexcused: live.totals.unexcused || Number(d?.unexcused ?? 0),
    skipped: live.totals.skipped || Number(d?.skipped ?? 0),
    warnings: Number(d?.warnings ?? 0)
  };

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
        subtitle={`Bugun: ${formatDate(today)}${leaderGroupName ? ` · ${leaderGroupName}` : ''}`}
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
              value={displayTotals.present}
              sub="belgilangan o'quvchilar"
              icon={<Icon name="check" />}
              tone="green"
            />
            <StatCard
              label="Sababli kelmadi"
              value={displayTotals.excused}
              icon={<Icon name="report" />}
              tone="amber"
            />
            <StatCard
              label="Sababsiz kelmadi"
              value={displayTotals.unexcused}
              icon={<Icon name="alert" />}
              tone="red"
            />
            <StatCard
              label="Darsdan qochdi"
              value={displayTotals.skipped}
              icon={<Icon name="alert" />}
              tone="violet"
            />
            <StatCard
              label="Ogohlantirishlar"
              value={displayTotals.warnings}
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
