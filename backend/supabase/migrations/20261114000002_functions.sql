-- =====================================================================
-- 4-SON TEXNIKUM DAVOMAT — 2/4: yordamchi funksiyalar, triggerlar, RPC
-- Barcha SECURITY DEFINER funksiyalar: search_path = '' (schema-hijack himoyasi)
-- =====================================================================

-- ------------------------------------------------------------ yordamchilar
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role = 'admin' and p.is_active);
$$;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active);
$$;

-- Guruh rahbarining (faol) guruhi; yo‘q bo‘lsa NULL
create or replace function public.current_group_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select g.id
  from public.groups g join public.profiles p on p.id = g.leader_id
  where g.leader_id = auth.uid() and p.is_active and p.role = 'group_leader' and g.is_active
  limit 1;
$$;

create or replace function public.get_setting_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select (s.value #>> '{}')::int from public.settings s where s.key = p_key), p_default);
$$;

create or replace function public.get_setting_text(p_key text, p_default text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.value #>> '{}' from public.settings s where s.key = p_key), p_default);
$$;

create or replace function public.paras_per_day_for(p_group_id uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select g.paras_per_day from public.groups g where g.id = p_group_id),
                  public.get_setting_int('paras_per_day', 4));
$$;

-- ------------------------------------------------- profiles himoya triggeri
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'admin' and coalesce(current_setting('app.bootstrapping', true), '') <> 'on' then
      raise exception 'Administrator faqat bootstrap_admin() orqali yaratiladi' using errcode = '42501';
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'Profil identifikatorini o‘zgartirib bo‘lmaydi' using errcode = '42501';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Rolni o‘zgartirib bo‘lmaydi' using errcode = '42501';
    end if;
    if old.role = 'admin' and new.is_active = false then
      raise exception 'Administratorni faolsizlantirib bo‘lmaydi' using errcode = '42501';
    end if;
    return new;
  else
    if old.role = 'admin' then
      raise exception 'Administratorni o‘chirib bo‘lmaydi' using errcode = '42501';
    end if;
    return old;
  end if;
end $$;

create trigger profiles_guard_trg before insert or update or delete on public.profiles
  for each row execute function public.profiles_guard();

-- --------------------------------------------------- groups himoya triggeri
create or replace function public.groups_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.leader_id is not null and not exists (
       select 1 from public.profiles p where p.id = new.leader_id and p.role = 'group_leader') then
    raise exception 'Guruh rahbari faqat group_leader rolidagi foydalanuvchi bo‘lishi mumkin'
      using errcode = '22023';
  end if;
  return new;
end $$;

create trigger groups_guard_trg before insert or update of leader_id on public.groups
  for each row execute function public.groups_guard();

-- ------------------------------------------------------ attendance auditi
create or replace function public.attendance_audit_fn() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.attendance_audit
      (attendance_id, student_id, group_id, lesson_date, para, action, old_data, new_data, changed_by)
    values (new.id, new.student_id, new.group_id, new.lesson_date, new.para, 'insert', null, to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
      return new;
    end if;
    insert into public.attendance_audit
      (attendance_id, student_id, group_id, lesson_date, para, action, old_data, new_data, changed_by)
    values (new.id, new.student_id, new.group_id, new.lesson_date, new.para, 'update', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  else
    insert into public.attendance_audit
      (attendance_id, student_id, group_id, lesson_date, para, action, old_data, new_data, changed_by)
    values (old.id, old.student_id, old.group_id, old.lesson_date, old.para, 'delete', to_jsonb(old), null, auth.uid());
    return old;
  end if;
end $$;

create trigger attendance_audit_trg after insert or update or delete on public.attendance
  for each row execute function public.attendance_audit_fn();

-- --------------------------------------------------- ogohlantirish xati matni
create or replace function public.build_letter_text(p_student_id uuid, p_hours int, p_threshold int) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_name text; v_parent text; v_group text;
  v_college text := public.get_setting_text('college_name', 'Texnikum');
begin
  select s.full_name, coalesce(nullif(btrim(s.parent_name), ''), 'ota-ona'), g.name
    into v_name, v_parent, v_group
  from public.students s join public.groups g on g.id = s.group_id
  where s.id = p_student_id;

  return format(
    $tpl$Hurmatli %s!

%s ma‘muriyati sizni %s (%s guruh) ning darslarga sababsiz qatnashmayotgani haqida xabardor qiladi. Hozirgacha uzrsiz qoldirilgan akademik soatlar: %s soat (belgilangan chegara: %s soat).

Iltimos, farzandingizning davomatiga e‘tibor bering va zarur bo‘lsa, texnikum ma‘muriyati bilan bog‘laning.$tpl$,
    v_parent, v_college, v_name, v_group, p_hours, p_threshold);
end $$;

-- ------------------------------------------------------ 72 soat hisob-kitobi
-- Faqat unexcused_absent soatlari qo‘shiladi. Soat > chegara bo‘lgandagina
-- ogohlantirish yaratiladi. level = ceil(soat / chegara) - 1.
create or replace function public.recompute_warnings(p_student_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_threshold int := greatest(public.get_setting_int('warning_threshold_hours', 72), 1);
  v_hours int;
  v_level int;
begin
  if not exists (select 1 from public.students where id = p_student_id) then
    return;
  end if;

  select coalesce(sum(a.academic_hours), 0)::int into v_hours
  from public.attendance a
  where a.student_id = p_student_id and a.status = 'unexcused_absent';

  v_level := case when v_hours > v_threshold
                  then ceil(v_hours::numeric / v_threshold)::int - 1 else 0 end;

  -- Endi kerak bo‘lmagan qoralamalarni olib tashlash (yuborilganlar saqlanadi)
  delete from public.warning_letters
   where student_id = p_student_id and status = 'draft' and level > v_level;

  if v_level >= 1 then
    insert into public.warning_letters (student_id, level, unexcused_hours, threshold_hours, letter_text)
    values (p_student_id, v_level, v_hours, v_threshold,
            public.build_letter_text(p_student_id, v_hours, v_threshold))
    on conflict (student_id, level) do nothing;

    update public.warning_letters
       set unexcused_hours = v_hours, threshold_hours = v_threshold
     where student_id = p_student_id and level = v_level and status = 'draft';
  end if;
end $$;

-- ------------------------------------------------------ "qochdi"ni bekor qilish
create or replace function public._clear_escape(p_student_id uuid, p_date date, p_k smallint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.attendance
   where student_id = p_student_id and lesson_date = p_date
     and is_auto and escaped_after_para = p_k;
  update public.attendance
     set status = 'present', escaped_after_para = null, marked_by = auth.uid()
   where student_id = p_student_id and lesson_date = p_date
     and para = p_k and status = 'escaped';
end $$;

-- ----------------------------------------------------------- davomat belgilash
create or replace function public.mark_attendance(
  p_student_id  uuid,
  p_lesson_date date,
  p_para        smallint,
  p_status      public.attendance_status,
  p_note        text default null
) returns public.attendance
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := auth.uid();
  v_student  public.students%rowtype;
  v_existing public.attendance%rowtype;
  v_prev_esc public.attendance%rowtype;
  v_row      public.attendance%rowtype;
  v_hours    int  := public.get_setting_int('academic_hours_per_para', 2);
  v_today    date := (now() at time zone public.get_setting_text('timezone', 'Asia/Tashkent'))::date;
  v_ppd      int;
begin
  if v_uid is null then
    raise exception 'Autentifikatsiya talab qilinadi' using errcode = '28000';
  end if;

  select * into v_student from public.students where id = p_student_id;
  if not found then
    raise exception 'O‘quvchi topilmadi' using errcode = 'P0002';
  end if;
  if not v_student.is_active then
    raise exception 'O‘quvchi faol emas' using errcode = '22023';
  end if;

  -- Server tomonida vakolat tekshiruvi
  if not (public.is_admin()
          or (public.current_group_id() is not null and public.current_group_id() = v_student.group_id)) then
    raise exception 'Bu guruh uchun ruxsat yo‘q' using errcode = '42501';
  end if;

  if p_lesson_date > v_today then
    raise exception 'Kelajak sanasiga davomat belgilab bo‘lmaydi' using errcode = '22023';
  end if;

  v_ppd := public.paras_per_day_for(v_student.group_id);
  if p_para < 1 or p_para > v_ppd then
    raise exception 'Para raqami 1..% oralig‘ida bo‘lishi kerak', v_ppd using errcode = '22023';
  end if;

  if p_status = 'escaped' then
    if p_para > 3 then
      raise exception 'Darsdan qochdi faqat 1, 2 yoki 3-paradan keyin belgilanadi' using errcode = '22023';
    end if;
    if p_para >= v_ppd then
      raise exception 'Bu paradan keyin rejalashtirilgan para yo‘q' using errcode = '22023';
    end if;
  end if;

  select * into v_existing from public.attendance
   where student_id = p_student_id and lesson_date = p_lesson_date and para = p_para;

  if v_existing.id is not null and v_existing.group_id <> v_student.group_id and not public.is_admin() then
    raise exception 'Bu yozuv boshqa guruhga tegishli' using errcode = '42501';
  end if;

  -- 1) Eski "qochdi" belgisini tozalash (yangi belgi qo‘yilayotgan bo‘lsa yoki
  --    "qochdi" yozuvi boshqa holatga o‘zgartirilayotgan bo‘lsa)
  if p_status = 'escaped' then
    select * into v_prev_esc from public.attendance
     where student_id = p_student_id and lesson_date = p_lesson_date and status = 'escaped';
    if v_prev_esc.id is not null then
      perform public._clear_escape(p_student_id, p_lesson_date, v_prev_esc.para);
    end if;
  elsif v_existing.status = 'escaped' then
    perform public._clear_escape(p_student_id, p_lesson_date, v_existing.para);
  end if;

  -- 2) Asosiy yozuv (UPSERT: takroriy yozuv hosil bo‘lmaydi)
  insert into public.attendance
    (student_id, group_id, lesson_date, para, status, academic_hours, note,
     is_auto, escaped_after_para, marked_by)
  values
    (p_student_id, coalesce(v_existing.group_id, v_student.group_id), p_lesson_date, p_para, p_status,
     coalesce(v_existing.academic_hours, v_hours), p_note, false,
     case when p_status = 'escaped' then p_para else null end, v_uid)
  on conflict (student_id, lesson_date, para) do update
    set status = excluded.status,
        note = excluded.note,
        is_auto = false,
        escaped_after_para = excluded.escaped_after_para,
        marked_by = excluded.marked_by
  returning * into v_row;

  -- 3) Tanlangan paradan KEYINGI paralar uzrsiz; oldingilariga tegilmaydi
  if p_status = 'escaped' then
    insert into public.attendance
      (student_id, group_id, lesson_date, para, status, academic_hours, is_auto, escaped_after_para, marked_by)
    select p_student_id, v_row.group_id, p_lesson_date, gs::smallint, 'unexcused_absent', v_hours,
           true, p_para, v_uid
    from generate_series(p_para + 1, v_ppd) as gs
    on conflict (student_id, lesson_date, para) do update
      set status = 'unexcused_absent', is_auto = true,
          escaped_after_para = excluded.escaped_after_para,
          note = null, marked_by = excluded.marked_by;
  end if;

  perform public.recompute_warnings(p_student_id);
  return v_row;
end $$;

-- Bitta para uchun butun guruhni birdaniga belgilash (bitta tranzaksiya)
create or replace function public.mark_attendance_bulk(
  p_group_id    uuid,
  p_lesson_date date,
  p_para        smallint,
  p_records     jsonb      -- [{"student_id": "...", "status": "present", "note": null}, ...]
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n integer := 0;
begin
  if jsonb_typeof(p_records) is distinct from 'array' then
    raise exception 'p_records massiv bo‘lishi kerak' using errcode = '22023';
  end if;

  for r in
    select (e ->> 'student_id')::uuid as student_id,
           (e ->> 'status')::public.attendance_status as status,
           e ->> 'note' as note
    from jsonb_array_elements(p_records) as e
  loop
    if not exists (select 1 from public.students s where s.id = r.student_id and s.group_id = p_group_id) then
      raise exception 'O‘quvchi ko‘rsatilgan guruhga tegishli emas: %', r.student_id using errcode = '22023';
    end if;
    perform public.mark_attendance(r.student_id, p_lesson_date, p_para, r.status, r.note);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ------------------------------------------------------- administrator RPC
create or replace function public.update_setting(p_key text, p_value jsonb) returns public.settings
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.settings;
  v_int int;
begin
  if not public.is_admin() then
    raise exception 'Faqat administrator' using errcode = '42501';
  end if;

  case p_key
    when 'academic_hours_per_para' then
      v_int := (p_value #>> '{}')::int;
      if v_int not between 1 and 6 then raise exception 'academic_hours_per_para 1..6 bo‘lishi kerak' using errcode = '22023'; end if;
    when 'paras_per_day' then
      v_int := (p_value #>> '{}')::int;
      if v_int not between 1 and 8 then raise exception 'paras_per_day 1..8 bo‘lishi kerak' using errcode = '22023'; end if;
    when 'warning_threshold_hours' then
      v_int := (p_value #>> '{}')::int;
      if v_int not between 1 and 1000 then raise exception 'warning_threshold_hours 1..1000 bo‘lishi kerak' using errcode = '22023'; end if;
    when 'college_name' then
      if jsonb_typeof(p_value) <> 'string' or length(btrim(p_value #>> '{}')) = 0 then
        raise exception 'college_name bo‘sh bo‘lmagan matn bo‘lishi kerak' using errcode = '22023';
      end if;
    when 'timezone' then
      if jsonb_typeof(p_value) <> 'string' then raise exception 'timezone matn bo‘lishi kerak' using errcode = '22023'; end if;
      perform now() at time zone (p_value #>> '{}');   -- noto‘g‘ri nom bo‘lsa xato beradi
    else
      raise exception 'Noma‘lum sozlama: %', p_key using errcode = '22023';
  end case;

  update public.settings
     set value = p_value, updated_by = auth.uid(), updated_at = now()
   where key = p_key
  returning * into v_row;

  if p_key = 'warning_threshold_hours' then
    perform public.recompute_warnings(t.student_id)
    from (select distinct student_id from public.attendance where status = 'unexcused_absent') t;
  end if;
  return v_row;
end $$;

create or replace function public.update_warning(
  p_id uuid, p_letter_text text default null, p_status public.warning_status default null
) returns public.warning_letters
language plpgsql security definer set search_path = '' as $$
declare
  v_w public.warning_letters;
begin
  if not public.is_admin() then
    raise exception 'Faqat administrator' using errcode = '42501';
  end if;
  select * into v_w from public.warning_letters where id = p_id;
  if not found then
    raise exception 'Ogohlantirish topilmadi' using errcode = 'P0002';
  end if;
  if p_status is not null and p_status < v_w.status then
    raise exception 'Holatni orqaga qaytarib bo‘lmaydi' using errcode = '22023';
  end if;
  if p_letter_text is not null and length(btrim(p_letter_text)) = 0 then
    raise exception 'Xat matni bo‘sh bo‘lmasligi kerak' using errcode = '22023';
  end if;

  update public.warning_letters w
     set letter_text = coalesce(p_letter_text, w.letter_text),
         status      = coalesce(p_status, w.status),
         issued_at   = case when coalesce(p_status, w.status) >= 'issued' and w.issued_at is null then now() else w.issued_at end,
         sent_at     = case when coalesce(p_status, w.status) = 'sent'   and w.sent_at   is null then now() else w.sent_at   end,
         handled_by  = auth.uid()
   where w.id = p_id
  returning * into v_w;
  return v_w;
end $$;

-- ------------------------------------- faqat service_role (Edge Function) uchun
create or replace function public.bootstrap_admin(p_user_id uuid, p_full_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Administrator allaqachon mavjud' using errcode = 'P0001';
  end if;
  perform set_config('app.bootstrapping', 'on', true);
  insert into public.profiles (id, role, full_name) values (p_user_id, 'admin', p_full_name);
end $$;

create or replace function public.create_group_leader_profile(
  p_user_id uuid, p_full_name text, p_phone text default null, p_group_id uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (p_user_id, 'group_leader', p_full_name, p_phone);

  if p_group_id is not null then
    update public.groups set leader_id = p_user_id where id = p_group_id and leader_id is null;
    if not found then
      raise exception 'Guruh topilmadi yoki unda allaqachon rahbar bor' using errcode = '22023';
    end if;
  end if;
end $$;

-- ------------------------------------------------------------ EXECUTE huquqlari
revoke all on function public.bootstrap_admin(uuid, text)                          from public, anon, authenticated;
revoke all on function public.create_group_leader_profile(uuid, text, text, uuid)  from public, anon, authenticated;
grant  execute on function public.bootstrap_admin(uuid, text)                          to service_role;
grant  execute on function public.create_group_leader_profile(uuid, text, text, uuid)  to service_role;

revoke all on function public._clear_escape(uuid, date, smallint)       from public, anon, authenticated;
revoke all on function public.recompute_warnings(uuid)                  from public, anon, authenticated;
revoke all on function public.build_letter_text(uuid, int, int)         from public, anon, authenticated;

revoke all on function public.mark_attendance(uuid, date, smallint, public.attendance_status, text)  from public, anon;
revoke all on function public.mark_attendance_bulk(uuid, date, smallint, jsonb)                      from public, anon;
revoke all on function public.update_setting(text, jsonb)                                            from public, anon;
revoke all on function public.update_warning(uuid, text, public.warning_status)                      from public, anon;
grant execute on function public.mark_attendance(uuid, date, smallint, public.attendance_status, text) to authenticated;
grant execute on function public.mark_attendance_bulk(uuid, date, smallint, jsonb)                     to authenticated;
grant execute on function public.update_setting(text, jsonb)                                           to authenticated;
grant execute on function public.update_warning(uuid, text, public.warning_status)                     to authenticated;

revoke all on function public.is_admin(), public.is_active_member(), public.current_group_id() from public, anon;
grant execute on function public.is_admin(), public.is_active_member(), public.current_group_id() to authenticated;
revoke all on function public.get_setting_int(text, int), public.get_setting_text(text, text),
                       public.paras_per_day_for(uuid) from public, anon;
grant execute on function public.get_setting_int(text, int), public.get_setting_text(text, text),
                          public.paras_per_day_for(uuid) to authenticated;
