-- =====================================================================
-- 4-SON TEXNIKUM DAVOMAT — 1/4: sxema (enum, jadvallar, indekslar)
-- =====================================================================

create type public.user_role         as enum ('admin', 'group_leader');
create type public.attendance_status as enum ('present', 'excused_absent', 'unexcused_absent', 'escaped');
-- tartib muhim: draft < issued < sent (faqat oldinga o‘tish mumkin)
create type public.warning_status    as enum ('draft', 'issued', 'sent');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null,
  full_name  text not null check (length(btrim(full_name)) between 2 and 120),
  phone      text check (phone is null or length(phone) <= 32),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Tizimda ko‘pi bilan BITTA administrator bo‘lishi mumkin
create unique index profiles_single_admin on public.profiles ((role)) where role = 'admin';
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ groups
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique check (length(btrim(name)) between 1 and 60),
  leader_id     uuid unique references public.profiles (id) on delete set null,
  paras_per_day smallint check (paras_per_day between 1 and 8),   -- NULL = umumiy sozlama
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger groups_set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- students
create table public.students (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups (id) on delete restrict,
  full_name      text not null check (length(btrim(full_name)) between 2 and 120),
  student_code   text unique,
  parent_name    text,
  parent_phone   text,
  parent_address text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index students_group_idx on public.students (group_id);
create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- attendance
-- Bitta yozuv = bitta o‘quvchi + sana + para.
--  * status = escaped      -> o‘quvchi shu para tugagach ketgan (escaped_after_para = para)
--  * is_auto = true        -> "escaped" tufayli avtomatik qo‘yilgan uzrsiz yozuv
--  * academic_hours        -> yozuv yaratilgan paytdagi para soati (snapshot;
--                              keyin sozlama o‘zgarsa eski yozuvlar qayta hisoblanmaydi)
create table public.attendance (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students (id) on delete restrict,
  group_id           uuid not null references public.groups (id) on delete restrict,
  lesson_date        date not null,
  para               smallint not null check (para between 1 and 8),
  status             public.attendance_status not null,
  academic_hours     smallint not null check (academic_hours between 1 and 12),
  note               text check (note is null or length(note) <= 500),
  is_auto            boolean not null default false,
  escaped_after_para smallint check (escaped_after_para between 1 and 3),
  marked_by          uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint attendance_unique_slot unique (student_id, lesson_date, para),
  constraint attendance_escape_consistency check (
       (status = 'escaped' and not is_auto and escaped_after_para = para and para between 1 and 3)
    or (is_auto and status = 'unexcused_absent' and escaped_after_para is not null and escaped_after_para < para)
    or (status <> 'escaped' and not is_auto and escaped_after_para is null)
  )
);
-- Bir o‘quvchi bir kunda faqat bir marta "escaped" bo‘la oladi
create unique index attendance_one_escape_per_day
  on public.attendance (student_id, lesson_date) where status = 'escaped';
create index attendance_group_date_idx on public.attendance (group_id, lesson_date);
create index attendance_student_unexcused_idx on public.attendance (student_id) where status = 'unexcused_absent';
create trigger attendance_set_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------- attendance_audit
create table public.attendance_audit (
  id            bigint generated always as identity primary key,
  attendance_id uuid not null,          -- FK yo‘q: o‘chirilgan yozuvlar tarixi ham saqlanadi
  student_id    uuid not null,
  group_id      uuid not null,
  lesson_date   date not null,
  para          smallint not null,
  action        text not null check (action in ('insert', 'update', 'delete')),
  old_data      jsonb,
  new_data      jsonb,
  changed_by    uuid,
  changed_at    timestamptz not null default now()
);
create index attendance_audit_att_idx   on public.attendance_audit (attendance_id);
create index attendance_audit_group_idx on public.attendance_audit (group_id, changed_at desc);

-- ----------------------------------------------------------- warning_letters
-- level = nechanchi chegara oralig‘i: soat > T bo‘lsa level 1, soat > 2T bo‘lsa level 2 ...
create table public.warning_letters (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id) on delete cascade,
  level           smallint not null check (level >= 1),
  unexcused_hours integer not null check (unexcused_hours >= 0),
  threshold_hours integer not null check (threshold_hours > 0),
  status          public.warning_status not null default 'draft',
  letter_text     text not null,
  created_at      timestamptz not null default now(),
  issued_at       timestamptz,
  sent_at         timestamptz,
  handled_by      uuid references public.profiles (id) on delete set null,
  constraint warning_letters_unique_level unique (student_id, level)
);
create index warning_letters_status_idx on public.warning_letters (status);

-- ----------------------------------------------------------------- settings
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.settings (key, value, description) values
  ('academic_hours_per_para', '2',                'Bir para necha akademik soat'),
  ('paras_per_day',           '4',                'Kunlik rejalashtirilgan paralar soni (guruhda alohida belgilash mumkin)'),
  ('warning_threshold_hours', '72',               'Uzrsiz soatlar chegarasi; undan OSHGANDA ogohlantirish'),
  ('college_name',            '"4-son Texnikum"', 'Ogohlantirish xatida ishlatiladi'),
  ('timezone',                '"Asia/Tashkent"',  'Sana hisoblash uchun vaqt mintaqasi');
