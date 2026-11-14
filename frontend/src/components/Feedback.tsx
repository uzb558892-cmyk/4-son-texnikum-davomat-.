export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Qayta urinish</button>}
    </div>
  );
}

export function Toast({ message, tone = 'ok' }: { message: string; tone?: 'ok' | 'err' }) {
  return (
    <div role="status" className={`fixed bottom-4 right-4 z-[60] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>{message}</div>
  );
}

export function Spinner() {
  return <div className="py-16 text-center text-sm text-slate-400">Yuklanmoqda...</div>;
}
