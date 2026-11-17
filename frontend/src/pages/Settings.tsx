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
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function change() {
    if (pw.length < 10) return setMsg({ t: 'err', m: "Parol kamida 10 belgidan iborat bo'lsin." });
    if (pw !== pw2) return setMsg({ t: 'err', m: 'Parollar mos kelmadi.' });
    setBusy(true);
    try { await authService.changePassword(pw); setPw(''); setPw2(''); setMsg({ t: 'ok', m: 'Parol yangilandi.' }); }
    catch (e) { setMsg({ t: 'err', m: errorMessage(e) }); }
    finally { setBusy(false); }
  }

  const row = (k: string, v: string) => <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0"><span className="text-slate-500">{k}</span><span className="font-medium">{v}</span></div>;

  return (
    <>
      <PageHeader title="Sozlamalar" subtitle="Profil va xavfsizlik" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">Profil</h2>
          {row('F.I.Sh.', user.full_name)}{row('Email', user.email)}{row('Rol', ROLE_LABEL[user.role])}
          {row("Ma'lumotlar manbai", 'Supabase')}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Parolni o'zgartirish</h2>
          {(
            <div className="space-y-4">
              <Field label="Yangi parol"><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              <Field label="Parolni takrorlang"><Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
              {msg && <p role="status" className={`text-sm ${msg.t === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.m}</p>}
              <Button onClick={change} disabled={busy}>Parolni yangilash</Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
