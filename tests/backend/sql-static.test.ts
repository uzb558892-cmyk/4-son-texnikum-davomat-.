// Migratsiyalarning STATIK tekshiruvi (Postgres kerak emas): xavfsizlik qoidalari
// tasodifan buzilmasligi uchun regressiya himoyasi. Bu haqiqiy SQL ijrosi emas —
// bazadagi ijro uchun `supabase test db` (supabase/tests/database) ishlating.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const code = sql.replace(/--.*$/gm, ""); // izohlarsiz

const REQUIRED_TABLES = ["profiles", "groups", "students", "attendance", "attendance_audit", "warning_letters", "settings"];

test("barcha talab qilingan jadvallar yaratilgan", () => {
  for (const t of REQUIRED_TABLES) assert.match(code, new RegExp(`create table public\\.${t}\\b`), t);
});

test("har bir jadvalda RLS yoqilgan va kamida bitta siyosat bor", () => {
  const created = [...code.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]!);
  assert.deepEqual([...created].sort(), [...REQUIRED_TABLES].sort());
  for (const t of created) {
    assert.match(code, new RegExp(`alter table public\\.${t}\\s+enable row level security`), `RLS yo‘q: ${t}`);
    assert.match(code, new RegExp(`create policy \\w+ on public\\.${t}\\b`), `siyosat yo‘q: ${t}`);
  }
});

test("anon rolga hech narsa berilmagan", () => {
  for (const m of code.matchAll(/grant\s[\s\S]*?;/gi)) {
    const stmt = m[0];
    if (/\bto\b[\s\S]*\banon\b/i.test(stmt)) assert.fail(`anon'ga grant: ${stmt}`);
  }
});

test("jadvallarga yozish huquqi minimal: attendance/audit/warning/settings uchun INSERT/UPDATE/DELETE yo‘q", () => {
  for (const m of code.matchAll(/grant\s+(insert|update|delete)[^;]*;/gi)) {
    const stmt = m[0];
    for (const t of ["attendance", "attendance_audit", "warning_letters", "settings"]) {
      assert.doesNotMatch(stmt, new RegExp(`public\\.${t}\\b`), `${t} ga yozish huquqi berilgan: ${stmt}`);
    }
  }
});

test("profiles: faqat full_name, phone, is_active yangilanishi mumkin", () => {
  assert.match(code, /grant update \(full_name, phone, is_active\) on public\.profiles/);
  assert.doesNotMatch(code, /create policy \w+ on public\.profiles for insert/);
  assert.doesNotMatch(code, /create policy \w+ on public\.profiles for delete/);
});

test("yagona administrator: unique indeks + bootstrap faqat service_role", () => {
  assert.match(code, /create unique index profiles_single_admin on public\.profiles \(\(role\)\) where role = 'admin'/);
  assert.match(code, /revoke all on function public\.bootstrap_admin\(uuid, text\)\s+from public, anon, authenticated/);
  assert.match(code, /grant\s+execute on function public\.bootstrap_admin\(uuid, text\)\s+to service_role/);
  assert.match(code, /app\.bootstrapping/);
});

test("barcha SECURITY DEFINER funksiyalarda search_path o‘rnatilgan", () => {
  const fns = code.split(/create or replace function/i).slice(1);
  for (const body of fns) {
    const header = body.split(/\$\$|\$tpl\$/)[0] ?? "";
    if (/security definer/i.test(header)) {
      assert.match(header, /set search_path = ''/i, `search_path yo‘q: ${header.slice(0, 60)}`);
    }
  }
});

test("bir o‘quvchi/sana/para uchun unique cheklov va bir kunda bitta 'escaped'", () => {
  assert.match(code, /constraint attendance_unique_slot unique \(student_id, lesson_date, para\)/);
  assert.match(code, /attendance_one_escape_per_day[\s\S]*where status = 'escaped'/);
});

test("72 soat: faqat unexcused_absent yig‘iladi va qat‘iy '>' ishlatiladi", () => {
  const fn = code.split("create or replace function public.recompute_warnings")[1]!.split("create or replace function")[0]!;
  assert.match(fn, /a\.status = 'unexcused_absent'/);
  assert.match(fn, /v_hours > v_threshold/);
  assert.doesNotMatch(fn, /'excused_absent'|'present'|'escaped'/); // boshqa holatlar yig‘indiga kirmaydi
});

test("ochiq matnli parol yoki kalit SQL'da yo‘q", () => {
  assert.doesNotMatch(code, /password\s*[:=]\s*'[^']+'/i);
  assert.doesNotMatch(code, /eyJ[A-Za-z0-9_-]{20,}/); // JWT ko‘rinishidagi kalit
  assert.doesNotMatch(code, /service_role_key\s*=/i);
});

test("ro‘yxatdan o‘tish config.toml da o‘chirilgan", () => {
  const cfg = readFileSync(join(dir, "..", "config.toml"), "utf8");
  assert.match(cfg, /\[auth\][\s\S]*?enable_signup = false/);
  assert.match(cfg, /enable_anonymous_sign_ins = false/);
});

test("frontend kodida maxfiy kalit ishlatilmaydi (src/ da service_role yo‘q)", () => {
  const root = join(import.meta.dirname, "..", "src");
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  for (const f of walk(root)) {
    const text = readFileSync(f, "utf8");
    assert.doesNotMatch(text, /service_role|SERVICE_ROLE/i, f);
  }
});

test("frontend integratsiyasi uchun kerakli view va RPC lar mavjud", () => {
  assert.match(code, /create or replace view public\.groups_overview/);
  assert.match(code, /create or replace view public\.students_overview/);
  assert.match(code, /create or replace function public\.get_unexcused_warnings/);
  assert.match(code, /create or replace function public\.get_dashboard_stats/);
  assert.match(code, /create or replace function public\.get_attendance_report/);
});

test("integratsiya RPC lari authenticated uchun, anon uchun emas", () => {
  assert.match(code, /grant execute on function public\.get_unexcused_warnings\(uuid\)[\s\S]*to authenticated/);
  assert.match(code, /revoke all on function public\.get_unexcused_warnings\(uuid\)[\s\S]*from public, anon/);
});

test("davomatni frontend bevosita yozmaydi — server RPC interfeysi mavjud", () => {
  assert.match(code, /create or replace function public\.mark_attendance\(/);
  assert.match(code, /grant execute on function public\.mark_attendance/);
});
