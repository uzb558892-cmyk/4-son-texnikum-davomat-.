# 4-SON TEXNIKUM DAVOMAT

Yagona frontend + Supabase backend loyihasi. Frontend React 18 / TypeScript / Vite; backend Supabase PostgreSQL, RLS, RPC va Edge Functions.

## Loyiha tuzilmasi

```text
frontend/                 React/Vite web ilova
backend/                  Supabase migratsiyalar, Edge Functions, backend testlari
database/migrations/       SQL migratsiyalarning qulay nusxasi
documentation/             audit, xavfsizlik va deploy yo‘riqnomalari
tests/backend/             backend avtomatik testlari
.env.example               muhit o‘zgaruvchilari namunasi
```

## Hozirgi holat

- Frontend va backend o‘rtasidagi nom/ustun/status farqlari moslashtirildi.
- `20261114000005_frontend_compat.sql` migratsiyasi qo‘shildi: frontend kutgan view va RPC interfeyslari.
- Davomat yozish endi to‘g‘ridan-to‘g‘ri jadvalga `upsert` emas, serverdagi `mark_attendance` RPC orqali bajariladi.
- Guruh rahbari hisoblarini yaratish `create-group-leader` Edge Function orqali amalga oshadi.
- Administratorni frontenddan yaratish olib tashlandi; bitta admin faqat bir martalik bootstrap orqali yaratiladi.
- `list-users` Edge Function qo‘shildi; email Auth Admin API orqali serverda olinadi.
- CORS uchun `ALLOWED_ORIGIN` aniq ko‘rsatilishi talab qilinadi.

**Muhim cheklov:** ushbu muhitda Supabase loyihangizga ulanish va npm registridan frontend paketlarini o‘rnatish imkoni bo‘lmadi. Shuning uchun real Supabase integratsion testi va Vite production build muvaffaqiyatli deb da’vo qilinmaydi. Backend Node.js testlari bajarildi: 46/46 o‘tdi. Frontend build tashqi dependency install talab qilgani uchun yakunlanmadi. Batafsil `documentation/INTEGRATION-AUDIT.md`.

## Ishga tushirish

### 1. Supabase

Supabase loyihasini yarating, keyin:

```bash
cd backend
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migratsiyalar `backend/supabase/migrations/` ichida. `database/migrations/` — shu fayllarning nusxasi.

### 2. Edge Function secrets

Loyiha rootidan yoki `backend/` ichidan:

```bash
npx supabase secrets set BOOTSTRAP_SECRET="$(openssl rand -hex 32)"
npx supabase secrets set ALLOWED_ORIGIN="https://YOUR-DOMAIN"
```

`SUPABASE_SERVICE_ROLE_KEY` ni frontendga hech qachon kiritmang. Supabase Edge Functions bu maxfiy kalitni platforma tomonidan server muhitida oladi.

### 3. Edge Functions deploy

```bash
npx supabase functions deploy bootstrap-admin
npx supabase functions deploy create-group-leader
npx supabase functions deploy manage-group-leader
npx supabase functions deploy list-users
```

### 4. Birinchi administrator

`documentation/DEPLOYMENT.md` dagi bir martalik bootstrap yo‘riqnomasiga amal qiling. Admin yaratilgach `bootstrap-admin` funksiyasini o‘chiring.

### 5. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

`.env`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
VITE_DEMO_MODE=false
```

So‘ng:

```bash
npm run dev
npm run build
```

Vercel uchun Root Directory = `frontend`, Build Command = `npm run build`, Output Directory = `dist`. Environment Variables ga yuqoridagi uchta qiymatni kiriting.

## Testlar

```bash
cd backend
npm test
```

Supabase CLI va Docker mavjud bo‘lsa, haqiqiy Postgres/RLS testlari:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

## Muhim ish qoidalari

- Faqat `unexcused_absent` akademik soatlari ogohlantirishga qo‘shiladi.
- `excused_absent` hisobga kirmaydi.
- Aynan 72 soatda ogohlantirish yo‘q; 72 dan oshganda bor.
- Standart para = 2 akademik soat (sozlamada o‘zgartirilishi mumkin).
- `escaped` holatidan keyingi rejalashtirilgan paralar avtomatik uzrsiz bo‘ladi.
- `attendance_unique_slot` bir o‘quvchi/sana/para uchun takroriy yozuvni bloklaydi.
- Guruh rahbari faqat `current_group_id()` orqali o‘z guruhiga kiradi; RLS va RPC server tomonda tekshiradi.

## Xavfsizlik

Frontendga faqat Supabase URL va public anon/publishable key kiritiladi. Service role key, bootstrap secret va boshqa server sirlarini frontendga qo‘ymang. Batafsil `documentation/SECURITY.md`.
