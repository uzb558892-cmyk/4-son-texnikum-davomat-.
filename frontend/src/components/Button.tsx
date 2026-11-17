import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../utils/format';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const styles: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 hover:shadow-card-hover disabled:bg-slate-300 disabled:shadow-none',
  secondary: 'bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 disabled:text-slate-400 disabled:shadow-none',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-slate-300 disabled:shadow-none',
  ghost: 'text-brand-700 hover:bg-brand-50'
};

export default function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...p}
      className={cx('inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 sm:min-h-0', styles[variant], className)}
    />
  );
}
