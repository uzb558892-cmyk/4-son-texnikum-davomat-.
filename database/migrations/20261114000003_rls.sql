-- =====================================================================
-- 4-SON TEXNIKUM DAVOMAT — 3/4: Row Level Security va huquqlar
-- Prinsip: yozuvlar ko‘pincha RPC orqali; jadvallarga to‘g‘ridan-to‘g‘ri yozish minimal.
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.groups           enable row level security;
alter table public.students         enable row level security;
alter table public.attendance       enable row level security;
alter table public.attendance_audit enable row level security;
alter table public.warning_letters  enable row level security;
alter table public.settings         enable row level security;

-- Avval hamma narsani yopamiz (Supabase default privilege'larini bekor qilamiz)
revoke all on public.profiles, public.groups, public.students, public.attendance,
              public.attendance_audit, public.warning_letters, public.settings
  from anon, authenticated;

grant select on public.profiles, public.groups, public.students, public.attendance,
                public.attendance_audit, public.warning_letters, public.settings to authenticated;
grant insert, update, delete on public.groups, public.students to authenticated;
-- profiles: faqat shu ustunlarni yangilash mumkin (role/id ni hech kim o‘zgartira olmaydi)
grant update (full_name, phone, is_active) on public.profiles to authenticated;

-- ---------------------------------------------------------------- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- INSERT/DELETE siyosati yo‘q => faqat service_role (Edge Function) yarata/o‘chira oladi

-- ------------------------------------------------------------------ groups
create policy groups_select on public.groups for select to authenticated
  using (public.is_admin() or id = public.current_group_id());
create policy groups_admin_insert on public.groups for insert to authenticated
  with check (public.is_admin());
create policy groups_admin_update on public.groups for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy groups_admin_delete on public.groups for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- students
create policy students_select on public.students for select to authenticated
  using (public.is_admin() or group_id = public.current_group_id());
create policy students_admin_insert on public.students for insert to authenticated
  with check (public.is_admin());
create policy students_admin_update on public.students for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy students_admin_delete on public.students for delete to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------- attendance
-- Faqat o‘qish. Yozish: mark_attendance / mark_attendance_bulk (SECURITY DEFINER)
create policy attendance_select on public.attendance for select to authenticated
  using (
    public.is_admin()
    or student_id in (select s.id from public.students s where s.group_id = public.current_group_id())
  );

-- --------------------------------------------------------- attendance_audit
create policy attendance_audit_select on public.attendance_audit for select to authenticated
  using (public.is_admin() or group_id = public.current_group_id());

-- ----------------------------------------------------------- warning_letters
create policy warning_letters_select on public.warning_letters for select to authenticated
  using (
    public.is_admin()
    or student_id in (select s.id from public.students s where s.group_id = public.current_group_id())
  );

-- ---------------------------------------------------------------- settings
create policy settings_select on public.settings for select to authenticated
  using (public.is_active_member());
