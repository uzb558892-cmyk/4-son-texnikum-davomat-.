import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parentService } from '../services/parentService';
import type { ParentView } from '../services/parentService';
import { APP_NAME } from '../utils/constants';

const STATUS: Record<string, { label: string; cls: string }> = {
  present: { label: 'Keldi', cls: 'bg-emerald-50 text-emerald-700' },
  excused_absent: { label: 'Sababli kelmadi', cls: 'bg-amber-50 text-amber-800' },
  unexcused_absent: { label: 'Sababsiz kelmadi', cls: 'bg-red-50 text-red-700' },
  escaped: { label: 'Darsdan qochdi', cls: 'bg-violet-50 text-violet-700' },
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
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{APP_NAME}</div>
          <h1 className="mt-1 text-xl font-bold text-slate-800">Ota-onalar uchun</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">Farzandingiz kodi</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-base uppercase tracking-wider"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Yuklanmoqda...' : "Davomatni ko'rish"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-lg font-bold text-slate-800">{data.full_name}</div>
              <div className="text-sm text-slate-500">Guruh: {data.group_name}</div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-red-50 p-3">
                  <div className="text-2xl font-bold text-red-700">{data.unexcused_hours}</div>
                  <div className="text-xs text-red-700">Sababsiz soat</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <div className="text-2xl font-bold text-amber-800">{data.excused_hours}</div>
                  <div className="text-xs text-amber-800">Sababli soat</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Sababsiz soatlar chegarasi</span>
                  <span>
                    {data.unexcused_hours} / {data.threshold_hours}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: percent + '%' }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Davomat tarixi</div>
              {data.records.length === 0 ? (
                <div className="text-sm text-slate-500">Hozircha yozuv yo'q.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.records.map((r, i) => {
                    const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-100 text-slate-700' };
                    return (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-slate-700">
                          {fmtDate(r.date)} · {r.para}-para
                        </span>
                        <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + st.cls}>{st.label}</span>
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
