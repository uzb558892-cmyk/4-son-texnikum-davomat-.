/** Berilgan vaqt mintaqasidagi bugungi sana (YYYY-MM-DD). Serverdagi qoida bilan bir xil. */
export function todayInTimeZone(timeZone = "Asia/Tashkent", now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** YYYY-MM-DD ko‘rinishi va haqiqiy kalendar sanasi ekanini tekshiradi. */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isFutureDate(value: string, timeZone = "Asia/Tashkent", now: Date = new Date()): boolean {
  return value > todayInTimeZone(timeZone, now); // YYYY-MM-DD leksikografik taqqoslash to‘g‘ri
}
