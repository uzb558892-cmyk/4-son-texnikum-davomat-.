// Servislarni soxta (fake) Supabase klienti bilan tekshiradi — tarmoq/baza kerak emas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { markAttendance, markAttendanceBulk, getDaySheet } from "../src/services/attendanceService.ts";
import { updateSetting } from "../src/services/settingsService.ts";
import { updateWarning } from "../src/services/warningService.ts";
import { studentAbsenceSummary } from "../src/services/reportService.ts";
import { ApiError } from "../src/utils/errors.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

interface Call { kind: "rpc" | "from"; name: string; args?: unknown; chain: Array<[string, unknown[]]> }

function fakeDb(handlers: { rpc?: (name: string, args: unknown) => { data: unknown; error: unknown }; table?: (name: string, chain: Call["chain"]) => { data: unknown; error: unknown } }) {
  const calls: Call[] = [];
  const db = {
    rpc(name: string, args: unknown) {
      calls.push({ kind: "rpc", name, args, chain: [] });
      return Promise.resolve(handlers.rpc ? handlers.rpc(name, args) : { data: null, error: null });
    },
    from(name: string) {
      const call: Call = { kind: "from", name, chain: [] };
      calls.push(call);
      const proxy: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === "then") {
            const res = handlers.table ? handlers.table(name, call.chain) : { data: [], error: null };
            return (resolve: (v: unknown) => unknown) => resolve(res);
          }
          return (...a: unknown[]) => { call.chain.push([prop, a]); return proxy; };
        },
      });
      return proxy;
    },
  };
  return { db: db as never, calls };
}

test("markAttendance: RPC to‘g‘ri parametrlar bilan chaqiriladi", async () => {
  const row = { id: "r1", status: "present" };
  const { db, calls } = fakeDb({ rpc: () => ({ data: row, error: null }) });
  const out = await markAttendance(db, { studentId: U1, lessonDate: "2026-11-14", para: 2, status: "present" });
  assert.deepEqual(out, row);
  assert.equal(calls[0]!.name, "mark_attendance");
  assert.deepEqual(calls[0]!.args, { p_student_id: U1, p_lesson_date: "2026-11-14", p_para: 2, p_status: "present", p_note: null });
});

test("markAttendance: yaroqsiz kirishda RPC umuman chaqirilmaydi", async () => {
  const { db, calls } = fakeDb({});
  await assert.rejects(() => markAttendance(db, { studentId: "x", lessonDate: "2026-11-14", para: 1, status: "present" }), ApiError);
  assert.equal(calls.length, 0);
});

test("markAttendance: 42501 -> FORBIDDEN", async () => {
  const { db } = fakeDb({ rpc: () => ({ data: null, error: { code: "42501", message: "Bu guruh uchun ruxsat yo‘q" } }) });
  await assert.rejects(
    () => markAttendance(db, { studentId: U1, lessonDate: "2026-11-14", para: 1, status: "present" }),
    (e: unknown) => e instanceof ApiError && e.code === "FORBIDDEN",
  );
});

test("markAttendanceBulk: yozuvlar snake_case ga o‘giriladi", async () => {
  const { db, calls } = fakeDb({ rpc: () => ({ data: 2, error: null }) });
  const n = await markAttendanceBulk(db, {
    groupId: U1, lessonDate: "2026-11-14", para: 1,
    records: [{ studentId: U2, status: "present" }, { studentId: U1, status: "unexcused_absent", note: "kasal" }],
  });
  assert.equal(n, 2);
  assert.deepEqual((calls[0]!.args as { p_records: unknown[] }).p_records, [
    { student_id: U2, status: "present", note: null },
    { student_id: U1, status: "unexcused_absent", note: "kasal" },
  ]);
});

test("getDaySheet: o‘quvchi bo‘lmasa davomat so‘rovi yuborilmaydi", async () => {
  const { db, calls } = fakeDb({ table: () => ({ data: [], error: null }) });
  const out = await getDaySheet(db, U1, "2026-11-14");
  assert.deepEqual(out, { students: [], records: [] });
  assert.equal(calls.filter((c) => c.name === "attendance").length, 0);
});

test("getDaySheet: o‘quvchilar va yozuvlar birlashtiriladi", async () => {
  const { db } = fakeDb({
    table: (name) => name === "students"
      ? { data: [{ id: U2 }], error: null }
      : { data: [{ id: "a1", student_id: U2, para: 1 }], error: null },
  });
  const out = await getDaySheet(db, U1, "2026-11-14");
  assert.equal(out.students.length, 1);
  assert.equal(out.records.length, 1);
});

test("updateSetting va updateWarning to‘g‘ri RPC nomlari/parametrlari", async () => {
  const { db, calls } = fakeDb({ rpc: () => ({ data: { ok: 1 }, error: null }) });
  await updateSetting(db, "academic_hours_per_para", 3);
  await updateWarning(db, U1, { status: "issued" });
  assert.deepEqual(calls[0]!.args, { p_key: "academic_hours_per_para", p_value: 3 });
  assert.deepEqual(calls[1]!.args, { p_id: U1, p_letter_text: null, p_status: "issued" });
});

test("studentAbsenceSummary: filtrlar zanjirga qo‘shiladi", async () => {
  const { db, calls } = fakeDb({ table: () => ({ data: [], error: null }) });
  await studentAbsenceSummary(db, { groupId: U1, onlyExceeded: true });
  const chain = calls[0]!.chain.map(([m]) => m);
  assert.deepEqual(chain, ["select", "order", "eq", "eq"]);
});
