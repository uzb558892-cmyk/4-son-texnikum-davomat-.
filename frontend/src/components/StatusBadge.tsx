import type { AttendanceStatus } from '../types';
import { STATUS_META } from '../utils/constants';

export default function StatusBadge({ status }: { status: AttendanceStatus }) {
  const m = STATUS_META[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${m.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span>;
}
