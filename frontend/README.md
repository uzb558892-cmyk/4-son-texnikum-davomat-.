# 4-SON TEXNIKUM DAVOMAT — Frontend

Texnikum davomat tizimining frontend qismi. **Texnologiyalar:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Supabase JS Client.
Faqat davomatga oid modullar: baholar, fanlar, kundalik va dars jadvali yo'q.

## Ishga tushirish

```bash
cd frontend
npm install
cp .env.example .env      # Supabase kalitlarini kiriting
npm run dev               # http://localhost:5173
npm run build             # production build -> dist/
```

`.env` bo'sh bo'lsa yoki `VITE_DEMO_MODE=true` bo'lsa, ilova **DEMO rejimda** ishlaydi: tepada sariq banner chiqadi,
kirish sahifasida rol tanlanadi, ma'lumotlar `src/services/demoData.ts` dan olinadi va saqlanmaydi.

## Xavfsizlik
- Faqat `VITE_SUPABASE_ANON_KEY` (public) ishlatiladi. `service_role` kalitini frontendga qo'ymang.
- Login va rollar Supabase Auth + `profiles` jadvali orqali boshqariladi.
- "Guruh rahbari faqat o'z guruhini ko'rsin" qoidasi **backendda RLS orqali** majburiy bo'lishi kerak. Frontend faqat qulaylik uchun filtrlaydi.
- 72 soatlik hisob-kitob frontendda **bajarilmaydi** — `get_unexcused_warnings` RPC natijasi ko'rsatiladi.

## Tuzilma
```
frontend/
  src/
    components/   qayta ishlatiladigan UI (DataTable, Modal, StatCard, WarningLetter ...)
    pages/        10 ta sahifa (+ DashboardView)
    layouts/      AppLayout (chap yon menyu, mobil drawer)
    context/      AuthContext
    services/     Supabase ulanish va API qatlami (+ demoData.ts)
    hooks/        useAsync, useDebounce
    types/        TypeScript turlari
    utils/        format, constants, export (Excel/Word/Chop etish)
  public/  package.json  .env.example  README.md
  docs/BACKEND.md   backend talablari (jadvallar, view, RPC, RLS)
```

## Eksport funksiyalari
- **Excel:** `.xls` (HTML jadval) — Excel to'g'ridan-to'g'ri ochadi.
- **Word:** `.doc` (HTML) — ogohlantirish xati uchun.
- **PDF / Chop etish:** chop etish oynasi ochiladi; PDF uchun «PDF sifatida saqlash» tanlanadi.

## Backendga ulash
Barcha so'rovlar `src/services/*Service.ts` fayllarida. Jadval/RPC nomlari o'zgarsa, faqat shu fayllar tahrirlanadi.
Batafsil: `docs/BACKEND.md`.


## Integratsiya holati

Frontend servis qatlamlari backendning `attendance`, `groups_overview`, `students_overview` va mos RPC/Edge Function interfeyslariga moslashtirilgan. Production build va real Supabase sinovi uchun root `README.md` hamda `documentation/INTEGRATION-AUDIT.md` ni ko‘ring.
