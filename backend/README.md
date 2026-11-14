# 4-SON TEXNIKUM DAVOMAT — Backend

Onlayn davomat platformasining **backend** qismi: Supabase (PostgreSQL + Auth + RLS + Edge Functions) va frontend dasturchi uchun TypeScript klient qatlami. Frontend bu loyihaga kirmaydi.

```
backend/
├─ supabase/
│  ├─ config.toml                 # ro‘yxatdan o‘tish o‘chirilgan, Edge Function sozlamalari
│  ├─ migrations/                 # 1 sxema · 2 funksiyalar/triggerlar/RPC · 3 RLS · 4 hisobot ko‘rinishlari
│  ├─ functions/                  # bootstrap-admin, create-group-leader, manage-group-leader (+ _shared)
│  ├─ tests/database/             # pgTAP: RLS va qoidalar testlari
│  └─ seed.sql                    # test guruhlar va o‘quvchilar
├─ src/{services,types,utils}/    # frontend uchun servislar, turlar, qoidalar modeli
├─ tests/                         # avtomatik testlar (node:test)
├─ docs/                          # API.md, DATABASE.md, ER diagramma
├─ .env.example
└─ package.json / tsconfig.json
```

Hujjatlar: **[docs/API.md](docs/API.md)** (frontend uchun shartnoma) · **[docs/DATABASE.md](docs/DATABASE.md)** (sxema, qoidalar, xavfsizlik, ER diagramma).

## Rollar

* **Bitta administrator** — guruh rahbarlarini yaratadi, guruh/o‘quvchilarni boshqaradi, hamma davomat, ogohlantirish va hisobotlarni ko‘radi, sozlamalarni o‘zgartiradi.
* **Guruh rahbarlari** — faqat o‘z guruhini ko‘radi, davomat belgilaydi, o‘z guruhi hisobotini ko‘radi.
* Ochiq ro‘yxatdan o‘tish yo‘q; ikkinchi administrator yaratib bo‘lmaydi (DB darajasida taqiqlangan).

## O‘rnatish

### 0. Talablar
Node.js ≥ 22.6, [Supabase CLI](https://supabase.com/docs/guides/cli), Docker (faqat lokal ishlash uchun), Supabase loyihasi ([supabase.com](https://supabase.com) — bepul reja yetadi).

### 1. Bog‘liqliklar va muhit
```bash
npm install
cp .env.example .env      # qiymatlarni o‘zingiz to‘ldirasiz; .env ni git'ga qo‘shmang
```
`.env.example` ichida har bir qiymat qayerdan olinishi yozilgan (kalitlar to‘qib chiqarilmagan).

### 2. Lokal sinov (ixtiyoriy, Docker kerak)
```bash
supabase start            # lokal Postgres + Auth
supabase db reset         # migratsiyalar + seed.sql
npm run db:test           # pgTAP testlari (supabase test db)
```

### 3. Productionga (Supabase Cloud) joylash
```bash
supabase login
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push                                    # 4 ta migratsiya
supabase secrets set BOOTSTRAP_SECRET=<openssl rand -hex 32 natijasi>
supabase secrets set ALLOWED_ORIGIN=https://<frontend-manzili>   # ixtiyoriy, CORS
supabase functions deploy bootstrap-admin --no-verify-jwt
supabase functions deploy create-group-leader --no-verify-jwt
supabase functions deploy manage-group-leader --no-verify-jwt
```
`--no-verify-jwt`: funksiyalar tokenni o‘zlari tekshiradi (`_shared/common.ts`), shuning uchun Supabase darvozasi kerak emas.

**Dashboard'da (qo‘lda, bir marta):**
1. *Authentication → Providers → Email* — **"Allow new users to sign up"** ni **o‘chiring** (config.toml faqat lokal uchun amal qiladi).
2. *Authentication → Sign In / Providers* — **Anonymous sign-ins** o‘chiq bo‘lsin.
3. *Authentication → Policies* — parol uzunligi kamida 10.

### 4. Yagona administratorni yaratish (bir marta)
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/bootstrap-admin" \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: <BOOTSTRAP_SECRET qiymati>" \
  -d '{"email":"admin@sizning-domen.uz","password":"<kamida 10 belgili kuchli parol>","full_name":"Administrator"}'
```
Muvaffaqiyatdan so‘ng funksiyani va sirni **o‘chiring**:
```bash
supabase functions delete bootstrap-admin
supabase secrets unset BOOTSTRAP_SECRET
```
(Funksiyani qoldirsangiz ham ikkinchi administrator yaratib bo‘lmaydi — `409 ADMIN_EXISTS`.)

### 5. Guruh rahbarlarini yaratish
Administrator sifatida kirib `create-group-leader` ni chaqiring (frontend admin paneli yoki):
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/create-group-leader" \
  -H "Authorization: Bearer <admin access_token>" -H "Content-Type: application/json" \
  -d '{"email":"rahbar@sizning-domen.uz","password":"<10+ belgi>","full_name":"Ism Familiya","group_id":"<guruh uuid>"}'
```
Test ma‘lumotlari (ixtiyoriy, faqat staging): `supabase/seed.sql` mazmunini SQL Editor'da bajaring.

## Testlar
```bash
npm test            # 43 ta avtomatik test (qoidalar modeli, tekshiruvlar, servislar, SQL statik tekshiruvi)
npm run typecheck   # tsc (npm install dan keyin)
npm run db:test     # pgTAP (Docker + supabase start kerak)
```

## Sozlamalar
Administrator `update_setting` RPC orqali o‘zgartiradi: `academic_hours_per_para` (standart 2), `paras_per_day` (4), `warning_threshold_hours` (72), `college_name`, `timezone`. Batafsil: [docs/DATABASE.md](docs/DATABASE.md).

## Qabul qilingan qarorlar (spetsifikatsiyada aniq aytilmagan joylar)
* **"Qochdi":** tanlangan `K`-para qatori `escaped` bo‘ladi (hisobga kirmaydi); `K` dan keyingi barcha rejalashtirilgan paralar uzrsiz. Rejalashtirilgan paralar soni — `paras_per_day` (standart 4; guruhda alohida belgilash mumkin). Spetsifikatsiyada soni berilmagani uchun bu sozlama qo‘shildi.
* **Ogohlantirish darajalari:** 72 dan oshganda 1-xat, 144 dan oshganda 2-xat va h.k. (bitta kattalikka bog‘lab, takroriy xatlar oldi olingan).
* **Akademik soat snapshot:** sozlama o‘zgarsa, eski yozuvlar qayta hisoblanmaydi.
* **Hisoblash davri:** 72 soat o‘quvchining BUTUN yozuvlari bo‘yicha yig‘iladi (semestr/o‘quv yili bo‘yicha nolga tushirish yo‘q). Kerak bo‘lsa alohida qo‘shiladi.
* **Tahrir muddati:** rahbar o‘tgan sanalarni ham tahrirlay oladi (kelajak sana taqiqlangan); barcha o‘zgarishlar `attendance_audit` da saqlanadi.

## Ma‘lum cheklovlar (halol hisobot)
* SQL migratsiyalar va pgTAP testlari yozilgan muhitda **Postgres bo‘lmagani** sababli bazada ijro etilmagan; faqat statik tekshiruvdan o‘tgan. Birinchi `supabase db reset` / `supabase test db` da kichik xatolar chiqishi mumkin — shu holda xato matnini yuboring.
* Edge Function'lar (Deno) joylanmagan va ishga tushirilmagan.
* `src/services` tip tekshiruvi haqiqiy `@supabase/supabase-js` turlari bilan emas, soddalashtirilgan vaqtinchalik e‘lon bilan o‘tgan; `npm install && npm run typecheck` ni ishga tushiring, kerak bo‘lsa `npm run gen:types` bilan `database.ts` ni yangilang.
