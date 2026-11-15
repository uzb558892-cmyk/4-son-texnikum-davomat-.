-- Ota-ona kodi: har bir o'quvchiga tasodifiy kod, kod bilan faqat o'sha o'quvchini ko'rish
alter table public.students add column if not exists parent_code text unique;

create or replace function public.make_parent_code() returns text
language sql volatile set search_path = '' as $$
  select upper(
    substr(h,1,4) || '-' || substr(h,5,4) || '-' || substr(h,9,4) || '-' || substr(h,21,4)
  )
  from (select replace(gen_random_uuid()::text, '-', '') as h) t
$$;

create or replace function public.students_set_parent_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_code is null then
    new.parent_code := public.make_parent_code();
  end if;
  return new;
end
$$;

drop trigger if exists students_parent_code on public.students;
create trigger students_parent_code before insert on public.students
  for each row execute function public.students_set_parent_code();

update public.students set parent_code = public.make_parent_code() where parent_code is null;

create or replace function public.get_parent_view(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_student public.students%rowtype;
  v_group text;
begin
  if length(v_code) <> 19 then
    return null;
  end if;

  select * into v_student from public.students
   where parent_code = v_code and is_active;
  if not found then
    return null;
  end if;

  select g.name into v_group from public.groups g where g.id = v_student.group_id;

  return jsonb_build_object(
    'full_name', v_student.full_name,
    'group_name', v_group,
    'threshold_hours', public.get_setting_int('warning_threshold_hours', 72),
    'unexcused_hours', coalesce((
      select sum(a.academic_hours) from public.attendance a
       where a.student_id = v_student.id and a.status = 'unexcused_absent'), 0),
    'excused_hours', coalesce((
      select sum(a.academic_hours) from public.attendance a
       where a.student_id = v_student.id and a.status = 'excused_absent'), 0),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', r.lesson_date, 'para', r.para,
               'status', r.status::text, 'hours', r.academic_hours)
             order by r.lesson_date desc, r.para)
        from (select * from public.attendance a
               where a.student_id = v_student.id
               order by a.lesson_date desc, a.para
               limit 200) r
    ), '[]'::jsonb)
  );
end
$$;

grant execute on function public.get_parent_view(text) to anon, authenticated;
