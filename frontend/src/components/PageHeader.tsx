import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/85 bg-gradient-to-r from-white via-slate-50/40 to-indigo-50/60 px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 hidden h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-600 to-indigo-400 sm:block" aria-hidden />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
