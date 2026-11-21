import { useMemo, useState } from 'react';
import { groupsService, usersService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { SearchInput, Field, Input, Select } from '../components/Fields';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ErrorBox, Toast } from '../components/Feedback';
import { errorMessage } from '../utils/format';
import type { Group } from '../types';

export default function Groups() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const groups = useAsync(() => groupsService.list(), []);
  const users = useAsync(() => (isAdmin ? usersService.list() : Promise.resolve([])), [isAdmin]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Partial<Group> | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);

  const rows = useMemo(
    () => (groups.data ?? []).filter((g) => g.name.toLowerCase().includes(q.toLowerCase())),
    [groups.data, q]
  );
  const leaders = (users.data ?? []).filter((u) => u.role === 'group_leader');

  const notify = (m: string, t: 'ok' | 'err' = 'ok') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2500);
  };

  async function save() {
    if (!edit?.name || !edit.course) return;
    try {
      await groupsService.save({
        id: edit.id,
        name: edit.name,
        course: Number(edit.course),
        leader_id: edit.leader_id
      });
      setEdit(null);
      groups.reload();
      notify('Saqlandi');
    } catch (e) {
      notify(errorMessage(e), 'err');
    }
  }

  async function remove(g: Group) {
    if (!confirm(`"${g.name}" guruhini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await groupsService.remove(g.id);
      groups.reload();
      notify("O'chirildi");
    } catch (e) {
      notify(errorMessage(e), 'err');
    }
  }

  const cols: Column<Group>[] = [
    {
      key: 'n',
      header: 'Guruh',
      sortBy: (g) => g.name,
      render: (g) => <span className="font-semibold text-slate-900">{g.name}</span>
    },
    {
      key: 'c',
      header: 'Kurs',
      sortBy: (g) => g.course,
      render: (g) => (
        <span className="tabular-nums inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
          {g.course}-kurs
        </span>
      )
    },
    {
      key: 'l',
      header: 'Guruh rahbari',
      sortBy: (g) => g.leader_name ?? '',
      render: (g) =>
        g.leader_name ? (
          <span className="font-medium text-slate-700">{g.leader_name}</span>
        ) : (
          <span className="text-slate-400">Biriktirilmagan</span>
        )
    },
    {
      key: 's',
      header: "O'quvchilar soni",
      sortBy: (g) => g.student_count ?? 0,
      render: (g) => <span className="tabular-nums font-bold text-slate-800">{g.student_count ?? 0}</span>
    }
  ];

  if (isAdmin) {
    cols.push({
      key: 'a',
      header: '',
      className: 'text-right',
      render: (g) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEdit(g)}>
            Tahrirlash
          </Button>
          <Button
            variant="ghost"
            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => remove(g)}
          >
            O&apos;chirish
          </Button>
        </div>
      )
    });
  }

  return (
    <>
      <PageHeader
        title="Guruhlar"
        subtitle={user?.role !== 'group_leader' ? "Barcha guruhlar ro'yxati" : 'Sizning guruhingiz'}
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Guruh qidirish..." />
            {isAdmin && <Button onClick={() => setEdit({ course: 1 })}>+ Guruh qo&apos;shish</Button>}
          </>
        }
      />

      {groups.error && <ErrorBox message={groups.error} onRetry={groups.reload} />}

      <DataTable columns={cols} rows={rows} rowKey={(g) => g.id} loading={groups.loading} />

      {edit && (
        <Modal title={edit.id ? 'Guruhni tahrirlash' : 'Yangi guruh'} onClose={() => setEdit(null)}>
          <div className="space-y-4">
            <Field label="Guruh nomi">
              <Input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Kurs">
              <Select
                value={edit.course ?? 1}
                onChange={(e) => setEdit({ ...edit, course: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((c) => (
                  <option key={c} value={c}>
                    {c}-kurs
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Guruh rahbari">
              <Select
                value={edit.leader_id ?? ''}
                onChange={(e) => setEdit({ ...edit, leader_id: e.target.value || null })}
              >
                <option value="">Biriktirilmagan</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setEdit(null)}>
                Bekor qilish
              </Button>
              <Button onClick={save} disabled={!edit.name}>
                Saqlash
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.m} tone={toast.t} />}
    </>
  );
}
