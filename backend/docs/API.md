# API qo‘llanmasi (frontend dasturchi uchun)

Backend = **Supabase**. Frontend `@supabase/supabase-js` orqali ishlaydi; maxsus REST server yo‘q.
Uch xil yo‘l bor:

1. **Jadval/ko‘rinishlarni o‘qish** — `supabase.from(...)` (RLS rolga qarab filtrlaydi).
2. **Yozish RPC** — `supabase.rpc(...)` (davomat, sozlama, ogohlantirish).
3. **Edge Function** — `supabase.functions.invoke(...)` (faqat administrator; foydalanuvchi yaratish).

Tayyor TypeScript qatlam: `src/services/*` (`createBackendClient(url, anonKey)`). Frontend FAQAT `SUPABASE_URL` va `SUPABASE_ANON_KEY` ni biladi.

## 1. Autentifikatsiya

* Ochiq ro‘yxatdan o‘tish **yo‘q**. Kirish: `supabase.auth.signInWithPassword({ email, password })`.
* Kirgach rolni `profiles` dan oling: `from('profiles').select('*').eq('id', user.id).single()` → `role: 'admin' | 'group_leader'`, `is_active`.
* Rol faqat menyuni ko‘rsatish uchun; haqiqiy himoya serverda (RLS + RPC).

## 2. Jadvallar (o‘qish) va ruxsatlar

| Jadval/ko‘rinish | Admin | Guruh rahbari |
|---|---|---|
| `profiles` | hammasini o‘qiydi; `full_name, phone, is_active` yangilaydi | faqat o‘zini o‘qiydi |
| `groups` | CRUD | faqat o‘z guruhini o‘qiydi |
| `students` | CRUD | faqat o‘z guruhini o‘qiydi |
| `attendance` | o‘qiydi | faqat o‘z o‘quvchilariniki |
| `attendance_audit` | o‘qiydi | o‘z guruhiniki |
| `warning_letters` | o‘qiydi | o‘z o‘quvchilariniki (faqat o‘qish) |
| `settings` | o‘qiydi | o‘qiydi |
| `v_student_absence_summary`, `v_group_attendance_daily` | hammasi | faqat o‘z guruhi |

`attendance`, `attendance_audit`, `warning_letters`, `settings` ga **to‘g‘ridan-to‘g‘ri INSERT/UPDATE/DELETE yo‘q** (ruxsat bermaydi) — faqat RPC.
Ustunlar va turlar: `docs/DATABASE.md`, `src/types/database.ts`.

Misollar:
```ts
// Guruh o‘quvchilari (rahbar uchun avtomatik faqat o‘z guruhi)
await supabase.from('students').select('*').eq('is_active', true).order('full_name');

// Bir kunlik davomat
await supabase.from('attendance').select('*').in('student_id', ids).eq('lesson_date', '2026-11-14');

// 72 soatdan oshganlar
await supabase.from('v_student_absence_summary').select('*').eq('threshold_exceeded', true);
```

## 3. RPC

### `mark_attendance(p_student_id, p_lesson_date, p_para, p_status, p_note?)` → `attendance` qatori
Bitta o‘quvchi/sana/para. Mavjud yozuv bo‘lsa yangilanadi.
* `p_lesson_date`: `YYYY-MM-DD`, kelajak sana bo‘lmasin (hisob `timezone` sozlamasi bo‘yicha).
* `p_para`: `1..` kunlik paralar soni.
* `p_status = 'escaped'`: `p_para` = qaysi paradan **keyin** ketdi (faqat 1, 2, 3). Keyingi paralar avtomatik `unexcused_absent` bo‘ladi, oldingilari o‘zgarmaydi.
```ts
await supabase.rpc('mark_attendance', { p_student_id, p_lesson_date: '2026-11-14', p_para: 2, p_status: 'escaped' });
```
**Muhim:** `escaped` dan so‘ng shu kunning ro‘yxatini qayta o‘qing (boshqa para qatorlari ham o‘zgargan bo‘ladi).

### `mark_attendance_bulk(p_group_id, p_lesson_date, p_para, p_records)` → `integer`
Butun guruhni bitta tranzaksiyada belgilaydi (birortasida xato bo‘lsa hech biri yozilmaydi).
```ts
await supabase.rpc('mark_attendance_bulk', {
  p_group_id, p_lesson_date: '2026-11-14', p_para: 1,
  p_records: [{ student_id, status: 'present', note: null }, /* ... */],
});
```

### `update_setting(p_key, p_value)` → `settings` qatori (faqat admin)
Kalitlar va diapazonlar: `docs/DATABASE.md`. Masalan `rpc('update_setting', { p_key: 'academic_hours_per_para', p_value: 3 })`.
`warning_threshold_hours` o‘zgarsa ogohlantirishlar qayta hisoblanadi.

### `update_warning(p_id, p_letter_text?, p_status?)` → `warning_letters` qatori (faqat admin)
Xat matnini tahrirlash va holatni oldinga surish: `draft → issued → sent` (orqaga yo‘q). `issued_at/sent_at/handled_by` avtomatik.

## 4. Edge Function'lar (faqat administrator JWT bilan)

Barchasi `POST`, `Authorization: Bearer <admin access_token>` (supabase-js `functions.invoke` buni o‘zi qo‘yadi). Server tokenni tekshirib, chaqiruvchi **faol administrator** ekanini bazadan aniqlaydi.

### `create-group-leader`
So‘rov:
```json
{ "email": "rahbar@example.uz", "password": "kamida-10-belgi", "full_name": "Ism Familiya", "phone": "+998...", "group_id": "uuid (ixtiyoriy)" }
```
Javob `201`: `{ "id", "email", "full_name", "phone", "group_id", "role": "group_leader" }`.
Rahbar yaratiladi (email tasdiqlangan holda), `group_id` berilsa guruhga biriktiriladi (guruhda rahbar bo‘lmasligi shart). Xato bo‘lsa Auth hisobi qaytarib o‘chiriladi.

### `manage-group-leader`
```json
{ "action": "update", "user_id": "uuid", "full_name": "...", "phone": null }
{ "action": "deactivate", "user_id": "uuid" }      // profil faolsiz + Auth'da bloklash
{ "action": "activate", "user_id": "uuid" }
{ "action": "reset_password", "user_id": "uuid", "password": "yangi-parol-10+" }
```
Javob `200`: `{ "ok": true }`. Administrator hisobiga tegib bo‘lmaydi (`403`).

### `bootstrap-admin` (bir martalik, frontend uchun emas)
Yagona administratorni yaratadi (`x-bootstrap-secret` talab qilinadi). README ga qarang.

### Xato formati (Edge Function)
```json
{ "error": { "code": "VALIDATION", "message": "..." } }
```
| HTTP | code | Ma‘nosi |
|---|---|---|
| 400 | BAD_REQUEST / AUTH_CREATE_FAILED | JSON noto‘g‘ri / Auth rad etdi (masalan email band) |
| 401 | UNAUTHENTICATED | Token yo‘q/yaroqsiz |
| 403 | FORBIDDEN | Admin emas / ruxsat yo‘q |
| 404 | NOT_FOUND | Topilmadi |
| 409 | ADMIN_EXISTS | Administrator allaqachon bor |
| 422 | VALIDATION | Maydon xato |
| 503 | NOT_CONFIGURED | `BOOTSTRAP_SECRET` o‘rnatilmagan |

## 5. RPC / jadval xatolari (PostgREST) va `src/utils/errors.ts` moslashuvi

| Postgres kodi | `ApiError.code` | Qachon |
|---|---|---|
| `28000` | UNAUTHENTICATED | Kirilmagan |
| `42501` | FORBIDDEN | Boshqa guruh, admin emas, RLS/GRANT rad etdi |
| `P0002` | NOT_FOUND | O‘quvchi/ogohlantirish topilmadi |
| `22023`, `23514`, `22P02`, `22007` | VALIDATION | Para diapazoni, kelajak sana, noto‘g‘ri qiymat, CHECK buzildi |
| `23505`, `23503`, `P0001` | CONFLICT | Takroriy/bog‘liqlik/administrator mavjud |

## 6. Integratsiya bo‘yicha maslahatlar

* **Davomat ekrani:** `students` + shu kun `attendance` (`getDaySheet`), para tanlanadi, `mark_attendance_bulk` bilan saqlanadi.
* **Para ro‘yxati:** `settings.paras_per_day` yoki `groups.paras_per_day` (bo‘lsa shu).
* **`escaped` UI:** "Darsdan qochdi" tanlanganda "1/2/3-paradan keyin" so‘rang; saqlagach kunni qayta yuklang.
* **Ogohlantirishlar sahifasi (admin):** `warning_letters` + `students` (ota-ona maydonlari); PDF/chop etish frontend zimmasida, matn `letter_text` da tayyor.
* **Vaqt mintaqasi:** sana — `YYYY-MM-DD` matni; "bugun"ni `todayInTimeZone('Asia/Tashkent')` (src/utils/date.ts) bilan oling.
* **Turlar:** `npm run gen:types` bilan `database.ts` ni avtomatik yangilash mumkin.
