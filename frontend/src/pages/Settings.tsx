import { useState } from 'react';
import { authService } from '../services';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { Field, Input } from '../components/Fields';
import Button from '../components/Button';
import { ROLE_LABEL } from '../utils/constants';
import { errorMessage } from '../utils/format';

export default function Settings() {
  const { user } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      setMsg({ text: "Parol kamida 8 belgidan iborat bo'lishi kerak", ok: false });
      return;
    }
    if (pw !== pw2) {
      setMsg({ text: 'Yangi parollar bir xil emas', ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await authService.changePassword(pw);
      setPw('');
      setPw2('');
      setMsg({ text: 'Parol muvaffaqiyatli yangilandi', ok: true });
    } catch (err) {
      setMsg({ text: errorMessage(err), ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Sozlamalar" subtitle="Profil ma'lumotlari va parolni yangilash" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-800 uppercase">Profil ma&apos;lumotlari</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3.5 py-2.5">
              <dt className="text-slate-500">F.I.Sh.</dt>
              <dd className="font-semibold text-slate-900">{user?.full_name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3.5 py-2.5">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-700">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3.5 py-2.5">
              <dt className="text-slate-500">Rol</dt>
              <dd>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/80">
                  {user?.role ? ROLE_LABEL[user.role] : '—'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <form onSubmit={changePassword} className="card p-5">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-800 uppercase">Parolni o&apos;zgartirish</h2>
          <div className="space-y-4">
            <Field label="Yangi parol">
              <Input
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Kamida 8 belgi"
              />
            </Field>
            <Field label="Yangi parolni tasdiqlang">
              <Input
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Parolni qayta kiriting"
              />
            </Field>
            {msg && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  msg.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {msg.text}
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={saving || !pw || !pw2}>
                {saving ? 'Saqlanmoqda...' : 'Parolni yangilash'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
