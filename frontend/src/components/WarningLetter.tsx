import type { StudentWarning } from '../types';
import { escapeHtml, formatDate, todayISO } from '../utils/format';
import { STATUS_META } from '../utils/constants';
import { exportWord, printHtml } from '../utils/export';
import WarningCopyButton from './WarningCopyButton';
import Button from './Button';

/** Ogohlantirish xati HTML matni (backenddan kelgan soatlar ishlatiladi). */
export function letterHtml(w: StudentWarning): string {
  const parentLine = w.parent_phone
    ? ` (ota-onasi tel.: ${escapeHtml(w.parent_phone)})`
    : "";

  return `
    <h1>OGOHLANTIRISH XATI</h1>
    <p class="muted">4-son texnikum &nbsp;|&nbsp; ${escapeHtml(formatDate(todayISO()))}</p>
    <p><b>${escapeHtml(w.group_name)}</b> guruhi o'quvchisi <b>${escapeHtml(w.student_name)}</b>${parentLine}ning ota-onasiga!</p>
    <p>Sizning farzandingiz <b>${escapeHtml(w.student_name)}</b> <b>72 soatdan ortiq</b> (jami <b>${w.unexcused_hours} soat</b>) dars mashg'ulotlarida qatnashmadi.</p>
    <p>Ushbu holat bo'yicha sizga <b>belgilangan tartibda chora ko'ramiz</b>. Farzandingizni zudlik bilan darslarga qatnashishini ta'minlang va texnikum ma'muriyati hamda guruh rahbari bilan bog'laning.</p>
    <p class="sign">Guruh rahbari / Texnikum ma'muriyati: ______________________ &nbsp;&nbsp; Sana: ____________</p>`;
}

export default function WarningLetter({ w }: { w: StudentWarning }) {
  const html = letterHtml(w);
  const name = `ogohlantirish-${w.student_name.replace(/\s+/g, '-')}`;
  return (
    <div>
      <div className="max-h-[48vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed [&_h1]:mb-1 [&_h1]:text-center [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:font-semibold [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_.muted]:mb-3 [&_.muted]:text-center [&_.muted]:text-slate-500"
        dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => printHtml('Ogohlantirish xati', html)}>PDF yuklab olish</Button>
        <Button variant="secondary" onClick={() => exportWord(name, 'Ogohlantirish xati', html)}>Word yuklab olish</Button>
        <Button variant="secondary" onClick={() => printHtml('Ogohlantirish xati', html)}>Chop etish</Button>
        <WarningCopyButton w={w} />
      </div>
      <p className="mt-2 text-xs text-slate-400">PDF uchun chop etish oynasida «PDF sifatida saqlash» ni tanlang.</p>
    </div>
  );
}
