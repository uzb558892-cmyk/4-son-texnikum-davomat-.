import { isDemoMode } from '../services';

export default function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div role="note" className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
      DEMO REJIM — haqiqiy ma'lumotlar bazasi ulanmagan. Ko'rsatilgan ma'lumotlar sinov uchun va saqlanmaydi.
    </div>
  );
}
