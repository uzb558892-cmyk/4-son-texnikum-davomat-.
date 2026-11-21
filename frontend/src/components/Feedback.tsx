import Button from './Button';

export function Spinner() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-12 text-sm font-medium text-slate-500 shadow-xs">
      <span className="mr-2.5 h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      Yuklanmoqda...
    </div>
  );
}

export const Loader = Spinner;

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800">
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "Ma'lumot topilmadi",
  description
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {description && <div className="mt-1 text-xs text-slate-500">{description}</div>}
    </div>
  );
}

export function Toast({
  message,
  tone = 'success'
}: {
  message: string | null | undefined;
  tone?: 'success' | 'error' | 'info' | 'ok' | 'err';
}) {
  if (!message) return null;
  const isError = tone === 'error' || tone === 'err';
  const isInfo = tone === 'info';
  const styles = isError
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : isInfo
    ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <div
      role="status"
      className={`my-3 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xs ${styles}`}
    >
      {message}
    </div>
  );
}
