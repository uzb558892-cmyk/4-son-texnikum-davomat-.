# Xavfsizlik ko‘rsatmalari

- Frontend faqat `VITE_SUPABASE_URL` va public anon/publishable key ishlatadi.
- `service_role` faqat Supabase server/Edge Function ichida bo‘lishi kerak.
- Ochiq signup `supabase/config.toml` da o‘chirilgan.
- Admin `profiles_single_admin` unique partial index bilan yagona qilib cheklangan.
- Admin faqat `bootstrap_admin()` orqali, service_role kontekstida yaratiladi.
- `bootstrap-admin` endpointi `BOOTSTRAP_SECRET` ni tekshiradi; admin yaratilgach funksiyani o‘chirish kerak.
- Guruh rahbari yaratish, boshqarish va email ro‘yxatini olish Edge Function'larda `requireAdmin()` bilan tekshiriladi.
- RLS barcha asosiy jadvallarda yoqilgan.
- Davomat yozish `mark_attendance` RPC orqali; foydalanuvchi guruh vakolati serverda tekshiriladi.
- 72 soatlik hisob serverda faqat `unexcused_absent` statusini yig‘adi va `>` ishlatadi.
- Edge Function CORS `ALLOWED_ORIGIN` bilan cheklanadi. Uni haqiqiy frontend domeniga sozlash shart.
- `.env`, service role, bootstrap secret, database password va admin parolini GitHub'ga yuklamang.
- Loglarga maxfiy kalit yoki parol yozmang.

## Xavfsizlik cheklovi

SQL statik testlari RLS policy matni va grantlarni tekshiradi; bu real authorization testining o‘rnini bosmaydi. Production oldidan kamida ikki xil guruh rahbari bilan cross-group access test bajarilishi shart.
