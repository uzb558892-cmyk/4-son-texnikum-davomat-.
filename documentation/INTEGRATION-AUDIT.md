# Integratsion audit hisoboti

## Kirish materiallari

- `4-SON-TEXNIKUM-BACKEND.zip` — 56 ta arxiv yozuvi.
- `4-SON-TEXNIKUM-FRONTEND (1).zip` — 70 ta arxiv yozuvi.
- Har ikkala arxiv alohida SHA-256 qiymatga ega; frontend arxivi backendning nusxasi emas.

## Dastlabki aniqlangan nomuvofiqliklar

| Frontenddagi kutish | Backenddagi sxema |
|---|---|
| `attendance_records` | `attendance` |
| `date` | `lesson_date` |
| `lesson` | `para` |
| `excused` | `excused_absent` |
| `unexcused` | `unexcused_absent` |
| `skipped` | `escaped` |
| `groups_overview` | dastlab yo‘q edi |
| `students_overview` | dastlab yo‘q edi |
| `get_unexcused_warnings` | dastlab yo‘q edi |
| `get_attendance_report` | dastlab yo‘q edi |
| `get_dashboard_stats` | dastlab yo‘q edi |
| `create-user` | dastlab yo‘q edi |
| `profiles.email`, `profiles.group_id` | profiles jadvalida yo‘q |

## Amalga oshirilgan moslashtirishlar

1. `20261114000005_frontend_compat.sql` qo‘shildi.
2. `groups.course` va `students.phone` maydonlari migratsiya orqali qo‘shildi.
3. `groups_overview`, `students_overview` security-invoker view'lari yaratildi.
4. Ogohlantirish, dashboard va hisobot uchun server RPC funksiyalari yaratildi.
5. Frontend davomat holatlari backend enum qiymatlariga tarjima qilinadi.
6. Davomat saqlash `mark_attendance` RPC orqali bajariladi; jadvalga bevosita upsert olib tashlandi.
7. Guruh rahbari `group_id` qiymati `groups.leader_id` orqali aniqlanadi.
8. Joriy foydalanuvchining email'i Supabase Auth'dan olinadi; admin foydalanuvchilar ro‘yxatidagi email serverdagi `list-users` Edge Function orqali olinadi.
9. Foydalanuvchi yaratish `create-group-leader` ga moslashtirildi; admin yaratish formadan olib tashlandi.
10. Guruh rahbari tayinlash/boshqarish Edge Function orqali bajariladi.
11. Edge Function CORS `ALLOWED_ORIGIN` ga bog‘landi; qiymat yo‘q bo‘lsa permissive `*` ishlatilmaydi.

## Test natijalari

- Backend `npm test`: **46/46 o‘tdi** (Node.js 22.16.0, Node test runner).
- Bu testlar backend TypeScript helperlari va SQL statik tekshiruvlarini qamrab oladi.
- Frontend `tsc --noEmit` bajarildi, lekin `react`, `react-router-dom`, `@supabase/supabase-js` paketlari o‘rnatilmaganligi sabab modul topilmadi xatolari qaytdi.
- `npm install` urinishida tarmoq/registr javobi timeout bo‘ldi.
- Supabase CLI, Deno va real Supabase credentials mavjud bo‘lmagani uchun SQL migratsiyalarni real Postgres'da, Edge Functions'ni Deno'da, RLS'ni alohida hisoblarda va real loginni sinash imkoni bo‘lmadi.
- Vercel build/deploy va domen ulash bajarilmadi.

## Ochiq tekshiruvlar

Quyidagilarni deploydan keyin bajarish shart:
- SQL migratsiya sintaksisini Supabase Postgres'da bajarish.
- RLS testini admin va kamida ikki xil guruh rahbari bilan tekshirish.
- `list-users`, `create-group-leader`, `manage-group-leader` Edge Functions deploy va auth test.
- Vite production build.
- Admin login, guruh yaratish, o‘quvchi qo‘shish, davomat saqlash/tahrirlash.
- 72/73 soat chegarasi real DB'da.
- Sababli davomat hisobdan chiqarilishini tekshirish.
- Escape'dan keyingi paralar hisoblanishini tekshirish.
- PDF/Word, mobil ko‘rinish va hisobotlar.
- Guruh rahbari boshqa guruh ID'sini qo‘lda yuborganda 403/permission denied olishini tekshirish.

## Muhim eslatma

Bu integratsiya patchi va deploymentga tayyor manba kod. Real internetda ishlaydigan production platforma deb e'lon qilishdan oldin yuqoridagi ochiq testlar va tashqi sozlashlar bajarilishi shart.
