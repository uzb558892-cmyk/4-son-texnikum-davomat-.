import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidDateString, isFutureDate, todayInTimeZone } from "../src/utils/date.ts";
import { validateMarkInput, validateBulkInput, validateCreateLeaderInput, isUuid, isEmail } from "../src/utils/validation.ts";
import { ApiError, fromPostgrestError } from "../src/utils/errors.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

test("sana tekshiruvi", () => {
  assert.equal(isValidDateString("2026-11-14"), true);
  assert.equal(isValidDateString("2026-02-30"), false);
  assert.equal(isValidDateString("14-11-2026"), false);
  assert.equal(isValidDateString("2024-02-29"), true);
});

test("Toshkent vaqti: UTC 20:00 da Toshkentda ertasi kun", () => {
  const now = new Date("2026-11-14T20:00:00Z"); // Toshkent 01:00, 15-noyabr
  assert.equal(todayInTimeZone("Asia/Tashkent", now), "2026-11-15");
  assert.equal(isFutureDate("2026-11-15", "Asia/Tashkent", now), false);
  assert.equal(isFutureDate("2026-11-16", "Asia/Tashkent", now), true);
});

test("validateMarkInput: to‘g‘ri kirish o‘tadi", () => {
  assert.doesNotThrow(() => validateMarkInput({ studentId: U1, lessonDate: "2026-11-14", para: 2, status: "present" }));
});

test("validateMarkInput: noto‘g‘ri qiymatlar rad etiladi", () => {
  const base = { studentId: U1, lessonDate: "2026-11-14", para: 2, status: "present" as const };
  assert.throws(() => validateMarkInput({ ...base, studentId: "x" }), ApiError);
  assert.throws(() => validateMarkInput({ ...base, lessonDate: "2026-13-01" }), ApiError);
  assert.throws(() => validateMarkInput({ ...base, para: 0 }), ApiError);
  assert.throws(() => validateMarkInput({ ...base, para: 9 }), ApiError);
  assert.throws(() => validateMarkInput({ ...base, status: "late" as never }), ApiError);
  assert.throws(() => validateMarkInput({ ...base, status: "escaped", para: 4 }), ApiError);
  assert.throws(() => validateMarkInput({ ...base, note: "x".repeat(501) }), ApiError);
});

test("validateBulkInput: bo‘sh va takroriy ro‘yxat rad etiladi", () => {
  const base = { groupId: U1, lessonDate: "2026-11-14", para: 1 };
  assert.throws(() => validateBulkInput({ ...base, records: [] }), ApiError);
  assert.throws(() => validateBulkInput({ ...base, records: [{ studentId: U2, status: "present" }, { studentId: U2, status: "present" }] }), ApiError);
  assert.doesNotThrow(() => validateBulkInput({ ...base, records: [{ studentId: U2, status: "present" }] }));
});

test("validateCreateLeaderInput: qisqa parol va noto‘g‘ri email rad etiladi", () => {
  const ok = { email: "rahbar@example.com", password: "kamida-10-belgi", full_name: "Test Rahbar" };
  assert.doesNotThrow(() => validateCreateLeaderInput(ok));
  assert.throws(() => validateCreateLeaderInput({ ...ok, password: "qisqa" }), ApiError);
  assert.throws(() => validateCreateLeaderInput({ ...ok, email: "email-emas" }), ApiError);
  assert.throws(() => validateCreateLeaderInput({ ...ok, full_name: " " }), ApiError);
  assert.throws(() => validateCreateLeaderInput({ ...ok, group_id: "nope" }), ApiError);
});

test("uuid/email yordamchilari", () => {
  assert.equal(isUuid(U1), true);
  assert.equal(isUuid("abc"), false);
  assert.equal(isEmail("a@b.uz"), true);
  assert.equal(isEmail("a@b"), false);
});

test("Postgres kodlarini API xatosiga moslash", () => {
  assert.equal(fromPostgrestError({ code: "42501", message: "m" }).code, "FORBIDDEN");
  assert.equal(fromPostgrestError({ code: "28000", message: "m" }).code, "UNAUTHENTICATED");
  assert.equal(fromPostgrestError({ code: "P0002", message: "m" }).code, "NOT_FOUND");
  assert.equal(fromPostgrestError({ code: "22023", message: "m" }).code, "VALIDATION");
  assert.equal(fromPostgrestError({ code: "23505", message: "m" }).code, "CONFLICT");
  assert.equal(fromPostgrestError({ code: "XX000", message: "m" }).code, "INTERNAL");
});
