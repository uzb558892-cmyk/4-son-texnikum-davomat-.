-- =====================================================================
-- 4-SON TEXNIKUM DAVOMAT — 4/4: hisobot ko‘rinishlari (RLS ruxsatlari saqlanadi)
-- =====================================================================

create or replace view public.v_student_absence_summary
with (security_invoker = true) as
select
  s.id        as student_id,
  s.group_id,
  g.name      as group_name,
  s.full_name,
  coalesce(sum(a.academic_hours) filter (where a.status = 'unexcused_absent'), 0)::int as unexcused_hours,
  coalesce(sum(a.academic_hours) filter (where a.status = 'excused_absent'),   0)::int as excused_hours,
  count(*) filter (where a.status = 'escaped')::int                                    as escaped_count,
  count(*) filter (where a.status = 'present')::int                                    as present_paras,
  public.get_setting_int('warning_threshold_hours', 72)                                as threshold_hours,
  coalesce(sum(a.academic_hours) filter (where a.status = 'unexcused_absent'), 0)
    > public.get_setting_int('warning_threshold_hours', 72)                            as threshold_exceeded
from public.students s
join public.groups g on g.id = s.group_id
left join public.attendance a on a.student_id = s.id
group by s.id, g.id;

create or replace view public.v_group_attendance_daily
with (security_invoker = true) as
select
  a.group_id,
  a.lesson_date,
  a.para,
  count(*) filter (where a.status = 'present')::int          as present,
  count(*) filter (where a.status = 'excused_absent')::int   as excused_absent,
  count(*) filter (where a.status = 'unexcused_absent')::int as unexcused_absent,
  count(*) filter (where a.status = 'escaped')::int          as escaped
from public.attendance a
group by a.group_id, a.lesson_date, a.para;

revoke all on public.v_student_absence_summary, public.v_group_attendance_daily from anon, authenticated;
grant select on public.v_student_absence_summary, public.v_group_attendance_daily to authenticated;
