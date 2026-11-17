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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:gap-4 sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg sm:h-12 sm:w-12 sm:rounded-xl sm:text-xl ${tones[tone]}`} aria-hidden>{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-tight text-slate-900 sm:text-2xl">{value}</div>
        <div className="truncate text-xs text-slate-500 sm:text-sm">{label}</div>
        {hint && <div className="hidden text-xs text-slate-400 sm:block">{hint}</div>}
      </div>
    </div>
  );
}
