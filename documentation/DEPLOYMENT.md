# Deployment qo‘llanmasi

## 1. Supabase loyihasini yaratish

1. Supabase Dashboard orqali yangi project yarating.
2. Kuchli database parol belgilang va xavfsiz joyda saqlang.
3. Project Settings → API bo‘limidan Project URL va publishable/anon public key ni oling.
4. Project Settings → General bo‘limidan Project Reference ID ni oling.
5. Ushbu qiymatlar `.env.example` dagi mos joylarga kiritiladi. Haqiqiy `.env` faylni GitHub'ga yubormang.

## 2. SQL migratsiyalar

Terminalda:

```bash
cd backend
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Bu beshta migratsiyani ketma-ket bajaradi:
- `20261114000001_schema.sql`
- `20261114000002_functions.sql`
- `20261114000003_rls.sql`
- `20261114000004_views.sql`
- `20261114000005_frontend_compat.sql`

Agar CLI ishlatmasangiz, Supabase Dashboard → SQL Editor orqali migratsiyalarni tartib bilan bajarishingiz mumkin. Har bir faylni to‘liq ko‘chiring va muvaffaqiyatli yakunlanganini tekshiring.

## 3. Edge Function secrets

`BOOTSTRAP_SECRET` ni o‘zingiz yarating:

```bash
openssl rand -hex 32
```

Keyin:

```bash
npx supabase secrets set BOOTSTRAP_SECRET="PASTE_GENERATED_SECRET"
npx supabase secrets set ALLOWED_ORIGIN="https://YOUR-DOMAIN"
```

`ALLOWED_ORIGIN` qiymati frontendning aniq origin'i bo‘lishi kerak. Masalan, `https://davomat.example.uz`; oxirida slash qo‘ymang. Vercel preview domenidan foydalanilsa, unga mos origin ham sozlanishi kerak. Edge Functions CORS ro‘yxati bo‘sh qolsa, kod xavfsizlik uchun `null` origin ishlatadi va brauzer chaqiruvlarini qabul qilmaydi.

Supabase Edge Functions ichida `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` platforma tomonidan beriladi. Service role kalitini frontendga yoki ommaviy repozitoriyga kiritmang.

## 4. Edge Functions deploy

```bash
npx supabase functions deploy bootstrap-admin
npx supabase functions deploy create-group-leader
npx supabase functions deploy manage-group-leader
npx supabase functions deploy list-users
```

Har bir funksiya `backend/supabase/functions/` ichida. Guruh rahbarini yaratish/boshqarish va foydalanuvchilar ro‘yxati funksiyalari administrator tokenini serverda tekshiradi.

## 5. Birinchi administratorni yaratish

Admin ro‘yxatdan o‘tish sahifasi orqali yaratilmaydi. Faqat bir martalik bootstrap funksiyasi ishlatiladi.

Linux/macOS terminalida:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/bootstrap-admin" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_PUBLIC_ANON_KEY" \
  -H "x-bootstrap-secret: YOUR_BOOTSTRAP_SECRET" \
  -d '{"email":"admin@example.uz","password":"YOUR_STRONG_PASSWORD","full_name":"Administrator"}'
```

URL uchun Supabase Dashboard'dagi haqiqiy Project URL dan foydalaning. Parol kamida 10 belgidan iborat bo‘lsin. Email va parolni buyruq tarixida saqlamaslik uchun xavfsiz terminal usulidan foydalaning.

Javobda `role: admin` qaytsa, admin yaratilgan. Keyin bootstrap endpointini o‘chiring:

```bash
npx supabase functions delete bootstrap-admin
```

Agar o‘chirmasangiz ham, `profiles_single_admin` unique indeksi ikkinchi adminni bloklaydi va `BOOTSTRAP_SECRET` talab qilinadi. Shunga qaramay, bootstrap funksiyasini o‘chirish tavsiya etiladi.

## 6. Frontendni Vercel'ga joylashtirish

1. GitHub'ga loyiha repozitoriysini joylashtiring (`.env` va maxfiy qiymatlarsiz).
2. Vercel'da New Project → GitHub repo tanlang.
3. Root Directory: `frontend`.
4. Framework preset: Vite.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEMO_MODE=false`
8. Deploy qiling.

## 7. Domen ulash

Vercel Project → Settings → Domains orqali domen qo‘shing. Vercel bergan DNS yozuvlarini domen registratorida kiriting. Domen ishlay boshlagach, Supabase secrets ichidagi `ALLOWED_ORIGIN` ni aynan shu domen bilan yangilang.

## 8. Yakuniy tekshiruv

- Saytni oching, demo banner ko‘rinmasligini tekshiring.
- Administrator bilan login qiling.
- Guruh yarating va guruh rahbari hisobini yarating.
- O‘quvchi qo‘shing.
- Guruh rahbari login qilib faqat o‘z guruhini ko‘rayotganini tekshiring.
- Davomatni saqlang, sahifani yangilang va yozuv bazadan qaytishini tekshiring.
- 72 soat va 72 dan oshish holatlarini test ma’lumotlarida tekshiring.
- PDF/Word eksportlarini sinang.
- Brauzer konsoli va Supabase Logs'da xatolar yo‘qligini tekshiring.

**Eslatma:** ushbu arxiv yaratilgan paytda real Supabase project, Vercel deployment va domen mavjud emas edi. Shu sabab bu bosqichlar bajarilgan deb ko‘rsatilmaydi.
