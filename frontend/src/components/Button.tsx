import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-700 hover:to-indigo-800 focus-visible:ring-indigo-500',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-slate-900 focus-visible:ring-indigo-400',
  danger:
    'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm shadow-rose-600/20 hover:from-rose-700 hover:to-red-700 focus-visible:ring-rose-500',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-indigo-300'
};

export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45 ${VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
