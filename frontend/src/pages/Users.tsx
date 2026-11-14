import { useMemo, useState } from 'react';
import { groupsService, usersService } from '../services';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { SearchInput, Field, Input, Select } from '../components/Fields';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ErrorBox, Toast } from '../components/Feedback';
import { ROLE_LABEL } from '../utils/constants';
import { errorMessage } from '../utils/format';
import type { NewUserInput, Profile, Role } from '../types';

const empty: NewUserInput = { email: '', password: '', full_name: '', role: 'group_leader', group_id: null };

export default function Users() {
  const users = useAsync(() => usersService.list(), []);
  const groups = useAsync(() => groupsService.list(), []);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<NewUserInput | null>(null);
  const [edit, setEdit] = useState<Profile | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);
  const notify = (m: string, t: 'ok' | 'err' = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2500); };

  const rows = useMemo(() => (users.data ?? []).filter((u) => (u.full_name + u.email).toLowerCase().includes(q.toLowerCase())), [users.data, q]);
  const groupName = (id: string | null) => (groups.data ?? []).find((g) => g.id === id)?.name ?? '—';

  async function create() {
    if (!form) return;
    try { await usersService.create(form); setForm(null); users.reload(); notify("Foydalanuvchi qo'shildi"); }
    catch (e) { notify(errorMessage(e), 'err'); }
  }
  async function saveEdit() {
    if (!edit) return;
    try { await usersService.update(edit.id, { full_name: edit.full_name, group_id: edit.group_id }); setEdit(null); users.reload(); notify('Saqlandi'); }
    catch (e) { notify(errorMessage(e), 'err'); }
  }
  async function toggle(u: Profile) {
    try { await usersService.update(u.id, { is_active: !u.is_active }); users.reload(); } catch (e) { notify(errorMessage(e), 'err'); }
  }

  const cols: Column<Profile>[] = [
    { key: 'n', header: 'F.I.Sh.', render: (u) => <span className="font-semibold">{u.full_name}</span> },
    { key: 'e', header: 'Email', render: (u) => u.email },
    { key: 'r', header: 'Rol', render: (u) => ROLE_LABEL[u.role] },
    { key: 'g', header: 'Guruh', render: (u) => groupName(u.group_id) },
    { key: 's', header: 'Holat', render: (u) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${u.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{u.is_active ? 'Faol' : 'Faol emas'}</span> },
    { key: 'a', header: '', className: 'text-right', render: (u) => u.role === 'admin' ? <span className="text-xs text-slate-400">Himoyalangan</span> : (
      <div className="flex justify-end gap-1"><Button variant="ghost" className="px-2 py-1" onClick={() => setEdit(u)}>Tahrirlash</Button><Button variant="ghost" className="px-2 py-1" onClick={() => toggle(u)}>{u.is_active ? "O'chirib qo'yish" : 'Faollashtirish'}</Button></div>
    ) }
  ];

  const groupSelect = (value: string | null, onChange: (v: string | null) => void) => (
    <Field label="Guruh"><Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}><option value="">Biriktirilmagan</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
  );

  return (
    <>
      <PageHeader title="Foydalanuvchilar" subtitle="Administratorlar va guruh rahbarlari"
        actions={<><SearchInput value={q} onChange={setQ} placeholder="Ism yoki email..." /><Button onClick={() => setForm(empty)}>+ Foydalanuvchi qo'shish</Button></>} />
      {users.error && <ErrorBox message={users.error} onRetry={users.reload} />}
      <DataTable columns={cols} rows={rows} rowKey={(u) => u.id} loading={users.loading} />

      {form && (
        <Modal title="Yangi foydalanuvchi" onClose={() => setForm(null)}>
          <div className="space-y-4">
            <Field label="F.I.Sh."><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Vaqtinchalik parol"><Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Rol"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="group_leader">Guruh rahbari</option></Select></Field>
            {groupSelect(form.group_id, (v) => setForm({ ...form, group_id: v }))}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Bekor qilish</Button><Button onClick={create} disabled={!form.full_name || !form.email || form.password.length < 8}>Qo'shish</Button></div>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title="Foydalanuvchini tahrirlash" onClose={() => setEdit(null)}>
          <div className="space-y-4">
            <Field label="F.I.Sh."><Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={edit.email} disabled /></Field>
            <Field label="Rol"><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}><option value="group_leader">Guruh rahbari</option></Select></Field>
            {edit.role === 'group_leader' && groupSelect(edit.group_id, (v) => setEdit({ ...edit, group_id: v }))}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(null)}>Bekor qilish</Button><Button onClick={saveEdit}>Saqlash</Button></div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast.m} tone={toast.t} />}
    </>
  );
}
