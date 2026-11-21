import { useMemo, useState } from 'react';
import { groupsService, usersService } from '../services';
import { db } from '../services/supabase';
import type { NewAdminInput, UserPatch, UserRow } from '../services/usersService';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import { SearchInput, Field, Input, Select } from '../components/Fields';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ErrorBox, Toast } from '../components/Feedback';
import { ROLE_LABEL } from '../utils/constants';
import { errorMessage } from '../utils/format';
import type { NewUserInput, Role } from '../types';

type UserForm = NewUserInput & { phone: string; job_title: string };

const empty: UserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'group_leader',
  group_id: null,
  phone: '',
  job_title: ''
};
const emptyAdmin: NewAdminInput = { email: '', password: '', full_name: '', phone: '', job_title: '' };

export default function Users() {
  const users = useAsync(() => usersService.list(), []);
  const groups = useAsync(() => groupsService.list(), []);
  const me = useAsync(async () => (await db().auth.getUser()).data.user?.id ?? null, []);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<UserForm | null>(null);
  const [adminForm, setAdminForm] = useState<NewAdminInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [newPass, setNewPass] = useState('');
  const [toast, setToast] = useState<{ m: string; t: 'ok' | 'err' } | null>(null);

  const notify = (m: string, t: 'ok' | 'err' = 'ok') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2500);
  };

  const all = users.data ?? [];
  const isPrimary = all.find((u) => u.id === me.data)?.is_primary === true;
  const adminCount = all.filter((u) => u.role === 'admin').length;
  const showAddAdmin = isPrimary && adminCount < 3;
  const minPass = form && form.role !== 'group_leader' ? 10 : 8;

  const rows = useMemo(
    () => all.filter((u) => (u.full_name + u.email).toLowerCase().includes(q.toLowerCase())),
    [all, q]
  );
  const groupName = (id: string | null) => (groups.data ?? []).find((g) => g.id === id)?.name ?? '—';

  async function create() {
    if (!form) return;
    setBusy(true);
    try {
      if (form.role === 'manaviyatchi' || form.role === 'direktor' || form.role === 'navbatchi') {
        await usersService.createStaff({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          job_title: form.job_title,
          role: form.role
        });
      } else {
        await usersService.create(form);
      }
      setForm(null);
      users.reload();
      notify("Foydalanuvchi qo'shildi");
    } catch (e) {
      notify(errorMessage(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function createAdmin() {
    if (!adminForm) return;
    setBusy(true);
    try {
      await usersService.createAdmin(adminForm);
      setAdminForm(null);
      users.reload();
      notify("Administrator qo'shildi");
    } catch (e) {
      notify(errorMessage(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function adminAction(u: UserRow, action: 'activate' | 'deactivate' | 'delete') {
    const question =
      action === 'delete'
        ? `${u.full_name} administratorini butunlay o'chirasizmi?`
        : action === 'deactivate'
          ? `${u.full_name} administratorini bloklaysizmi?`
          : `${u.full_name} administratorini qayta faollashtirasizmi?`;
    if (!window.confirm(question)) return;
    try {
      await usersService.manageAdmin(u.id, action);
      users.reload();
      notify(
        action === 'delete'
          ? "Administrator o'chirildi"
          : action === 'deactivate'
            ? 'Administrator bloklandi'
            : 'Administrator faollashtirildi'
      );
    } catch (e) {
      notify(errorMessage(e), 'err');
    }
  }

  function openEdit(u: UserRow) {
    setNewPass('');
    setEdit(u);
  }
  function closeEdit() {
    setNewPass('');
    setEdit(null);
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    try {
      const patch: UserPatch = { full_name: edit.full_name };
      if (edit.role === 'group_leader') {
        patch.group_id = edit.group_id;
      } else {
        patch.phone = edit.phone?.trim() || null;
        patch.job_title = edit.job_title?.trim() || null;
      }
      await usersService.update(edit.id, patch);
      if (newPass) await usersService.resetPassword(edit.id, newPass);
      closeEdit();
      users.reload();
      notify('Saqlandi');
    } catch (e) {
      notify(errorMessage(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(u: UserRow) {
    if (u.is_active && !window.confirm(`${u.full_name} hisobini o'chirib qo'yasizmi? U tizimga kira olmaydi.`)) return;
    try {
      await usersService.update(u.id, { is_active: !u.is_active });
      users.reload();
    } catch (e) {
      notify(errorMessage(e), 'err');
    }
  }

  const roleText = (u: UserRow) => {
    if (u.role !== 'admin') return u.job_title ? `${ROLE_LABEL[u.role]} · ${u.job_title}` : ROLE_LABEL[u.role];
    const base = u.is_primary ? 'Asosiy administrator' : 'Administrator';
    return u.job_title ? `${base} · ${u.job_title}` : base;
  };

  const adminActions = (u: UserRow) => {
    if (u.is_primary || !isPrimary) {
      return (
        <span className="inline-flex items-center rounded-full bg-indigo-50/70 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
          Himoyalangan
        </span>
      );
    }
    return (
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => adminAction(u, u.is_active ? 'deactivate' : 'activate')}>
          {u.is_active ? 'Bloklash' : 'Faollashtirish'}
        </Button>
        <Button
          variant="ghost"
          className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={() => adminAction(u, 'delete')}
        >
          {"O'chirish"}
        </Button>
      </div>
    );
  };

  const cols: Column<UserRow>[] = [
    {
      key: 'n',
      header: 'F.I.Sh.',
      sortBy: (u) => u.full_name,
      render: (u) => <span className="font-semibold text-slate-900">{u.full_name}</span>
    },
    {
      key: 'e',
      header: 'Email',
      sortBy: (u) => u.email,
      render: (u) => <span className="text-slate-600">{u.email}</span>
    },
    {
      key: 'r',
      header: 'Rol',
      sortBy: (u) => roleText(u),
      render: (u) => <span className="font-medium text-slate-700">{roleText(u)}</span>
    },
    {
      key: 'g',
      header: 'Guruh',
      render: (u) => {
        const gn = groupName(u.group_id);
        return gn === '—' ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
            {gn}
          </span>
        );
      }
    },
    {
      key: 's',
      header: 'Holat',
      sortBy: (u) => (u.is_active ? 1 : 0),
      render: (u) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            u.is_active
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
              : 'bg-slate-100 text-slate-500 ring-slate-200/80'
          }`}
        >
          {u.is_active ? 'Faol' : 'Faol emas'}
        </span>
      )
    },
    {
      key: 'a',
      header: '',
      className: 'text-right',
      render: (u) =>
        u.role === 'admin' ? (
          adminActions(u)
        ) : (
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => openEdit(u)}>
              Tahrirlash
            </Button>
            <Button
              variant="ghost"
              className={`px-2.5 py-1 text-xs ${
                u.is_active ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
              onClick={() => toggle(u)}
            >
              {u.is_active ? "O'chirib qo'yish" : 'Faollashtirish'}
            </Button>
          </div>
        )
    }
  ];

  const groupSelect = (value: string | null, onChange: (v: string | null) => void) => (
    <Field label="Guruh">
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Biriktirilmagan</option>
        {(groups.data ?? []).map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <>
      <PageHeader
        title="Foydalanuvchilar"
        subtitle="Administratorlar, guruh rahbarlari, ma'naviyatchilar va navbatchilar"
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Ism yoki email..." />
            {showAddAdmin && (
              <Button variant="secondary" onClick={() => setAdminForm(emptyAdmin)}>
                + Administrator qo&apos;shish
              </Button>
            )}
            <Button onClick={() => setForm(empty)}>+ Foydalanuvchi qo&apos;shish</Button>
          </>
        }
      />

      {users.error && <ErrorBox message={users.error} onRetry={users.reload} />}

      <DataTable columns={cols} rows={rows} rowKey={(u) => u.id} loading={users.loading} />

      {adminForm && (
        <Modal title="Administrator qo'shish" onClose={() => setAdminForm(null)}>
          <div className="space-y-4">
            <Field label="F.I.Sh.">
              <Input
                value={adminForm.full_name}
                onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
              />
            </Field>
            <Field label="Telefon raqami">
              <Input type="tel" value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} />
            </Field>
            <Field label="Login (elektron pochta)">
              <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
            </Field>
            <Field label="Parol (kamida 10 belgi)">
              <Input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              />
            </Field>
            <Field label="Lavozimi">
              <Input
                value={adminForm.job_title}
                onChange={(e) => setAdminForm({ ...adminForm, job_title: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setAdminForm(null)}>
                Bekor qilish
              </Button>
              <Button
                onClick={createAdmin}
                disabled={busy || !adminForm.full_name.trim() || !adminForm.email || adminForm.password.length < 10}
              >
                Qo&apos;shish
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {form && (
        <Modal title="Yangi foydalanuvchi" onClose={() => setForm(null)}>
          <div className="space-y-4">
            <Field label="Rol">
              <Select
                value={form.role}
                onChange={(e) => {
                  const role = e.target.value as Role;
                  setForm({ ...form, role, group_id: role === 'group_leader' ? form.group_id : null });
                }}
              >
                <option value="group_leader">Guruh rahbari</option>
                <option value="manaviyatchi">Ma&apos;naviyatchi</option>
                <option value="direktor">Direktor</option>
                <option value="navbatchi">Navbatchi</option>
              </Select>
            </Field>
            <Field label="F.I.Sh.">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={`Vaqtinchalik parol (kamida ${minPass} belgi)`}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            {form.role === 'group_leader' ? (
              groupSelect(form.group_id, (v) => setForm({ ...form, group_id: v }))
            ) : (
              <>
                <Field label="Telefon raqami">
                  <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Lavozimi">
                  <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
                </Field>
              </>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)}>
                Bekor qilish
              </Button>
              <Button
                onClick={create}
                disabled={busy || !form.full_name.trim() || !form.email || form.password.length < minPass}
              >
                Qo&apos;shish
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal title="Foydalanuvchini tahrirlash" onClose={closeEdit}>
          <div className="space-y-4">
            <Field label="F.I.Sh.">
              <Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={edit.email} disabled />
            </Field>
            <Field label="Rol">
              <Input value={ROLE_LABEL[edit.role]} disabled />
            </Field>
            {edit.role === 'group_leader' ? (
              groupSelect(edit.group_id, (v) => setEdit({ ...edit, group_id: v }))
            ) : (
              <>
                <Field label="Telefon raqami">
                  <Input
                    type="tel"
                    value={edit.phone ?? ''}
                    onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  />
                </Field>
                <Field label="Lavozimi">
                  <Input
                    value={edit.job_title ?? ''}
                    onChange={(e) => setEdit({ ...edit, job_title: e.target.value })}
                  />
                </Field>
              </>
            )}
            <Field label="Yangi parol (ixtiyoriy, kamida 10 belgi)">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={closeEdit}>
                Bekor qilish
              </Button>
              <Button
                onClick={saveEdit}
                disabled={busy || !edit.full_name.trim() || (newPass.length > 0 && newPass.length < 10)}
              >
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
