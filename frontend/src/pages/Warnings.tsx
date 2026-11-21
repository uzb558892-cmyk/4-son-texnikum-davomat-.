import { useMemo, useState } from 'react';
import { groupsService, warningsService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { SearchInput, Select } from '../components/Fields';
import Button from '../components/Button';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import WarningLetter from '../components/WarningLetter';
import { ErrorBox } from '../components/Feedback';
import { formatDate, formatShort } from '../utils/format';
import type { StudentWarning } from '../types';

const Flag = () => (
  <span
    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs ring-2 ring-rose-100"
    title="Ogohlantirish"
    aria-label="Ogohlantirish"
  >
    !
  </span>
);

export default function Warnings() {
  const { user } = useAuth();
  const seeAll = user?.role !== 'group_leader';
  const [groupId, setGroupId] = useState(seeAll ? '' : user?.group_id ?? '');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<StudentWarning | null>(null);
  const [letter, setLetter] = useState<StudentWarning | null>(null);
  const groups = useAsync(() => groupsService.list(), []);
  const warnings = useAsync(() => warningsService.list(groupId || undefined), [groupId]);

  const rows = useMemo(
    () => (warnings.data ?? []).filter((w) => w.student_name.toLowerCase().includes(q.toLowerCase())),
    [warnings.data, q]
  );

  const cols: Column<StudentWarning>[] = [
    { key: 'f', header: '', render: () => <Flag /> },
    {
      key: 'n',
      header: "O'quvchi",
      sortBy: (w) => w.student_name,
      render: (w) => <span className="font-semibold text-slate-900">{w.student_name}</span>
    },
    {
      key: 'g',
      header: 'Guruh',
      sortBy: (w) => w.group_name,
      render: (w) => <span className="font-medium text-indigo-700">{w.group_name}</span>
    },
    {
      key: 'h',
      header: 'Sababsiz soat',
      sortBy: (w) => w.unexcused_hours,
      render: (w) => <span className="tabular-nums font-bold text-rose-700">{w.unexcused_hours} soat</span>
    },
    {
      key: 'l',
      header: 'Oxirgi sana',
      sortBy: (w) => w.last_absence_date ?? '',
      render: (w) => <span className="tabular-nums text-slate-600">{formatDate(w.last_absence_date)}</span>
    },
    {
      key: 'a',
      header: '',
      className: 'text-right',
      render: (w) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setDetail(w)}>
            Batafsil
          </Button>
          <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => setLetter(w)}>
            Xat tayyorlash
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Ogohlantirishlar"
        subtitle="72 soatdan ortiq darsni uzrsiz qoldirgan o'quvchilar (hisob-kitob serverda bajariladi)"
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="O'quvchi qidirish..." />
            {seeAll && (
              <Select aria-label="Guruh" className="sm:w-44" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Barcha guruhlar</option>
                {(groups.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            )}
          </>
        }
      />

      {warnings.error && <ErrorBox message={warnings.error} onRetry={warnings.reload} />}

      <DataTable
        columns={cols}
        rows={rows}
        rowKey={(w) => w.student_id}
        loading={warnings.loading}
        empty="72 soatdan oshgan ogohlantirishlar yo'q"
      />

      {detail && (
        <Modal title={`${detail.student_name} — ${detail.group_name}`} onClose={() => setDetail(null)}>
          <div className="mb-4 grid grid-cols-2 gap-2.5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/50 p-3.5 text-center">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Sababsiz soat</div>
              <div className="tabular-nums text-lg font-extrabold text-rose-700">{detail.unexcused_hours} soat</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Chegara</div>
              <div className="tabular-nums text-lg font-extrabold text-indigo-700">{detail.threshold_hours} soat</div>
            </div>
          </div>

          <div className="mb-2 text-xs font-bold tracking-wide text-slate-600 uppercase">
            Qoldirilgan darslar ({detail.absences.length})
          </div>
          <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {detail.absences.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs hover:bg-indigo-50/40">
                <span className="tabular-nums font-medium text-slate-700">
                  {formatShort(a.date)} · {a.lesson}-para
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Yopish
            </Button>
            <Button
              onClick={() => {
                const target = detail;
                setDetail(null);
                setLetter(target);
              }}
            >
              Xat tayyorlash
            </Button>
          </div>
        </Modal>
      )}

      {letter && (
        <Modal title={`Ogohlantirish xati — ${letter.student_name}`} onClose={() => setLetter(null)} wide>
          <WarningLetter w={letter} />
        </Modal>
      )}
    </>
  );
}
