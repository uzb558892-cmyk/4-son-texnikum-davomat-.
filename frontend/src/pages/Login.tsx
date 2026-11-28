import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-slate-50 lg:grid-cols-2 lg:grid-rows-1">
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 px-6 pb-16 pt-10 text-white lg:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="4-son texnikum davomat logotipi"
            className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-lg shadow-indigo-950/50 ring-1 ring-amber-300/40"
          />
          <div className="text-base font-bold leading-tight tracking-tight">
            4-SON TEXNIKUM
            <br />
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
              Davomat nazorat tizimi
            </span>
          </div>
        </div>

        <div className="relative my-10 hidden lg:block">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-white/15">
            Yagona boshqaruv va tahlil
          </span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white">
            O&apos;quvchilar davomati
            <br />
            bir joyda, aniq va tezkor
          </h2>
          <ul className="mt-7 space-y-3.5 text-sm text-indigo-100/95">
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                <Icon name="check" className="h-4 w-4" />
              </span>
              Kunlik va para kesimida davomatni belgilash
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                <Icon name="report" className="h-4 w-4" />
              </span>
              Guruhlar statistikasi va batafsil hisobotlar
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                <Icon name="alert" className="h-4 w-4" />
              </span>
              Ogohlantirishlar va ota-onalar bilan tezkor aloqa
            </li>
          </ul>
        </div>

        <div className="relative hidden text-xs font-medium text-indigo-200/80 lg:block">
          Kosonsoy tumani 4-son texnikum
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center bg-slate-50 px-4 py-0 lg:items-center lg:py-10">
        <form
          onSubmit={submit}
          className="relative z-10 -mt-8 w-full max-w-md space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8 lg:mt-0"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tizimga kirish</h1>
            <p className="mt-1 text-sm text-slate-500">
              Hisobingiz elektron pochta va parolini kiriting
            </p>
          </div>

          <Field label="Elektron pochta">
            <Input
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@example.com"
            />
          </Field>

          <Field label="Parol">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full py-2.5" disabled={busy || !email || !password}>
            {busy ? 'Kirilmoqda...' : 'Kirish'}
          </Button>

          <div className="space-y-2 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            <p>Parolni unutgan bo&apos;lsangiz, texnikum administratoriga murojaat qiling.</p>
            <div className="flex items-center justify-center gap-4 text-slate-500">
              <Link to="/maxfiylik-siyosati" className="hover:text-slate-900 underline">
                Maxfiylik siyosati
              </Link>
              <span>•</span>
              <Link to="/foydalanish-shartlari" className="hover:text-slate-900 underline">
                Foydalanish shartlari
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
