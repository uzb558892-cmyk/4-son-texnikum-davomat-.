import { useState } from 'react';
import { studentsService } from '../services';
import type { ParentCodeRow } from '../services/studentsService';
import { useAsync } from '../hooks/useAsync';
import Modal from './Modal';
import Button from './Button';
import { ErrorBox } from './Feedback';

const BASE = 'https://4-son-texnikum-davomat.vercel.app/ota-ona?kod=';
const link = (r: ParentCodeRow) => BASE + encodeURIComponent(r.parent_code);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadCsv(rows: ParentCodeRow[]) {
  const esc = (v: string) => '"' + v.replace(/"/g, '""') + '"';
  const lines = [
    'Guruh,F.I.Sh.,Havola',
    ...rows.map((r) => [r.group_name, r.full_name, link(r)].map(esc).join(',')),
  ];
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ota-ona-havolalari.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ParentCodesModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const codes = useAsync(() => studentsService.parentCodes(groupId || undefined), [groupId]);
  const [msg, setMsg] = useState('');
  const rows = codes.data ?? [];

  function say(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  }

  async function copyOne(r: ParentCodeRow) {
    say((await copyText(link(r))) ? r.full_name + ": havola nusxalandi" : "Nusxalab bo'lmadi");
  }

  async function copyAll() {
    const text = rows.map((r) => r.full_name + ' - ' + link(r)).join('\n');
    say((await copyText(text)) ? rows.length + " ta havola nusxalandi" : "Nusxalab bo'lmadi");
  }

  return (
    <Modal title="Ota-ona kodlari" onClose={onClose}>
      <div className="space-y-3">
        {codes.error && <ErrorBox message={codes.error} onRetry={codes.reload} />}
        {codes.loading && <div className="text-sm text-slate-500">Yuklanmoqda...</div>}
        {!codes.loading && !codes.error && rows.length === 0 && (
          <div className="text-sm text-slate-500">O'quvchi topilmadi.</div>
        )}
        {rows.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={copyAll}>Hammasini nusxalash</Button>
            <Button variant="secondary" onClick={() => downloadCsv(rows)}>Excel (CSV)</Button>
          </div>
        )}
        {msg && <div className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
        <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.student_id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <div className="font-medium text-slate-800">{r.full_name}</div>
                <div className="text-xs text-slate-500">{r.group_name}</div>
              </div>
              <Button variant="ghost" onClick={() => copyOne(r)}>Nusxalash</Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
