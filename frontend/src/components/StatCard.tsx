import type { ReactNode } from 'react';

const tones = {
  blue: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600'
};

export default function StatCard({ label, value, hint, icon, tone = 'blue' }: { label: string; value: ReactNode; hint?: string; icon: ReactNode; tone?: keyof typeof tones }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${tones[tone]}`} aria-hidden>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight text-slate-900">{value}</div>
        <div className="truncate text-sm text-slate-500">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}
