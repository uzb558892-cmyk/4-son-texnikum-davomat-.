import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { Field, Input } from '../components/Fields';
import Icon from '../components/Icon';
import { errorMessage } from '../utils/format';

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 pb-16 pt-10 text-white lg:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-700 shadow-card"><Icon name="check" className="h-6 w-6" /></span>
          <div className="text-base font-bold leading-tight">4-SON TEXNIKUM<br /><span className="text-sm font-medium text-brand-200">DAVOMAT</span></div>
        </div>
        <div className="relative mt-8 hidden lg:block">
          <h2 className="text-3xl font-bold leading-tight">O'quvchilar davomati<br />bir joyda, aniq va tez</h2>
          <ul className="mt-6 space-y-3 text-brand-100">
            <li className="flex items-center gap-3"><Icon name="check" className="h-5 w-5 text-brand-300" />Kunlik davomatni belgilash</li>
            <li className="flex items-center gap-3"><Icon name="report" className="h-5 w-5 text-brand-300" />Statistika va hisobotlar</li>
            <li className="flex items-center gap-3"><Icon name="alert" className="h-5 w-5 text-brand-300" />Ota-onalar uchun ogohlantirish xatlari</li>
          </ul>
        </div>
        <div className="relative mt-8 hidden text-xs text-brand-200 lg:block">Kosonsoy tumani 4-son texnikum</div>
      </div>

      <div className="flex flex-1 items-start justify-center bg-surface px-4 py-0 lg:items-center lg:py-8">
        <form onSubmit={submit} className="relative z-10 -mt-8 w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card-hover lg:mt-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tizimga kirish</h1>
            <p className="mt-1 text-sm text-slate-500">Hisobingiz ma'lumotlarini kiriting</p>
          </div>
          <Field label="Elektron pochta">
            <Input type="email" inputMode="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@example.com" />
          </Field>
          <Field label="Parol">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !email || !password}>{busy ? 'Kirilmoqda...' : 'Kirish'}</Button>
          <p className="text-center text-xs text-slate-400">Parolni unutgan bo'lsangiz, administratorga murojaat qiling.</p>
        </form>
      </div>
    </div>
  );
}
