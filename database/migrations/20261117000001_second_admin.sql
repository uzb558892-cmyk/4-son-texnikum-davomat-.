-- =====================================================================
-- 4-SON TEXNIKUM DAVOMAT — 2-administrator qo‘shish
-- Asosiy administrator (is_primary) himoyalangan, 2-administratorni
-- faqat asosiy administrator qo‘sha/bloklay/o‘chira oladi.
-- =====================================================================
begin;

-- 1) Yangi ustunlar
alter table public.profiles add column if not exists is_primary boolean not null default false;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles drop constraint if exists profiles_job_title_len;
alter table public.profiles add constraint profiles_job_title_len
  check (job_title is null or length(job_title) <= 120);

-- 2) Hozirgi yagona administratorni ASOSIY qilamiz
update public.profiles set is_primary = true
where role = 'admin'
  and not exists (select 1 from public.profiles x where x.is_primary);

-- 3) Eski "faqat bitta admin" qoidasini "faqat bitta asosiy admin" bilan almashtiramiz
drop index if exists public.profiles_single_admin;
create unique index if not exists profiles_single_primary
  on public.profiles ((is_primary)) where is_primary;

-- 4) Himoya triggeri
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_boot boolean := coalesce(current_setting('app.bootstrapping', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.role = 'admin' and not v_boot then
      raise exception 'Administrator faqat maxsus funksiyalar orqali yaratiladi' using errcode = '42501';
    end if;
    if new.is_primary and not v_boot then
      raise exception 'Asosiy administrator belgisini berib bo‘lmaydi' using errcode = '42501';
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'Profil identifikatorini o‘zgartirib bo‘lmaydi' using errcode = '42501';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Rolni o‘zgartirib bo‘lmaydi' using errcode = '42501';
    end if;
    if new.is_primary is distinct from old.is_primary then
      raise exception 'Asosiy administrator belgisini o‘zgartirib bo‘lmaydi' using errcode = '42501';
    end if;
    if old.is_primary and new.is_active = false then
      raise exception 'Asosiy administratorni faolsizlantirib bo‘lmaydi' using errcode = '42501';
    end if;
    return new;
  else
    if old.is_primary then
      raise exception 'Asosiy administratorni o‘chirib bo‘lmaydi' using errcode = '42501';
    end if;
    return old;
  end if;
end $$;

-- 5) RLS: administrator boshqa administratorning profilini o‘zgartira olmaydi
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin() and (role <> 'admin' or id = auth.uid()))
  with check (public.is_admin() and (role <> 'admin' or id = auth.uid()));

-- 6) bootstrap_admin: birinchi administrator endi asosiy bo‘ladi
create or replace function public.bootstrap_admin(p_user_id uuid, p_full_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Administrator allaqachon mavjud' using errcode = 'P0001';
  end if;
  perform set_config('app.bootstrapping', 'on', true);
  insert into public.profiles (id, role, full_name, is_primary)
  values (p_user_id, 'admin', p_full_name, true);
end $$;

-- 7) 2-administrator profilini yaratish (faqat service_role / Edge Function)
create or replace function public.create_second_admin_profile(
  p_user_id uuid, p_full_name text, p_phone text, p_job_title text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('davomat_admin_limit'));
  if not exists (select 1 from public.profiles where is_primary) then
    raise exception 'Asosiy administrator topilmadi' using errcode = 'P0001';
  end if;
  if (select count(*) from public.profiles where role = 'admin') >= 2 then
    raise exception 'Tizimda allaqachon 2 ta administrator bor' using errcode = 'P0001';
  end if;
  perform set_config('app.bootstrapping', 'on', true);
  insert into public.profiles (id, role, full_name, phone, job_title)
  values (p_user_id, 'admin', btrim(p_full_name), nullif(btrim(p_phone), ''), nullif(btrim(p_job_title), ''));
end $$;

revoke all on function public.create_second_admin_profile(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_second_admin_profile(uuid, text, text, text) to service_role;

-- 8) Yakuniy xavfsizlik tekshiruvi: aynan 1 ta asosiy administrator bo‘lishi shart
do $$
begin
  if (select count(*) from public.profiles where is_primary and role = 'admin') <> 1 then
    raise exception 'Asosiy administrator topilmadi — o‘zgarishlar bekor qilindi';
  end if;
end $$;

commit;
