import type { Student } from '../types';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileSlug(groupLabel: string): string {
  const clean = groupLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'barcha-guruhlar';
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildTableHtml(students: Student[], title: string, subtitle: string): string {
  const rowsHtml = students
    .map(
      (s, idx) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td class="name">${escapeHtml(s.full_name)}</td>
        <td>${escapeHtml(s.group_name || '—')}</td>
        <td class="mono">${escapeHtml(s.phone || '—')}</td>
        <td class="mono">${escapeHtml(s.parent_phone || '—')}</td>
      </tr>`
    )
    .join('');

  return `
    <div class="doc-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)} · Sana: ${escapeHtml(todayStamp())} · Jami: ${students.length} ta</p>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:48px;">№</th>
          <th>F.I.Sh.</th>
          <th>Guruh</th>
          <th>Telefon</th>
          <th>Ota-onasi telefoni</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="5" class="empty">Ma\'lumot topilmadi</td></tr>'}
      </tbody>
    </table>
  `;
}

export function exportStudentsToExcel(students: Student[], groupLabel: string): void {
  const title = "4-SON TEXNIKUM — O'QUVCHILAR RO'YXATI";
  const subtitle = groupLabel;
  const body = buildTableHtml(students, title, subtitle);
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; }
    h1 { font-size: 16px; margin: 0 0 4px 0; }
    p { font-size: 12px; color: #475569; margin: 0 0 12px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; text-align: left; }
    th { background: #eef2ff; color: #1e293b; font-weight: 700; }
    .num { text-align: center; }
    .name { font-weight: 600; }
    .empty { text-align: center; color: #64748b; padding: 14px; }
  </style>
</head>
<body>${body}</body>
</html>`;

  const blob = new Blob(['\uFEFF' + html], {
    type: 'application/vnd.ms-excel;charset=utf-8;'
  });
  triggerDownload(blob, `oquvchilar-${fileSlug(groupLabel)}-${todayStamp()}.xls`);
}

export function exportStudentsToWord(students: Student[], groupLabel: string): void {
  const title = "4-SON TEXNIKUM — O'QUVCHILAR RO'YXATI";
  const subtitle = groupLabel;
  const body = buildTableHtml(students, title, subtitle);
  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word"
        xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Calibri", "Arial", sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; color: #1e1b4b; }
    p { font-size: 12px; color: #475569; margin: 0 0 14px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #94a3b8; padding: 7px 9px; font-size: 12px; text-align: left; }
    th { background: #e0e7ff; color: #1e1b4b; font-weight: bold; }
    .num { text-align: center; }
    .name { font-weight: bold; }
    .empty { text-align: center; color: #64748b; padding: 14px; }
  </style>
</head>
<body>${body}</body>
</html>`;

  const blob = new Blob(['\uFEFF' + docHtml], {
    type: 'application/msword;charset=utf-8;'
  });
  triggerDownload(blob, `oquvchilar-${fileSlug(groupLabel)}-${todayStamp()}.doc`);
}

export function exportStudentsToPdf(students: Student[], groupLabel: string): void {
  const title = "4-SON TEXNIKUM — O'QUVCHILAR RO'YXATI";
  const subtitle = groupLabel;
  const body = buildTableHtml(students, title, subtitle);
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
    .doc-header { margin-bottom: 12px; }
    h1 { font-size: 17px; margin: 0 0 4px 0; }
    p { font-size: 12px; color: #475569; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11.5px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .num { text-align: center; }
    .name { font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; color: #64748b; padding: 14px; }
  </style>
</head>
<body>
  ${body}
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}
