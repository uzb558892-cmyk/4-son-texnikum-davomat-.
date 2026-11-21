import { useMemo, useState, type ReactNode } from 'react';
import Button from './Button';
import { EmptyState, Loader } from './Feedback';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortBy?: (row: T) => string | number;
  width?: string;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  pageSize = 25
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortBy) return rows;
    const by = col.sortBy;
    return [...rows].sort((a, b) => {
      const av = by(a);
      const bv = by(b);
      const d =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'uz');
      return asc ? d : -d;
    });
  }, [rows, columns, sortKey, asc]);

  if (loading) return <Loader />;
  if (!rows.length) {
    return (
      <EmptyState
        title={empty ?? emptyTitle ?? "Ma'lumot topilmadi"}
        description={emptyDescription}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggle = (key: string) => {
    if (sortKey === key) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              {columns.map((c) => {
                const isSorted = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    onClick={() => c.sortBy && toggle(c.key)}
                    className={`px-3.5 py-3 whitespace-nowrap transition-colors ${
                      c.sortBy ? 'cursor-pointer select-none hover:bg-indigo-100/50 hover:text-indigo-700' : ''
                    } ${isSorted ? 'text-indigo-700' : ''} ${c.className ?? ''}`}
                  >
                    {c.header}
                    {isSorted ? (
                      <span className="ml-1 inline-block rounded bg-indigo-100 px-1 text-[10px] font-extrabold text-indigo-700">
                        {asc ? '↑' : '↓'}
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.map((r) => (
              <tr
                key={rowKey(r)}
                className="transition-colors duration-150 even:bg-slate-50/35 hover:bg-indigo-50/60"
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-3.5 py-2.5 text-slate-700 ${c.className ?? ''}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-600">
          <span className="tabular-nums">
            Jami <b className="text-slate-900">{sorted.length}</b> ta —{' '}
            <b className="text-indigo-700">{safePage + 1}</b> / {totalPages} bet
          </span>
          <div className="flex gap-1.5">
            <Button variant="secondary" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
              Oldingi
            </Button>
            <Button
              variant="secondary"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Keyingi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
