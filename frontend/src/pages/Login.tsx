import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../services';
import Button from '../components/Button';
import { Field, Input } from '../components/Fields';
import DemoBanner from '../components/DemoBanner';
import Icon from '../components/Icon';
import { errorMessage } from '../utils/format';

export default function Login() {
  const { user, signIn, signInDemo } = useAuth();
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
    <div className="flex min-h-full flex-col">
      <DemoBanner />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
          <div className="flex items-center gap-3 text-lg font-bold"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700"><Icon name="check" /></span>4-SON TEXNIKUM</div>
          <div>
            <h2 className="text-4xl font-bold leading-tight">Davomat hisobi<br />bir joyda.</h2>
            <p className="mt-4 max-w-md text-brand-200">Har bir para, har bir o'quvchi. Guruh rahbarlari davomatni belgilaydi, ma'muriyat esa hisobot va ogohlantirishlarni kuzatadi.</p>
          </div>
          <p className="text-sm text-brand-200">© 4-son texnikum</p>
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-slate-900">Tizimga kirish</h1>
            <p className="mt-1 text-sm text-slate-500">4-SON TEXNIKUM DAVOMAT</p>
            {!isDemoMode && (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="Email"><Input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                <Field label="Parol"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Kirilmoqda...' : 'Kirish'}</Button>
              </form>
            )}
            {isDemoMode && (
              <div className="mt-6 space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Demo rejim: ma'lumotlar bazasi ulanmagan. Rolni tanlab, tizimni sinab ko'ring.</div>
                <Button className="w-full" onClick={() => { signInDemo('admin'); navigate('/'); }}>Administrator sifatida kirish</Button>
                <Button variant="secondary" className="w-full" onClick={() => { signInDemo('group_leader'); navigate('/'); }}>Guruh rahbari sifatida kirish</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
