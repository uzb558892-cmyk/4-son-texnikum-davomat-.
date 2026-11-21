import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parentService } from '../services/parentService';
import type { ParentView } from '../services/parentService';
import { APP_NAME } from '../utils/constants';

const STATUS: Record<string, { label: string; cls: string }> = {
  present: { label: 'Keldi', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70' },
  excused_absent: { label: 'Sababli kelmadi', cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70' },
  unexcused_absent: { label: 'Sababsiz kelmadi', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70' },
  escaped: { label: 'Darsdan qochdi', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70' },
};

const fmtDate = (d: string) => d.split('-').reverse().join('.');

export default function ParentPage() {
  const [params, setParams] = useSearchParams();
  const urlCode = params.get('kod') ?? '';
  const [input, setInput] = useState(urlCode);
  const [data, setData] = useState<ParentView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(code: string) {
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await parentService.get(clean);
      if (res) setData(res);
      else setError("Kod noto'g'ri yoki o'quvchi faol emas.");
    } catch {
      setError("Ulanishda xato. Keyinroq qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (urlCode) load(urlCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setParams({ kod: input.trim() });
    load(input);
  }

  const percent = data
    ? Math.min(100, Math.round((data.unexcused_hours / Math.max(1, data.threshold_hours)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 p-5 text-center text-white shadow-lg shadow-indigo-950/15">
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">{APP_NAME}</div>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Ota-onalar nazorat portali</h1>
          <p className="mt-1 text-xs text-indigo-200/85">
            Farzandingiz davomati va ogohlantirish chegarasini tekshiring
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-3.5 p-5">
          <label className="block text-sm font-semibold text-slate-800">Farzandingiz kodi</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-center font-mono text-base font-semibold uppercase tracking-widest text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Yuklanmoqda...' : "Davomatni ko'rish"}
          </button>
        </form>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="text-lg font-bold text-slate-900">{data.full_name}</div>
              <div className="mt-0.5 text-sm font-medium text-indigo-700">Guruh: {data.group_name}</div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-rose-200/70 bg-rose-50/80 p-3.5">
                  <div className="tabular-nums text-2xl font-bold text-rose-700">{data.unexcused_hours}</div>
                  <div className="mt-0.5 text-xs font-semibold text-rose-700">Sababsiz soat</div>
                </div>
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-3.5">
                  <div className="tabular-nums text-2xl font-bold text-amber-800">{data.excused_hours}</div>
                  <div className="mt-0.5 text-xs font-semibold text-amber-800">Sababli soat</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600">
                  <span>Sababsiz soatlar chegarasi</span>
                  <span className="tabular-nums font-semibold text-slate-800">
                    {data.unexcused_hours} / {data.threshold_hours}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
                  <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: percent + '%' }} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-3 text-sm font-bold text-slate-900">Davomat tarixi</div>
              {data.records.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-sm text-slate-500">
                  Hozircha yozuv yo&apos;q.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.records.map((r, i) => {
                    const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-100 text-slate-700' };
                    return (
                      <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="tabular-nums font-medium text-slate-700">
                          {fmtDate(r.date)} · {r.para}-para
                        </span>
                        <span className={'rounded-lg px-2.5 py-0.5 text-xs font-semibold ' + st.cls}>
                          {st.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
