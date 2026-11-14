import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMark, planEscape, unexcusedHours, warningLevel, RuleError } from "../src/utils/attendanceRules.ts";
import type { Slot } from "../src/utils/attendanceRules.ts";

const opts = { parasPerDay: 4, hoursPerPara: 2 };
const statuses = (day: Slot[]) => day.map((s) => `${s.para}:${s.status}${s.isAuto ? "*" : ""}`);

test("planEscape: 1-paradan keyin 2,3,4 uzrsiz", () => {
  assert.deepEqual(planEscape(1, 4), [2, 3, 4]);
  assert.deepEqual(planEscape(2, 4), [3, 4]);
  assert.deepEqual(planEscape(3, 4), [4]);
});

test("planEscape: noto‘g‘ri para rad etiladi", () => {
  assert.throws(() => planEscape(0, 4), RuleError);
  assert.throws(() => planEscape(4, 6), RuleError);   // faqat 1..3
  assert.throws(() => planEscape(3, 3), RuleError);   // keyingi para yo‘q
  assert.throws(() => planEscape(1.5, 4), RuleError);
});

test("escaped: oldingi paralarga tegilmaydi, keyingilari uzrsiz bo‘ladi", () => {
  let day: Slot[] = [];
  day = applyMark(day, { para: 1, status: "present" }, opts);
  day = applyMark(day, { para: 2, status: "excused_absent" }, opts);
  day = applyMark(day, { para: 2, status: "escaped" }, opts);
  assert.deepEqual(statuses(day), ["1:present", "2:escaped", "3:unexcused_absent*", "4:unexcused_absent*"]);
  assert.equal(unexcusedHours(day), 4); // 2 ta para x 2 soat; escaped yozuvi hisobga kirmaydi
});

test("escaped: qo‘lda belgilangan keyingi para ustidan yoziladi (uzrsiz)", () => {
  let day: Slot[] = [{ para: 3, status: "excused_absent", academicHours: 2, isAuto: false, escapedAfterPara: null }];
  day = applyMark(day, { para: 1, status: "escaped" }, opts);
  assert.equal(day.find((s) => s.para === 3)?.status, "unexcused_absent");
});

test("takroriy yozuv hosil bo‘lmaydi (bir para — bitta yozuv)", () => {
  let day: Slot[] = [];
  day = applyMark(day, { para: 1, status: "present" }, opts);
  day = applyMark(day, { para: 1, status: "unexcused_absent" }, opts);
  day = applyMark(day, { para: 1, status: "excused_absent" }, opts);
  assert.equal(day.length, 1);
  assert.equal(day[0]!.status, "excused_absent");
});

test("escaped qayta belgilash: bir kunda faqat bitta qochish; eskisi tozalanadi", () => {
  let day: Slot[] = [];
  day = applyMark(day, { para: 2, status: "escaped" }, opts);   // 3,4 uzrsiz
  day = applyMark(day, { para: 1, status: "escaped" }, opts);   // endi 2,3,4 uzrsiz
  assert.deepEqual(statuses(day), ["1:escaped", "2:unexcused_absent*", "3:unexcused_absent*", "4:unexcused_absent*"]);
  assert.equal(day.filter((s) => s.status === "escaped").length, 1);
});

test("escaped bekor qilinsa avtomatik yozuvlar o‘chadi, qochgan para 'present' bo‘ladi", () => {
  let day: Slot[] = [];
  day = applyMark(day, { para: 1, status: "escaped" }, opts);
  day = applyMark(day, { para: 1, status: "present" }, opts);
  assert.deepEqual(statuses(day), ["1:present"]);
  assert.equal(unexcusedHours(day), 0);
});

test("avtomatik yozuvni qo‘lda o‘zgartirish uni oddiy yozuvga aylantiradi", () => {
  let day: Slot[] = [];
  day = applyMark(day, { para: 1, status: "escaped" }, opts);
  day = applyMark(day, { para: 3, status: "excused_absent" }, opts);
  const p3 = day.find((s) => s.para === 3)!;
  assert.equal(p3.status, "excused_absent");
  assert.equal(p3.isAuto, false);
  assert.equal(p3.escapedAfterPara, null);
});

test("akademik soat: yozuv yaratilgan paytdagi qiymat saqlanadi (snapshot)", () => {
  let day = applyMark([], { para: 1, status: "unexcused_absent" }, { parasPerDay: 4, hoursPerPara: 2 });
  day = applyMark(day, { para: 2, status: "unexcused_absent" }, { parasPerDay: 4, hoursPerPara: 3 }); // sozlama o‘zgargan
  assert.equal(day[0]!.academicHours, 2);
  assert.equal(day[1]!.academicHours, 3);
  day = applyMark(day, { para: 1, status: "unexcused_absent" }, { parasPerDay: 4, hoursPerPara: 3 }); // qayta belgilash
  assert.equal(day[0]!.academicHours, 2); // eski snapshot o‘zgarmaydi
  assert.equal(unexcusedHours(day), 5);
});

test("faqat uzrsiz soatlar hisoblanadi", () => {
  const mk = (status: Slot["status"]): Slot => ({ para: 1, status, academicHours: 2, isAuto: false, escapedAfterPara: null });
  assert.equal(unexcusedHours([mk("present"), mk("excused_absent"), mk("escaped"), mk("unexcused_absent")]), 2);
});

test("72 soat: aynan 72 — ogohlantirish YO‘Q; 73 — bor", () => {
  assert.equal(warningLevel(72, 72), 0);
  assert.equal(warningLevel(71, 72), 0);
  assert.equal(warningLevel(73, 72), 1);
  assert.equal(warningLevel(74, 72), 1);   // juft soatlar bilan: 72 -> 74
});

test("ogohlantirish darajalari: 144 gacha 1, 145 dan 2", () => {
  assert.equal(warningLevel(144, 72), 1);
  assert.equal(warningLevel(145, 72), 2);
  assert.equal(warningLevel(216, 72), 2);
  assert.equal(warningLevel(217, 72), 3);
});

test("chegara sozlanadigan: 10 soatlik chegarada 11 soat ogohlantiradi", () => {
  assert.equal(warningLevel(10, 10), 0);
  assert.equal(warningLevel(11, 10), 1);
  assert.throws(() => warningLevel(5, 0), RuleError);
});

test("para diapazoni: kunlik paralar sonidan oshsa rad", () => {
  assert.throws(() => applyMark([], { para: 5, status: "present" }, opts), RuleError);
  assert.throws(() => applyMark([], { para: 0, status: "present" }, opts), RuleError);
  assert.doesNotThrow(() => applyMark([], { para: 5, status: "present" }, { parasPerDay: 5, hoursPerPara: 2 }));
});

test("72 soatlik senariy: 36 ta uzrsiz para (2 soat) = 72 -> yo‘q, 37-si -> bor", () => {
  const days: Slot[] = [];
  for (let i = 1; i <= 36; i++) days.push({ para: i, status: "unexcused_absent", academicHours: 2, isAuto: false, escapedAfterPara: null });
  assert.equal(warningLevel(unexcusedHours(days), 72), 0);
  days.push({ para: 37, status: "unexcused_absent", academicHours: 2, isAuto: false, escapedAfterPara: null });
  assert.equal(warningLevel(unexcusedHours(days), 72), 1);
});
