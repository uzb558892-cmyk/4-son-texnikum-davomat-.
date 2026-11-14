import { useMemo, useState } from 'react';
import { groupsService, studentsService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { SearchInput, Field, Input, Select } from '../components/Fields';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ErrorBox, Toast } from '../components/Feedback';
import { errorMessage } from '../utils/format';
import type { Student } from '../types';

export default function Students() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [groupId, setGroupId] = useState(isAdmin ? '' : user?.group_id ?? '');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const groups = useAsync(() => groupsService.list(), []);
  const students = useAsync(() => studentsService.list(groupId || undefined), [groupId]);
  const [edit, setEdit] = useState<Partial<Student> | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);
  const notify = (m: string, t: 'ok' | 'err' = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2500); };

  const rows = useMemo(() => (students.data ?? []).filter((s) => s.full_name.toLowerCase().includes(dq.toLowerCase())), [students.data, dq]);

  async function save() {
    if (!edit?.full_name || !edit.group_id) return;
    try {
      await studentsService.save({ id: edit.id, full_name: edit.full_name, group_id: edit.group_id, phone: edit.phone, parent_phone: edit.parent_phone });
      setEdit(null); students.reload(); notify('Saqlandi');
    } catch (e) { notify(errorMessage(e), 'err'); }
  }
  async function remove(s: Student) {
    if (!confirm(`"${s.full_name}" o'quvchisini o'chirishni tasdiqlaysizmi?`)) return;
    try { await studentsService.remove(s.id); students.reload(); notify("O'chirildi"); } catch (e) { notify(errorMessage(e), 'err'); }
  }

  const cols: Column<Student>[] = [
    { key: 'n', header: "F.I.Sh.", render: (s) => <span className="font-semibold">{s.full_name}</span> },
    { key: 'g', header: 'Guruh', render: (s) => s.group_name },
    { key: 'p', header: 'Telefon', render: (s) => s.phone || '—' },
    { key: 'pp', header: 'Ota-onasi telefoni', render: (s) => s.parent_phone || '—' }
  ];
  if (isAdmin) cols.push({ key: 'a', header: '', className: 'text-right', render: (s) => (
    <div className="flex justify-end gap-1"><Button variant="ghost" className="px-2 py-1" onClick={() => setEdit(s)}>Tahrirlash</Button><Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => remove(s)}>O'chirish</Button></div>
  ) });

  return (
    <>
      <PageHeader title="O'quvchilar" subtitle={`Jami: ${rows.length} ta`}
        actions={<>
          <SearchInput value={q} onChange={setQ} placeholder="F.I.Sh. bo'yicha qidirish..." />
          {isAdmin && (
            <Select aria-label="Guruh" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="sm:w-44">
              <option value="">Barcha guruhlar</option>
              {(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          )}
          {isAdmin && <Button onClick={() => setEdit({ group_id: groupId || groups.data?.[0]?.id })}>+ O'quvchi qo'shish</Button>}
        </>} />
      {students.error && <ErrorBox message={students.error} onRetry={students.reload} />}
      <DataTable columns={cols} rows={rows} rowKey={(s) => s.id} loading={students.loading} />
      {edit && (
        <Modal title={edit.id ? "O'quvchini tahrirlash" : "Yangi o'quvchi"} onClose={() => setEdit(null)}>
          <div className="space-y-4">
            <Field label="F.I.Sh."><Input value={edit.full_name ?? ''} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="Guruh"><Select value={edit.group_id ?? ''} onChange={(e) => setEdit({ ...edit, group_id: e.target.value })}>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
            <Field label="Telefon"><Input value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Ota-onasi telefoni"><Input value={edit.parent_phone ?? ''} onChange={(e) => setEdit({ ...edit, parent_phone: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(null)}>Bekor qilish</Button><Button onClick={save} disabled={!edit.full_name || !edit.group_id}>Saqlash</Button></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.m} tone={toast.t} />}
    </>
  );
}
