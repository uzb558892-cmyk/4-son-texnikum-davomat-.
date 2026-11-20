import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../utils/format';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const styles: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm ring-1 ring-brand-800/15 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-md disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none disabled:ring-0',
  secondary:
    'bg-white text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:text-slate-400 disabled:shadow-none',
  danger:
    'bg-rose-600 text-white shadow-sm ring-1 ring-rose-700/15 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none disabled:ring-0',
  ghost:
    'text-brand-700 hover:bg-brand-50/90 hover:text-brand-800 disabled:text-slate-400'
};

export default function Button({
  variant = 'primary',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 sm:min-h-[38px]',
        styles[variant],
        className
      )}
    />
  );
}
