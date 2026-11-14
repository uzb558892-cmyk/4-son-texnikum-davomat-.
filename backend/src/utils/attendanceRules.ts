// Davomat qoidalarining TypeScript ma‘lumotnoma modeli.
// SQL funksiyalari (mark_attendance, recompute_warnings) aynan shu mantiqni bajaradi;
// tests/attendanceRules.test.ts shu modelni tekshiradi, frontend esa oldindan
// ko‘rsatish (preview) uchun ishlata oladi. Haqiqiy manba — baza.
import type { AttendanceStatus } from "../types/database.ts";

export const ESCAPE_MAX_PARA = 3;
export const MAX_PARAS_PER_DAY = 8;

export interface Slot {
  para: number;
  status: AttendanceStatus;
  academicHours: number;
  isAuto: boolean;
  escapedAfterPara: number | null;
}

export class RuleError extends Error {
  readonly code = "VALIDATION" as const;
  constructor(message: string) { super(message); this.name = "RuleError"; }
}

/** "qochdi" tanlangandan keyin uzrsiz bo‘lib qoladigan paralar. */
export function planEscape(afterPara: number, parasPerDay: number): number[] {
  if (!Number.isInteger(afterPara) || afterPara < 1 || afterPara > ESCAPE_MAX_PARA) {
    throw new RuleError("Darsdan qochdi faqat 1, 2 yoki 3-paradan keyin belgilanadi");
  }
  if (afterPara >= parasPerDay) throw new RuleError("Bu paradan keyin rejalashtirilgan para yo‘q");
  const out: number[] = [];
  for (let p = afterPara + 1; p <= parasPerDay; p++) out.push(p);
  return out;
}

/** Faqat uzrsiz soatlar. */
export function unexcusedHours(slots: ReadonlyArray<Pick<Slot, "status" | "academicHours">>): number {
  return slots.reduce((sum, s) => (s.status === "unexcused_absent" ? sum + s.academicHours : sum), 0);
}

/** 0 = ogohlantirish yo‘q. Soat > chegara bo‘lgandagina >= 1. level = ceil(soat/chegara) - 1. */
export function warningLevel(hours: number, threshold: number): number {
  if (!Number.isFinite(threshold) || threshold <= 0) throw new RuleError("Chegara musbat bo‘lishi kerak");
  return hours > threshold ? Math.ceil(hours / threshold) - 1 : 0;
}

export interface MarkOptions { parasPerDay: number; hoursPerPara: number }

/** Bitta o‘quvchining bir kunlik yozuvlariga yangi belgini qo‘llaydi (SQL bilan bir xil qoidalar). */
export function applyMark(day: ReadonlyArray<Slot>, mark: { para: number; status: AttendanceStatus }, opts: MarkOptions): Slot[] {
  const { para, status } = mark;
  const { parasPerDay, hoursPerPara } = opts;
  if (!Number.isInteger(para) || para < 1 || para > parasPerDay) {
    throw new RuleError(`Para raqami 1..${parasPerDay} oralig‘ida bo‘lishi kerak`);
  }
  if (status === "escaped") planEscape(para, parasPerDay); // tekshiruv

  const rows = new Map<number, Slot>(day.map((s) => [s.para, { ...s }]));
  const existing = rows.get(para) ? { ...rows.get(para)! } : undefined;

  const clearEscape = (k: number) => {
    for (const [p, r] of [...rows]) if (r.isAuto && r.escapedAfterPara === k) rows.delete(p);
    const r = rows.get(k);
    if (r && r.status === "escaped") { r.status = "present"; r.escapedAfterPara = null; }
  };

  if (status === "escaped") {
    const prev = [...rows.values()].find((r) => r.status === "escaped");
    if (prev) clearEscape(prev.para);
  } else if (existing?.status === "escaped") {
    clearEscape(existing.para);
  }

  rows.set(para, {
    para, status,
    academicHours: existing?.academicHours ?? hoursPerPara,
    isAuto: false,
    escapedAfterPara: status === "escaped" ? para : null,
  });

  if (status === "escaped") {
    for (const p of planEscape(para, parasPerDay)) {
      const prior = rows.get(p);
      rows.set(p, {
        para: p, status: "unexcused_absent",
        academicHours: prior?.academicHours ?? hoursPerPara,
        isAuto: true, escapedAfterPara: para,
      });
    }
  }
  return [...rows.values()].sort((a, b) => a.para - b.para);
}
