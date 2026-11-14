import { useEffect, useState, type ReactNode } from 'react';
import Button from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export default function DataTable<T>({ columns, rows, rowKey, loading, empty = "Ma'lumot topilmadi", pageSize = 10 }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; loading?: boolean; empty?: string; pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { if (page >= pages) setPage(0); }, [pages, page]);
  const slice = rows.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-semibold ${c.className ?? ''}`}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
            ) : slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">{empty}</td></tr>
            ) : slice.map((r) => (
              <tr key={rowKey(r)} className="hover:bg-slate-50/70">
                {columns.map((c) => <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm text-slate-500">
          <span>{page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} / {rows.length}</span>
          <div className="flex gap-2">
            <Button variant="secondary" className="px-3 py-1" disabled={page === 0} onClick={() => setPage(page - 1)}>Oldingi</Button>
            <Button variant="secondary" className="px-3 py-1" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Keyingi</Button>
          </div>
        </div>
      )}
    </div>
  );
}
