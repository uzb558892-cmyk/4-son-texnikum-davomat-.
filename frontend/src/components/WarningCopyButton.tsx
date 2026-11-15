import { useState } from 'react';
import type { StudentWarning } from '../types';
import { formatDate } from '../utils/format';
import Button from './Button';

function warningMessage(w: StudentWarning): string {
  return `Hurmatli ota-ona!\n\nFarzandingiz: ${w.student_name} (${w.group_name} guruh)\nDarslarga sababsiz qatnashmagan soatlar: ${w.unexcused_hours} soat (belgilangan chegara: ${w.threshold_hours} soat)\nOxirgi qoldirilgan sana: ${formatDate(w.last_absence_date)}\n\nIltimos, farzandingizning davomatiga e'tibor bering va zarur bo'lsa, 4-son texnikum ma'muriyati bilan bog'laning.`;
}

export default function WarningCopyButton({ w }: { w: StudentWarning }) {
  const [msg, setMsg] = useState('');

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(warningMessage(w));
      ok = true;
    } catch {
      ok = false;
    }
    setMsg(ok ? 'Matn nusxalandi' : "Nusxalab bo'lmadi");
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <>
      <Button variant="secondary" onClick={copy}>Telegram uchun nusxalash</Button>
      {msg && <span className="self-center text-sm text-emerald-700">{msg}</span>}
    </>
  );
}
