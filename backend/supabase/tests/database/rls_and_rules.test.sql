-- pgTAP testlari. Ishga tushirish:  supabase start && supabase test db
-- ESLATMA: bu fayl yozilgan muhitda Postgres bo‘lmagani uchun u YUKLAB OLINISHIDAN OLDIN
-- ijro etilmagan. Birinchi ishga tushirishda xatolar chiqsa — README dagi "Ma‘lum cheklovlar"ga qarang.
begin;
select plan(16);

-- ------------------------------------------------------------------ tayyorgarlik
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'admin@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'lead-a@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'lead-b@test.local');

select public.bootstrap_admin('aaaaaaaa-0000-4000-8000-000000000001', 'Test Admin');
select public.create_group_leader_profile('aaaaaaaa-0000-4000-8000-000000000002', 'Rahbar A');
select public.create_group_leader_profile('aaaaaaaa-0000-4000-8000-000000000003', 'Rahbar B');

insert into public.groups (id, name, leader_id) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'TEST-A', 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'TEST-B', 'aaaaaaaa-0000-4000-8000-000000000003');

insert into public.students (id, group_id, full_name) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'A Birinchi'),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001', 'A Ikkinchi'),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000002', 'B Birinchi'),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000002', 'B Ikkinchi');

-- ---------------------------------------------------------- administrator qoidalari
select throws_ok(
  $$select public.bootstrap_admin('aaaaaaaa-0000-4000-8000-000000000003', 'Ikkinchi admin')$$,
  'P0001', null, 'ikkinchi administrator yaratib bo‘lmaydi');

select throws_ok(
  $$insert into public.profiles (id, role, full_name) values (gen_random_uuid(), 'admin', 'Soxta admin')$$,
  null, null, 'profiles ga to‘g‘ridan-to‘g‘ri admin qo‘shib bo‘lmaydi');

-- ------------------------------------------------------------ Guruh rahbari A sifatida
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is((select count(*)::int from public.students), 2, 'rahbar A faqat o‘z guruhi o‘quvchilarini ko‘radi');
select is((select count(*)::int from public.groups), 1, 'rahbar A faqat o‘z guruhini ko‘radi');
select is((select count(*)::int from public.profiles), 1, 'rahbar A faqat o‘z profilini ko‘radi');

select lives_ok(
  $$select public.mark_attendance('cccccccc-0000-4000-8000-000000000001', current_date, 1::smallint, 'present')$$,
  'rahbar A o‘z o‘quvchisiga davomat belgilay oladi');

select throws_ok(
  $$select public.mark_attendance('cccccccc-0000-4000-8000-000000000003', current_date, 1::smallint, 'present')$$,
  '42501', null, 'rahbar A boshqa guruh o‘quvchisiga belgilay olmaydi');

select throws_ok(
  $$insert into public.attendance (student_id, group_id, lesson_date, para, status, academic_hours)
    values ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', current_date, 2, 'present', 2)$$,
  '42501', null, 'attendance ga to‘g‘ridan-to‘g‘ri yozib bo‘lmaydi');

select throws_ok($$select public.update_setting('academic_hours_per_para', '3')$$,
  '42501', null, 'rahbar sozlamani o‘zgartira olmaydi');

select throws_ok($$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', null, 'rahbar o‘z rolini o‘zgartira olmaydi');

-- takroriy yozuv yo‘q
select public.mark_attendance('cccccccc-0000-4000-8000-000000000001', current_date, 1::smallint, 'unexcused_absent');
select is((select count(*)::int from public.attendance
            where student_id = 'cccccccc-0000-4000-8000-000000000001' and lesson_date = current_date and para = 1),
          1, 'bir o‘quvchi/sana/para uchun bitta yozuv');

-- "qochdi": 1-paradan keyin (kunlik 4 para) -> 2,3,4 uzrsiz
select public.mark_attendance('cccccccc-0000-4000-8000-000000000002', current_date, 1::smallint, 'escaped');
select is((select count(*)::int from public.attendance
            where student_id = 'cccccccc-0000-4000-8000-000000000002' and lesson_date = current_date
              and status = 'unexcused_absent' and is_auto),
          3, '1-paradan keyin 3 ta keyingi para uzrsiz bo‘ladi');

-- ------------------------------------------------------------------- anon
reset role;
set local role anon;
select throws_ok($$select * from public.students$$, '42501', null, 'anon o‘quvchilarni o‘qiy olmaydi');

-- ------------------------------------------------------------------ administrator
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.students), 4, 'administrator barcha o‘quvchilarni ko‘radi');

-- ------------------------------------------------- 72 soat (postgres sifatida to‘g‘ridan-to‘g‘ri)
reset role;
insert into public.attendance (student_id, group_id, lesson_date, para, status, academic_hours)
select 'cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000002',
       date '2026-01-01' + g, 1, 'unexcused_absent', 2
from generate_series(1, 36) g;                       -- 36 x 2 = 72 soat
select public.recompute_warnings('cccccccc-0000-4000-8000-000000000004');
select is((select count(*)::int from public.warning_letters where student_id = 'cccccccc-0000-4000-8000-000000000004'),
          0, 'aynan 72 soatda ogohlantirish yaratilmaydi');

insert into public.attendance (student_id, group_id, lesson_date, para, status, academic_hours)
values ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000002', date '2026-03-01', 1, 'unexcused_absent', 2);
select public.recompute_warnings('cccccccc-0000-4000-8000-000000000004');
select is((select count(*)::int from public.warning_letters where student_id = 'cccccccc-0000-4000-8000-000000000004'),
          1, '72 soatdan oshgach ogohlantirish yaratiladi');

select * from finish();
rollback;
