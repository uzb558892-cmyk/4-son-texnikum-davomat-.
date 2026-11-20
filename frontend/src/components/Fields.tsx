import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '../utils/format';

const base =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-base text-slate-800 shadow-2xs transition-colors duration-150 sm:py-2 sm:text-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-400';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(base, p.className)} />;
}

export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(base, p.className)} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Qidirish...'
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <svg
        className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 sm:top-2.5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="M14 14l4 4" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Qidirish"
        className={cx(base, 'pl-9')}
      />
    </div>
  );
}

export function Textarea({ rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} {...props} className={cx(base, 'leading-relaxed', props.className)} />;
}
