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
  const hours = w.unexcused_hours;

  return `
    <h1>OGOHLANTIRISH XATI</h1>
    <p class="muted">4-son texnikum &nbsp;|&nbsp; ${escapeHtml(formatDate(todayISO()))}</p>
    <p><b>Hurmatli ota-ona (qonuniy vakil)!</b></p>
    <p>Sizga ma'lum qilamizki, <b>${escapeHtml(w.group_name)}</b> guruhi o'quvchisi <b>${escapeHtml(w.student_name)}</b>${parentLine} joriy o'quv davomida <b>${hours} soat</b> (belgilangan <b>${w.threshold_hours} soat</b> chegaradan ortiq) dars mashg'ulotlarida uzrli sababsiz qatnashmadi.</p>
    <p>Farzandingizning darslarga muntazam qatnashmasligi va nazoratsiz qoldirilishi yuzasidan ota-onaga nisbatan belgilangan tartibda <b>ma'muriy chora</b> ko'rilishi hamda o'quvchiga nisbatan texnikum ichki tartib qoidalariga muvofiq tegishli intizomiy choralar qo'llanilishi mumkinligi haqida rasman ogohlantiramiz.</p>
    <p>Iltimos, zudlik bilan farzandingizni darslarga qatnashishini ta'minlang va texnikum ma'muriyati / guruh rahbari bilan bog'laning.</p>
    <p class="sign">Texnikum ma'muriyati: ______________________ &nbsp;&nbsp; Sana: ____________</p>
    <p class="sign">Ota-ona / qonuniy vakil imzosi: ______________________</p>`;
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
