import type { ReactNode } from 'react';

const tones = {
  blue: { wrap: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200/70', accent: 'border-t-brand-500' },
  green: { wrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70', accent: 'border-t-emerald-500' },
  amber: { wrap: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70', accent: 'border-t-amber-500' },
  red: { wrap: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70', accent: 'border-t-rose-500' },
  violet: { wrap: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70', accent: 'border-t-violet-500' },
  slate: { wrap: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200', accent: 'border-t-slate-400' }
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'blue'
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: keyof typeof tones;
}) {
  const t = tones[tone];
  return (
    <div className={`card-interactive flex items-center gap-3.5 border-t-[3px] p-3.5 sm:gap-4 sm:p-4 ${t.accent}`}>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg sm:h-12 sm:w-12 sm:text-xl ${t.wrap}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="tabular-nums text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{value}</div>
        <div className="truncate text-xs font-semibold text-slate-600 sm:text-sm">{label}</div>
        {hint && <div className="mt-0.5 hidden truncate text-[11px] font-medium text-slate-400 sm:block">{hint}</div>}
      </div>
    </div>
  );
}
