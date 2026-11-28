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
import ParentCodesModal from '../components/ParentCodesModal';
import { ErrorBox, Toast } from '../components/Feedback';
import { errorMessage } from '../utils/format';
import {
  exportStudentsToExcel,
  exportStudentsToPdf,
  exportStudentsToWord
} from '../utils/exportStudents';
import type { Student } from '../types';

export default function Students() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const seeAll = user?.role !== 'group_leader';
  const canCodes = user?.role === 'admin' || user?.role === 'group_leader';
  const [groupId, setGroupId] = useState(seeAll ? '' : user?.group_id ?? '');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const groups = useAsync(() => groupsService.list(), []);
  const students = useAsync(() => studentsService.list(groupId || undefined), [groupId]);
  const [edit, setEdit] = useState<Partial<Student> | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);

  const notify = (m: string, t: 'ok' | 'err' = 'ok') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2500);
  };

  const groupNameById = useMemo(
    () => new Map((groups.data ?? []).map((g) => [g.id, g.name])),
    [groups.data]
  );

  const enriched = useMemo(
    () =>
      (students.data ?? []).map((s) => ({
        ...s,
        group_name: s.group_name || groupNameById.get(s.group_id) || '—'
      })),
    [students.data, groupNameById]
  );

  const rows = useMemo(() => {
    const query = dq.trim().toLowerCase();
    if (!query) return enriched;
    return enriched.filter(
      (s) =>
        s.full_name.toLowerCase().includes(query) ||
        (s.group_name ?? '').toLowerCase().includes(query)
    );
  }, [enriched, dq]);

  const selectedGroupName = groupId ? (groupNameById.get(groupId) ?? 'Tanlangan guruh') : 'Barcha guruhlar';

  async function save() {
    if (!edit?.full_name || !edit.group_id) return;
    try {
      await studentsService.save({
        id: edit.id,
        full_name: edit.full_name,
        group_id: edit.group_id,
        phone: edit.phone,
        parent_phone: edit.parent_phone
      });
      setEdit(null);
      students.reload();
      notify('Saqlandi');
    } catch (e) {
      notify(errorMessage(e), 'err');
    }
  }

  async function remove(s: Student) {
    if (!confirm(`"${s.full_name}" o'quvchisini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await studentsService.remove(s.id);
      students.reload();
      notify("O'chirildi");
    } catch (e) {
      notify(errorMessage(e), 'err');
    }
  }

  const cols: Column<Student>[] = [
    {
      key: 'n',
      header: 'F.I.Sh.',
      sortBy: (s) => s.full_name,
      render: (s) => <span className="font-semibold text-slate-900">{s.full_name}</span>
    },
    {
      key: 'g',
      header: 'Guruh',
      sortBy: (s) => s.group_name ?? '',
      render: (s) => (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
          {s.group_name}
        </span>
      )
    },
    {
      key: 'p',
      header: 'Telefon',
      render: (s) =>
        s.phone ? (
          <span className="tabular-nums text-slate-700">{s.phone}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )
    },
    {
      key: 'pp',
      header: 'Ota-onasi telefoni',
      render: (s) =>
        s.parent_phone ? (
          <span className="tabular-nums text-slate-700">{s.parent_phone}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )
    }
  ];

  if (isAdmin) {
    cols.push({
      key: 'a',
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEdit(s)}>
            Tahrirlash
          </Button>
          <Button
            variant="ghost"
            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => remove(s)}
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
        title="O'quvchilar"
        subtitle={`${selectedGroupName} · ${rows.length} ta o'quvchi`}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!rows.length}
              onClick={() => {
                exportStudentsToExcel(rows, selectedGroupName);
                notify('Excel fayl yuklandi');
              }}
            >
              Excel
            </Button>
            <Button
              variant="secondary"
              disabled={!rows.length}
              onClick={() => {
                exportStudentsToWord(rows, selectedGroupName);
                notify('Word fayl yuklandi');
              }}
            >
              Word
            </Button>
            <Button
              variant="secondary"
              disabled={!rows.length}
              onClick={() => exportStudentsToPdf(rows, selectedGroupName)}
            >
              PDF
            </Button>
            {canCodes && (
              <Button variant="secondary" onClick={() => setShowCodes(true)}>
                Ota-ona kodlari
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setEdit({ group_id: groupId || groups.data?.[0]?.id })}>
                + O&apos;quvchi qo&apos;shish
              </Button>
            )}
          </>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {seeAll && (
          <Field label="Guruh bo'yicha filtr">
            <Select aria-label="Guruh" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Barcha guruhlar</option>
              {(groups.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="F.I.Sh. yoki guruh bo'yicha qidirish">
          <SearchInput value={q} onChange={setQ} placeholder="Ism-familiya yoki guruh..." />
        </Field>
        <div className="flex items-end justify-between gap-2 text-xs text-slate-500">
          <span>
            Ko&apos;rsatilmoqda: <strong className="text-slate-800">{rows.length}</strong> /{' '}
            <strong className="text-slate-800">{enriched.length}</strong>
          </span>
          {(groupId || q) && (
            <Button
              variant="ghost"
              className="px-2.5 py-1 text-xs"
              onClick={() => {
                if (seeAll) setGroupId('');
                setQ('');
              }}
            >
              Filtrni tozalash
            </Button>
          )}
        </div>
      </div>

      {students.error && <ErrorBox message={students.error} onRetry={students.reload} />}

      <DataTable columns={cols} rows={rows} rowKey={(s) => s.id} loading={students.loading} />

      {showCodes && <ParentCodesModal groupId={groupId} onClose={() => setShowCodes(false)} />}

      {edit && (
        <Modal title={edit.id ? "O'quvchi tahrirlash" : "Yangi o'quvchi"} onClose={() => setEdit(null)}>
          <div className="space-y-4">
            <Field label="F.I.Sh.">
              <Input value={edit.full_name ?? ''} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} />
            </Field>
            <Field label="Guruh">
              <Select value={edit.group_id ?? ''} onChange={(e) => setEdit({ ...edit, group_id: e.target.value })}>
                {(groups.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Telefon">
              <Input value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Ota-onasi telefoni">
              <Input
                value={edit.parent_phone ?? ''}
                onChange={(e) => setEdit({ ...edit, parent_phone: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setEdit(null)}>
                Bekor qilish
              </Button>
              <Button onClick={save} disabled={!edit.full_name || !edit.group_id}>
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
