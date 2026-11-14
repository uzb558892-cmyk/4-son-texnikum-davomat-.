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

const Flag = () => <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white" title="Ogohlantirish" aria-label="Ogohlantirish">!</span>;

export default function Warnings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [groupId, setGroupId] = useState(isAdmin ? '' : user?.group_id ?? '');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<StudentWarning | null>(null);
  const [letter, setLetter] = useState<StudentWarning | null>(null);
  const groups = useAsync(() => groupsService.list(), []);
  const warnings = useAsync(() => warningsService.list(groupId || undefined), [groupId]);

  const rows = useMemo(() => (warnings.data ?? []).filter((w) => w.student_name.toLowerCase().includes(q.toLowerCase())), [warnings.data, q]);

  const cols: Column<StudentWarning>[] = [
    { key: 'f', header: '', render: () => <Flag /> },
    { key: 'n', header: "O'quvchi", render: (w) => <span className="font-semibold">{w.student_name}</span> },
    { key: 'g', header: 'Guruh', render: (w) => w.group_name },
    { key: 'h', header: 'Sababsiz soat', render: (w) => <span className="font-bold text-red-700">{w.unexcused_hours} soat</span> },
    { key: 'l', header: 'Oxirgi sana', render: (w) => formatDate(w.last_absence_date) },
    { key: 'a', header: '', className: 'text-right', render: (w) => (
      <div className="flex justify-end gap-1"><Button variant="ghost" className="px-2 py-1" onClick={() => setDetail(w)}>Batafsil</Button><Button variant="secondary" className="px-3 py-1" onClick={() => setLetter(w)}>Xat tayyorlash</Button></div>
    ) }
  ];

  return (
    <>
      <PageHeader title="Ogohlantirishlar" subtitle="72 soatdan ortiq darsni uzrsiz qoldirgan o'quvchilar (hisob-kitob serverda bajariladi)"
        actions={<>
          <SearchInput value={q} onChange={setQ} placeholder="O'quvchi qidirish..." />
          {isAdmin && <Select aria-label="Guruh" className="sm:w-44" value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">Barcha guruhlar</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>}
        </>} />
      {!warnings.loading && rows.length > 0 && (
        <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><Flag />{rows.length} nafar o'quvchi chegaradan oshgan.</div>
      )}
      {warnings.error && <ErrorBox message={warnings.error} onRetry={warnings.reload} />}
      <DataTable columns={cols} rows={rows} rowKey={(w) => w.student_id} loading={warnings.loading} empty="Ogohlantirish talab qilinadigan o'quvchilar yo'q" />

      {detail && (
        <Modal title="O'quvchi haqida ma'lumot" onClose={() => setDetail(null)} wide>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><div className="text-slate-500">F.I.Sh.</div><div className="font-semibold">{detail.student_name}</div></div>
            <div><div className="text-slate-500">Guruh</div><div className="font-semibold">{detail.group_name}</div></div>
            <div><div className="text-slate-500">Telefon</div><div>{detail.phone || '—'}</div></div>
            <div><div className="text-slate-500">Ota-onasi telefoni</div><div>{detail.parent_phone || '—'}</div></div>
            <div><div className="text-slate-500">Sababsiz qoldirilgan</div><div className="font-bold text-red-700">{detail.unexcused_hours} soat (chegara: {detail.threshold_hours})</div></div>
            <div><div className="text-slate-500">Oxirgi qoldirilgan sana</div><div>{formatDate(detail.last_absence_date)}</div></div>
          </div>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Qoldirilgan darslar</h3>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-3 py-2">Sana</th><th className="px-3 py-2">Para</th><th className="px-3 py-2">Holat</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{detail.absences.map((a, i) => <tr key={i}><td className="px-3 py-2">{formatShort(a.date)}</td><td className="px-3 py-2">{a.lesson}-para</td><td className="px-3 py-2"><StatusBadge status={a.status} /></td></tr>)}</tbody></table>
          </div>
          <div className="mt-4 flex justify-end"><Button onClick={() => { setLetter(detail); setDetail(null); }}>Xat tayyorlash</Button></div>
        </Modal>
      )}
      {letter && <Modal title="Ogohlantirish xati" onClose={() => setLetter(null)} wide><WarningLetter w={letter} /></Modal>}
    </>
  );
}
