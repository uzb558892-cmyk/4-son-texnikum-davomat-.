import type { ReactNode } from 'react';

type Tone = 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

const TONE: Record<
  Tone,
  {
    topBar: string;
    iconBox: string;
    ring: string;
    valueText: string;
  }
> = {
  slate: {
    topBar: 'from-slate-500 to-slate-700',
    iconBox: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
    ring: 'hover:border-slate-300',
    valueText: 'text-slate-900'
  },
  blue: {
    topBar: 'from-blue-500 to-indigo-600',
    iconBox: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 ring-1 ring-blue-200/80',
    ring: 'hover:border-blue-300',
    valueText: 'text-slate-900'
  },
  green: {
    topBar: 'from-emerald-500 to-teal-600',
    iconBox: 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 ring-1 ring-emerald-200/80',
    ring: 'hover:border-emerald-300',
    valueText: 'text-emerald-800'
  },
  amber: {
    topBar: 'from-amber-400 to-orange-500',
    iconBox: 'bg-gradient-to-br from-amber-50 to-orange-100 text-amber-700 ring-1 ring-amber-200/80',
    ring: 'hover:border-amber-300',
    valueText: 'text-amber-800'
  },
  red: {
    topBar: 'from-rose-500 to-red-600',
    iconBox: 'bg-gradient-to-br from-rose-50 to-red-100 text-rose-700 ring-1 ring-rose-200/80',
    ring: 'hover:border-rose-300',
    valueText: 'text-rose-800'
  },
  violet: {
    topBar: 'from-violet-500 to-purple-600',
    iconBox: 'bg-gradient-to-br from-violet-50 to-purple-100 text-violet-700 ring-1 ring-violet-200/80',
    ring: 'hover:border-violet-300',
    valueText: 'text-violet-800'
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
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.ring}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.topBar} opacity-90`} />
      <div className="flex items-start justify-between gap-3 pt-0.5">
        <div className="min-w-0">
          <div className={`text-2xl font-bold tracking-tight sm:text-[26px] ${t.valueText}`}>{value}</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-700">{label}</div>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
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
