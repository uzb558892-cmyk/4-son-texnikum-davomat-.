import type { ReactNode } from 'react';

type Tone = 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

const TONE: Record<
  Tone,
  {
    topBar: string;
    iconBox: string;
    ring: string;
    valueText: string;
    glow: string;
  }
> = {
  slate: {
    topBar: 'from-indigo-900 via-slate-700 to-amber-500/70',
    iconBox: 'bg-gradient-to-br from-slate-100 to-indigo-50/80 text-indigo-950 ring-1 ring-slate-200/90',
    ring: 'hover:border-indigo-300/80',
    valueText: 'text-slate-950',
    glow: 'from-indigo-500/[0.03]'
  },
  blue: {
    topBar: 'from-indigo-600 via-blue-600 to-amber-400/80',
    iconBox: 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900 text-amber-300 ring-1 ring-amber-400/30 shadow-xs',
    ring: 'hover:border-indigo-400/70',
    valueText: 'text-indigo-950',
    glow: 'from-indigo-600/[0.04]'
  },
  green: {
    topBar: 'from-emerald-600 via-teal-600 to-amber-400/70',
    iconBox: 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-emerald-300 ring-1 ring-emerald-400/30 shadow-xs',
    ring: 'hover:border-emerald-400/70',
    valueText: 'text-emerald-950',
    glow: 'from-emerald-500/[0.04]'
  },
  amber: {
    topBar: 'from-amber-500 via-amber-400 to-yellow-500',
    iconBox: 'bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-amber-300 ring-1 ring-amber-400/35 shadow-xs',
    ring: 'hover:border-amber-400/80',
    valueText: 'text-amber-950',
    glow: 'from-amber-500/[0.05]'
  },
  red: {
    topBar: 'from-rose-600 via-red-600 to-amber-400/70',
    iconBox: 'bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-rose-300 ring-1 ring-rose-400/30 shadow-xs',
    ring: 'hover:border-rose-400/70',
    valueText: 'text-rose-950',
    glow: 'from-rose-500/[0.04]'
  },
  violet: {
    topBar: 'from-indigo-700 via-violet-700 to-amber-400/75',
    iconBox: 'bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 text-amber-300 ring-1 ring-violet-400/30 shadow-xs',
    ring: 'hover:border-violet-400/70',
    valueText: 'text-indigo-950',
    glow: 'from-violet-500/[0.04]'
  }
};

export default function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'blue'
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b ${t.glow} to-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.ring}`}
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${t.topBar}`} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <div className={`tabular-nums text-2xl font-extrabold tracking-tight sm:text-[26px] ${t.valueText}`}>{value}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">{label}</div>
          {sub && <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div>}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${t.iconBox}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
