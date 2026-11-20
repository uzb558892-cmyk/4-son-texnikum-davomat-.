import { useEffect, type ReactNode } from 'react';

export default function Modal({
  title,
  onClose,
  children,
  wide
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`animate-fadeIn max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 py-3.5 backdrop-blur-xs">
          <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
