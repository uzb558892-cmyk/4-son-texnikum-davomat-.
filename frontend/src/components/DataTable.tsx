import { useEffect, useState, type ReactNode } from 'react';
import Button from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty = "Ma'lumot topilmadi",
  pageSize = 10
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  loading?: boolean;
  empty?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    if (page >= pages) setPage(0);
  }, [pages, page]);
  const slice = rows.slice(page * pageSize, page * pageSize + pageSize);
  const message = loading ? 'Yuklanmoqda...' : slice.length === 0 ? empty : null;

  return (
    <div className="card animate-fadeIn overflow-hidden">
      {message ? (
        <div className="px-4 py-12 text-center text-sm font-medium text-slate-400">{message}</div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 sm:hidden">
            {slice.map((r) => (
              <div key={rowKey(r)} className="space-y-2.5 px-4 py-3.5 transition-colors hover:bg-slate-50/70">
                {columns.map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                    {c.header && (
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {c.header}
                      </span>
                    )}
                    <span className="ml-auto min-w-0 text-right font-medium text-slate-800">{c.render(r)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={`whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider ${c.className ?? ''}`}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slice.map((r) => (
                  <tr key={rowKey(r)} className="transition-colors duration-150 hover:bg-slate-50/90">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3.5 text-slate-700 ${c.className ?? ''}`}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/40 px-4 py-2.5 text-xs font-medium text-slate-500 sm:text-sm">
          <span className="tabular-nums">
            {page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} / {rows.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="px-3 py-1 text-xs"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Oldingi
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1 text-xs"
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
            >
              Keyingi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
