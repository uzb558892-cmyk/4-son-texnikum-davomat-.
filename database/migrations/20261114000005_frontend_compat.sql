-- 4-SON TEXNIKUM DAVOMAT — frontend integratsiyasi uchun moslik migratsiyasi
-- Mavjud asosiy sxema va xavfsizlik qoidalarini buzmasdan frontend kutayotgan
-- view/RPC interfeyslarini taqdim etadi.

alter table public.groups add column if not exists course smallint not null default 1
  check (course between 1 and 4);
alter table public.students add column if not exists phone text
  check (phone is null or length(phone) <= 32);

create or replace view public.groups_overview
with (security_invoker = true) as
select g.id, g.name, g.course, g.leader_id, p.full_name as leader_name,
       count(s.id)::integer as student_count
from public.groups g
left join public.profiles p on p.id = g.leader_id
left join public.students s on s.group_id = g.id and s.is_active
group by g.id, g.name, g.course, g.leader_id, p.full_name;

create or replace view public.students_overview
with (security_invoker = true) as
select s.id, s.full_name, s.group_id, g.name as group_name,
       s.phone, s.parent_phone, s.is_active
from public.students s join public.groups g on g.id = s.group_id;

grant select on public.groups_overview, public.students_overview to authenticated;

-- 72 soatlik ogohlantirishlar: faqat unexcused_absent yig'iladi va qat'iy >.
create or replace function public.get_unexcused_warnings(p_group_id uuid default null)
returns table (
  student_id uuid, student_name text, group_id uuid, group_name text,
  phone text, parent_phone text, unexcused_hours integer, threshold_hours integer,
  last_absence_date date, absences jsonb
)
language plpgsql stable security definer set search_path = '' as $$
declare v_group uuid := public.current_group_id();
begin
  if not public.is_active_member() then
    raise exception 'Faol hisob talab qilinadi' using errcode = '42501';
  end if;
  if not public.is_admin() and p_group_id is not null and p_group_id is distinct from v_group then
    raise exception 'Bu guruh uchun ruxsat yo‘q' using errcode = '42501';
  end if;
  return query
  with totals as (
    select s.id, coalesce(sum(a.academic_hours) filter (where a.status = 'unexcused_absent'),0)::integer h,
           max(a.lesson_date) filter (where a.status = 'unexcused_absent') last_date
    from public.students s left join public.attendance a on a.student_id=s.id
    where s.is_active and (public.is_admin() or s.group_id=v_group)
      and (p_group_id is null or s.group_id=p_group_id)
    group by s.id
  )
  select s.id, s.full_name, s.group_id, g.name, s.phone, s.parent_phone,
         t.h, public.get_setting_int('warning_threshold_hours',72), t.last_date,
         coalesce((select jsonb_agg(jsonb_build_object(
           'date',a.lesson_date,'lesson',a.para,
           'status',case a.status when 'unexcused_absent' then 'unexcused'
                                  when 'excused_absent' then 'excused'
                                  when 'escaped' then 'skipped' else 'present' end
         ) order by a.lesson_date desc,a.para)
           from public.attendance a where a.student_id=s.id and a.status='unexcused_absent'),'[]'::jsonb)
  from totals t join public.students s on s.id=t.id join public.groups g on g.id=s.group_id
  where t.h > public.get_setting_int('warning_threshold_hours',72)
  order by t.h desc, s.full_name;
end $$;

create or replace function public.get_dashboard_stats(p_date date default current_date, p_group_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_group uuid := public.current_group_id();
  result jsonb;
begin
  if not public.is_active_member() then raise exception 'Faol hisob talab qilinadi' using errcode='42501'; end if;
  if not public.is_admin() and p_group_id is not null and p_group_id is distinct from v_group then
    raise exception 'Bu guruh uchun ruxsat yo‘q' using errcode='42501';
  end if;
  with gs as (
    select g.id,g.name,count(s.id) filter(where s.is_active)::integer total,
      count(a.id) filter(where s.is_active and a.status='present')::integer present,
      count(a.id) filter(where s.is_active and a.status='excused_absent')::integer excused,
      count(a.id) filter(where s.is_active and a.status='unexcused_absent')::integer unexcused,
      count(a.id) filter(where s.is_active and a.status='escaped')::integer skipped
    from public.groups g
    left join public.students s on s.group_id=g.id and s.is_active
    left join public.attendance a on a.student_id=s.id and a.lesson_date=p_date
    where (public.is_admin() or g.id=v_group) and (p_group_id is null or g.id=p_group_id)
    group by g.id,g.name
  ), totals as (
    select count(*) filter(where s.is_active)::integer students,
      count(a.id) filter(where s.is_active and a.status='present')::integer present,
      count(a.id) filter(where s.is_active and a.status='excused_absent')::integer excused,
      count(a.id) filter(where s.is_active and a.status='unexcused_absent')::integer unexcused,
      count(a.id) filter(where s.is_active and a.status='escaped')::integer skipped
    from public.students s left join public.attendance a on a.student_id=s.id and a.lesson_date=p_date
    where (public.is_admin() or s.group_id=v_group) and (p_group_id is null or s.group_id=p_group_id)
  ), warning_count as (
    select count(*)::integer n from public.get_unexcused_warnings(p_group_id)
  )
  select jsonb_build_object(
    'groups',(select count(*)::integer from gs),
    'students',t.students,'present',t.present,'excused',t.excused,'unexcused',t.unexcused,
    'skipped',t.skipped,'warnings',w.n,
    'groupsToday',coalesce((select jsonb_agg(jsonb_build_object(
      'group_id',id,'group_name',name,'total',total,'present',present,
      'excused',excused,'unexcused',unexcused,'skipped',skipped
    ) order by name) from gs),'[]'::jsonb)
  ) into result from totals t cross join warning_count w;
  return result;
end $$;

create or replace function public.get_attendance_report(
  p_period text, p_date date, p_group_by text, p_group_id uuid default null
)
returns table (
  key text, label text, sub text, present integer, excused integer,
  unexcused integer, skipped integer, excused_hours integer, unexcused_hours integer
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_group uuid := public.current_group_id();
  d_start date; d_end date;
begin
  if not public.is_active_member() then raise exception 'Faol hisob talab qilinadi' using errcode='42501'; end if;
  if not public.is_admin() and p_group_id is not null and p_group_id is distinct from v_group then
    raise exception 'Bu guruh uchun ruxsat yo‘q' using errcode='42501';
  end if;
  if p_period not in ('daily','weekly','monthly','yearly') then raise exception 'Davr noto‘g‘ri' using errcode='22023'; end if;
  if p_group_by not in ('group','student') then raise exception 'Kesim noto‘g‘ri' using errcode='22023'; end if;
  d_start := case p_period when 'daily' then p_date when 'weekly' then date_trunc('week',p_date)::date
    when 'monthly' then date_trunc('month',p_date)::date else date_trunc('year',p_date)::date end;
  d_end := case p_period when 'daily' then p_date when 'weekly' then date_trunc('week',p_date)::date+6
    when 'monthly' then (date_trunc('month',p_date)+interval '1 month'-interval '1 day')::date
    else (date_trunc('year',p_date)+interval '1 year'-interval '1 day')::date end;
  if p_group_by='group' then
    return query
    select g.id::text,g.name,null::text,
      count(a.id) filter(where a.status='present')::int,
      count(a.id) filter(where a.status='excused_absent')::int,
      count(a.id) filter(where a.status='unexcused_absent')::int,
      count(a.id) filter(where a.status='escaped')::int,
      coalesce(sum(a.academic_hours) filter(where a.status='excused_absent'),0)::int,
      coalesce(sum(a.academic_hours) filter(where a.status='unexcused_absent'),0)::int
    from public.groups g left join public.students s on s.group_id=g.id
    left join public.attendance a on a.student_id=s.id and a.lesson_date between d_start and d_end
    where (public.is_admin() or g.id=v_group) and (p_group_id is null or g.id=p_group_id)
    group by g.id,g.name order by g.name;
  else
    return query
    select s.id::text,s.full_name,g.name,
      count(a.id) filter(where a.status='present')::int,
      count(a.id) filter(where a.status='excused_absent')::int,
      count(a.id) filter(where a.status='unexcused_absent')::int,
      count(a.id) filter(where a.status='escaped')::int,
      coalesce(sum(a.academic_hours) filter(where a.status='excused_absent'),0)::int,
      coalesce(sum(a.academic_hours) filter(where a.status='unexcused_absent'),0)::int
    from public.students s join public.groups g on g.id=s.group_id
    left join public.attendance a on a.student_id=s.id and a.lesson_date between d_start and d_end
    where (public.is_admin() or s.group_id=v_group) and (p_group_id is null or s.group_id=p_group_id)
    group by s.id,s.full_name,g.name order by s.full_name;
  end if;
end $$;

revoke all on function public.get_unexcused_warnings(uuid), public.get_dashboard_stats(date,uuid),
  public.get_attendance_report(text,date,text,uuid) from public, anon;
grant execute on function public.get_unexcused_warnings(uuid), public.get_dashboard_stats(date,uuid),
  public.get_attendance_report(text,date,text,uuid) to authenticated;
