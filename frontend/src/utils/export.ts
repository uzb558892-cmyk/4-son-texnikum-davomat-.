import { escapeHtml } from './format';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DOC_STYLE = `
  body{font-family:'Times New Roman',serif;font-size:14px;color:#111;margin:32px}
  h1{font-size:20px;text-align:center;margin:0 0 6px}
  h2{font-size:16px;margin:18px 0 8px}
  p{line-height:1.55;margin:8px 0}
  table{border-collapse:collapse;width:100%;margin-top:10px}
  th,td{border:1px solid #444;padding:6px 8px;text-align:left;font-size:13px}
  th{background:#e8eefc}
  .muted{color:#555;text-align:center;margin-bottom:16px}
  .sign{margin-top:36px}
`;

function wrapHtml(title: string, body: string): string {
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${DOC_STYLE}</style></head><body>${body}</body></html>`;
}

/** Jadvalni Excel (.xls) formatida yuklab olish (Excel to'g'ridan-to'g'ri ochadi). */
export function exportExcel(filename: string, title: string, headers: string[], rows: Array<Array<string | number>>) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  const html = wrapHtml(title, `<h1>${escapeHtml(title)}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
  download(new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${filename}.xls`);
}

/** HTML kontentni Word (.doc) formatida yuklab olish. */
export function exportWord(filename: string, title: string, bodyHtml: string) {
  const html = wrapHtml(title, bodyHtml);
  download(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }), `${filename}.doc`);
}

/** Chop etish oynasini ochadi. Brauzer dialogida "PDF sifatida saqlash"ni tanlab PDF olish mumkin. */
export function printHtml(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert("Brauzer oynani blokladi. Qalqib chiquvchi oynalarga ruxsat bering.");
    return;
  }
  w.document.open();
  w.document.write(wrapHtml(title, bodyHtml));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function tableHtml(title: string, subtitle: string, headers: string[], rows: Array<Array<string | number>>): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  return `<h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(subtitle)}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
