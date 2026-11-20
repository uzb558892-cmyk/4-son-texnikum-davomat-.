import type { AttendanceStatus, ReportPeriod } from '../types';

export const APP_NAME = '4-SON TEXNIKUM DAVOMAT';
export const LESSONS = [1, 2, 3, 4];

export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; badge: string; active: string; dot: string }
> = {
  present: { label: 'Keldi', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', active: 'bg-emerald-600 text-white border-emerald-600', dot: 'bg-emerald-500' },
  excused: { label: 'Sababli kelmadi', badge: 'bg-amber-50 text-amber-800 ring-amber-200', active: 'bg-amber-500 text-white border-amber-500', dot: 'bg-amber-500' },
  unexcused: { label: 'Sababsiz kelmadi', badge: 'bg-red-50 text-red-700 ring-red-200', active: 'bg-red-600 text-white border-red-600', dot: 'bg-red-500' },
  skipped: { label: 'Darsdan qochdi', badge: 'bg-violet-50 text-violet-700 ring-violet-200', active: 'bg-violet-600 text-white border-violet-600', dot: 'bg-violet-500' }
};

export const STATUS_ORDER: AttendanceStatus[] = ['present', 'excused', 'unexcused', 'skipped'];

export const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: 'Kunlik',
  weekly: 'Haftalik',
  monthly: 'Oylik',
  yearly: 'Yillik'
};

export const ROLE_LABEL = {
  admin: 'Administrator',
  group_leader: 'Guruh rahbari',
  manaviyatchi: "Ma'naviyatchi",
  direktor: "Direktor",
  navbatchi: 'Navbatchi'
} as const;
