# Database

Canonical SQL migrations:
`../backend/supabase/migrations/`

Ushbu papkadagi `migrations/` — migratsiyalarning ko‘chirma nusxasi. Migratsiyalarni tartib bilan Supabase CLI orqali `supabase db push` yordamida yoki SQL Editor'da bajaring.

1. `20261114000001_schema.sql`
2. `20261114000002_functions.sql`
3. `20261114000003_rls.sql`
4. `20261114000004_views.sql`
5. `20261114000005_frontend_compat.sql`

Asosiy jadvallar: profiles, groups, students, attendance, attendance_audit, warning_letters, settings.
